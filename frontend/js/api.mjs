/** Thin client for the /api/v1 endpoints. Errors carry the code and message the API sent. */

export class ApiError extends Error {
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
 * @param {string} path
 * @param {{ signal?: AbortSignal, method?: string, body?: unknown }} [options]
 */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      signal: options.signal,
      method: options.method ?? 'GET',
      headers: options.body ? { 'content-type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }
  if (response.ok) return response;
  /** @type {any} */
  let body = null;
  try { body = await response.json(); } catch { /* not JSON */ }
  throw new ApiError(response.status, body?.error?.code ?? 'error', body?.error?.message ?? `Request failed (${response.status})`);
}

/** @param {Record<string, string | number | undefined>} query */
const qs = (query) => {
  const pairs = Object.entries(query).filter(([, value]) => value !== undefined && value !== '');
  return pairs.length ? `?${new URLSearchParams(/** @type {[string, string][]} */ (pairs.map(([k, v]) => [k, String(v)]))).toString()}` : '';
};

export const api = {
  /** @param {AbortSignal} [signal] */
  meta: (signal) => request('/meta', { signal }).then((r) => r.json()),
  /** @param {string} q @param {AbortSignal} [signal] */
  search: (q, signal) => request(`/search${qs({ q })}`, { signal }).then((r) => r.json()),
  /** @param {Record<string, string | number | undefined>} query @param {AbortSignal} [signal] */
  claims: (query, signal) => request(`/claims${qs(query)}`, { signal }).then((r) => r.json()),
  /** @param {string} id @param {AbortSignal} [signal] */
  claim: (id, signal) => request(`/claims/${encodeURIComponent(id)}`, { signal }).then((r) => r.json()),
  /** @param {Record<string, string | number | undefined>} query @param {AbortSignal} [signal] */
  sources: (query, signal) => request(`/sources${qs(query)}`, { signal }).then((r) => r.json()),
  /** @param {string} id @param {AbortSignal} [signal] */
  source: (id, signal) => request(`/sources/${encodeURIComponent(id)}`, { signal }).then((r) => r.json()),
  /** @param {string} kind @param {string} id @param {string} format */
  cite: (kind, id, format) => request(`/${kind}/${encodeURIComponent(id)}/cite${qs({ format })}`).then((r) => r.text()),
  /** Link that downloads a citation file. @param {string} kind @param {string} id @param {string} format */
  citeDownloadUrl: (kind, id, format) => `/api/v1/${kind}/${encodeURIComponent(id)}/cite${qs({ format, download: 'true' })}`,
};
