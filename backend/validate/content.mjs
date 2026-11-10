import { pathToFileURL } from 'node:url';
import { loadCorpus } from '../pipeline.mjs';
import { CLAIM_STATUSES, CONTESTED_TERMS, GRADES, ORAL_TESTIMONY_FIELDS, SOURCE_TYPES, TRANSLATION_METHODS } from '../schema.mjs';

const SOURCE_REQUIRED = ['id', 'title', 'authors', 'year', 'venue', 'sourceType', 'licence', 'url', 'summary'];

/** @param {unknown} value */
const isBlank = (value) => !value || (Array.isArray(value) && value.length === 0);

/**
 * Validate a corpus against the rules in AGENTS.md.
 * Errors block a build. Warnings flag gaps that are expected in drafts but must be fixed before publishing.
 * @param {{ claims: any[], sources: any[], glossary?: any[], chronology?: any[] }} corpus
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateCorpus({ claims, sources, glossary = [], chronology = [] }) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  const sourceIds = new Set();
  for (const [index, source] of sources.entries()) {
    const label = `sources[${index}]`;
    for (const field of SOURCE_REQUIRED) {
      if (isBlank(source[field])) errors.push(`${label}.${field} is required`);
    }
    if (source.id) {
      if (sourceIds.has(source.id)) errors.push(`${label}.id "${source.id}" is duplicated`);
      sourceIds.add(source.id);
    }
    if (source.sourceType && !SOURCE_TYPES.includes(source.sourceType)) errors.push(`${label}.sourceType is invalid`);
    if (source.url && !/^https?:\/\//.test(source.url)) errors.push(`${label}.url must be http(s)`);
    if (source.sourceType === 'oral_testimony') {
      for (const field of ORAL_TESTIMONY_FIELDS) {
        if (isBlank(source[field])) errors.push(`${label} (oral testimony) needs ${field} recorded`);
      }
      // AGENTS.md rule 17: anything without recorded consent is not loaded.
      if (!isBlank(source.consent) && source.consent?.status !== 'granted') {
        errors.push(`${label} (oral testimony) consent status must be "granted" (got "${source.consent?.status}")`);
      }
    }
    if (JSON.stringify(source).includes('TODO(source)')) errors.push(`${label} contains TODO(source)`);
  }

  const claimIds = new Set();
  const usedSourceIds = new Set();
  for (const [index, claim] of claims.entries()) {
    const label = claim.id ? `claim ${claim.id}` : `claims[${index}]`;
    if (!claim.id || !claim.topic || !claim.statement?.en || !claim.status || !Array.isArray(claim.sourceIds)) {
      errors.push(`claims[${index}] is missing required fields`);
      continue;
    }
    if (claimIds.has(claim.id)) errors.push(`${label} has a duplicated id`);
    claimIds.add(claim.id);
    if (!CLAIM_STATUSES.includes(claim.status)) errors.push(`${label} has an invalid status "${claim.status}"`);

    const idsInClaim = new Set();
    for (const id of claim.sourceIds) {
      usedSourceIds.add(id);
      if (!sourceIds.has(id)) errors.push(`${label} references unknown source ${id}`);
      if (idsInClaim.has(id)) errors.push(`${label} lists source ${id} more than once`);
      idsInClaim.add(id);
    }

    if (JSON.stringify(claim).includes('TODO(source)')) errors.push(`${label} contains TODO(source)`);

    if (claim.status === 'published') {
      if (idsInClaim.size < 2) errors.push(`published ${label} needs at least two evidence entries (distinct sources)`);
      if (!Array.isArray(claim.reviewers) || claim.reviewers.length === 0) {
        errors.push(`published ${label} needs reviewer sign-off`);
      } else if (claim.reviewers.some((/** @type {any} */ reviewer) => !reviewer?.name || !reviewer?.date)) {
        errors.push(`published ${label} has a reviewer entry without name and date`);
      }
      if (!GRADES.includes(claim.grade)) errors.push(`published ${label} needs a grade from the fixed set (got "${claim.grade}")`);
    }

    const translation = claim.translation;
    if (!translation || isBlank(translation.zu)) {
      errors.push(`${label} needs a translation.zu`);
    } else {
      if (!TRANSLATION_METHODS.includes(translation.method)) errors.push(`${label} translation.method must be one of ${TRANSLATION_METHODS.join(', ')}`);
      if (translation.method === 'human_reviewed' && !translation.reviewedBy) errors.push(`${label} translation is human_reviewed but has no reviewedBy`);
      if (translation.method === 'machine' && translation.reviewedBy) errors.push(`${label} translation is machine but has reviewedBy set`);
    }

    const text = `${claim.topic} ${claim.statement.en}`;
    for (const { term, pattern } of CONTESTED_TERMS) {
      if (pattern.test(text) && isBlank(claim.termNotes)) {
        const message = `${label} uses the contested term "${term}" without a term-history note`;
        if (claim.status === 'published') errors.push(message);
        else warnings.push(message);
      }
    }
  }

  /** Terms and dates need a source, a definition or event, and an African-centred framing line (AGENTS.md rule 25). */
  const entries = [
    ...glossary.map((entry, index) => ({ entry, label: `glossary[${index}]`, body: entry.definition?.en })),
    ...chronology.map((entry, index) => ({ entry, label: `chronology[${index}]`, body: entry.event?.en })),
  ];
  const entryIds = new Set();
  for (const { entry, label, body } of entries) {
    if (isBlank(entry.id)) errors.push(`${label}.id is required`);
    else if (entryIds.has(entry.id)) errors.push(`${label}.id "${entry.id}" is duplicated`);
    else entryIds.add(entry.id);
    if (isBlank(body)) errors.push(`${label} needs ${label.startsWith('glossary') ? 'a definition' : 'an event'}`);
    if (isBlank(entry.framing?.en)) errors.push(`${label} needs an African-centred framing line`);
    if (isBlank(entry.sourceIds)) errors.push(`${label} needs at least one source`);
    for (const id of entry.sourceIds ?? []) {
      usedSourceIds.add(id);
      if (!sourceIds.has(id)) errors.push(`${label} references unknown source ${id}`);
    }
    if (label.startsWith('glossary') && isBlank(entry.term)) errors.push(`${label}.term is required`);
    if (label.startsWith('chronology') && (typeof entry.sortYear !== 'number' || isBlank(entry.label))) errors.push(`${label} needs a label and a numeric sortYear`);
    if (JSON.stringify(entry).includes('TODO(source)')) errors.push(`${label} contains TODO(source)`);
  }

  for (const id of sourceIds) {
    if (!usedSourceIds.has(id)) warnings.push(`source ${id} is not used by any claim`);
  }

  return { errors, warnings };
}

async function main() {
  const corpus = await loadCorpus();
  const { errors, warnings } = validateCorpus(corpus);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Content structure valid: ${corpus.claims.length} claims, ${corpus.sources.length} source records, ${corpus.glossary?.length ?? 0} terms, ${corpus.chronology?.length ?? 0} dated events, ${warnings.length} warnings. Drafts remain unpublished until reviewed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
