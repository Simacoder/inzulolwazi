import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkQuestions, evaluateQuestion, groundedness, parseQuestions, renderMarkdown, summarise, translationReviewCsv } from '../eval/run.mjs';
import { answer, loadCorpus } from '../backend/pipeline.mjs';
import { makeClaim, makeCorpus } from './fixtures.mjs';

/** @param {Record<string, unknown>} fields */
const q = (fields) => /** @type {any} */ ({
  id: 'q1', claim: 'claim_pyramids', language: 'en', question: 'Who built the pyramids?', expected: 'answer', ...fields,
});

test('groundedness: every sentence cited and resolvable scores fully', () => {
  const corpus = makeCorpus();
  const result = answer('pyramids and trade at zimbabwe', corpus);
  const g = groundedness(result, corpus);
  assert.ok(g);
  assert.equal(g.sentences, 2);
  assert.equal(g.grounded, 2);
});

test('groundedness: a sentence without a citation marker is not grounded', () => {
  const corpus = makeCorpus();
  const result = answer('Who built the pyramids?', corpus);
  result.answer += ' An extra claim with no citation.';
  const g = groundedness(result, corpus);
  assert.ok(g);
  assert.equal(g.sentences, 2);
  assert.equal(g.grounded, 1);
});

test('groundedness: a marker with no matching citation is not grounded', () => {
  const corpus = makeCorpus();
  const result = answer('Who built the pyramids?', corpus);
  result.citations = [];
  assert.equal(groundedness(result, corpus)?.grounded, 0);
});

test('groundedness: a citation pointing at a source outside the corpus is not grounded', () => {
  const corpus = makeCorpus();
  const result = answer('Who built the pyramids?', corpus);
  result.citations = result.citations.map((c) => ({ ...c, id: 'src_invented' }));
  assert.equal(groundedness(result, corpus)?.grounded, 0);
});

test('groundedness: abstentions are not scored', () => {
  const corpus = makeCorpus();
  assert.equal(groundedness(answer('What is the capital of France?', corpus), corpus), null);
});

test('expectation "answer" passes for a published, cited claim', () => {
  const r = evaluateQuestion(q({}), makeCorpus());
  assert.equal(r.status, 'pass');
  assert.equal(r.abstained, false);
});

test('expectation "answer" fails when the app abstains', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ status: 'draft', grade: 'draft', reviewers: [] })];
  const r = evaluateQuestion(q({}), corpus);
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /abstained/);
});

test('expectation "abstain_until_claim_reviewed" fails if a draft is answered', () => {
  const r = evaluateQuestion(q({ expected: 'abstain_until_claim_reviewed' }), makeCorpus());
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /not reviewed/);
});

test('expectation "abstain_until_claim_reviewed" passes when the draft is retrieved and withheld', () => {
  const r = evaluateQuestion(q({ claim: 'claim_draft', question: 'draftword unreviewed', expected: 'abstain_until_claim_reviewed' }), makeCorpus());
  assert.equal(r.status, 'pass');
  assert.equal(r.retrieved, true);
});

test('expectation "abstain_until_claim_reviewed" fails if the claim is not even retrieved', () => {
  const r = evaluateQuestion(q({ claim: 'claim_draft', question: 'What is the capital of France?', expected: 'abstain_until_claim_reviewed' }), makeCorpus());
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /did not retrieve/);
});

test('expectation "abstain_no_matching_source" fails on any retrieved claim', () => {
  const unrelated = evaluateQuestion(q({ claim: null, question: 'What is the capital of France?', expected: 'abstain_no_matching_source' }), makeCorpus());
  assert.equal(unrelated.status, 'pass');
  const matched = evaluateQuestion(q({ claim: null, question: 'Who built the pyramids?', expected: 'abstain_no_matching_source' }), makeCorpus());
  assert.equal(matched.status, 'fail');
});

test('known_issue downgrades a failure, and a passing known issue is flagged as stale', () => {
  const failing = evaluateQuestion(q({ claim: null, question: 'Who built the pyramids?', expected: 'abstain_no_matching_source', known_issue: 'tracked' }), makeCorpus());
  assert.equal(failing.status, 'known_issue');
  const passing = evaluateQuestion(q({ claim: null, question: 'What is the capital of France?', expected: 'abstain_no_matching_source', known_issue: 'tracked' }), makeCorpus());
  assert.equal(passing.status, 'stale_known_issue');
});

