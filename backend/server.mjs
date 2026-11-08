import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answer, loadCorpus } from './pipeline.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, '..', 'frontend');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

async function bodyJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (body.length > 20_000) throw new Error('Request too large');
  return JSON.parse(body || '{}');
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/api/claims' && request.method === 'GET') {
      const corpus = await loadCorpus();
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(corpus.claims));
      return;
    }
    if (url.pathname === '/api/sources' && request.method === 'GET') {
      const { sources } = await loadCorpus();
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(sources));
      return;
    }
    if (url.pathname === '/api/search' && request.method === 'POST') {
      const { question = '' } = await bodyJson(request);
      const result = answer(question, await loadCorpus());
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(result));
      return;
    }
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = path.resolve(publicRoot, `.${relative}`);
    if (!target.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Not found');
    if (!(await stat(target)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'content-type': mime[path.extname(target)] ?? 'application/octet-stream' });
    response.end(await readFile(target));
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 404;
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: status === 400 ? 'Invalid JSON request' : 'Not found' }));
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`inzulolwazi listening at http://localhost:${port}`));
