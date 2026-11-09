/** Fixed vocabularies shared by the validator, the pipeline and the tests. */

export const SOURCE_TYPES = ['scholarship', 'archaeology', 'genetics', 'linguistics', 'colonial_record', 'critical_commentary', 'oral_testimony'];

/** Grades a published claim may carry (see docs/architecture.md). */
export const GRADES = ['well_established', 'broadly_accepted_details_contested', 'contested', 'partly_supported', 'unsupported', 'insufficient_sources'];

export const CLAIM_STATUSES = ['draft', 'published'];

export const TRANSLATION_METHODS = ['machine', 'human_reviewed'];

/** Labels that need a term-history note wherever a claim uses them (AGENTS.md rule 6). */
export const CONTESTED_TERMS = [
  { term: 'Khoisan', pattern: /khoi?e?san/i },
  { term: 'Bantu', pattern: /\bbantu\b/i },
];

export const ORAL_TESTIMONY_FIELDS = ['consent', 'language', 'place', 'date', 'rightsHolder'];
