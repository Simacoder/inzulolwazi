/**
 * inzulolwazi front end: hash routes, live search, filters, citations.
 * Pages are built by pure functions in js/render.js. This file only handles the browser: fetching, focus and events.
 */
import { api, ApiError } from './js/api.mjs';
import { t } from './js/i18n.mjs';
import { debounce, parseHash, buildHash } from './js/util.mjs';
import * as view from './js/render.mjs';

/** @type {{ lang: 'en' | 'zu', meta: any, route: ReturnType<typeof parseHash>, controller: AbortController | null }} */
const state = { lang: 'en', meta: null, route: parseHash(location.hash), controller: null };
const main = /** @type {HTMLElement} */ (document.querySelector('#view'));
const status = /** @type {HTMLElement} */ (document.querySelector('#status'));

try { if (localStorage.getItem('lang') === 'zu') state.lang = 'zu'; } catch { /* storage may be blocked */ }

/** @param {string} message */
function announce(message) { status.textContent = ''; setTimeout(() => { status.textContent = message; }, 30); }

/** Cancel whatever request is still running and start a fresh one. */
function freshSignal() {
  state.controller?.abort();
  state.controller = new AbortController();
  return state.controller.signal;
}

/** @param {unknown} error */
const isAbort = (error) => error instanceof DOMException && error.name === 'AbortError';

/** @param {string} title */
function setTitle(title) { document.title = title ? `${title} · inzulolwazi` : 'inzulolwazi · African history, with the evidence shown'; }

