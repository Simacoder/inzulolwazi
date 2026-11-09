const STOP_WORDS = new Set([
  'about', 'after', 'along', 'also', 'and', 'are', 'at', 'by', 'can', 'did', 'do', 'for', 'from', 'have',
  'how', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'their', 'there', 'this', 'to', 'was', 'were', 'what',
  'when', 'where', 'which', 'who', 'why', 'with', 'yet', 'yini', 'yibuphi', 'ukuthi', 'kakhulu', 'lapho', 'uma',
  'ngoba', 'futhi', 'kanye', 'abantu', 'bona', 'ingabe', 'kanjani', 'kuphi', 'ngani', 'leyo', 'lesi',
]);

/**
 * @param {unknown} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return String(text ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

/**
 * @param {string[]} tokens
 * @param {Map<string, number>} inverseDocumentFrequency
 * @returns {Map<string, number>}
 */
function vectorFor(tokens, inverseDocumentFrequency) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  /** @type {Map<string, number>} */
  const vector = new Map();
  for (const [token, count] of counts) vector.set(token, (1 + Math.log(count)) * (inverseDocumentFrequency.get(token) ?? 1));
  return vector;
}

/**
 * Rank curated claim documents with corpus-fitted TF-IDF and cosine similarity.
 * @param {string} query
 * @param {import('../backend/types.js').RankDocument[]} documents
 * @returns {import('../backend/types.js').RankScore[]}
 */
export function rankDocuments(query, documents) {
  if (!documents.length) return [];
  const tokenizedDocs = documents.map((document) => ({ document, tokens: tokenize(document.text) }));
  /** @type {Map<string, number>} */
  const documentFrequency = new Map();
  for (const { tokens } of tokenizedDocs) for (const token of new Set(tokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  const inverseDocumentFrequency = new Map([...documentFrequency].map(([term, frequency]) => [term, Math.log(1 + documents.length / (1 + frequency)) + 1]));
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];
  const queryVector = vectorFor(queryTokens, inverseDocumentFrequency);
  const queryNorm = Math.sqrt([...queryVector.values()].reduce((sum, weight) => sum + weight * weight, 0));
  return tokenizedDocs.map(({ document, tokens }) => {
    const documentVector = vectorFor(tokens, inverseDocumentFrequency);
    let dot = 0;
    let documentNormSquared = 0;
    for (const [term, weight] of documentVector) {
      documentNormSquared += weight * weight;
      dot += weight * (queryVector.get(term) ?? 0);
    }
    const score = queryNorm && documentNormSquared ? dot / (queryNorm * Math.sqrt(documentNormSquared)) : 0;
    return { id: document.id, score };
  }).sort((a, b) => b.score - a.score);
}
