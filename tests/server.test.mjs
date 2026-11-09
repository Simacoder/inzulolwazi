import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer, MAX_BODY_BYTES } from '../backend/server.mjs';
import { loadCorpus } from '../backend/pipeline.mjs';

const server = createAppServer();
let base = '';

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)));
});

/**
 * Send a request without URL normalisation, to test path traversal handling.
 * @param {string} rawPath
 * @returns {Promise<number>}
 */
function rawGet(rawPath) {
  return new Promise((resolve, reject) => {
    const address = /** @type {import('node:net').AddressInfo} */ (server.address());
    const request = http.request({ host: '127.0.0.1', port: address.port, path: rawPath, method: 'GET' }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode ?? 0));
    });
    request.on('error', reject);
    request.end();
  });
}

/** @param {unknown} body */
const post = (body) => fetch(`${base}/api/search`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('GET /api/claims returns the corpus claims', async () => {
  const response = await fetch(`${base}/api/claims`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  const claims = await response.json();
  assert.equal(claims.length, (await loadCorpus()).claims.length);
});

test('GET /api/sources returns the corpus sources', async () => {
  const response = await fetch(`${base}/api/sources`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, (await loadCorpus()).sources.length);
});

test('POST /api/search abstains on a draft topic and does not leak the draft as an answer', async () => {
  const response = await post({ question: 'Who built the pyramids at Giza?' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.abstained, true);
  assert.deepEqual(result.citations, []);
  assert.ok(result.matches.some((/** @type {{ id: string }} */ m) => m.id === 'claim_giza_builders'));
});

test('POST /api/search abstains with no matches for an unrelated question', async () => {
  const result = await (await post({ question: 'What is the capital of France?' })).json();
  assert.equal(result.abstained, true);
  assert.deepEqual(result.matches, []);
});

test('POST /api/search treats a missing question as empty and abstains', async () => {
  const response = await post({});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).abstained, true);
});

test('POST /api/search rejects invalid JSON with 400', async () => {
  const response = await post('{not json');
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Invalid JSON request');
});

test('POST /api/search rejects a non-string question with 400', async () => {
  assert.equal((await post({ question: 42 })).status, 400);
  assert.equal((await post({ question: ['a'] })).status, 400);
});

test('POST /api/search rejects an oversized body with 413', async () => {
  const response = await post({ question: 'x'.repeat(MAX_BODY_BYTES + 1) });
  assert.equal(response.status, 413);
});

test('serves the frontend at / and static assets', async () => {
  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await index.text(), /inzulolwazi/);
  assert.equal((await fetch(`${base}/styles.css`)).status, 200);
  assert.equal((await fetch(`${base}/app.js`)).status, 200);
});

test('does not serve files outside the frontend folder', async () => {
  for (const rawPath of ['/..%2fpackage.json', '/%2e%2e/package.json', '/..%2f..%2fcontent%2fclaims.json', '/..%2f.git%2fconfig']) {
    assert.equal(await rawGet(rawPath), 404, rawPath);
  }
});

test('unknown routes and wrong methods return 404', async () => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/claims`, { method: 'POST' })).status, 404);
});
