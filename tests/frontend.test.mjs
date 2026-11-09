import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, highlight, parseHash, buildHash } from '../frontend/js/util.mjs';
import { STRINGS, t } from '../frontend/js/i18n.mjs';
import * as view from '../frontend/js/render.mjs';
import { loadCorpus } from '../backend/pipeline.mjs';
import { searchView, claimDetailView, listClaims, listSources, metaView, sourceDetailView } from '../backend/views.mjs';
import { buildOpenApi } from '../backend/openapi.mjs';
import { ROUTES } from '../backend/routes.mjs';

test('esc and highlight cannot inject markup', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  const out = highlight('<b>Giza</b> pyramids', ['giza', '<b>']);
  assert.ok(!out.includes('<b>'));
  assert.match(out, /<mark>Giza<\/mark>/);
  assert.equal(highlight('plain', []), 'plain');
});

test('routes survive a round trip, including awkward characters', () => {
  for (const [name, id, query] of [['search', undefined, { q: 'Who built the pyramids? & more' }], ['claim', 'claim_giza_builders', { from: 'a/b' }], ['explore', undefined, { status: 'draft' }]]) {
    const parsed = parseHash(buildHash(/** @type {string} */ (name), /** @type {any} */ (id), /** @type {any} */ (query)));
    assert.equal(parsed.name, name);
    assert.equal(parsed.id, id);
    assert.deepEqual(parsed.query, query);
  }
  assert.equal(parseHash('').name, 'home');
  assert.equal(parseHash('#/nonsense').name, 'notfound');
  assert.equal(parseHash('#/claim/%E0%A4%A').name, 'claim');
});

test('every English string has a type the views can use, and isiZulu only overrides', () => {
  for (const key of Object.keys(STRINGS.zu)) assert.ok(key in STRINGS.en, `zu key ${key} missing in en`);
  assert.equal(t('zu', 'navApi'), t('en', 'navApi'));
});

test('views render with real data, escape it, and keep the required labels', async () => {
  const corpus = await loadCorpus();
  const meta = metaView(corpus, 'https://github.com/Simacoder/inzulolwazi');
  const claims = listClaims(corpus, { sort: 'topic', limit: 50, offset: 0 });
  const sources = listSources(corpus, { sort: 'year', limit: 50, offset: 0 });
  const search = searchView('Who built the pyramids at Giza?', corpus);
  const detail = claimDetailView(corpus.claims[0], corpus);
  const pages = [
    view.homeView('en', meta, claims.items), view.searchPageShell('en', '<script>'), view.searchResultsView('en', search),
    view.searchResultsView('en', searchView('zzzz qqqq', corpus)), view.exploreView('en', meta, { q: '"><svg>' }, claims),
    view.sourcesView('en', meta, {}, sources), view.claimDetailView('en', detail, meta, 'x'), view.sourceDetailView('en', sourceDetailView(corpus.sources[0], corpus)),
    view.methodView('en', meta), view.apiView('en', buildOpenApi(ROUTES, { repository: meta.repository }), meta),
    view.errorView('en', '<b>bad</b>'), view.notFoundView('zu'),
  ];
  for (const html of pages) {
    assert.ok(html.length > 50);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<svg>/i);
    assert.doesNotMatch(html, /\sstyle=/i, 'the CSP forbids inline styles');
    assert.doesNotMatch(html, /\bthe (real history|truth)\b/i);
  }
  const claimHtml = view.claimDetailView('en', detail, meta);
  assert.match(claimHtml, /Machine translated, not yet reviewed by a fluent speaker/);
  assert.match(claimHtml, /English \(source text\)/);
  assert.match(claimHtml, /<meter /);
});

test('a draft result is shown as a research lead, never as an answer', async () => {
  const corpus = await loadCorpus();
  const html = view.searchResultsView('en', searchView('pyramids', corpus));
  assert.match(html, /No reviewed answer yet/);
  assert.doesNotMatch(html, /What the collection can say/);
  assert.match(html, /wording match/);
});

test('the topic chip always has text', async () => {
  const corpus = await loadCorpus();
  for (const claim of corpus.claims) assert.ok(claim.topic.trim().length > 0);
  const { results } = searchView('trade', corpus);
  assert.ok(results.every((r) => r.claim.topic));
});

test('a written term note is shown instead of the pending message', async () => {
  const corpus = await loadCorpus();
  const bantu = corpus.claims.find((c) => c.id === 'claim_bantu_language_history');
  assert.ok(bantu);
  const meta = metaView(corpus, 'https://example.org/repo');
  const html = view.claimDetailView('en', claimDetailView(bantu, corpus), meta);
  assert.match(html, /van der Waal/);
  assert.doesNotMatch(html, /has not been written yet/);
});
