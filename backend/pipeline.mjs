import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rankDocuments } from '../ml/tfidf.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const contentPath = path.join(root, '..', 'content', 'claims.json');
const sourcePath = path.join(root, '..', 'content', 'sources.json');

export async function loadCorpus() {
  const [claims, sources] = await Promise.all([
    readFile(contentPath, 'utf8').then(JSON.parse),
    readFile(sourcePath, 'utf8').then(JSON.parse),
  ]);
  return { claims, sources };
}

export function retrieve(question, claims) {
  const ranked = rankDocuments(question, claims.map((claim) => ({
    id: claim.id,
    text: [claim.topic, claim.statement.en, ...claim.keywords, ...(claim.keywordsZu ?? [])].join(' '),
  })));
  return ranked.filter(({ score }) => score >= 0.08).slice(0, 3)
    .map(({ id, score }) => ({ claim: claims.find((claim) => claim.id === id), score }));
}

export function answer(question, corpus) {
  const matches = retrieve(question, corpus.claims);
  if (!matches.length) {
    return { abstained: true, answer: "We don't have a source for this yet.", citations: [], matches: [] };
  }
  const results = matches.map(({ claim }) => {
    const linked = claim.sourceIds.map((id) => corpus.sources.find((source) => source.id === id)).filter(Boolean);
    return {
      id: claim.id,
      statement: claim.statement.en,
      status: claim.status,
      grade: claim.grade,
      rationale: claim.rationale.en,
      sources: linked,
      answer: claim.status === 'published' && linked.length >= 2 ? claim.statement.en : null,
    };
  });
  const approved = results.filter((item) => item.answer);
  if (!approved.length) {
    return { abstained: true, answer: "We don't have a reviewed, source-backed answer for this topic yet.", citations: [], matches: results };
  }
  return {
    abstained: false,
    answer: approved.map((item, i) => `${item.answer} [${i + 1}]`).join(' '),
    citations: approved.flatMap((item, i) => item.sources.map((source) => ({ number: i + 1, ...source }))),
    matches: results,
  };
}
