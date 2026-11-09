export type SourceType =
  | 'scholarship'
  | 'archaeology'
  | 'genetics'
  | 'linguistics'
  | 'colonial_record'
  | 'critical_commentary'
  | 'oral_testimony';

export interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  sourceType: SourceType;
  licence: string;
  url: string;
  doi?: string | null;
  authorBackground?: string;
  /** Set to 'organization' when the single author is a body, not a person (used when citing). */
  authorKind?: 'person' | 'organization';
  summary: string;
  /** Required when sourceType is oral_testimony. */
  consent?: { status: string; recordedOn?: string };
  language?: string;
  place?: string;
  date?: string;
  rightsHolder?: string;
}

export interface Reviewer {
  name: string;
  role?: string;
  date: string;
}

export interface Translation {
  zu: string;
  method: 'machine' | 'human_reviewed';
  reviewedBy: string | null;
}

export interface Claim {
  id: string;
  topic: string;
  keywords: string[];
  keywordsZu?: string[];
  status: 'draft' | 'published';
  grade: string;
  statement: { en: string; zu?: string };
  rationale: { en: string; zu?: string };
  sourceIds: string[];
  reviewers: Reviewer[];
  translation: Translation;
  termNotes?: string[];
}

export interface Corpus {
  claims: Claim[];
  sources: Source[];
}

export interface RankedClaim {
  claim: Claim;
  score: number;
}

export interface GroundedClaim {
  id: string;
  topic: string;
  statement: string;
  status: Claim['status'];
  grade: string;
  rationale: string;
  sources: Source[];
  /** The text that may be shown as an answer, or null if the claim is not answerable. */
  answer: string | null;
}

export interface Citation extends Source {
  number: number;
}

export interface AnswerResult {
  abstained: boolean;
  answer: string;
  citations: Citation[];
  matches: GroundedClaim[];
}

export interface RankDocument {
  id: string;
  text: string;
}

export interface RankScore {
  id: string;
  score: number;
}

/** What the API returns for a source (adds labels and links to the stored record). */
export interface SourceView {
  id: string;
  title: string;
  authors: string[];
  authorKind: 'person' | 'organization';
  year: number;
  venue: string;
  sourceType: SourceType;
  sourceTypeLabel: string;
  sourceTypeDescription: string;
  licence: string;
  licenceNote: string;
  url: string;
  doi: string | null;
  doiUrl: string | null;
  summary: string;
  authorBackground: string | null;
}

export interface ReadinessCheck {
  id: 'sources' | 'review' | 'grade' | 'terms';
  label: string;
  done: boolean;
  detail: string;
}

/** What a claim still needs before it can be published (mirrors the content validator). */
export interface Readiness {
  ready: boolean;
  checks: ReadinessCheck[];
}

export interface SourceTypeCount {
  type: SourceType;
  label: string;
  count: number;
}

export interface TranslationView {
  zu: string;
  method: Translation['method'];
  reviewedBy: string | null;
  /** The label that must sit next to the translation (AGENTS.md rule 8). */
  label: string;
}

export interface ClaimView {
  id: string;
  topic: string;
  status: Claim['status'];
  grade: string;
  gradeLabel: string;
  gradeDescription: string;
  statement: { en: string };
  translation: TranslationView;
  rationale: string;
  sourceCount: number;
  sourceTypes: SourceTypeCount[];
  newestSourceYear: number | null;
  reviewers: Reviewer[];
  contestedTerms: string[];
  termNotes: string[];
  readiness: Readiness;
}

export interface ClaimDetailView extends ClaimView {
  sources: SourceView[];
}

export interface SourceDetailView extends SourceView {
  /** The claims that cite this source. */
  usedIn: { id: string; topic: string; status: string }[];
}

/** How alike the words of a question and a claim are. It says nothing about whether the claim answers the question. */
export type MatchStrength = 'close' | 'partial' | 'loose';

export interface SearchResultView {
  claim: ClaimView;
  sources: SourceView[];
  score: number;
  strength: MatchStrength;
  /** Words from the question that matched this claim. */
  matchedTerms: string[];
  /** Words in the claim text to highlight. */
  highlights: string[];
  /** True only for a published claim with at least two distinct sources. */
  answerable: boolean;
}

export interface SearchView {
  query: string;
  abstained: boolean;
  /** The answer text, or the reason none is shown. */
  answer: string;
  citations: Citation[];
  results: SearchResultView[];
  /** Topics to try when nothing matched. */
  suggestions: { id: string; topic: string }[];
  retrieval: { method: 'tfidf-local'; model: null; threshold: number };
}

export interface Page<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}