/** Move focus to the page heading so keyboard and screen-reader users land on the new content. */
function focusHeading() {
  const heading = main.querySelector('h1:not(.sr-only), h1');
  const target = /** @type {HTMLElement | null} */ (heading ?? main);
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function applyChrome() {
  document.documentElement.lang = state.lang;
  const names = { navSearch: '#/search', navExplore: '#/explore', navTimeline: '#/timeline', navGlossary: '#/glossary', navSources: '#/sources', navMethod: '#/method', navApi: '#/api' };
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const key = /** @type {keyof typeof names} */ (link.getAttribute('data-nav'));
    link.textContent = t(state.lang, key);
    if (names[key]?.slice(2) === state.route.name) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const button = /** @type {HTMLButtonElement} */ (document.querySelector('#lang'));
  button.textContent = state.lang === 'en' ? 'isiZulu' : 'English';
  button.setAttribute('aria-label', t(state.lang, 'langSwitch'));
  const skip = document.querySelector('#skip'); if (skip) skip.textContent = t(state.lang, 'skip');
  const footer = document.querySelector('#footerLine'); if (footer) footer.textContent = t(state.lang, 'footerLine');
  const note = /** @type {HTMLElement} */ (document.querySelector('#zuNote'));
  note.hidden = state.lang !== 'zu';
  note.textContent = t(state.lang, 'zuNote');
}

/** @param {string} html @param {string} title */
function show(html, title) {
  main.innerHTML = html;
  setTitle(title);
  applyChrome();
  focusHeading();
}

async function ensureMeta(signal) {
  if (!state.meta) state.meta = await api.meta(signal);
  return state.meta;
}

async function render() {
  state.route = parseHash(location.hash);
  const { name, id, query } = state.route;
  const signal = freshSignal();
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = view.loadingView(state.lang);
  try {
    const meta = await ensureMeta(signal);
    if (name === 'home') {
      const claims = await api.claims({ limit: 50 }, signal);
      show(view.homeView(state.lang, meta, claims.items), '');
    } else if (name === 'search') {
      show(view.searchPageShell(state.lang, query.q ?? ''), t(state.lang, 'navSearch'));
      if (query.q) await runSearch(query.q, signal); else renderSearchEmpty(meta);
      const input = /** @type {HTMLInputElement} */ (main.querySelector('#q'));
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    } else if (name === 'explore') {
      const page = await api.claims({ ...query, limit: 50 }, signal);
      show(view.exploreView(state.lang, meta, query, page), t(state.lang, 'exploreTitle'));
    } else if (name === 'sources') {
      const page = await api.sources({ ...query, limit: 50 }, signal);
      show(view.sourcesView(state.lang, meta, query, page), t(state.lang, 'sourcesTitle'));
    } else if (name === 'glossary') {
      const page = await api.glossary({ ...query, limit: 50 }, signal);
      show(view.glossaryPageView(state.lang, query, page), t(state.lang, 'glossaryTitle'));
    } else if (name === 'timeline') {
      const page = await api.chronology({ ...query, limit: 50 }, signal);
      show(view.timelinePageView(state.lang, query, page), t(state.lang, 'timelineTitle'));
    } else if (name === 'claim' && id) {
      const claim = await api.claim(id, signal);
      show(view.claimDetailView(state.lang, claim, meta, query.from), claim.topic);
      await loadCitations();
    } else if (name === 'source' && id) {
      const source = await api.source(id, signal);
      show(view.sourceDetailView(state.lang, source), source.title);
      await loadCitations();
    } else if (name === 'method') {
      show(view.methodView(state.lang, meta), t(state.lang, 'methodTitle'));
    } else if (name === 'api') {
      const res = await fetch('/api/v1/openapi.json', { signal });
      show(view.apiView(state.lang, await res.json(), meta), t(state.lang, 'apiTitle'));
    } else {
      show(view.notFoundView(state.lang), t(state.lang, 'notFoundTitle'));
    }
  } catch (error) {
    if (isAbort(error)) return;
    if (error instanceof ApiError && error.status === 404) show(view.notFoundView(state.lang), t(state.lang, 'notFoundTitle'));
    else show(view.errorView(state.lang, error instanceof Error ? error.message : String(error)), t(state.lang, 'errorTitle'));
  } finally {
    main.removeAttribute('aria-busy');
  }
}

/** @param {any} meta */
function renderSearchEmpty(meta) {
  const results = /** @type {HTMLElement} */ (main.querySelector('#results'));
  results.innerHTML = `<p class="try"><span>${t(state.lang, 'tryThese')}</span> ${meta.exampleQuestions.map((/** @type {string} */ q) => `<a class="pill" href="${buildHash('search', undefined, { q })}">${q.replace(/[&<>"]/g, '')}</a>`).join('')}</p>`;
}

/** @param {string} q @param {AbortSignal} signal */
async function runSearch(q, signal) {
  const results = /** @type {HTMLElement} */ (main.querySelector('#results'));
  results.setAttribute('aria-busy', 'true');
  try {
    const data = await api.search(q.trim(), signal);
    results.innerHTML = view.searchResultsView(state.lang, data);
    announce(data.results.length ? `${data.results.length} research leads` : t(state.lang, 'noResultsTitle'));
  } catch (error) {
    if (isAbort(error)) return;
    results.innerHTML = view.errorView(state.lang, error instanceof Error ? error.message : String(error));
  } finally {
    results.removeAttribute('aria-busy');
  }
}

/** Live search: update the address, then fetch, without rebuilding the input (so typing is never interrupted). */
const liveSearch = debounce(() => {
  const input = /** @type {HTMLInputElement | null} */ (document.querySelector('[data-live-search]'));
  if (!input) return;
  const q = input.value.trim();
  if (state.route.name === 'search') {
    history.replaceState(null, '', q ? buildHash('search', undefined, { q }) : '#/search');
    state.route = parseHash(location.hash);
    const results = /** @type {HTMLElement} */ (main.querySelector('#results'));
    if (q.length < 2) { state.controller?.abort(); results.innerHTML = ''; if (!q && state.meta) renderSearchEmpty(state.meta); return; }
    void runSearch(q, freshSignal());
  } else if (q.length >= 2) {
    location.hash = buildHash('search', undefined, { q });
  }
}, 250);

/** Filters on Explore and Sources: update the address, then refresh only the results area. */
const refreshList = debounce(async () => {
  const form = /** @type {HTMLFormElement | null} */ (document.querySelector('[data-filters]'));
  if (!form) return;
  const kind = form.dataset.filters;
  const query = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v)]).filter(([, v]) => v));
  history.replaceState(null, '', buildHash(kind ?? 'explore', undefined, query));
  state.route = parseHash(location.hash);
  const signal = freshSignal();
  try {
    const pick = {
      sources: { id: '#sources-results', load: () => api.sources({ ...query, limit: 50 }, signal), render: (/** @type {any} */ page) => view.sourcesView(state.lang, state.meta, query, page) },
      glossary: { id: '#glossary-results', load: () => api.glossary({ ...query, limit: 50 }, signal), render: (/** @type {any} */ page) => view.glossaryPageView(state.lang, query, page) },
      timeline: { id: '#timeline-results', load: () => api.chronology({ ...query, limit: 50 }, signal), render: (/** @type {any} */ page) => view.timelinePageView(state.lang, query, page) },
      explore: { id: '#explore-results', load: () => api.claims({ ...query, limit: 50 }, signal), render: (/** @type {any} */ page) => view.exploreView(state.lang, state.meta, query, page) },
    }[/** @type {'sources' | 'glossary' | 'timeline' | 'explore'} */ (kind ?? 'explore')];
    const target = /** @type {HTMLElement} */ (main.querySelector(pick.id));
    const html = pick.render(await pick.load());
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const fresh = doc.querySelector(pick.id);
    if (fresh) target.innerHTML = fresh.innerHTML;
  } catch (error) {
    if (!isAbort(error)) announce(error instanceof Error ? error.message : String(error));
  }
}, 200);

