/** Synthetic corpus for tests. No real people, recordings or unreviewed historical claims. */

/** @typedef {import('../backend/types.js').Corpus} Corpus */
/** @typedef {import('../backend/types.js').Claim} Claim */
/** @typedef {import('../backend/types.js').Source} Source */

/** @returns {Source[]} */
export function makeSources() {
  return [
    {
      id: 'src_a', title: 'Test source A', authors: ['A. Author'], year: 2020, venue: 'Journal of Tests',
      sourceType: 'scholarship', licence: 'open access', url: 'https://example.org/a', doi: null, summary: 'Synthetic summary A.',
    },
    {
      id: 'src_b', title: 'Test source B', authors: ['B. Author'], year: 2021, venue: 'Archaeology of Tests',
      sourceType: 'archaeology', licence: 'link only', url: 'https://example.org/b', doi: null, summary: 'Synthetic summary B.',
    },
    {
      id: 'src_c', title: 'Test source C', authors: ['C. Author'], year: 2022, venue: 'Linguistics of Tests',
      sourceType: 'linguistics', licence: 'CC BY 4.0', url: 'https://example.org/c', doi: null, summary: 'Synthetic summary C.',
    },
  ];
}

/**
 * @param {Partial<Claim>} [overrides]
 * @returns {Claim}
 */
export function makeClaim(overrides = {}) {
  return {
    id: 'claim_pyramids',
    topic: 'Test pyramids topic',
    keywords: ['pyramids', 'giza', 'builders'],
    keywordsZu: ['amaphiramidi'],
    status: 'published',
    grade: 'well_established',
    statement: { en: 'Synthetic statement about the pyramids test topic.' },
    rationale: { en: 'Synthetic rationale.' },
    sourceIds: ['src_a', 'src_b'],
    reviewers: [{ name: 'Test Reviewer', role: 'historian', date: '2026-01-01' }],
    translation: { zu: 'Umbhalo wokuhlola.', method: 'machine', reviewedBy: null },
    ...overrides,
  };
}

/**
 * A corpus with two published claims and one draft.
 * @returns {Corpus}
 */
export function makeCorpus() {
  return {
    sources: makeSources(),
    claims: [
      makeClaim(),
      makeClaim({
        id: 'claim_trade',
        topic: 'Test trade topic',
        keywords: ['trade', 'zimbabwe', 'beads'],
        keywordsZu: ['ukuhwebelana'],
        statement: { en: 'Synthetic statement about the trade test topic.' },
        sourceIds: ['src_b', 'src_c'],
      }),
      makeClaim({
        id: 'claim_draft',
        topic: 'Test draft topic',
        keywords: ['draftword', 'unreviewed'],
        keywordsZu: [],
        status: 'draft',
        grade: 'draft',
        statement: { en: 'Synthetic draft statement.' },
        reviewers: [],
        sourceIds: ['src_a', 'src_c'],
      }),
    ],
  };
}
