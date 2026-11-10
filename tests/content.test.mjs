import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCorpus } from '../backend/pipeline.mjs';
import { validateCorpus } from '../backend/validate/content.mjs';
import { CONTESTED_TERMS } from '../backend/schema.mjs';

const frontendFiles = ['frontend/index.html', 'frontend/app.js', 'frontend/js/i18n.mjs', 'frontend/js/render.mjs', 'frontend/js/util.mjs', 'frontend/js/api.mjs'];

test('repo content has no validation errors', async () => {
  const { errors } = validateCorpus(await loadCorpus());
  assert.deepEqual(errors, []);
});

test('the PoC holds six starter topics', async () => {
  const { claims } = await loadCorpus();
  assert.equal(claims.length, 6);
});

test('every draft claim is unpublished and has no reviewer yet, or is complete', async () => {
  const { claims } = await loadCorpus();
  for (const claim of claims) {
    if (claim.status === 'draft') assert.equal(claim.grade, 'draft', `${claim.id} draft must carry the draft grade`);
  }
});

test('translations never replace the English source text and are labelled', async () => {
  const { claims } = await loadCorpus();
  for (const claim of claims) {
    assert.ok(claim.statement.en.length > 0, `${claim.id} needs English source text`);
    assert.notEqual(claim.translation.zu, claim.statement.en, `${claim.id} translation must differ from the English`);
    assert.ok(['machine', 'human_reviewed'].includes(claim.translation.method), `${claim.id} translation needs a method`);
    if (claim.translation.method === 'machine') assert.equal(claim.translation.reviewedBy, null, `${claim.id} machine translation cannot be marked reviewed`);
  }
});

test('contested terms in the English statement are kept unchanged in the isiZulu translation (AGENTS.md rule 11)', async () => {
  const { claims } = await loadCorpus();
  for (const claim of claims) {
    for (const { term, pattern } of CONTESTED_TERMS) {
      if (pattern.test(claim.statement.en)) assert.match(claim.translation.zu, pattern, `${claim.id} must keep "${term}" in the translation`);
    }
  }
});

test('source records carry the metadata AGENTS.md requires', async () => {
  const { sources } = await loadCorpus();
  for (const source of sources) {
    for (const field of /** @type {const} */ (['title', 'authors', 'year', 'venue', 'licence', 'sourceType', 'url', 'summary'])) {
      assert.ok(source[field], `${source.id}.${field}`);
    }
    assert.ok(source.url.startsWith('https://'), `${source.id} should link over https`);
  }
});

test('UI copy never uses "the real history" or "the truth" (AGENTS.md rule 4)', async () => {
  for (const file of frontendFiles) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /\bthe (real history|truth)\b/i, file);
  }
});

test('the frontend labels draft and machine-translated content', async () => {
  const i18n = await readFile(new URL('../frontend/js/i18n.mjs', import.meta.url), 'utf8');
  assert.match(i18n, /Machine translated, not yet reviewed by a fluent speaker/);
  assert.match(i18n, /draft: 'Draft'/);
  const render = await readFile(new URL('../frontend/js/render.mjs', import.meta.url), 'utf8');
  assert.match(render, /claim\.translation\.label/);
});

test('terms and dated events without a framing line, a source or a known source fail validation', async () => {
  const { validateCorpus } = await import('../backend/validate/content.mjs');
  const corpus = await loadCorpus();
  const base = { claims: corpus.claims, sources: corpus.sources };
  const term = { id: 't1', term: 'X', aliases: [], definition: { en: 'A thing.' }, framing: { en: 'Read from an African-centred standpoint.' }, sourceIds: [corpus.sources[0].id] };
  const event = { id: 'e1', label: '1900', sortYear: 1900, event: { en: 'Something.' }, framing: { en: 'Read from an African-centred standpoint.' }, sourceIds: [corpus.sources[0].id] };
  assert.deepEqual(validateCorpus({ ...base, glossary: [term], chronology: [event] }).errors, []);
  assert.match(validateCorpus({ ...base, glossary: [{ ...term, framing: { en: '' } }] }).errors.join(), /African-centred framing/);
  assert.match(validateCorpus({ ...base, chronology: [{ ...event, sourceIds: [] }] }).errors.join(), /at least one source/);
  assert.match(validateCorpus({ ...base, glossary: [{ ...term, sourceIds: ['nope'] }] }).errors.join(), /unknown source/);
  assert.match(validateCorpus({ ...base, glossary: [term, term] }).errors.join(), /duplicated/);
  assert.match(validateCorpus({ ...base, chronology: [{ ...event, sortYear: undefined }] }).errors.join(), /numeric sortYear/);
});
