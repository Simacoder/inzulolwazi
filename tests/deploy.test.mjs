import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { buildFrontend, contentSecurityPolicy, normaliseApiBase } from '../scripts/build-frontend.mjs';
import { clientAddress, createAppServer } from '../backend/server.mjs';

/** @param {Record<string, string>} headers @param {string} [remote] */
const fakeRequest = (headers, remote = '10.0.0.1') => /** @type {any} */ ({ headers, socket: { remoteAddress: remote } });

test('the API address must be a bare https origin', () => {
  assert.equal(normaliseApiBase('https://api.example.com/'), 'https://api.example.com');
  assert.equal(normaliseApiBase(''), '');
  assert.equal(normaliseApiBase('http://localhost:3000'), 'http://localhost:3000');
  assert.throws(() => normaliseApiBase('http://api.example.com'), /https/);
  assert.throws(() => normaliseApiBase('https://api.example.com/v1'), /origin only/);
  assert.throws(() => normaliseApiBase('not a url'));
});

test('the frontend build writes the API address and a CSP that allows only that address', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'inzulolwazi-dist-'));
  try {
    const result = await buildFrontend({ apiBase: 'https://inzulolwazi-api.onrender.com', out });
    assert.equal(result.apiBase, 'https://inzulolwazi-api.onrender.com');
    assert.match(await readFile(path.join(out, 'js', 'config.mjs'), 'utf8'), /API_BASE = "https:\/\/inzulolwazi-api\.onrender\.com"/);
    const html = await readFile(path.join(out, 'index.html'), 'utf8');
    assert.match(html, /http-equiv="Content-Security-Policy"[^>]*connect-src 'self' https:\/\/inzulolwazi-api\.onrender\.com/);
    assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|connect-src [^;]*\*/);
    assert.ok((await readdir(out)).includes('app.js'));
    assert.ok((await readdir(path.join(out, 'js'))).includes('render.mjs'));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test('without an API address the build stays same-origin', () => {
  assert.doesNotMatch(contentSecurityPolicy(''), /connect-src 'self' /);
  assert.match(contentSecurityPolicy(''), /connect-src 'self';/);
  assert.equal(readFileSync(new URL('../frontend/js/config.mjs', import.meta.url), 'utf8').includes("API_BASE = ''"), true);
});

test('behind a trusted proxy the client is the last X-Forwarded-For entry, and a forged first entry is ignored', () => {
  const request = fakeRequest({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
  assert.equal(clientAddress(request, true), '203.0.113.9');
  assert.equal(clientAddress(request, false), '10.0.0.1');
  assert.equal(clientAddress(fakeRequest({}), true), '10.0.0.1');
});

test('with a trusted proxy, different forwarded clients get separate rate-limit budgets', async () => {
  const server = createAppServer({ rateLimitPerMinute: 2, trustProxy: true, now: () => 5_000_000 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const url = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}/api/v1/health`;
  const get = (/** @type {string} */ ip) => fetch(url, { headers: { 'x-forwarded-for': ip } }).then((r) => r.status);
  try {
    assert.deepEqual([await get('1.1.1.1'), await get('1.1.1.1'), await get('1.1.1.1')], [200, 200, 429]);
    assert.equal(await get('2.2.2.2'), 200);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
});

test('render.yaml describes a web service that binds publicly, trusts the proxy and has a health check', () => {
  const blueprint = parse(readFileSync(new URL('../render.yaml', import.meta.url), 'utf8'));
  const service = blueprint.services[0];
  assert.equal(service.type, 'web');
  assert.equal(service.runtime, 'node');
  assert.equal(service.startCommand, 'npm start');
  assert.equal(service.healthCheckPath, '/api/v1/health');
  const env = Object.fromEntries(service.envVars.map((/** @type {any} */ v) => [v.key, String(v.value)]));
  assert.equal(env.HOST, '0.0.0.0');
  assert.equal(env.TRUST_PROXY, 'true');
  assert.equal(env.NODE_VERSION, '22');
  assert.ok(!JSON.stringify(blueprint).match(/secret|password|token/i), 'no secrets in the blueprint');
});

test('vercel.json builds the static frontend and sets security headers', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.buildCommand, 'npm run build:frontend');
  const names = config.headers.flatMap((/** @type {any} */ h) => h.headers.map((/** @type {any} */ x) => x.key));
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']) assert.ok(names.includes(key), key);
});
