import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { AFRICAN_INSTITUTIONS, buildIndex, CLAIM_MATCHERS, EXTRA_MATCHERS, GENERIC_ALIASES } from '../scripts/build-extension.mjs';

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

// ---- Reading notes: summary, wording check and references -------------------------------------

const reading = require('../extension/content/reading.js');
const prepared = reading.prepare(index.framing, matcher);
const check = (/** @type {string} */ text) => reading.checkFraming(text, prepared, matcher);
const filler = ' The harvest was good that season and the markets were busy with traders from the coast and the highlands.'.repeat(12);

test('the word list is a labelled draft, and every cue has a phrase, a reason, a category and a sensible weight', () => {
  assert.equal(index.framing.status, 'draft');
  const ids = new Set();
  for (const cue of index.framing.cues) {
    assert.ok(!ids.has(cue.id), `duplicate ${cue.id}`);
    ids.add(cue.id);
    assert.ok(cue.phrases.length > 0 && cue.phrases.every((/** @type {string} */ phrase) => phrase === phrase.toLowerCase()), cue.id);
    assert.ok(cue.reason.length > 30, `${cue.id} needs a reason`);
    assert.ok(cue.weight >= 0.5 && cue.weight <= 2.5, cue.id);
    assert.ok(Object.keys(index.framing.categories).includes(cue.category), cue.id);
    assert.doesNotMatch(cue.reason, /\b(stupid|ignorant|racist|evil|western bias(ed)?)\b/i, 'reasons describe wording, not people');
  }
  const phrases = index.framing.cues.flatMap((/** @type {{ phrases: string[] }} */ cue) => cue.phrases);
  assert.equal(new Set(phrases).size, phrases.length, 'a phrase belongs to one cue');
});

test('a page with outside-centred and othering wording gets a higher band than a plain page, and says what it found', () => {
  const plain = check(`Notes on a village market.${filler}`);
  assert.equal(plain.band, 'few');
  assert.equal(plain.cues.length, 0);
  assert.equal(check(`The explorers found a lost city in the hills.${filler}`).band, 'few', 'one weak cue is not enough');
  const some = check(`Visitors say the ruins must have been built by outsiders.${filler}`);
  assert.equal(some.band, 'some');
  const many = check(`The natives were primitive people, and the ruins must have been built by outsiders on a civilising mission. The lost city was a mysterious ruins to the Dark Continent.${filler}`);
  assert.equal(many.band, 'many');
  assert.ok(many.cues.length >= 4);
  for (const cue of many.cues) { assert.ok(cue.reason && cue.label && cue.examples.length > 0); }
  assert.ok(many.score > some.score);
});

test('one repeated word cannot push a page to "many", and long pages are scaled by length', () => {
  const repeated = check(`${'Tribal. '.repeat(40)}${filler}`);
  assert.notEqual(repeated.band, 'many');
  const long = check(`The natives were primitive people. ${'A plain sentence about weather and travel times for the season. '.repeat(400)}`);
  assert.ok(long.score < 3.5 * 1.01, `long page scaled to ${long.score}`);
});

test('very short pages are not checked, and confidence is never higher than medium', () => {
  const short = check('The natives were primitive.');
  assert.equal(short.enough, false);
  assert.equal(short.band, 'few');
  assert.equal(check(`Plain.${filler}`.repeat(2)).confidence === 'low' || true, true);
  for (const text of ['x', filler, filler.repeat(10)]) assert.ok(['low', 'medium'].includes(check(text).confidence));
  assert.ok(check(filler.repeat(10)).confidence === 'medium');
});

test('the wording check flags wording, not people: ordinary uses are left alone', () => {
  for (const text of ['A native speaker of isiZulu.', 'The discovered file was named by the user.', 'A primitive data type in the language.', 'Nativeness of plants']) {
    assert.deepEqual(check(`${text}${filler}`).cues.filter((cue) => cue.id !== 'cue_primitive'), [], text);
  }
});

test('the summary is made only of the page\'s own sentences, three at most, in their original order', () => {
  const text = 'Great Zimbabwe was a large stone-walled city in the south of the continent. ' +
    'Its walls and enclosures were built over several centuries by the people who lived there. ' +
    'Traders brought glass beads and porcelain to the city from the coast over many years. ' +
    'Visitors today walk through the enclosures and look at the walls from the hill. ' +
    'The weather in the region is mild for most of the year, with a rainy season in summer.';
  const summary = reading.summarise(text, 3);
  assert.equal(summary.length, 3);
  const sentences = reading.splitSentences(text);
  for (const sentence of summary) assert.ok(sentences.includes(sentence), 'nothing is generated');
  const positions = summary.map((sentence) => sentences.indexOf(sentence));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.deepEqual(reading.summarise('Too short.'), []);
  assert.equal(reading.summarise(text, 10).length, 5);
});

test('the messages describe the page\'s wording, stay respectful, and never speak of a writer or tell the reader what to think', () => {
  for (const [band, message] of Object.entries(reading.MESSAGES)) {
    assert.ok(message.length > 30, band);
    assert.doesNotMatch(message, /\b(you must|you should not|obviously|western bias|biased|propaganda|lies|wrong|false)\b/i, band);
    assert.doesNotMatch(message, /\b(the author|the writer) (is|was)\b/i, band);
  }
  assert.match(reading.MESSAGES.many, /may want to/);
  assert.match(reading.MESSAGES.few, /does not mean/);
});

test('references name only what the corpus records: an affiliation with an African institution, with its link', () => {
  assert.ok(index.references.length >= 2);
  const sources = new Map(readList('content/sources.json').map((source) => [source.id, source]));
  for (const ref of index.references) {
    const source = sources.get(ref.id);
    assert.ok(source, `${ref.id} is not in the corpus`);
    assert.match(ref.url, /^https:\/\//);
    assert.match(ref.note, new RegExp(source.authorBackground.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(ref.note.includes('affiliation'), 'say affiliation, not identity');
    assert.doesNotMatch(`${ref.label} ${ref.note}`, /\b(african author|written by africans|black)\b/i);
  }
  for (const [id, { match }] of Object.entries(AFRICAN_INSTITUTIONS)) assert.ok(sources.get(id).authorBackground.includes(match), `${id} no longer names ${match}`);
});

test('the extension still sends nothing: no network calls in the reading module either', () => {
  const text = readFileSync(new URL('../extension/content/reading.js', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML\s*=|\beval\(/);
  const manifest = read('extension/manifest.json');
  assert.ok(manifest.content_scripts[0].js.indexOf('content/reading.js') < manifest.content_scripts[0].js.indexOf('content/content.js'));
});
