/**
 * The v1 API. One route table drives the server and the OpenAPI document,
 * so the documentation cannot drift from what the server accepts.
 */
import { CLAIM_STATUSES, SOURCE_TYPES } from './schema.mjs';
import { CITATION_FILES, CITATION_FORMATS, formatCitations, isCitationFormat } from './cite.mjs';
import { linkedSources } from './pipeline.mjs';
import { MAX_QUERY_LENGTH, claimDetailView, listClaims, listSources, metaView, searchView, sourceDetailView } from './views.mjs';
import { buildOpenApi } from './openapi.mjs';

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * @typedef {object} ParamSpec
 * @property {string} name
 * @property {string} description
 * @property {'string' | 'integer' | 'boolean'} [type]
 * @property {boolean} [required]
 * @property {readonly string[]} [enum]
 * @property {string | number | boolean} [default]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [maxLength]
 * @property {string | number} [example]
 */

/**
 * @typedef {object} Context
 * @property {URL} url
 * @property {Record<string, string>} params
 * @property {import('./types.js').Corpus} corpus
 * @property {unknown} body
 * @property {{ repository: string, log: (entry: Record<string, unknown>) => void }} config
 */

/**
 * @typedef {object} Result
 * @property {number} [status]
 * @property {unknown} [json]
 * @property {string} [text]
 * @property {string} [contentType]
 * @property {Record<string, string>} [headers]
 */

/**
 * @typedef {object} Route
 * @property {'GET' | 'POST'} method
 * @property {string} path
 * @property {string} summary
 * @property {string} tag
 * @property {ParamSpec[]} [query]
 * @property {boolean} [body]
 * @property {string} response
 * @property {(context: Context) => Result | Promise<Result>} handler
 */

/** @typedef {Record<string, string | number | boolean | undefined>} Query */

/**
 * Read and validate query parameters against their specs, which are also what the docs show.
 * @param {URL} url
 * @param {ParamSpec[]} specs
 * @returns {Query}
 */
