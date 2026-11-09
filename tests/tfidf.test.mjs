import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankDocuments, tokenize } from '../ml/tfidf.mjs';

const docs = [
  { id: 'pyramids', text: 'pyramids giza egypt builders workers tombs' },
  { id: 'trade', text: 'great zimbabwe trade beads porcelain kilwa' },
  { id: 'bones', text: 'lebombo ishango bones notches counting' },
];

test('tokenize drops stop words and single characters and folds case and diacritics', () => {
  assert.deepEqual(tokenize('What is the Café of A Giza?'), ['cafe', 'giza']);
});

test('tokenize tolerates null and non-string input', () => {
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize(undefined), []);
  assert.deepEqual(tokenize(42), ['42']);
});

test('ranks the matching document first', () => {
  const ranked = rankDocuments('Who built the pyramids at Giza?', docs);
  assert.equal(ranked[0].id, 'pyramids');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('returns every document, scored between 0 and 1', () => {
  const ranked = rankDocuments('trade at zimbabwe', docs);
  assert.equal(ranked.length, docs.length);
  for (const { score } of ranked) assert.ok(score >= 0 && score <= 1.000001);
});

test('scores zero for a query with no shared terms', () => {
  const ranked = rankDocuments('capital of france', docs);
  assert.ok(ranked.every(({ score }) => score === 0));
});

test('returns no results for an empty corpus or a query of only stop words', () => {
  assert.deepEqual(rankDocuments('pyramids', []), []);
  assert.deepEqual(rankDocuments('what is the', docs), []);
  assert.deepEqual(rankDocuments('', docs), []);
});

test('matches across diacritics', () => {
  const ranked = rankDocuments('cafe', [{ id: 'a', text: 'café' }, { id: 'b', text: 'tea' }]);
  assert.equal(ranked[0].id, 'a');
  assert.ok(ranked[0].score > 0);
});

test('ranking is deterministic', () => {
  assert.deepEqual(rankDocuments('lebombo bones', docs), rankDocuments('lebombo bones', docs));
});
