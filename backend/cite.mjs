/** Citation export for sources: plain text, BibTeX and RIS. */

/** @typedef {import('./types.js').Source} Source */

export const CITATION_FORMATS = /** @type {const} */ (['text', 'bibtex', 'ris']);

/** @typedef {typeof CITATION_FORMATS[number]} CitationFormat */

/** In plain-text citations, more authors than this are shortened to "et al.". */
const MAX_TEXT_AUTHORS = 6;

/** @param {string} value */
const endSentence = (value) => (/[.?!]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`);

/** @type {Record<string, string>} */
const BIB_ESCAPES = {
  '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
};

/**
 * Escape text for a BibTeX field. URLs and DOIs are written verbatim and never pass through here.
 * @param {string} value
 */
export const bibEscape = (value) => String(value).replace(/[\\{}&%$#_~^]/g, (ch) => BIB_ESCAPES[ch]);

/**
 * @param {string} value
 * @returns {value is CitationFormat}
 */
export const isCitationFormat = (value) => /** @type {readonly string[]} */ (CITATION_FORMATS).includes(value);

/** @param {string[]} authors */
function joinAuthors(authors) {
  if (!authors.length) return 'Unknown author';
  if (authors.length > MAX_TEXT_AUTHORS) return `${authors.slice(0, MAX_TEXT_AUTHORS).join(', ')}, et al.`;
  if (authors.length === 1) return authors[0];
  return `${authors.slice(0, -1).join(', ')}${authors.length > 2 ? ',' : ''} & ${authors[authors.length - 1]}`;
}

/**
 * Names are kept as written in the record. They are not inverted, so an organisation is never mangled
 * into "Centre, U. W. H.".
 * @param {Source} source
 */
function textCitation(source) {
  const link = source.doi ? `https://doi.org/${source.doi}` : source.url;
  return `${joinAuthors(source.authors)} (${source.year}). ${endSentence(source.title)} ${endSentence(source.venue)} ${link}`;
}

/** @param {Source} source */
function bibtexCitation(source) {
  const authors = source.authors.map((name) => (source.authorKind === 'organization' ? `{${bibEscape(name)}}` : bibEscape(name))).join(' and ');
  /** @type {[string, string][]} */
  const fields = [
    ['author', authors],
    ['title', `{${bibEscape(source.title)}}`],
    ['year', String(source.year)],
    ['note', bibEscape(source.venue)],
  ];
  if (source.doi) fields.push(['doi', source.doi]);
  fields.push(['url', source.url], ['keywords', source.sourceType]);
  return `@misc{${source.id},\n${fields.map(([name, value]) => `  ${name} = {${value}}`).join(',\n')}\n}`;
}

/** @param {Source} source */
function risCitation(source) {
  const lines = [
    'TY  - GEN',
    ...source.authors.map((name) => `AU  - ${name}`),
    `TI  - ${source.title}`,
    `PY  - ${source.year}`,
    `T2  - ${source.venue}`,
  ];
  if (source.doi) lines.push(`DO  - ${source.doi}`);
  lines.push(`UR  - ${source.url}`, `KW  - ${source.sourceType}`, 'ER  - ');
  return lines.join('\n');
}

/**
 * Format one or more sources as citations.
 * @param {Source[]} sources
 * @param {CitationFormat} format
 * @returns {string}
 */
export function formatCitations(sources, format) {
  if (format === 'bibtex') return sources.map(bibtexCitation).join('\n\n');
  if (format === 'ris') return sources.map(risCitation).join('\n\n');
  return sources.map(textCitation).join('\n');
}

/** @type {Record<CitationFormat, { contentType: string, extension: string }>} */
export const CITATION_FILES = {
  text: { contentType: 'text/plain; charset=utf-8', extension: 'txt' },
  bibtex: { contentType: 'application/x-bibtex; charset=utf-8', extension: 'bib' },
  ris: { contentType: 'application/x-research-info-systems; charset=utf-8', extension: 'ris' },
};
