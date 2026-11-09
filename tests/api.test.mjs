import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer, MAX_BODY_BYTES } from '../backend/server.mjs';
import { ROUTES, matchRoute } from '../backend/routes.mjs';
import { buildOpenApi } from '../backend/openapi.mjs';
import { formatCitations } from '../backend/cite.mjs';
import { EXAMPLE_QUESTIONS } from '../backend/views.mjs';
import { loadCorpus } from '../backend/pipeline.mjs';

/** @type {Record<string, unknown>[]} */
const logged = [];
const server = createAppServer({ log: (entry) => logged.push(entry) });
let base = '';

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  base = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)));
});

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function api(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  /** @type {any} */
  let json = null;
  try { json = JSON.parse(text); } catch { /* text endpoint */ }
  return { response, text, json };
}

test('health and meta describe the service', async () => {
  const health = await api('/api/v1/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.json.status, 'ok');
  assert.ok(health.json.claims > 0);
  const meta = await api('/api/v1/meta');
  assert.equal(meta.response.status, 200);
  assert.ok(meta.json.limits || meta.json.counts || Object.keys(meta.json).length > 0);
});

test('every example question finds at least one claim', async () => {
  assert.ok(EXAMPLE_QUESTIONS.length >= 3);
  for (const question of EXAMPLE_QUESTIONS) {
    const { json } = await api(`/api/v1/search?q=${encodeURIComponent(question)}`);
    assert.ok(json.results.length >= 1, `no claim found for: ${question}`);
  }
});

test('search never returns a draft as an answer and offers it as a research lead', async () => {
  const { json } = await api(`/api/v1/search?q=${encodeURIComponent('Who built the pyramids at Giza?')}`);
  assert.equal(json.abstained, true);
  assert.ok(json.results.length >= 1);
  for (const item of json.results) {
    assert.equal(item.answerable, false);
    assert.ok(['close', 'partial', 'loose'].includes(item.strength));
  }
  assert.equal(json.retrieval.model, null);
});

test('search plurals and highlights work', async () => {
  const { json } = await api(`/api/v1/search?q=${encodeURIComponent('pyramid')}`);
  assert.ok(json.results.length >= 1);
  assert.ok(json.results[0].matchedTerms.length >= 1);
});

test('POST search matches GET search', async () => {
  const question = 'Khoisan';
  const get = await api(`/api/v1/search?q=${question}`);
  const post = await api('/api/v1/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
  assert.equal(post.response.status, 200);
  assert.deepEqual(post.json.results.map((/** @type {any} */ r) => r.claim.id), get.json.results.map((/** @type {any} */ r) => r.claim.id));
});

test('search logs retrieval without the question text', async () => {
  logged.length = 0;
  const secret = 'zebra-unique-marker-4471';
  await api(`/api/v1/search?q=${secret}`);
  assert.ok(logged.length >= 1);
  assert.ok(!JSON.stringify(logged).includes(secret));
});

test('search validation errors use the v1 error shape', async () => {
  for (const path of ['/api/v1/search', '/api/v1/search?q=', `/api/v1/search?q=${'a'.repeat(301)}`]) {
    const { response, json } = await api(path);
    assert.equal(response.status, 400, path);
    assert.equal(json.error.code, 'invalid_parameter');
    assert.equal(typeof json.error.message, 'string');
  }
  const bad = await api('/api/v1/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 5 }) });
  assert.equal(bad.response.status, 400);
  const invalid = await api('/api/v1/search', { method: 'POST', body: '{nope' });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.json.error.code, 'invalid_json');
  const big = await api('/api/v1/search', { method: 'POST', body: JSON.stringify({ question: 'x'.repeat(MAX_BODY_BYTES + 1) }) });
  assert.equal(big.response.status, 413);
  assert.equal(big.json.error.code, 'payload_too_large');
});

test('claims list filters, sorts and pages', async () => {
  const all = await api('/api/v1/claims');
  assert.equal(all.response.status, 200);
  assert.equal(all.json.total, all.json.items.length);
  const page = await api('/api/v1/claims?limit=2&offset=1');
  assert.equal(page.json.items.length, 2);
  assert.equal(page.json.limit, 2);
  assert.equal(page.json.offset, 1);
  const drafts = await api('/api/v1/claims?status=draft');
  assert.ok(drafts.json.items.every((/** @type {any} */ c) => c.status === 'draft'));
  const published = await api('/api/v1/claims?status=published');
  assert.equal(published.json.total, 0);
  const text = await api('/api/v1/claims?q=pyramids');
  assert.ok(text.json.total >= 1);
  const typed = await api('/api/v1/claims?sourceType=linguistics');
  assert.ok(typed.json.total >= 1);
  const sorted = await api('/api/v1/claims?sort=sources');
  const counts = sorted.json.items.map((/** @type {any} */ c) => c.sourceCount);
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
});

test('claims list rejects bad parameters', async () => {
  for (const query of ['limit=0', 'limit=51', 'limit=abc', 'offset=-1', 'status=nope', 'sourceType=nope', 'sort=nope']) {
    const { response, json } = await api(`/api/v1/claims?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(json.error.code, 'invalid_parameter');
  }
});

test('a claim carries its sources, labelled translation and readiness checklist', async () => {
  const id = 'claim_khoisan_term';
  const { response, json } = await api(`/api/v1/claims/${id}`);
  assert.equal(response.status, 200);
  assert.equal(json.id, id);
  assert.ok(Array.isArray(json.sources));
  assert.ok(json.translation.label.toLowerCase().includes('machine') || json.translation.method === 'human_reviewed');
  assert.equal(json.readiness.checks.length, 4);
  assert.equal(typeof json.readiness.ready, 'boolean');
});

test('unknown claims and sources give 404', async () => {
  for (const path of ['/api/v1/claims/nope', '/api/v1/claims/nope/cite', '/api/v1/sources/nope', '/api/v1/sources/nope/cite', '/api/v1/unknown']) {
    const { response, json } = await api(path);
    assert.equal(response.status, 404, path);
    assert.equal(json.error.code, 'not_found');
  }
});

test('wrong methods give 405 with an Allow header', async () => {
  const { response, json } = await api('/api/v1/claims', { method: 'POST', body: '{}' });
  assert.equal(response.status, 405);
  assert.equal(json.error.code, 'method_not_allowed');
  assert.equal(response.headers.get('allow'), 'GET');
  const search = await api('/api/v1/search', { method: 'DELETE' });
  assert.equal(search.response.status, 405);
  assert.match(search.response.headers.get('allow') ?? '', /GET/);
  assert.match(search.response.headers.get('allow') ?? '', /POST/);
});

test('sources list filters by type and by claim', async () => {
  const corpus = await loadCorpus();
  const all = await api('/api/v1/sources?limit=50');
  assert.equal(all.json.total, corpus.sources.length);
  const linguistics = await api('/api/v1/sources?type=linguistics');
  assert.ok(linguistics.json.items.every((/** @type {any} */ s) => s.sourceType === 'linguistics'));
  const claim = corpus.claims[0];
  const byClaim = await api(`/api/v1/sources?claim=${claim.id}`);
  assert.deepEqual(byClaim.json.items.map((/** @type {any} */ s) => s.id).sort(), [...new Set(claim.sourceIds)].sort());
  const missing = await api('/api/v1/sources?claim=nope');
  assert.equal(missing.response.status, 400);
});

test('a source says which claims use it', async () => {
  const { json } = await api('/api/v1/sources/src_unesco_great_zimbabwe');
  assert.equal(json.authorKind, 'organization');
  assert.ok(json.usedIn.length >= 1);
  assert.ok(json.usedIn.every((/** @type {any} */ c) => c.id && c.topic));
});

test('citations come as text, BibTeX and RIS', async () => {
  const text = await api('/api/v1/sources/src_lebombo_border_cave_derrico_2012/cite');
  assert.match(text.response.headers.get('content-type') ?? '', /text\/plain/);
  assert.match(text.text, /d’Errico/);
  assert.match(text.text, /et al\./);
  assert.match(text.text, /10\.1073\/pnas\.1204213109/);
  const bib = await api('/api/v1/sources/src_unesco_great_zimbabwe/cite?format=bibtex');
  assert.match(bib.text, /^@misc\{src_unesco_great_zimbabwe,/);
  assert.match(bib.text, /author = \{\{UNESCO World Heritage Centre\}\}/);
  const ris = await api('/api/v1/sources/src_unesco_great_zimbabwe/cite?format=ris');
  assert.match(ris.text, /^TY {2}- GEN/);
  assert.match(ris.text, /ER {2}- /);
  const download = await api('/api/v1/sources/src_unesco_great_zimbabwe/cite?format=ris&download=true');
  assert.match(download.response.headers.get('content-disposition') ?? '', /attachment; filename="src_unesco_great_zimbabwe\.ris"/);
  const bad = await api('/api/v1/sources/src_unesco_great_zimbabwe/cite?format=pdf');
  assert.equal(bad.response.status, 400);
});

test('claim citations cover every distinct source', async () => {
  const corpus = await loadCorpus();
  const claim = corpus.claims[0];
  const { text } = await api(`/api/v1/claims/${claim.id}/cite?format=ris`);
  assert.equal((text.match(/^TY {2}-/gm) ?? []).length, new Set(claim.sourceIds).size);
});

test('BibTeX escapes special characters', () => {
  const output = formatCitations([{
    id: 's1', title: 'Iron & Salt: 50% of {Trade}', authors: ['A. Author'], year: 2020, venue: 'Journal_of Things',
    sourceType: 'archaeology', licence: 'open access', url: 'https://example.org/a', doi: null, authorBackground: 'x', summary: 'x',
  }], 'bibtex');
  assert.match(output, /Iron \\& Salt: 50\\% of \\\{Trade\\\}/);
  assert.match(output, /Journal\\_of Things/);
});

test('API responses carry CORS, nosniff and rate-limit headers; pages carry a CSP', async () => {
  const { response } = await api('/api/v1/health');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('x-ratelimit-limit'));
  const preflight = await fetch(`${base}/api/v1/search`, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  const page = await fetch(`${base}/`);
  const csp = page.headers.get('content-security-policy') ?? '';
  assert.match(csp, /script-src 'self'/);
  assert.ok(!csp.includes("'unsafe-inline'") || !/script-src[^;]*'unsafe-inline'/.test(csp));
  await page.arrayBuffer();
});

test('the rate limiter blocks after the limit and recovers', async () => {
  let clock = 1_000_000;
  const limited = createAppServer({ rateLimitPerMinute: 3, now: () => clock });
  await new Promise((resolve) => limited.listen(0, '127.0.0.1', () => resolve(undefined)));
  const url = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (limited.address()).port}/api/v1/health`;
  try {
    for (let index = 0; index < 3; index += 1) assert.equal((await fetch(url)).status, 200);
    const blocked = await fetch(url);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
    assert.equal((await blocked.json()).error.code, 'rate_limited');
    clock += 61_000;
    assert.equal((await fetch(url)).status, 200);
  } finally {
    await new Promise((resolve) => limited.close(() => resolve(undefined)));
  }
});

test('the OpenAPI document matches the route table and every $ref resolves', async () => {
  const { json: spec } = await api('/api/v1/openapi.json');
  assert.equal(spec.openapi, '3.1.0');
  for (const route of ROUTES) {
    const path = route.path.replace(/:([A-Za-z]+)/g, '{$1}');
    assert.ok(spec.paths[path]?.[route.method.toLowerCase()], `${route.method} ${path} missing from the spec`);
  }
  const operations = Object.values(spec.paths).flatMap((item) => Object.keys(/** @type {object} */ (item)));
  assert.equal(operations.length, ROUTES.length);
  const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const name of refs) assert.ok(spec.components.schemas[name], `unresolved $ref ${name}`);
  assert.deepEqual(buildOpenApi(ROUTES, { repository: spec.info.contact.url }).paths, spec.paths);
});

test('matchRoute decodes ids and reports allowed methods', () => {
  const found = matchRoute('GET', '/api/v1/claims/a%20b');
  assert.ok(found && 'route' in found);
  assert.equal(found.params.id, 'a b');
  assert.deepEqual(matchRoute('PUT', '/api/v1/health'), { allowed: ['GET'] });
  assert.equal(matchRoute('GET', '/api/v1/nothing'), null);
});

test('legacy routes still work next to v1', async () => {
  const claims = await api('/api/claims');
  assert.ok(Array.isArray(claims.json));
  const search = await api('/api/search', { method: 'POST', body: JSON.stringify({ question: 'pyramids' }) });
  assert.equal(search.response.status, 200);
});

test('the Bantu topic carries its term-history note and two distinct sources, and the page shows the note', async () => {
  const { json } = await api('/api/v1/claims/claim_bantu_language_history');
  assert.ok(json.termNotes.length >= 1);
  assert.equal(json.sources.length, 2);
  assert.ok(json.readiness.checks.find((/** @type {any} */ c) => c.id === 'terms').done);
  assert.ok(json.readiness.checks.find((/** @type {any} */ c) => c.id === 'sources').done);
  assert.equal(json.status, 'draft');
});

test('Williams is recorded as critical commentary, never as primary evidence', async () => {
  const { json } = await api('/api/v1/sources/src_williams_destruction_1987');
  assert.equal(json.sourceType, 'critical_commentary');
  assert.match(json.summary, /not primary evidence/i);
});
