/**
 * View models: what the API sends for claims, sources and searches.
 * These add labels, counts and readiness to the stored records without changing them.
 */
import { compose, ground, linkedSources, retrieve, RETRIEVAL_THRESHOLD } from './pipeline.mjs';
import { CONTESTED_TERMS, FEEDBACK_TYPES, GRADES, GRADE_INFO, SOURCE_TYPE_INFO } from './schema.mjs';
import { tokenize } from '../ml/tfidf.mjs';

/** @typedef {import('./types.js').Corpus} Corpus */
/** @typedef {import('./types.js').Claim} Claim */
/** @typedef {import('./types.js').Source} Source */
/** @typedef {import('./types.js').SourceView} SourceView */
/** @typedef {import('./types.js').ClaimView} ClaimView */
/** @typedef {import('./types.js').ClaimDetailView} ClaimDetailView */
/** @typedef {import('./types.js').SearchView} SearchView */
/** @typedef {import('./types.js').SourceDetailView} SourceDetailView */
/** @typedef {import('./types.js').MatchStrength} MatchStrength */

/** Longest question the search endpoints accept. */
export const MAX_QUERY_LENGTH = 300;

/** Questions the app suggests. Each one must find at least one claim (see tests). */
export const EXAMPLE_QUESTIONS = [
  'Who built the pyramids at Giza?',
  'What evidence is there of trade at Great Zimbabwe?',
  'Where did the term Khoisan come from?',
  'Do the Lebombo bone notches prove people used mathematics?',
];

/**
 * Cosine-similarity bands for the word-match label. They describe how alike the words are,
 * not whether the claim answers the question or is true.
 */
const CLOSE_MATCH = 0.35;
const PARTIAL_MATCH = 0.2;

/** @param {number} score @returns {MatchStrength} */
export const strengthFor = (score) => (score >= CLOSE_MATCH ? 'close' : score >= PARTIAL_MATCH ? 'partial' : 'loose');

/** @param {number} value */
const round = (value) => Math.round(value * 1000) / 1000;

/** @param {string} licence */
function licenceNote(licence) {
  if (/link only/i.test(licence)) return 'We link to the original and show only our own short summary.';
  if (/cc by|open access/i.test(licence)) return 'Open access. Check the licence on the publisher page before reusing the text.';
  return '';
}

/**
 * @param {Source} source
 * @returns {SourceView}
 */
export function sourceView(source) {
  const info = SOURCE_TYPE_INFO[source.sourceType];
  return {
    id: source.id,
    title: source.title,
    authors: source.authors,
    authorKind: source.authorKind ?? 'person',
    year: source.year,
    venue: source.venue,
    sourceType: source.sourceType,
    sourceTypeLabel: info?.label ?? source.sourceType,
    sourceTypeDescription: info?.description ?? '',
    licence: source.licence,
    licenceNote: licenceNote(source.licence),
    url: source.url,
    doi: source.doi ?? null,
    doiUrl: source.doi ? `https://doi.org/${source.doi}` : null,
    summary: source.summary,
    authorBackground: source.authorBackground ?? null,
  };
}

/**
 * @param {Source} source
 * @param {Corpus} corpus
 * @returns {SourceDetailView}
 */
export function sourceDetailView(source, corpus) {
  return {
    ...sourceView(source),
    usedIn: corpus.claims
      .filter((claim) => claim.sourceIds.includes(source.id))
      .map((claim) => ({ id: claim.id, topic: claim.topic, status: claim.status })),
  };
}

/**
 * Contested labels in a claim's topic or statement (the same text the content validator scans).
 * @param {Claim} claim
 * @returns {string[]}
 */
export function contestedTermsIn(claim) {
  const text = `${claim.topic} ${claim.statement.en}`;
  return CONTESTED_TERMS.filter(({ pattern }) => pattern.test(text)).map(({ term }) => term);
}

/**
 * What a claim still needs before it can be published. This mirrors the content validator.
 * @param {Claim} claim
 * @param {Corpus} corpus
 * @returns {import('./types.js').Readiness}
 */
