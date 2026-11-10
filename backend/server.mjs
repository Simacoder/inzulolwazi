import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { answer, loadCorpus } from './pipeline.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { HttpError, matchRoute } from './routes.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, '..', 'frontend');
/** @type {Record<string, string>} */
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

export const MAX_BODY_BYTES = 20_000;
const DEFAULT_REPOSITORY = 'https://github.com/Simacoder/inzulolwazi';

/** Content-Security-Policy for pages. Fonts come from Google Fonts. Everything else is served from this origin. */
const PAGE_CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

class PayloadTooLargeError extends Error {}
class BadRequestError extends Error {}

/**
 * Read a JSON body, rejecting it as soon as it exceeds the size limit.
 * @param {import('node:http').IncomingMessage} request
 * @returns {Promise<unknown>}
 */
async function bodyJson(request) {
  let size = 0;
  /** @type {Buffer[]} */
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/**
 * The address to rate-limit. Behind a trusted proxy (Render), the last X-Forwarded-For entry is the client
 * as that proxy saw it. Entries before it can be forged, so they are ignored.
 * @param {import('node:http').IncomingMessage} request
 * @param {boolean} trustProxy
 */
export function clientAddress(request, trustProxy) {
  if (trustProxy) {
    const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',').map((part) => part.trim()).filter(Boolean);
    if (forwarded.length) return forwarded[forwarded.length - 1];
  }
  return request.socket.remoteAddress ?? 'unknown';
}

/**
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {unknown} payload
 * @param {Record<string, string>} [headers]
 */
function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(payload));
}

/**
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Record<string, string>} [headers]
 */
const sendError = (response, status, code, message, headers) => sendJson(response, status, { error: { code, message } }, headers);

/**
 * @param {{ repository?: string, log?: (entry: Record<string, unknown>) => void, rateLimitPerMinute?: number, now?: () => number, trustProxy?: boolean }} [options]
 */
export function createAppServer(options = {}) {
  const config = {
    repository: options.repository ?? process.env.REPO_URL ?? DEFAULT_REPOSITORY,
    log: options.log ?? (() => {}),
    trustProxy: options.trustProxy ?? process.env.TRUST_PROXY === 'true',
  };
  const limiter = createRateLimiter({
    limit: options.rateLimitPerMinute ?? (Number(process.env.RATE_LIMIT_PER_MINUTE) || 120),
    windowMs: 60_000,
    now: options.now,
  });

  return createServer(async (request, response) => {
    // Headers for every response.
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('x-frame-options', 'DENY');

    const url = new URL(request.url ?? '/', 'http://localhost');
    const isApi = url.pathname.startsWith('/api/');
    const isV1 = url.pathname.startsWith('/api/v1/');
    try {
      if (isApi) {
        // The API is read-only public data, so any website may call it.
        response.setHeader('access-control-allow-origin', '*');
        response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
        response.setHeader('access-control-allow-headers', 'content-type');
        response.setHeader('cache-control', 'no-cache');
        if (request.method === 'OPTIONS') {
          response.writeHead(204);
          response.end();
          return;
        }
        const verdict = limiter.check(clientAddress(request, config.trustProxy));
        response.setHeader('x-ratelimit-limit', String(verdict.limit));
        response.setHeader('x-ratelimit-remaining', String(verdict.remaining));
        if (!verdict.allowed) {
          const headers = { 'retry-after': String(verdict.retryAfterSeconds) };
          if (isV1) return sendError(response, 429, 'rate_limited', `Too many requests. Try again in ${verdict.retryAfterSeconds} seconds.`, headers);
          return sendJson(response, 429, { error: 'Too many requests' }, headers);
        }
      }

      if (isV1) {
        const match = matchRoute(request.method ?? 'GET', url.pathname);
        if (!match) throw new HttpError(404, 'not_found', 'No such endpoint');
        if ('allowed' in match) {
          response.setHeader('allow', [...new Set(match.allowed)].join(', '));
          throw new HttpError(405, 'method_not_allowed', `Use ${[...new Set(match.allowed)].join(' or ')} for this endpoint`);
        }
        const body = match.route.method === 'POST' ? await bodyJson(request) : undefined;
        const result = await match.route.handler({ url, params: match.params, corpus: await loadCorpus(), body, config });
        if (result.text !== undefined) {
          response.writeHead(result.status ?? 200, { 'content-type': result.contentType ?? 'text/plain; charset=utf-8', ...result.headers });
          response.end(result.text);
        } else {
          sendJson(response, result.status ?? 200, result.json, result.headers);
        }
        return;
      }

      // The first three routes below predate v1 and keep their original behaviour.
      if (url.pathname === '/api/claims' && request.method === 'GET') {
        sendJson(response, 200, (await loadCorpus()).claims);
        return;
      }
      if (url.pathname === '/api/sources' && request.method === 'GET') {
        sendJson(response, 200, (await loadCorpus()).sources);
        return;
      }
      if (url.pathname === '/api/search' && request.method === 'POST') {
        const body = await bodyJson(request);
        const question = body && typeof body === 'object' && 'question' in body ? body.question : '';
        if (typeof question !== 'string') throw new BadRequestError('question must be a string');
        sendJson(response, 200, answer(question, await loadCorpus()));
        return;
      }
      if (isApi) throw new Error('Not found');

      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(publicRoot, `.${relative}`);
      if (!target.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Not found');
      if (!(await stat(target)).isFile()) throw new Error('Not found');
      const extension = path.extname(target);
      /** @type {Record<string, string>} */
      const headers = { 'content-type': mime[extension] ?? 'application/octet-stream', 'cache-control': 'no-cache' };
      if (extension === '.html') headers['content-security-policy'] = PAGE_CSP;
      response.writeHead(200, headers);
      response.end(await readFile(target));
    } catch (error) {
      if (isV1) {
        if (error instanceof HttpError) return sendError(response, error.status, error.code, error.message);
        if (error instanceof PayloadTooLargeError) return sendError(response, 413, 'payload_too_large', 'Request too large');
        if (error instanceof SyntaxError) return sendError(response, 400, 'invalid_json', 'Invalid JSON request');
        if (error instanceof URIError) return sendError(response, 400, 'invalid_parameter', 'Malformed URL');
        return sendError(response, 500, 'internal_error', 'Something went wrong on our side');
      }
      if (error instanceof PayloadTooLargeError) return sendJson(response, 413, { error: 'Request too large' });
      if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Invalid JSON request' });
      if (error instanceof BadRequestError) return sendJson(response, 400, { error: error.message });
      return sendJson(response, 404, { error: 'Not found' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  // Locally the server listens on this machine only. A host such as Render sets HOST=0.0.0.0 so its router can reach it.
  const host = process.env.HOST || '127.0.0.1';
  const log = (/** @type {Record<string, unknown>} */ entry) => console.log(JSON.stringify(entry));
  createAppServer({ log }).listen(port, host, () => console.log(`inzulolwazi listening on ${host}:${port}`));
}
