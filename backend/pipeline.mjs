import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rankDocuments } from '../ml/tfidf.mjs';

/** @typedef {import('./types.js').Corpus} Corpus */
/** @typedef {import('./types.js').Claim} Claim */
/** @typedef {import('./types.js').RankedClaim} RankedClaim */
/** @typedef {import('./types.js').GroundedClaim} GroundedClaim */
/** @typedef {import('./types.js').AnswerResult} AnswerResult */

const root = path.dirname(fileURLToPath(import.meta.url));
const contentPath = path.join(root, '..', 'content', 'claims.json');
const sourcePath = path.join(root, '..', 'content', 'sources.json');
const glossaryPath = path.join(root, '..', 'content', 'glossary.json');
const chronologyPath = path.join(root, '..', 'content', 'chronology.json');

/** Minimum cosine score for a claim to count as a retrieval match. */
export const RETRIEVAL_THRESHOLD = 0.08;
/** Maximum number of matched claims returned for one question. */
export const MAX_MATCHES = 3;

/** @returns {Promise<Corpus>} */
export async function loadCorpus() {
  const [claims, sources, glossary, chronology] = await Promise.all([
    readFile(contentPath, 'utf8').then(JSON.parse),
    readFile(sourcePath, 'utf8').then(JSON.parse),
    readFile(glossaryPath, 'utf8').then(JSON.parse),
    readFile(chronologyPath, 'utf8').then(JSON.parse),
  ]);
  return { claims, sources, glossary, chronology };
}

/**
 * Stage 1: retrieve candidate claims for a question.
 * @param {string} question
 * @param {Claim[]} claims
 * @returns {RankedClaim[]}
 */
export function retrieve(question, claims) {
  const ranked = rankDocuments(question, claims.map((claim) => ({
    id: claim.id,
    text: [claim.topic, claim.statement.en, ...claim.keywords, ...(claim.keywordsZu ?? [])].join(' '),
  })));
  /** @type {RankedClaim[]} */
  const matches = [];
  for (const { id, score } of ranked.filter((item) => item.score >= RETRIEVAL_THRESHOLD).slice(0, MAX_MATCHES)) {
    const claim = claims.find((item) => item.id === id);
    if (claim) matches.push({ claim, score });
  }
  return matches;
}

/**
 * The corpus sources a claim cites, each counted once.
 * Distinct ids only: one source listed twice must not count as two pieces of evidence.
 * @param {{ sourceIds: string[] }} claim
 * @param {Corpus} corpus
 * @returns {import('./types.js').Source[]}
 */
export function linkedSources(claim, corpus) {
  return [...new Set(claim.sourceIds)].flatMap((id) => corpus.sources.filter((source) => source.id === id));
}

/**
 * Stage 2: attach sources and decide which claims may be shown as an answer.
 * A claim is answerable only if it is published and backed by at least two sources.
 * @param {RankedClaim[]} matches
 * @param {Corpus} corpus
 * @returns {GroundedClaim[]}
 */
export function ground(matches, corpus) {
  return matches.map(({ claim }) => {
    const linked = linkedSources(claim, corpus);
    return {
      id: claim.id,
      topic: claim.topic,
      statement: claim.statement.en,
      status: claim.status,
      grade: claim.grade,
      rationale: claim.rationale.en,
      sources: linked,
      answer: claim.status === 'published' && linked.length >= 2 ? claim.statement.en : null,
    };
  });
}

/**
 * Stage 3: compose the cited answer, or abstain.
 * @param {GroundedClaim[]} grounded
 * @returns {AnswerResult}
 */
export function compose(grounded) {
  if (!grounded.length) {
    return { abstained: true, answer: "We don't have a source for this yet.", citations: [], matches: [] };
  }
  const approved = grounded.filter((item) => item.answer);
  if (!approved.length) {
    return { abstained: true, answer: "We don't have a reviewed, source-backed answer for this topic yet.", citations: [], matches: grounded };
  }
  return {
    abstained: false,
    answer: approved.map((item, i) => `${item.answer} [${i + 1}]`).join(' '),
    citations: approved.flatMap((item, i) => item.sources.map((source) => ({ number: i + 1, ...source }))),
    matches: grounded,
  };
}

/**
 * Answer a question from the curated corpus, or abstain.
 * @param {string} question
 * @param {Corpus} corpus
 * @returns {AnswerResult}
 */
export function answer(question, corpus) {
  return compose(ground(retrieve(question, corpus.claims), corpus));
}
