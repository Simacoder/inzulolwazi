import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { buildIndex, CLAIM_MATCHERS, EXTRA_MATCHERS, GENERIC_ALIASES } from '../scripts/build-extension.mjs';

const require = createRequire(import.meta.url);
const matcher = require('../extension/content/matcher.js');
const read = (/** @type {string} */ file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
/** @type {(file: string) => any[]} */
const readList = (file) => { const data = read(file); return Array.isArray(data) ? data : data.claims; };
/** @type {Record<string, string[]>} */
const extraMatchers = EXTRA_MATCHERS;
const index = buildIndex();
const compiled = matcher.compile(index.entries);
const idsIn = (/** @type {string} */ text) => matcher.summarise(matcher.findMatches(text, compiled)).map((item) => item.id);

test('the extension data is generated from the corpus and is up to date', () => {
  assert.equal(readFileSync(new URL('../extension/data/index.json', import.meta.url), 'utf8'), `${JSON.stringify(index, null, 2)}\n`, 'run npm run build:extension');
  const script = readFileSync(new URL('../extension/data/index.js', import.meta.url), 'utf8');
  assert.ok(script.includes(`globalThis.INZ_DATA = ${JSON.stringify(index)};`));
});

test('every glossary term and every chosen claim is covered, with sources, framing and a link into the app', () => {
  const glossary = readList('content/glossary.json');
  for (const term of glossary) assert.ok(index.entries.some((entry) => entry.id === term.id), `${term.id} missing`);
  for (const claimId of Object.keys(CLAIM_MATCHERS)) assert.ok(index.entries.some((entry) => entry.id === claimId));
  for (const entry of index.entries) {
    assert.ok(entry.matchers.length > 0, entry.id);
    assert.ok(entry.summary.length > 40 && entry.framing.length > 40, `${entry.id} needs a summary and an African-centred reading`);
    assert.ok(entry.sources.length >= 1, `${entry.id} needs at least one source`);
    for (const source of entry.sources) assert.match(source.url, /^https:\/\//);
    assert.match(entry.appPath, /^#\/(claim|glossary)/);
    assert.ok(['term', 'claim'].includes(entry.kind));
  }
});

test('search phrases come from the corpus: glossary terms and aliases, or a claim\'s own keywords', () => {
  const glossary = new Map(readList('content/glossary.json').map((term) => [term.id, term]));
  const claims = new Map(readList('content/claims.json').map((claim) => [claim.id, claim]));
  for (const entry of index.entries.filter((item) => item.kind === 'term')) {
    const term = glossary.get(entry.id);
    const allowed = [term.term, ...term.aliases, ...(extraMatchers[entry.id] ?? [])];
    for (const phrase of entry.matchers) assert.ok(allowed.includes(phrase), `${phrase} is not from ${entry.id}`);
  }
  for (const entry of index.entries.filter((item) => item.kind === 'claim')) {
    const keywords = claims.get(entry.id).keywords.map((/** @type {string} */ word) => word.toLowerCase());
    for (const phrase of entry.matchers) for (const word of phrase.toLowerCase().split(' ')) assert.ok(keywords.includes(word), `${word} is not a keyword of ${entry.id}`);
  }
  for (const entry of index.entries) for (const generic of GENERIC_ALIASES) assert.ok(!entry.matchers.includes(generic), `${generic} is too generic to flag`);
});

test('it finds each loaded term as a whole word, in any case, across line breaks', () => {
  assert.deepEqual(idsIn('Notes on the Bantu peoples.'), ['term_bantu']);
  assert.deepEqual(idsIn('BANTU and bantu'), ['term_bantu']);
  assert.deepEqual(idsIn('the Great\n  Zimbabwe ruins'), ['term_great_zimbabwe_name']);
  assert.deepEqual(idsIn('Khoikhoi and Khoekhoe'), ['term_khoisan']);
  assert.deepEqual(idsIn('The Hamitic hypothesis'), ['term_hamitic_theory']);
  assert.deepEqual(idsIn('Lebombo then Ishango'), ['claim_counting_bones']);
  assert.deepEqual(idsIn('Chancellor Williams wrote'), ['claim_african_centred_history']);
});

test('it does not flag ordinary words, parts of longer words, or the bare country name', () => {
  for (const text of ['Zimbabwe won the match', 'a classification of rocks', 'Bantustan policy', 'Gizah', 'the williams sisters', 'ubantu', 'San Francisco', 'a plain sentence about food']) {
    assert.deepEqual(idsIn(text), [], text);
  }
});

test('the longest phrase wins, positions are exact, and counts are per entry', () => {
  const text = 'Bantu peoples, then Bantu again, and Giza.';
  const matches = matcher.findMatches(text, compiled);
  assert.deepEqual(matches.map((match) => text.slice(match.start, match.end)), ['Bantu peoples', 'Bantu', 'Giza']);
  assert.deepEqual(matcher.summarise(matches), [{ id: 'term_bantu', count: 2 }, { id: 'claim_giza_builders', count: 1 }]);
  assert.deepEqual(matcher.findMatches('', compiled), []);
  assert.deepEqual(matcher.findMatches('anything', matcher.compile([])), []);
});

test('the manifest is Manifest V3 with minimal permissions, no remote code, and every file it names', () => {
  /** @type {{ manifest_version: number, permissions: string[], host_permissions?: string[], content_security_policy: { extension_pages: string }, background: { service_worker: string }, action: { default_popup: string }, icons: Record<string, string>, content_scripts: { js: string[], css: string[], exclude_matches: string[] }[], version: string }} */
  const manifest = read('extension/manifest.json');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['contextMenus', 'storage']);
  assert.equal(manifest.host_permissions, undefined, 'no host permissions are needed');
  assert.match(manifest.content_security_policy.extension_pages, /script-src 'self'/);
  const files = [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap((script) => [...script.js, ...script.css])];
  for (const file of files) assert.ok(existsSync(new URL(`../extension/${file}`, import.meta.url)), `${file} is missing`);
  assert.ok(manifest.content_scripts[0].exclude_matches.some((pattern) => pattern.includes('inzulolwazi-api.onrender.com')), 'the app itself is not scanned');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test('extension text never promises "the truth" or "the real history", and no script loads remote code', () => {
  const files = ['extension/content/content.js', 'extension/popup/popup.html', 'extension/popup/popup.js', 'extension/background.js', 'extension/manifest.json', 'extension/demo/demo.html'];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /\bthe (real history|truth)\b/i, file);
    assert.doesNotMatch(text, /<script[^>]+src="https?:/i, file);
    assert.doesNotMatch(text, /\beval\(|new Function\(|innerHTML\s*=/, `${file} must not inject markup`);
  }
  const content = readFileSync(new URL('../extension/content/content.js', import.meta.url), 'utf8');
  assert.doesNotMatch(content, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket/, 'page text must never be sent anywhere');
});
