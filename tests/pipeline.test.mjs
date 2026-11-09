import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answer, compose, ground, loadCorpus, MAX_MATCHES, retrieve } from '../backend/pipeline.mjs';
import { makeClaim, makeCorpus } from './fixtures.mjs';

test('answers a published, two-source claim with numbered citations', () => {
  const result = answer('Who built the pyramids?', makeCorpus());
  assert.equal(result.abstained, false);
  assert.match(result.answer, /Synthetic statement about the pyramids test topic\. \[1\]/);
  assert.deepEqual(result.citations.map((c) => [c.number, c.id]), [[1, 'src_a'], [1, 'src_b']]);
});

test('numbers citations per claim when several claims answer', () => {
  const result = answer('pyramids and trade at zimbabwe', makeCorpus());
  assert.equal(result.abstained, false);
  assert.match(result.answer, /\[1\]/);
  assert.match(result.answer, /\[2\]/);
  const numbers = new Set(result.citations.map((c) => c.number));
  assert.deepEqual([...numbers].sort(), [1, 2]);
});

test('every citation number in the answer has a matching citation (cite or abstain)', () => {
  const result = answer('pyramids and trade at zimbabwe', makeCorpus());
  const used = [...result.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  assert.ok(used.length > 0);
  for (const n of used) assert.ok(result.citations.some((c) => c.number === n), `citation ${n} missing`);
});

test('abstains with no matches when nothing in the corpus is relevant', () => {
  const result = answer('What is the capital of France?', makeCorpus());
  assert.equal(result.abstained, true);
  assert.equal(result.answer, "We don't have a source for this yet.");
  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.matches, []);
});

test('abstains on an empty or stop-word-only question', () => {
  assert.equal(answer('', makeCorpus()).abstained, true);
  assert.equal(answer('what is the', makeCorpus()).abstained, true);
});

test('never answers from a draft claim, even with two sources', () => {
  const result = answer('draftword unreviewed', makeCorpus());
  assert.equal(result.abstained, true);
  assert.equal(result.citations.length, 0);
  assert.ok(!result.answer.includes('Synthetic draft statement'));
  assert.equal(result.matches[0].id, 'claim_draft');
  assert.equal(result.matches[0].answer, null);
});

test('never answers from a published claim with fewer than two sources', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a'] })];
  const result = answer('pyramids', corpus);
  assert.equal(result.abstained, true);
  assert.equal(result.matches[0].answer, null);
});

test('ignores source ids that are not in the corpus when counting evidence', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a', 'src_missing'] })];
  const result = answer('pyramids', corpus);
  assert.equal(result.abstained, true);
});

test('counts distinct sources: one source listed twice is not two pieces of evidence (AGENTS.md rule 2)', () => {
  const corpus = makeCorpus();
  corpus.claims = [makeClaim({ sourceIds: ['src_a', 'src_a'] })];
  const result = answer('pyramids', corpus);
  assert.equal(result.abstained, true);
  assert.equal(result.matches[0].answer, null);
  assert.deepEqual(result.matches[0].sources.map((s) => s.id), ['src_a']);
});

test('returns at most MAX_MATCHES claims', () => {
  const corpus = makeCorpus();
  corpus.claims = ['a', 'b', 'c', 'd', 'e'].map((id) => makeClaim({ id: `claim_${id}`, keywords: ['shared', 'topic'] }));
  assert.ok(retrieve('shared topic', corpus.claims).length <= MAX_MATCHES);
});

test('retrieves by isiZulu keywords', () => {
  const matches = retrieve('amaphiramidi', makeCorpus().claims);
  assert.equal(matches[0].claim.id, 'claim_pyramids');
});

test('stages compose: ground then compose equals answer', () => {
  const corpus = makeCorpus();
  const question = 'pyramids and trade at zimbabwe';
  assert.deepEqual(answer(question, corpus), compose(ground(retrieve(question, corpus.claims), corpus)));
});

test('ground attaches sources in the order listed on the claim', () => {
  const corpus = makeCorpus();
  const [grounded] = ground(retrieve('pyramids', corpus.claims), corpus);
  assert.deepEqual(grounded.sources.map((s) => s.id), ['src_a', 'src_b']);
});

test('real corpus: all draft claims are retrievable but never answered', async () => {
  const corpus = await loadCorpus();
  for (const claim of corpus.claims.filter((c) => c.status === 'draft')) {
    const result = answer(claim.keywords.slice(0, 3).join(' '), corpus);
    assert.equal(result.abstained, true, `${claim.id} must abstain while draft`);
    assert.equal(result.citations.length, 0);
    assert.ok(!result.answer.includes(claim.statement.en), `${claim.id} statement leaked into the answer`);
    assert.ok(result.matches.some((m) => m.id === claim.id), `${claim.id} should still be retrieved`);
  }
});

test('real corpus: isiZulu question retrieves the Giza claim', async () => {
  const corpus = await loadCorpus();
  const result = answer('Obani abakha amaphiramidi aseGiza?', corpus);
  assert.ok(result.matches.some((m) => m.id === 'claim_giza_builders'));
});
