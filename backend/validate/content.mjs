import { loadCorpus } from '../pipeline.mjs';

const { claims, sources } = await loadCorpus();
const errors = [];
const sourceIds = new Set(sources.map((source) => source.id));
for (const [index, source] of sources.entries()) {
  for (const field of ['id', 'title', 'authors', 'year', 'venue', 'sourceType', 'licence', 'url', 'summary']) {
    if (!source[field] || (Array.isArray(source[field]) && !source[field].length)) errors.push(`sources[${index}].${field} is required`);
  }
  if (!['scholarship', 'archaeology', 'genetics', 'linguistics', 'colonial_record', 'critical_commentary', 'oral_testimony'].includes(source.sourceType)) errors.push(`sources[${index}].sourceType is invalid`);
  if (source.url && !/^https?:\/\//.test(source.url)) errors.push(`sources[${index}].url must be http(s)`);
}
for (const [index, claim] of claims.entries()) {
  if (!claim.id || !claim.topic || !claim.statement?.en || !claim.status || !claim.sourceIds) errors.push(`claims[${index}] is missing required fields`);
  if (claim.sourceIds.some((id) => !sourceIds.has(id))) errors.push(`claims[${index}] references an unknown source`);
  if (claim.status === 'published') {
    if (claim.sourceIds.length < 2) errors.push(`published claim ${claim.id} needs at least two evidence entries`);
    if (!claim.reviewers?.length) errors.push(`published claim ${claim.id} needs reviewer sign-off`);
    if (claim.grade === 'draft') errors.push(`published claim ${claim.id} needs a fixed grade`);
  }
  if (claim.status === 'draft' && claim.statement.en.includes('TODO(source)')) errors.push(`claim ${claim.id} contains TODO(source)`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Content structure valid: ${claims.length} claims, ${sources.length} source records. Drafts remain unpublished until reviewed.`);
}
