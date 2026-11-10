/** Small, pure helpers shared by the views. Nothing here touches the DOM, so Node can test it. */

/** @param {unknown} value */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);

/** @param {string} value */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Escape text and wrap the given words in <mark>. The text is escaped first, so it cannot inject markup.
 * @param {string} text
 * @param {string[]} words
 */
export function highlight(text, words) {
  const safe = esc(text);
  const usable = [...new Set(words.map((word) => esc(word)).filter((word) => word.length > 1))].sort((a, b) => b.length - a.length);
  if (!usable.length) return safe;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${usable.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  return safe.replace(pattern, '<mark>$1</mark>');
}

/**
 * Turn "#/claim/abc?x=1" into { name, params, query }.
 * @param {string} hash
 */
export function parseHash(hash) {
  const [pathPart, queryPart = ''] = hash.replace(/^#\/?/, '').split('?');
  const segments = pathPart.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  const [name = 'home', id] = segments;
  const known = ['home', 'search', 'explore', 'discover', 'claim', 'sources', 'source', 'glossary', 'timeline', 'method', 'api'];
  if (!known.includes(name)) return { name: 'notfound', id: undefined, query };
  return { name, id, query };
}

/**
 * @param {string} name
 * @param {string | undefined} [id]
 * @param {Record<string, string | undefined>} [query]
 */
export function buildHash(name, id, query = {}) {
  const pairs = Object.entries(query).filter(([, value]) => value !== undefined && value !== '');
  const search = pairs.length ? `?${new URLSearchParams(/** @type {[string, string][]} */ (pairs)).toString()}` : '';
  if (name === 'home') return '#/';
  return `#/${name}${id ? `/${encodeURIComponent(id)}` : ''}${search}`;
}

/**
 * @param {() => void} fn
 * @param {number} wait
 */
export function debounce(fn, wait) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const wrapped = () => { clearTimeout(timer); timer = setTimeout(fn, wait); };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}
