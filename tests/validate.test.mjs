import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCorpus } from '../backend/validate/content.mjs';
import { makeClaim, makeCorpus, makeSources } from './fixtures.mjs';

/** @param {any} corpus */
const errorsOf = (corpus) => validateCorpus(corpus).errors;
/** @param {string[]} list @param {RegExp} pattern */
const hasMatch = (list, pattern) => list.some((line) => pattern.test(line));

test('a well-formed corpus has no errors or warnings', () => {
  const { errors, warnings } = validateCorpus(makeCorpus());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('published claims need at least two sources', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a'] })];
  assert.ok(hasMatch(errorsOf(corpus), /at least two evidence entries/));
});

test('published claims need two distinct sources: one source listed twice does not count', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a', 'src_a'] })];
  const errors = errorsOf(corpus);
  assert.ok(hasMatch(errors, /at least two evidence entries/));
  assert.ok(hasMatch(errors, /lists source src_a more than once/));
});

test('a repeated source id is rejected even on a draft claim', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ status: 'draft', grade: 'draft', reviewers: [], sourceIds: ['src_a', 'src_a'] })];
  assert.ok(hasMatch(errorsOf(corpus), /lists source src_a more than once/));
});

test('published claims need reviewer sign-off with name and date', () => {
  const none = makeCorpus();
  none.claims = [makeClaim({ reviewers: [] })];
  assert.ok(hasMatch(errorsOf(none), /reviewer sign-off/));
  const partial = makeCorpus();
  partial.claims = [makeClaim({ reviewers: [{ name: 'Only Name', date: '' }] })];
  assert.ok(hasMatch(errorsOf(partial), /without name and date/));
});

test('published claims need a grade from the fixed set', () => {
  for (const grade of ['draft', 'definitely_true', '']) {
    const corpus = makeCorpus();
    corpus.claims = [makeClaim({ grade })];
    assert.ok(hasMatch(errorsOf(corpus), /grade from the fixed set/), `grade "${grade}" should be rejected`);
  }
});

test('draft claims may keep the draft grade and need no reviewers', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ status: 'draft', grade: 'draft', reviewers: [], sourceIds: ['src_a'] })];
  assert.deepEqual(errorsOf(corpus), []);
});

test('rejects unknown source references', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a', 'src_nope'] })];
  assert.ok(hasMatch(errorsOf(corpus), /unknown source src_nope/));
});

test('does not throw when sourceIds is missing', () => {
  const corpus = makeCorpus();
  const claim = /** @type {any} */ (makeClaim());
  delete claim.sourceIds;
  corpus.claims = [claim];
  assert.ok(hasMatch(errorsOf(corpus), /missing required fields/));
});

test('rejects invalid status and duplicate ids', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ status: /** @type {any} */ ('archived') }), makeClaim()];
  const errors = errorsOf(corpus);
  assert.ok(hasMatch(errors, /invalid status/));
  assert.ok(hasMatch(errors, /duplicated id/));
  const dupSources = { claims: [], sources: [...makeSources(), makeSources()[0]] };
  assert.ok(hasMatch(errorsOf(dupSources), /duplicated/));
});

test('TODO(source) fails validation anywhere, in claims and sources, in any status', () => {
  const inRationale = makeCorpus();
  inRationale.claims = [makeClaim({ status: 'draft', grade: 'draft', reviewers: [], rationale: { en: 'TODO(source) add evidence' } })];
  assert.ok(hasMatch(errorsOf(inRationale), /TODO\(source\)/));
  const inSource = makeCorpus();
  inSource.sources[0].summary = 'TODO(source)';
  assert.ok(hasMatch(errorsOf(inSource), /TODO\(source\)/));
});

test('sources need all required metadata and a valid type and URL', () => {
  const corpus = makeCorpus();
  const source = /** @type {any} */ (corpus.sources[0]);
  delete source.licence;
  source.sourceType = 'blog';
  source.url = 'ftp://example.org';
  const errors = errorsOf(corpus);
  assert.ok(hasMatch(errors, /licence is required/));
  assert.ok(hasMatch(errors, /sourceType is invalid/));
  assert.ok(hasMatch(errors, /url must be http/));
});