test('checkQuestions catches malformed evaluation sets', () => {
  const corpus = makeCorpus();
  const bad = /** @type {any[]} */ ([
    q({ id: 'dup' }), q({ id: 'dup' }),
    q({ id: 'lang', language: 'fr' }),
    q({ id: 'exp', expected: 'maybe' }),
    q({ id: 'claim', claim: 'claim_unknown' }),
    q({ id: 'noclaim', claim: null, expected: 'answer' }),
    { id: 'empty', claim: null, language: 'en', question: ' ', expected: 'abstain_no_matching_source' },
  ]);
  const errors = checkQuestions(bad, corpus).join('\n');
  for (const pattern of [/duplicated id/, /invalid language/, /invalid expected/, /unknown claim/, /names no claim/, /needs an id and a question/]) {
    assert.match(errors, pattern);
  }
  assert.deepEqual(checkQuestions([q({})], corpus), []);
});

test('summarise keeps languages separate and does not blend them', () => {
  const corpus = makeCorpus();
  const results = [
    evaluateQuestion(q({ id: 'a', language: 'en' }), corpus),
    evaluateQuestion(q({ id: 'b', language: 'zu', question: 'amaphiramidi' }), corpus),
    evaluateQuestion(q({ id: 'c', language: 'zu', claim: null, question: 'What is the capital of France?', expected: 'abstain_no_matching_source' }), corpus),
  ];
  const summary = summarise(results);
  assert.deepEqual(summary.byLanguage.map((row) => [row.language, row.questions]), [['en', 1], ['zu', 2]]);
  assert.equal(summary.total.questions, 3);
  assert.ok(summary.byClaim.some((row) => row.claim === 'claim_pyramids' && row.language === 'zu'));
});

test('report says "not measured", not 100%, when nothing has been answered', async () => {
  const corpus = await loadCorpus();
  const questions = parseQuestions(await readFile(new URL('../eval/questions.yaml', import.meta.url), 'utf8'));
  const results = questions.map((item) => evaluateQuestion(item, corpus));
  const markdown = renderMarkdown({ results, summary: summarise(results), corpus });
  assert.match(markdown, /not measured/);
  assert.match(markdown, /\| 0 \| n\/a \|/, 'the grounded-sentences column must read n/a when no answers exist');
  assert.doesNotMatch(markdown, /\d{4}-\d{2}-\d{2}T/, 'the tracked report must not contain timestamps');
});

test('translation review sheet lists unreviewed claims and escapes quotes', () => {
  const corpus = makeCorpus();
  corpus.claims[0] = makeClaim({ statement: { en: 'He said "hello", then left.' } });
  corpus.claims[1] = makeClaim({ id: 'claim_done', translation: { zu: 'x', method: 'human_reviewed', reviewedBy: 'Reviewer' } });
  const csv = translationReviewCsv(corpus);
  assert.match(csv, /"He said ""hello"", then left\."/);
  assert.ok(!csv.includes('claim_done'));
  assert.equal(csv.trim().split('\n').length, 1 + 2);
});

test('the repo evaluation set is well formed and covers both languages', async () => {
  const corpus = await loadCorpus();
  const questions = parseQuestions(await readFile(new URL('../eval/questions.yaml', import.meta.url), 'utf8'));
  assert.deepEqual(checkQuestions(questions, corpus), []);
  assert.ok(questions.some((item) => item.language === 'en'));
  assert.ok(questions.some((item) => item.language === 'zu'));
  assert.ok(questions.some((item) => item.expected === 'abstain_no_matching_source'));
});

test('the repo evaluation set has no failing questions', async () => {
  const corpus = await loadCorpus();
  const questions = parseQuestions(await readFile(new URL('../eval/questions.yaml', import.meta.url), 'utf8'));
  const failures = questions.map((item) => evaluateQuestion(item, corpus)).filter((r) => r.status === 'fail');
  assert.deepEqual(failures.map((r) => `${r.id}: ${r.reason}`), []);
});