export function readiness(claim, corpus) {
  const sourceCount = linkedSources(claim, corpus).length;
  const reviewerCount = claim.reviewers.length;
  const contested = contestedTermsIn(claim);
  /** @type {import('./types.js').ReadinessCheck[]} */
  const checks = [
    { id: 'sources', label: 'At least two distinct sources', done: sourceCount >= 2, detail: `${sourceCount} of 2` },
    { id: 'review', label: 'Reviewer sign-off', done: reviewerCount >= 1, detail: reviewerCount ? `${reviewerCount} reviewer${reviewerCount === 1 ? '' : 's'}` : 'None yet' },
    { id: 'grade', label: 'Grade assigned after review', done: GRADES.includes(claim.grade), detail: GRADES.includes(claim.grade) ? (GRADE_INFO[claim.grade]?.label ?? claim.grade) : 'Not yet graded' },
  ];
  if (contested.length) {
    const noted = (claim.termNotes ?? []).length > 0;
    checks.push({ id: 'terms', label: `Term-history note for ${contested.join(' and ')}`, done: noted, detail: noted ? 'Written' : 'Not written yet' });
  }
  return { ready: checks.every((check) => check.done), checks };
}

/**
 * @param {Claim} claim
 * @param {Corpus} corpus
 * @returns {ClaimView}
 */
export function claimView(claim, corpus) {
  const sources = linkedSources(claim, corpus);
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const source of sources) counts.set(source.sourceType, (counts.get(source.sourceType) ?? 0) + 1);
  const gradeInfo = GRADE_INFO[claim.grade] ?? { label: claim.grade, description: '' };
  const reviewed = claim.translation.method === 'human_reviewed' && claim.translation.reviewedBy;
  return {
    id: claim.id,
    topic: claim.topic,
    status: claim.status,
    grade: claim.grade,
    gradeLabel: gradeInfo.label,
    gradeDescription: gradeInfo.description,
    statement: { en: claim.statement.en },
    translation: {
      zu: claim.translation.zu,
      method: claim.translation.method,
      reviewedBy: claim.translation.reviewedBy,
      label: reviewed ? `Reviewed by ${claim.translation.reviewedBy}` : 'Machine translated, not yet reviewed by a fluent speaker',
    },
    rationale: claim.rationale.en,
    sourceCount: sources.length,
    sourceTypes: [...counts].map(([type, count]) => ({
      type: /** @type {import('./types.js').SourceType} */ (type),
      label: SOURCE_TYPE_INFO[type]?.label ?? type,
      count,
    })),
    newestSourceYear: sources.length ? Math.max(...sources.map((source) => source.year)) : null,
    reviewers: claim.reviewers,
    contestedTerms: contestedTermsIn(claim),
    termNotes: claim.termNotes ?? [],
    readiness: readiness(claim, corpus),
  };
}

/**
 * @param {Claim} claim
 * @param {Corpus} corpus
 * @returns {ClaimDetailView}
 */
