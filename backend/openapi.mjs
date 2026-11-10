/** Builds the OpenAPI 3.1 description of the v1 API from the route table. */
import { CLAIM_STATUSES, SOURCE_TYPES } from './schema.mjs';

/** @typedef {import('./routes.mjs').Route} Route */
/** @typedef {import('./routes.mjs').ParamSpec} ParamSpec */

const ref = (/** @type {string} */ name) => ({ $ref: `#/components/schemas/${name}` });
const str = (/** @type {string} */ description) => ({ type: 'string', description });
const nullableStr = (/** @type {string} */ description) => ({ type: ['string', 'null'], description });
const int = (/** @type {string} */ description) => ({ type: 'integer', description });

/**
 * @param {Record<string, unknown>} properties
 * @param {string[]} [required]
 */
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: true });

/** @param {string} item */
const page = (item) => object({ total: int('Items matching the filters.'), limit: int('Page size used.'), offset: int('Items skipped.'), items: { type: 'array', items: ref(item) } });

const schemas = {
  Error: object({ error: object({ code: str('A stable code such as not_found or invalid_parameter.'), message: str('What went wrong.') }) }),
  Health: object({ status: str('Always "ok" when the service is up.'), claims: int('Claims in the collection.'), sources: int('Sources in the collection.'), uptimeSeconds: int('Seconds since the process started.') }),
  Source: object({
    id: str('Stable id.'), title: str('Title.'), authors: { type: 'array', items: { type: 'string' } },
    authorKind: { type: 'string', enum: ['person', 'organization'] }, year: int('Year of publication.'), venue: str('Journal, series or publisher, as written.'),
    sourceType: { type: 'string', enum: SOURCE_TYPES }, sourceTypeLabel: str('Human-readable type.'), sourceTypeDescription: str('How far to lean on this kind of source.'),
    licence: str('Licence or access terms.'), licenceNote: str('What the licence means for reuse.'), url: str('Link to the original.'),
    doi: nullableStr('DOI, when there is one.'), doiUrl: nullableStr('DOI as a link.'), summary: str('Our own short summary.'), authorBackground: nullableStr('Who the author is.'),
  }),
  SourceDetail: { allOf: [ref('Source'), object({ usedIn: { type: 'array', items: object({ id: str('Claim id.'), topic: str('Claim topic.'), status: str('Claim status.') }) } })] },
  Readiness: object({
    ready: { type: 'boolean', description: 'True when nothing blocks publication.' },
    checks: { type: 'array', items: object({ id: str('sources, review, grade or terms.'), label: str('What is checked.'), done: { type: 'boolean' }, detail: str('Where it stands.') }) },
  }),
  Claim: object({
    id: str('Stable id.'), topic: str('Short topic name.'), status: { type: 'string', enum: CLAIM_STATUSES }, grade: str('Grade key, or "draft".'),
    gradeLabel: str('Human-readable grade.'), gradeDescription: str('What the grade means.'), statement: object({ en: str('English source text.') }),
    translation: object({ zu: str('isiZulu text.'), method: { type: 'string', enum: ['machine', 'human_reviewed'] }, reviewedBy: nullableStr('Reviewer, when reviewed.'), label: str('The label that must be shown beside the translation.') }),
    rationale: str('Why the claim is framed this way.'), sourceCount: int('Distinct sources cited.'),
    sourceTypes: { type: 'array', items: object({ type: { type: 'string', enum: SOURCE_TYPES }, label: str('Type label.'), count: int('Sources of this type.') }) },
    newestSourceYear: { type: ['integer', 'null'] }, reviewers: { type: 'array', items: object({ name: str('Name.'), date: str('Date of sign-off.') }, ['name', 'date']) },
    contestedTerms: { type: 'array', items: { type: 'string' } }, termNotes: { type: 'array', items: { type: 'string' }, description: 'Term-history notes for contested labels.' }, readiness: ref('Readiness'),
  }),
  ClaimDetail: { allOf: [ref('Claim'), object({ sources: { type: 'array', items: ref('Source') } })] },
  SearchResult: object({
    query: str('The question as sent.'),
    abstained: { type: 'boolean', description: 'True when no reviewed, source-backed answer exists. Drafts always abstain.' },
    answer: str('The answer, or the reason none is shown.'),
    citations: { type: 'array', items: { type: 'object' } },
    results: { type: 'array', items: object({
      claim: ref('Claim'), sources: { type: 'array', items: ref('Source') }, score: { type: 'number', description: 'Cosine similarity, 0 to 1. It measures how alike the words are, not whether a claim is true.' },
      strength: { type: 'string', enum: ['close', 'partial', 'loose'], description: 'How alike the words are. It does not say the claim answers the question.' }, matchedTerms: { type: 'array', items: { type: 'string' } }, highlights: { type: 'array', items: { type: 'string' } },
      answerable: { type: 'boolean', description: 'True only for a published claim with at least two distinct sources.' },
    }) },
    terms: { type: 'array', items: ref('GlossaryEntry'), description: 'Defined terms the question names or resembles.' },
    timeline: { type: 'array', items: ref('ChronologyEntry'), description: 'Dated events the question names or resembles.' },
    suggestions: { type: 'array', items: object({ id: str('Claim id.'), topic: str('Topic.') }) },
    retrieval: object({ method: str('tfidf-local: keyword matching on this server. No AI model is involved.'), model: { type: 'null' }, threshold: { type: 'number' } }),
  }),
  GlossaryEntry: object({
    id: str('Stable id.'), term: str('The term.'), aliases: { type: 'array', items: { type: 'string' } }, definition: str('The definition, attributed to its sources.'),
    framing: str('How to read the term from an African-centred standpoint.'), sourceCount: int('Sources cited.'), sources: { type: 'array', items: ref('Source') },
  }),
  ChronologyEntry: object({
    id: str('Stable id.'), label: str('Date as written, such as "1100–1450 AD".'), sortYear: int('Year used for ordering. Negative for BC.'), endYear: { type: ['integer', 'null'] },
    event: str('What happened, attributed to its source.'), framing: str('How the event is placed from an African-centred standpoint.'), sourceCount: int('Sources cited.'), sources: { type: 'array', items: ref('Source') },
  }),
  GlossaryPage: page('GlossaryEntry'),
  ChronologyPage: page('ChronologyEntry'),
  ClaimPage: page('Claim'),
  SourcePage: page('SourceDetail'),
  Meta: { type: 'object', description: 'Counts, definitions of every grade and source type, languages, example questions and limits.', additionalProperties: true },
  OpenApi: { type: 'object', description: 'This document.', additionalProperties: true },
};

