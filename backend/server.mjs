import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { answer, loadCorpus } from './pipeline.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, '..', 'frontend');
/** @type {Record<string, string>} */
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

export const MAX_BODY_BYTES = 20_000;

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
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

export function createAppServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
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
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(publicRoot, `.${relative}`);
      if (!target.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Not found');
      if (!(await stat(target)).isFile()) throw new Error('Not found');
      response.writeHead(200, { 'content-type': mime[path.extname(target)] ?? 'application/octet-stream' });
      response.end(await readFile(target));
    } catch (error) {
      if (error instanceof PayloadTooLargeError) return sendJson(response, 413, { error: 'Request too large' });
      if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Invalid JSON request' });
      if (error instanceof BadRequestError) return sendJson(response, 400, { error: error.message });
      return sendJson(response, 404, { error: 'Not found' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createAppServer().listen(port, '127.0.0.1', () => console.log(`inzulolwazi listening at http://localhost:${port}`));
}