export function claimDetailView(claim, corpus) {
  return { ...claimView(claim, corpus), sources: linkedSources(claim, corpus).map(sourceView) };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
const words = (text) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Search the curated corpus. Drafts are returned as research leads, never as answers.
 * @param {string} question
 * @param {Corpus} corpus
 * @returns {SearchView}
 */
export function searchView(question, corpus) {
  const ranked = retrieve(question, corpus.claims);
  const grounded = ground(ranked, corpus);
  const composed = compose(grounded);
  const queryTokens = new Set(tokenize(question));
  const queryWords = [...new Set(words(question).map((word) => word.toLocaleLowerCase()))];

  const results = ranked.map(({ claim, score }, index) => {
    const documentTokens = new Set(tokenize([claim.topic, claim.statement.en, ...claim.keywords, ...(claim.keywordsZu ?? [])].join(' ')));
    const matchedTerms = queryWords.filter((word) => {
      const [token] = tokenize(word);
      return token !== undefined && documentTokens.has(token);
    });
    const visible = words([claim.topic, claim.statement.en, claim.rationale.en, claim.translation.zu].join(' '));
    const highlights = [...new Set(visible.map((word) => word.toLocaleLowerCase()).filter((word) => {
      const [token] = tokenize(word);
      return token !== undefined && queryTokens.has(token);
    }))];
    return {
      claim: claimView(claim, corpus),
      sources: linkedSources(claim, corpus).map(sourceView),
      score: round(score),
      strength: strengthFor(score),
      matchedTerms,
      highlights,
      answerable: grounded[index].answer !== null,
    };
  });

  return {
    query: question,
    abstained: composed.abstained,
    answer: composed.answer,
    citations: composed.citations,
    results,
    suggestions: results.length ? [] : corpus.claims.map((claim) => ({ id: claim.id, topic: claim.topic })),
    retrieval: { method: 'tfidf-local', model: null, threshold: RETRIEVAL_THRESHOLD },
  };
}

/**
 * Words in `text` that all appear in `haystack` (after the same normalisation search uses).
 * Used by the list filters, so a filter and a search agree on what a word is.
 * @param {string} text
 * @param {string} haystack
 */
function containsAllWords(text, haystack) {
  const needles = tokenize(text);
  if (!needles.length) return true;
  const available = new Set(tokenize(haystack));
  return needles.every((needle) => available.has(needle));
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {number} offset
 * @returns {import('./types.js').Page<T>}
 */
function paginate(items, limit, offset) {
  return { total: items.length, limit, offset, items: items.slice(offset, offset + limit) };
}

/**
 * @param {Corpus} corpus
 * @param {{ status?: string, sourceType?: string, q?: string, sort: 'topic' | 'sources' | 'year', limit: number, offset: number }} options
 * @returns {import('./types.js').Page<ClaimView>}
 */
export function listClaims(corpus, options) {
  let views = corpus.claims.map((claim) => ({ claim, view: claimView(claim, corpus) }));
  if (options.status) views = views.filter(({ view }) => view.status === options.status);
  if (options.sourceType) views = views.filter(({ view }) => view.sourceTypes.some((entry) => entry.type === options.sourceType));
  if (options.q) {
    const query = options.q;
    views = views.filter(({ claim }) => containsAllWords(query, [claim.topic, claim.statement.en, ...claim.keywords].join(' ')));
  }
  if (options.sort === 'sources') views.sort((a, b) => b.view.sourceCount - a.view.sourceCount || a.view.topic.localeCompare(b.view.topic));
  else if (options.sort === 'year') views.sort((a, b) => (b.view.newestSourceYear ?? 0) - (a.view.newestSourceYear ?? 0) || a.view.topic.localeCompare(b.view.topic));
  else views.sort((a, b) => a.view.topic.localeCompare(b.view.topic));
  return paginate(views.map(({ view }) => view), options.limit, options.offset);
}

/**
 * @param {Corpus} corpus
 * @param {{ type?: string, q?: string, claim?: string, sort: 'year' | 'title' | 'type', limit: number, offset: number }} options
 * @returns {import('./types.js').Page<SourceDetailView>}
 */
export function listSources(corpus, options) {
  let sources = corpus.sources;
  if (options.type) sources = sources.filter((source) => source.sourceType === options.type);
  if (options.claim) {
    const claim = corpus.claims.find((item) => item.id === options.claim);
    const ids = new Set(claim?.sourceIds ?? []);
    sources = sources.filter((source) => ids.has(source.id));
  }
  if (options.q) {
    const query = options.q;
    sources = sources.filter((source) => containsAllWords(query, [source.title, ...source.authors, source.venue, source.summary].join(' ')));
  }
  const sorted = [...sources];
  if (options.sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
  else if (options.sort === 'type') sorted.sort((a, b) => a.sourceType.localeCompare(b.sourceType) || b.year - a.year);
  else sorted.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return paginate(sorted.map((source) => sourceDetailView(source, corpus)), options.limit, options.offset);
}

/**
 * @param {Corpus} corpus
 * @param {string} repository
 */
export function metaView(corpus, repository) {
  /** @type {Record<string, number>} */
  const sourcesByType = {};
  for (const source of corpus.sources) sourcesByType[source.sourceType] = (sourcesByType[source.sourceType] ?? 0) + 1;
  return {
    name: 'inzulolwazi',
    apiVersion: 'v1',
    repository,
    counts: {
      claims: corpus.claims.length,
      published: corpus.claims.filter((claim) => claim.status === 'published').length,
      drafts: corpus.claims.filter((claim) => claim.status === 'draft').length,
      reviewed: corpus.claims.filter((claim) => claim.reviewers.length > 0).length,
      sources: corpus.sources.length,
      sourcesByType,
    },
    grades: GRADE_INFO,
    sourceTypes: SOURCE_TYPE_INFO,
    languages: [
      { code: 'en', label: 'English', role: 'source text' },
      { code: 'zu', label: 'isiZulu', role: 'translation', reviewed: corpus.claims.filter((claim) => claim.translation.method === 'human_reviewed').length, total: corpus.claims.length },
    ],
    feedbackTypes: FEEDBACK_TYPES,
    exampleQuestions: EXAMPLE_QUESTIONS,
    examples: { claimId: corpus.claims[0]?.id ?? null, sourceId: corpus.sources[0]?.id ?? null },
    limits: { maxQueryLength: MAX_QUERY_LENGTH, maxPageSize: 50 },
  };
}
