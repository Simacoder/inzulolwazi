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

/**
 * What each grade means, in plain language (docs/design.md).
 * `draft` is not a gradeable outcome: it marks a claim that has not been reviewed yet.
 * @type {Record<string, { label: string, description: string }>}
 */
export const GRADE_INFO = {
  draft: { label: 'Not yet graded', description: 'A research draft. It has not been reviewed, so it has no grade.' },
  well_established: { label: 'Well established', description: 'Multiple independent lines of evidence agree.' },
  broadly_accepted_details_contested: { label: 'Broadly accepted, details debated', description: 'The core is accepted, and the specifics are disputed.' },
  contested: { label: 'Contested', description: 'Scholars disagree, and both sides are shown.' },
  partly_supported: { label: 'Partly supported', description: 'The popular version overreaches, and the core holds.' },
  unsupported: { label: 'Unsupported', description: 'No credible evidence in our sources.' },
  insufficient_sources: { label: 'Not enough sources yet', description: 'We cannot say, and we are not guessing.' },
};

/**
 * What each kind of source is, and how far to lean on it (AGENTS.md rule 5).
 * @type {Record<string, { label: string, description: string }>}
 */
export const SOURCE_TYPE_INFO = {
  scholarship: { label: 'Scholarship', description: 'Peer-reviewed historical or social-science research.' },
  archaeology: { label: 'Archaeology', description: 'Findings from excavations and material remains.' },
  genetics: { label: 'Genetics', description: 'Studies of ancient or modern DNA.' },
  linguistics: { label: 'Linguistics', description: 'Comparative and historical study of languages.' },
  colonial_record: { label: 'Colonial record', description: 'Writing produced under colonial rule. It shows what was claimed at the time, not a neutral account.' },
  critical_commentary: { label: 'Critical commentary', description: 'Interpretive or critical writing, including commentary. Weighed claim by claim and never treated as primary evidence.' },
  oral_testimony: { label: 'Oral testimony', description: 'Accounts passed down or recorded from community members, with consent and the rights holder recorded.' },
};

/** Kinds of feedback the public can send (docs/design.md). */
export const FEEDBACK_TYPES = ['source_suggestion', 'translation_issue', 'correction'];