test('translations must be labelled machine or human_reviewed, consistently', () => {
  const cases = [
    [{ zu: '', method: 'machine', reviewedBy: null }, /needs a translation\.zu/],
    [{ zu: 'x', method: 'auto', reviewedBy: null }, /translation\.method/],
    [{ zu: 'x', method: 'human_reviewed', reviewedBy: null }, /no reviewedBy/],
    [{ zu: 'x', method: 'machine', reviewedBy: 'Someone' }, /machine but has reviewedBy/],
  ];
  for (const [translation, pattern] of cases) {
    const corpus = makeCorpus();
    corpus.claims = [makeClaim({ translation: /** @type {any} */ (translation) })];
    assert.ok(hasMatch(errorsOf(corpus), /** @type {RegExp} */ (pattern)), String(pattern));
  }
  const missing = makeCorpus();
  const claim = /** @type {any} */ (makeClaim());
  delete claim.translation;
  missing.claims = [claim];
  assert.ok(hasMatch(errorsOf(missing), /needs a translation\.zu/));
});

test('a reviewed translation with a named reviewer is valid', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ translation: { zu: 'x', method: 'human_reviewed', reviewedBy: 'Fluent Reviewer' } })];
  assert.deepEqual(errorsOf(corpus), []);
});

test('oral testimony needs consent, language, place, date and rights holder', () => {
  const corpus = makeCorpus();
  corpus.sources.push({
    id: 'src_oral', title: 'Synthetic testimony', authors: ['Synthetic speaker'], year: 2026, venue: 'Fixture',
    sourceType: 'oral_testimony', licence: 'permission', url: 'https://example.org/o', summary: 'Synthetic.',
  });
  const errors = errorsOf(corpus);
  for (const field of ['consent', 'language', 'place', 'date', 'rightsHolder']) {
    assert.ok(hasMatch(errors, new RegExp(`needs ${field} recorded`)), field);
  }
});

test('oral testimony is rejected unless consent is granted (AGENTS.md rule 17)', () => {
  const oral = {
    id: 'src_oral', title: 'Synthetic testimony', authors: ['Synthetic speaker'], year: 2026, venue: 'Fixture',
    sourceType: 'oral_testimony', licence: 'permission', url: 'https://example.org/o', summary: 'Synthetic.',
    language: 'zu', place: 'Synthetic place', date: '2026-01-01', rightsHolder: 'Synthetic family',
  };
  for (const consent of [{ status: 'withheld' }, { status: 'pending' }, { status: '' }]) {
    const corpus = makeCorpus();
    corpus.sources.push(/** @type {any} */ ({ ...oral, consent }));
    assert.ok(hasMatch(errorsOf(corpus), /consent status must be "granted"/), `consent "${consent.status}" should be rejected`);
  }
  const granted = makeCorpus();
  granted.sources.push(/** @type {any} */ ({ ...oral, consent: { status: 'granted', recordedOn: '2026-01-01' } }));
  assert.deepEqual(errorsOf(granted), []);
});

test('contested terms need a term note: warning for drafts, error for published', () => {
  const draft = makeCorpus();
  draft.claims = [makeClaim({ status: 'draft', grade: 'draft', reviewers: [], topic: 'Language history and Bantu' })];
  const draftResult = validateCorpus(draft);
  assert.deepEqual(draftResult.errors, []);
  assert.ok(hasMatch(draftResult.warnings, /"Bantu".*term-history note/));

  const published = makeCorpus();
  published.claims = [makeClaim({ statement: { en: 'The Khoisan label is a later construct.' } })];
  assert.ok(hasMatch(errorsOf(published), /"Khoisan".*term-history note/));

  const noted = makeCorpus();
  noted.claims = [makeClaim({ statement: { en: 'The Khoesan label is a later construct.' }, termNotes: ['term_khoisan'] })];
  const notedResult = validateCorpus(noted);
  assert.deepEqual(notedResult.errors, []);
  assert.ok(!hasMatch(notedResult.warnings, /term-history note/));
});

test('warns about sources no claim uses', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim()];
  assert.ok(hasMatch(validateCorpus(corpus).warnings, /src_c is not used/));
});