async function loadCitations() {
  const panel = /** @type {HTMLElement | null} */ (main.querySelector('.cite'));
  if (!panel) return;
  const { citeKind, citeId, citeName } = panel.dataset;
  const out = /** @type {HTMLElement} */ (panel.querySelector('[data-cite-out]'));
  const download = /** @type {HTMLAnchorElement} */ (panel.querySelector('[data-cite-download]'));
  let format = 'text';
  const load = async () => {
    try {
      out.textContent = await api.cite(String(citeKind), String(citeId), format);
      download.href = api.citeDownloadUrl(String(citeKind), String(citeId), format);
      download.setAttribute('download', `${citeName}.${format === 'bibtex' ? 'bib' : format === 'ris' ? 'ris' : 'txt'}`);
    } catch (error) { out.textContent = error instanceof Error ? error.message : String(error); }
  };
  panel.addEventListener('click', (event) => {
    const tab = /** @type {HTMLElement | null} */ ((/** @type {HTMLElement} */ (event.target)).closest('[data-cite-format]'));
    if (!tab) return;
    format = String(tab.dataset.citeFormat);
    panel.querySelectorAll('[data-cite-format]').forEach((el) => el.setAttribute('aria-pressed', String(el === tab)));
    void load();
  });
  await load();
}

/** @param {string} text */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = document.createElement('textarea'); area.value = text; area.className = 'sr-only'; document.body.append(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}

document.addEventListener('click', async (event) => {
  const target = /** @type {HTMLElement} */ (event.target);
  const copy = target.closest('[data-cite-copy]');
  if (copy) {
    const out = main.querySelector('[data-cite-out]');
    if (await copyText(out?.textContent ?? '')) { announce(t(state.lang, 'copied')); const label = copy.textContent; copy.textContent = t(state.lang, 'copied'); setTimeout(() => { copy.textContent = label; }, 1500); }
  } else if (target.closest('[data-share]')) {
    if (await copyText(location.href)) announce(t(state.lang, 'linkCopied'));
  } else if (target.closest('[data-print]')) {
    window.print();
  } else if (target.closest('[data-retry]')) {
    void render();
  } else if (target.closest('#lang')) {
    state.lang = state.lang === 'en' ? 'zu' : 'en';
    try { localStorage.setItem('lang', state.lang); } catch { /* ignore */ }
    void render();
  } else {
    const run = /** @type {HTMLElement | null} */ (target.closest('[data-api-run]'));
    if (run) {
      const out = /** @type {HTMLElement} */ (main.querySelector('[data-api-out]'));
      out.textContent = t(state.lang, 'loading');
      try {
        const res = await fetch(String(run.dataset.apiRun));
        const text = await res.text();
        try { out.textContent = JSON.stringify(JSON.parse(text), null, 2).slice(0, 6000); } catch { out.textContent = text.slice(0, 6000); }
      } catch { out.textContent = 'Network error'; }
    }
  }
});

document.addEventListener('input', (event) => {
  const target = /** @type {HTMLElement} */ (event.target);
  if (target.matches('[data-live-search]')) liveSearch();
  else if (target.matches('[data-filter]')) refreshList();
});
document.addEventListener('change', (event) => { if ((/** @type {HTMLElement} */ (event.target)).matches('[data-filter]')) refreshList(); });
document.addEventListener('submit', (event) => {
  const form = /** @type {HTMLFormElement} */ (event.target);
  if (form.matches('[data-search-form]')) {
    event.preventDefault();
    liveSearch.cancel();
    const q = String(new FormData(form).get('q') ?? '').trim();
    if (q) location.hash = buildHash('search', undefined, { q });
    if (state.route.name === 'search' && q) void render();
  } else if (form.matches('[data-filters]')) event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  const target = /** @type {HTMLElement} */ (event.target);
  const typing = target.matches('input, textarea, select') || target.isContentEditable;
  if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    const input = /** @type {HTMLInputElement | null} */ (document.querySelector('[data-live-search]'));
    if (input) input.focus(); else location.hash = '#/search';
  } else if (event.key === 'Escape' && target.matches('[data-live-search]')) {
    const input = /** @type {HTMLInputElement} */ (target);
    if (input.value) { input.value = ''; liveSearch(); }
  }
});

window.addEventListener('hashchange', () => void render());
applyChrome();
void render();