/**
 * @param {ParamSpec} spec
 */
function schemaFor(spec) {
  /** @type {Record<string, unknown>} */
  const schema = { type: spec.type ?? 'string' };
  if (spec.enum) schema.enum = [...spec.enum];
  if (spec.default !== undefined) schema.default = spec.default;
  if (spec.minimum !== undefined) schema.minimum = spec.minimum;
  if (spec.maximum !== undefined) schema.maximum = spec.maximum;
  if (spec.maxLength !== undefined) schema.maxLength = spec.maxLength;
  if (spec.example !== undefined) schema.example = spec.example;
  return schema;
}

/** @param {string} path */
const operationId = (path) => path.replace(/^\/api\/v1\//, '').replace(/[/:.]+(\w)/g, (_match, letter) => letter.toUpperCase()).replace(/^\w/, (letter) => letter.toLowerCase());

/**
 * @param {Route[]} routes
 * @param {{ repository: string }} options
 */
export function buildOpenApi(routes, { repository }) {
  /** @type {Record<string, Record<string, unknown>>} */
  const paths = {};
  for (const route of routes) {
    const path = route.path.replace(/:([A-Za-z]+)/g, '{$1}');
    const pathNames = [...route.path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1]);
    const parameters = [
      ...pathNames.map((name) => ({ name, in: 'path', required: true, description: `The ${name} of the item.`, schema: { type: 'string' } })),
      ...(route.query ?? []).map((spec) => ({ name: spec.name, in: 'query', required: Boolean(spec.required), description: spec.description, schema: schemaFor(spec) })),
    ];
    /** @type {Record<string, unknown>} */
    const responses = {
      200: {
        description: 'Success.',
        content: route.response === 'text'
          ? { 'text/plain': { schema: { type: 'string' } }, 'application/x-bibtex': { schema: { type: 'string' } }, 'application/x-research-info-systems': { schema: { type: 'string' } } }
          : { 'application/json': { schema: ref(route.response) } },
      },
      429: { description: 'Too many requests. Wait for the number of seconds in the Retry-After header.', content: { 'application/json': { schema: ref('Error') } } },
    };
    if (parameters.length || route.body) responses[400] = { description: 'A parameter was missing or invalid.', content: { 'application/json': { schema: ref('Error') } } };
    if (pathNames.length) responses[404] = { description: 'No item with that id.', content: { 'application/json': { schema: ref('Error') } } };
    paths[path] ??= {};
    paths[path][route.method.toLowerCase()] = {
      operationId: `${route.method.toLowerCase()}${operationId(route.path).replace(/^\w/, (letter) => letter.toUpperCase())}`,
      summary: route.summary,
      tags: [route.tag],
      ...(parameters.length ? { parameters } : {}),
      ...(route.body ? { requestBody: { required: true, content: { 'application/json': { schema: object({ question: { type: 'string', maxLength: 300, description: 'The question or topic to search for.' } }) } } } } : {}),
      responses,
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'inzulolwazi API',
      version: '1.0.0',
      description: 'Read-only access to a curated collection of African history research, with the evidence shown. Claims are drafts until reviewers sign them off, and a draft is never returned as an answer.',
      license: { name: 'See the repository for the licence of the code. Source texts keep their own licences.' },
      contact: { url: repository },
    },
    servers: [{ url: '/' }],
    tags: [{ name: 'Search' }, { name: 'Claims' }, { name: 'Glossary' }, { name: 'Chronology' }, { name: 'Sources' }, { name: 'Service' }],
    paths,
    components: { schemas },
  };
}