export function readQuery(url, specs) {
  /** @type {Query} */
  const values = {};
  for (const spec of specs) {
    const raw = url.searchParams.get(spec.name);
    if (raw === null || raw === '') {
      if (spec.required) throw new HttpError(400, 'invalid_parameter', `${spec.name} is required`);
      values[spec.name] = spec.default;
      continue;
    }
    if (spec.type === 'integer') {
      const number = Number(raw);
      if (!Number.isInteger(number)) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be an integer`);
      if (spec.minimum !== undefined && number < spec.minimum) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be at least ${spec.minimum}`);
      if (spec.maximum !== undefined && number > spec.maximum) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be at most ${spec.maximum}`);
      values[spec.name] = number;
    } else if (spec.type === 'boolean') {
      if (!['1', 'true', '0', 'false'].includes(raw)) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be true or false`);
      values[spec.name] = raw === '1' || raw === 'true';
    } else {
      if (spec.enum && !spec.enum.includes(raw)) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be one of: ${spec.enum.join(', ')}`);
      if (raw.length > (spec.maxLength ?? 200)) throw new HttpError(400, 'invalid_parameter', `${spec.name} must be at most ${spec.maxLength ?? 200} characters`);
      values[spec.name] = raw;
    }
  }
  return values;
}

/** @type {ParamSpec} */
const limitParam = { name: 'limit', description: 'Page size.', type: 'integer', default: 20, minimum: 1, maximum: 50 };
/** @type {ParamSpec} */
const offsetParam = { name: 'offset', description: 'Number of items to skip.', type: 'integer', default: 0, minimum: 0 };
/** @type {ParamSpec} */
const formatParam = { name: 'format', description: 'Citation format.', enum: CITATION_FORMATS, default: 'text' };
/** @type {ParamSpec} */
const downloadParam = { name: 'download', description: 'Send the citations as a file download.', type: 'boolean', default: false };

/**
 * @param {unknown} value
 * @returns {string}
 */
function validQuestion(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_parameter', 'question must be a string');
  const question = value.trim();
  if (!question) throw new HttpError(400, 'invalid_parameter', 'question must not be empty');
  if (question.length > MAX_QUERY_LENGTH) throw new HttpError(400, 'invalid_parameter', `question must be at most ${MAX_QUERY_LENGTH} characters`);
  return question;
}

/**
 * Search, and log what was retrieved. The log has no question text, so it holds no personal data (AGENTS.md rule 21).
 * @param {string} question
 * @param {Context} context
 * @returns {Result}
 */
function runSearch(question, context) {
  const result = searchView(question, context.corpus);
  context.config.log({
    type: 'search',
    at: new Date().toISOString(),
    queryLength: question.length,
    matches: result.results.map((item) => ({ id: item.claim.id, score: item.score })),
    abstained: result.abstained,
    retrieval: result.retrieval.method,
    model: result.retrieval.model,
  });
  return { json: result };
}

/**
 * @param {Context} context
 * @returns {import('./types.js').Claim}
 */
function claimOr404(context) {
  const claim = context.corpus.claims.find((item) => item.id === context.params.id);
  if (!claim) throw new HttpError(404, 'not_found', `No claim with id ${context.params.id}`);
  return claim;
}

/**
 * @param {Context} context
 * @returns {import('./types.js').Source}
 */
function sourceOr404(context) {
  const source = context.corpus.sources.find((item) => item.id === context.params.id);
  if (!source) throw new HttpError(404, 'not_found', `No source with id ${context.params.id}`);
  return source;
}

/**
 * @param {import('./types.js').Source[]} sources
 * @param {Query} query
 * @param {string} filename
 * @returns {Result}
 */
function citationResult(sources, query, filename) {
  const format = String(query.format);
  if (!isCitationFormat(format)) throw new HttpError(400, 'invalid_parameter', 'format must be text, bibtex or ris');
  const file = CITATION_FILES[format];
  /** @type {Record<string, string>} */
  const headers = query.download ? { 'content-disposition': `attachment; filename="${filename}.${file.extension}"` } : {};
  return { text: `${formatCitations(sources, format)}\n`, contentType: file.contentType, headers };
}

/** @type {ParamSpec[]} */
const claimQuery = [
  { name: 'status', description: 'Only claims with this status.', enum: CLAIM_STATUSES },
  { name: 'sourceType', description: 'Only claims that cite at least one source of this type.', enum: SOURCE_TYPES },
  { name: 'q', description: 'Words that must all appear in the topic, statement or keywords.', maxLength: 100 },
  { name: 'sort', description: 'Sort order. "sources" puts the best-evidenced first, "year" the most recent source first.', enum: ['topic', 'sources', 'year'], default: 'topic' },
  limitParam, offsetParam,
];

/** @type {ParamSpec[]} */
const sourceQuery = [
  { name: 'type', description: 'Only sources of this type.', enum: SOURCE_TYPES },
  { name: 'claim', description: 'Only the sources a claim cites (a claim id).', maxLength: 100 },
  { name: 'q', description: 'Words that must all appear in the title, authors, venue or summary.', maxLength: 100 },
  { name: 'sort', description: 'Sort order.', enum: ['year', 'title', 'type'], default: 'year' },
  limitParam, offsetParam,
];

const startedAt = Date.now();

/** @type {ParamSpec[]} */
const searchQuery = [{ name: 'q', description: 'The question or topic to search for.', required: true, maxLength: MAX_QUERY_LENGTH, example: 'Who built the pyramids at Giza?' }];

/** @type {Route[]} */
export const ROUTES = [
  {
    method: 'GET', path: '/api/v1/health', tag: 'Service', summary: 'Check that the service is running.', response: 'Health',
    handler: ({ corpus }) => ({ json: { status: 'ok', claims: corpus.claims.length, sources: corpus.sources.length, uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) } }),
  },
  {
    method: 'GET', path: '/api/v1/meta', tag: 'Service', summary: 'Counts, grade and source-type definitions, languages and example questions.', response: 'Meta',
    handler: ({ corpus, config }) => ({ json: metaView(corpus, config.repository) }),
  },
  {
    method: 'GET', path: '/api/v1/search', tag: 'Search', summary: 'Search the curated collection. Drafts come back as research leads, never as answers.',
    query: searchQuery, response: 'SearchResult',
    handler: (context) => runSearch(validQuestion(readQuery(context.url, searchQuery).q), context),
  },
  {
    method: 'POST', path: '/api/v1/search', tag: 'Search', summary: 'The same search, with the question in a JSON body: {"question": "..."}.',
    body: true, response: 'SearchResult',
    handler: (context) => {
      const body = context.body && typeof context.body === 'object' ? /** @type {Record<string, unknown>} */ (context.body) : {};
      return runSearch(validQuestion(body.question), context);
    },
  },
  {
    method: 'GET', path: '/api/v1/claims', tag: 'Claims', summary: 'List claims, with filters.', response: 'ClaimPage',
    query: claimQuery,
    handler: ({ url, corpus }) => {
      const query = readQuery(url, claimQuery);
      return {
        json: listClaims(corpus, {
          status: /** @type {string | undefined} */ (query.status),
          sourceType: /** @type {string | undefined} */ (query.sourceType),
          q: /** @type {string | undefined} */ (query.q),
          sort: /** @type {'topic' | 'sources' | 'year'} */ (query.sort),
          limit: /** @type {number} */ (query.limit),
          offset: /** @type {number} */ (query.offset),
        }),
      };
    },
  },
  {
    method: 'GET', path: '/api/v1/claims/:id', tag: 'Claims', summary: 'One claim, with its sources, translation label and publication checklist.', response: 'ClaimDetail',
    handler: (context) => ({ json: claimDetailView(claimOr404(context), context.corpus) }),
  },
  {
    method: 'GET', path: '/api/v1/claims/:id/cite', tag: 'Claims', summary: 'Citations for every source behind a claim.', response: 'text',
    query: [formatParam, downloadParam],
    handler: (context) => {
      const claim = claimOr404(context);
      const query = readQuery(context.url, [formatParam, downloadParam]);
      return citationResult(linkedSources(claim, context.corpus), query, `${claim.id}-sources`);
    },
  },
  {
    method: 'GET', path: '/api/v1/sources', tag: 'Sources', summary: 'List sources, with filters.', response: 'SourcePage',
    query: sourceQuery,
    handler: ({ url, corpus }) => {
      const query = readQuery(url, sourceQuery);
      const claim = /** @type {string | undefined} */ (query.claim);
      if (claim && !corpus.claims.some((item) => item.id === claim)) throw new HttpError(400, 'invalid_parameter', `claim ${claim} does not exist`);
      return {
        json: listSources(corpus, {
          type: /** @type {string | undefined} */ (query.type),
          claim,
          q: /** @type {string | undefined} */ (query.q),
          sort: /** @type {'year' | 'title' | 'type'} */ (query.sort),
          limit: /** @type {number} */ (query.limit),
          offset: /** @type {number} */ (query.offset),
        }),
      };
    },
  },
  {
    method: 'GET', path: '/api/v1/sources/:id', tag: 'Sources', summary: 'One source, with the claims that cite it.', response: 'SourceDetail',
    handler: (context) => ({ json: sourceDetailView(sourceOr404(context), context.corpus) }),
  },
  {
    method: 'GET', path: '/api/v1/sources/:id/cite', tag: 'Sources', summary: 'A citation for one source.', response: 'text',
    query: [formatParam, downloadParam],
    handler: (context) => {
      const source = sourceOr404(context);
      return citationResult([source], readQuery(context.url, [formatParam, downloadParam]), source.id);
    },
  },
  {
    method: 'GET', path: '/api/v1/openapi.json', tag: 'Service', summary: 'This API, described in OpenAPI 3.1.', response: 'OpenApi',
    handler: ({ config }) => ({ json: buildOpenApi(ROUTES, { repository: config.repository }) }),
  },
];

/**
 * @param {string} method
 * @param {string} pathname
 * @returns {{ route: Route, params: Record<string, string> } | { allowed: string[] } | null}
 */
export function matchRoute(method, pathname) {
  /** @type {string[]} */
  const allowed = [];
  for (const route of ROUTES) {
    const names = [...route.path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1]);
    const pattern = new RegExp(`^${route.path.replace(/:[A-Za-z]+/g, '([^/]+)')}$`);
    const found = pattern.exec(pathname);
    if (!found) continue;
    if (route.method !== method) {
      allowed.push(route.method);
      continue;
    }
    /** @type {Record<string, string>} */
    const params = {};
    names.forEach((name, index) => { params[name] = decodeURIComponent(found[index + 1]); });
    return { route, params };
  }
  return allowed.length ? { allowed } : null;
}
