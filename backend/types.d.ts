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
