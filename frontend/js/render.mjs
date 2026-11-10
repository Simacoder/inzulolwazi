/**
 * Views as pure functions: data in, HTML string out. They read no globals, so Node can test them.
 * Every value that came from the API goes through esc() or highlight().
 */
import { API_BASE } from './config.mjs';
import { esc, highlight, buildHash } from './util.mjs';
import { t } from './i18n.mjs';
import { LENS_QUESTIONS, QUIZ_QUESTIONS } from './discovery.mjs';

/** @typedef {'en' | 'zu'} Lang */

/** @param {Lang} lang @param {any} claim */
export const gradeChip = (lang, claim) => `<span class="chip chip-grade chip-${esc(claim.status)}" title="${esc(claim.gradeDescription)}">${esc(claim.status === 'draft' ? t(lang, 'draft') : claim.gradeLabel)}</span>`;

/** @param {{ type: string, label: string, count?: number }} entry */
export const typeChip = (entry) => `<span class="chip chip-type type-${esc(entry.type)}">${esc(entry.label)}${(entry.count ?? 0) > 1 ? ` ×${entry.count}` : ''}</span>`;

/** @param {Lang} lang @param {any} claim */
function sourceCountLine(lang, claim) {
  return `<span class="muted">${esc(t(lang, 'sourcesN')(claim.sourceCount))}</span>`;
}

/** @param {Lang} lang @param {any} claim @param {string[]} [words] */
export function claimCard(lang, claim, words = []) {
  return `<article class="card">
    <div class="card-top">${gradeChip(lang, claim)}${sourceCountLine(lang, claim)}</div>
    <h3><a href="${buildHash('claim', claim.id)}">${highlight(claim.topic, words)}</a></h3>
    <p>${highlight(claim.rationale, words)}</p>
    <div class="chips">${claim.sourceTypes.map(typeChip).join('')}</div>
    <a class="card-link" href="${buildHash('claim', claim.id)}">${esc(t(lang, 'openTopic'))} <span aria-hidden="true">→</span></a>
  </article>`;
}

/** @param {Lang} lang @param {string} message */
export const errorView = (lang, message) => `<section class="panel notice" role="alert"><h1>${esc(t(lang, 'errorTitle'))}</h1><p>${esc(message)}</p><button type="button" class="button" data-retry>${esc(t(lang, 'retry'))}</button></section>`;
/** @param {Lang} lang */
export const notFoundView = (lang) => `<section class="panel notice"><h1>${esc(t(lang, 'notFoundTitle'))}</h1><p>${esc(t(lang, 'notFoundText'))}</p><a class="button" href="#/">${esc(t(lang, 'goHome'))}</a></section>`;
/** @param {Lang} lang */
export const loadingView = (lang) => `<p class="loading" role="status">${esc(t(lang, 'loading'))}</p>`;

/** @param {Lang} lang @param {any} meta @param {any[]} claims */
export function homeView(lang, meta, claims) {
  const c = meta.counts;
  const types = Object.keys(c.sourcesByType).length;
  return `<section class="hero">
      <p class="eyebrow">${esc(t(lang, 'eyebrow'))}</p>
      <h1>${esc(t(lang, 'heroTitle'))} <em>${esc(t(lang, 'heroEm'))}</em></h1>
      <p class="lead">${esc(t(lang, 'heroText'))}</p>
      ${searchBox(lang, '')}
      <p class="try"><span>${esc(t(lang, 'tryThese'))}</span> ${meta.exampleQuestions.map((/** @type {string} */ q) => `<a class="pill" href="${buildHash('search', undefined, { q })}">${esc(q)}</a>`).join('')}</p>
      <p class="hint">${esc(t(lang, 'shortcut'))}</p>
    </section>
    <dl class="stats" aria-label="Collection size">
      <div><dt>${esc(t(lang, 'statClaims'))}</dt><dd>${c.claims}</dd></div>
      <div><dt>${esc(t(lang, 'statSources'))}</dt><dd>${c.sources}</dd></div>
      <div><dt>${esc(t(lang, 'statTypes'))}</dt><dd>${types}</dd></div>
      <div><dt>${esc(t(lang, 'navGlossary'))}</dt><dd>${c.terms}</dd></div>
      <div><dt>${esc(t(lang, 'navTimeline'))}</dt><dd>${c.events}</dd></div>
      <div><dt>${esc(t(lang, 'statReviewed'))}</dt><dd>${c.reviewed}</dd></div>
    </dl>
    <aside class="panel note"><strong>${esc(t(lang, 'honestTitle'))}</strong> ${esc(t(lang, 'honestText'))}</aside>
    <section aria-labelledby="topics-h"><div class="section-head"><h2 id="topics-h">${esc(t(lang, 'topics'))}</h2><a href="#/explore">${esc(t(lang, 'browseAll'))} →</a></div>
      <div class="grid">${claims.map((claim) => claimCard(lang, claim)).join('')}</div></section>`;
}

/** @param {Lang} lang @param {string} value */
export function searchBox(lang, value) {
  return `<form class="searchbox" role="search" data-search-form>
    <label class="sr-only" for="q">${esc(t(lang, 'searchLabel'))}</label>
    <input id="q" name="q" type="search" value="${esc(value)}" maxlength="300" autocomplete="off" enterkeyhint="search" placeholder="${esc(t(lang, 'searchPlaceholder'))}" data-live-search />
    <button type="submit" class="button button-primary">${esc(t(lang, 'searchButton'))}</button>
  </form>`;
}

/** @param {Lang} lang @param {string} strength */
const strengthLabel = (lang, strength) => t(lang, strength === 'close' ? 'matchClose' : strength === 'partial' ? 'matchPartial' : 'matchLoose');

/** @param {Lang} lang @param {any} entry @param {string[]} [words] */
export function termCard(lang, entry, words = []) {
  return `<article class="card term">
    <h3><a href="${buildHash('glossary', undefined, { q: entry.term })}">${highlight(entry.term, words)}</a></h3>
    ${entry.aliases.length ? `<p class="muted small">${esc(t(lang, 'alsoCalled'))}: ${esc(entry.aliases.join(', '))}</p>` : ''}
    <p>${highlight(entry.definition, words)}</p>
    <p class="framing"><strong>${esc(t(lang, 'framingHeading'))}.</strong> ${esc(entry.framing)}</p>
    <div class="chips">${entry.sources.map((/** @type {any} */ s) => `<a class="chip chip-type type-${esc(s.sourceType)}" href="${buildHash('source', s.id)}" title="${esc(s.title)}">${esc(s.authors[0])} (${esc(s.year)}) · ${esc(s.sourceTypeLabel)}</a>`).join('')}</div>
  </article>`;
}

/** @param {Lang} lang @param {any} entry @param {string[]} [words] */
export function eventCard(lang, entry, words = []) {
  return `<article class="event" id="${esc(entry.id)}">
    <p class="when">${esc(entry.label)}</p>
    <div class="card">
      <p>${highlight(entry.event, words)}</p>
      <p class="framing"><strong>${esc(t(lang, 'framingHeading'))}.</strong> ${esc(entry.framing)}</p>
      <div class="chips">${entry.sources.map((/** @type {any} */ s) => `<a class="chip chip-type type-${esc(s.sourceType)}" href="${buildHash('source', s.id)}" title="${esc(s.title)}">${esc(s.authors[0])} (${esc(s.year)}) · ${esc(s.sourceTypeLabel)}</a>`).join('')}</div>
    </div>
  </article>`;
}

/** @param {Lang} lang @param {Record<string,string>} query @param {any} page */
export function glossaryPageView(lang, query, page) {
  const filters = `<form class="filters" data-filters="glossary"><label class="field grow"><span>${esc(t(lang, 'filterWords'))}</span><input type="search" name="q" value="${esc(query.q ?? '')}" maxlength="100" data-filter /></label></form>`;
  const body = page.items.length
    ? `<p class="muted" aria-live="polite">${esc(t(lang, 'showing')(page.items.length, page.total))}</p><div class="stack">${page.items.map((/** @type {any} */ e) => termCard(lang, e, (query.q ?? '').split(/\s+/).filter(Boolean))).join('')}</div>`
    : `<section class="panel notice" aria-live="polite"><p>${esc(t(lang, 'noEntries'))}</p><a class="button" href="#/glossary">${esc(t(lang, 'resetFilters'))}</a></section>`;
  return `<h1>${esc(t(lang, 'glossaryTitle'))}</h1><p class="lead">${esc(t(lang, 'glossaryIntro'))}</p>${filters}<div id="glossary-results">${body}</div>`;
}

/** @param {Lang} lang @param {Record<string,string>} query @param {any} page */
export function timelinePageView(lang, query, page) {
  const filters = `<form class="filters" data-filters="timeline">
    <label class="field grow"><span>${esc(t(lang, 'filterWords'))}</span><input type="search" name="q" value="${esc(query.q ?? '')}" maxlength="100" data-filter /></label>
    <label class="field"><span>${esc(t(lang, 'fromYear'))}</span><input type="number" name="from" value="${esc(query.from ?? '')}" data-filter /></label>
    <label class="field"><span>${esc(t(lang, 'toYear'))}</span><input type="number" name="to" value="${esc(query.to ?? '')}" data-filter /></label></form><p class="muted small">${esc(t(lang, 'yearHint'))}</p>`;
  const body = page.items.length
    ? `<p class="muted" aria-live="polite">${esc(t(lang, 'showing')(page.items.length, page.total))}</p><div class="timeline">${page.items.map((/** @type {any} */ e) => eventCard(lang, e, (query.q ?? '').split(/\s+/).filter(Boolean))).join('')}</div>`
    : `<section class="panel notice" aria-live="polite"><p>${esc(t(lang, 'noEntries'))}</p><a class="button" href="#/timeline">${esc(t(lang, 'resetFilters'))}</a></section>`;
  return `<h1>${esc(t(lang, 'timelineTitle'))}</h1><p class="lead">${esc(t(lang, 'timelineIntro'))}</p>${filters}<div id="timeline-results">${body}</div>`;
}

/** @param {Lang} lang @param {any} data */
export function searchResultsView(lang, data) {
  const head = `<p class="results-for" aria-live="polite">${esc(t(lang, 'resultsFor'))} <strong>“${esc(data.query)}”</strong></p>`;
  const words = data.query.split(/\s+/).filter(Boolean);
  const terms = data.terms.length ? `<section aria-labelledby="terms-h"><h2 id="terms-h">${esc(t(lang, 'termsHeading'))}</h2><div class="stack">${data.terms.map((/** @type {any} */ e) => termCard(lang, e, words)).join('')}</div></section>` : '';
  const timeline = data.timeline.length ? `<section aria-labelledby="time-h"><h2 id="time-h">${esc(t(lang, 'timelineHeading'))}</h2><div class="timeline">${data.timeline.map((/** @type {any} */ e) => eventCard(lang, e, words)).join('')}</div></section>` : '';
  const browse = `<p class="try"><a class="pill" href="#/timeline">${esc(t(lang, 'browseTimeline'))}</a><a class="pill" href="#/glossary">${esc(t(lang, 'browseTerms'))}</a></p>`;
  if (!data.results.length && (terms || timeline)) return `${head}${terms}${timeline}${browse}`;
  if (!data.results.length) {
    return `${head}<section class="panel notice"><h2>${esc(t(lang, 'noResultsTitle'))}</h2><p>${esc(t(lang, 'noResultsText'))}</p>
      <ul class="plain">${data.suggestions.map((/** @type {any} */ s) => `<li><a href="${buildHash('claim', s.id)}">${esc(s.topic)}</a></li>`).join('')}</ul></section>${browse}`;
  }
  const answerable = data.results.filter((/** @type {any} */ r) => r.answerable);
  const answer = answerable.length
    ? `<section class="panel answer"><h2>${esc(t(lang, 'answerHeading'))}</h2><p>${esc(data.answer)}</p></section>`
    : `<aside class="panel note"><strong>${esc(t(lang, 'abstainHeading'))}.</strong> ${esc(t(lang, 'leadsNote'))}</aside>`;
  const cards = data.results.map((/** @type {any} */ r) => `<article class="card result">
      <div class="card-top">${gradeChip(lang, r.claim)}<span class="chip chip-match match-${esc(r.strength)}">${esc(strengthLabel(lang, r.strength))}</span><span class="muted">${esc(t(lang, 'sourcesN')(r.claim.sourceCount))}</span></div>
      <h3><a href="${buildHash('claim', r.claim.id, { from: data.query })}">${highlight(r.claim.topic, r.highlights)}</a></h3>
      <p>${highlight(r.claim.rationale, r.highlights)}</p>
      ${r.matchedTerms.length ? `<p class="muted small">${esc(t(lang, 'matchedWords'))}: ${r.matchedTerms.map((/** @type {string} */ w) => `<mark>${esc(w)}</mark>`).join(' ')}</p>` : ''}
      <div class="chips">${r.claim.sourceTypes.map(typeChip).join('')}</div>
      <a class="card-link" href="${buildHash('claim', r.claim.id, { from: data.query })}">${esc(t(lang, 'openTopic'))} <span aria-hidden="true">→</span></a>
    </article>`).join('');
  return `${head}${terms}${timeline}${answer}<div class="grid">${cards}</div>${browse}`;
}

/** @param {Lang} lang @param {string} query */
export const searchPageShell = (lang, query) => `<section class="hero hero-compact"><h1 class="sr-only">${esc(t(lang, 'navSearch'))}</h1>${searchBox(lang, query)}</section><div id="results" aria-live="polite"></div>`;

/**
 * @param {Lang} lang
 * @param {{ label: string, name: string, value: string, options: [string, string][] }} spec
 */
function select(lang, { label, name, value, options }) {
  return `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}" data-filter>${options.map(([v, text]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}

/** @param {Lang} lang @param {any} meta @param {Record<string,string>} query @param {any} page */
export function exploreView(lang, meta, query, page) {
  const typeOptions = /** @type {[string, string][]} */ ([['', t(lang, 'any')], ...Object.entries(meta.sourceTypes).map(([k, v]) => [k, /** @type {any} */ (v).label])]);
  const filters = `<form class="filters" data-filters="explore">
      <label class="field grow"><span>${esc(t(lang, 'filterWords'))}</span><input type="search" name="q" value="${esc(query.q ?? '')}" maxlength="100" data-filter /></label>
      ${select(lang, { label: t(lang, 'filterStatus'), name: 'status', value: query.status ?? '', options: [['', t(lang, 'any')], ['draft', t(lang, 'draft')], ['published', t(lang, 'published')]] })}
      ${select(lang, { label: t(lang, 'filterType'), name: 'sourceType', value: query.sourceType ?? '', options: typeOptions })}
      ${select(lang, { label: t(lang, 'sortBy'), name: 'sort', value: query.sort ?? 'topic', options: [['topic', t(lang, 'sortTopic')], ['sources', t(lang, 'sortSources')], ['year', t(lang, 'sortYear')]] })}
    </form>`;
  const words = (query.q ?? '').split(/\s+/).filter(Boolean);
  const body = page.items.length
    ? `<p class="muted" aria-live="polite">${esc(t(lang, 'showing')(page.items.length, page.total))}</p><div class="grid">${page.items.map((/** @type {any} */ c) => claimCard(lang, c, words)).join('')}</div>`
    : `<section class="panel notice" aria-live="polite"><p>${esc(t(lang, 'nothingMatches'))}</p><a class="button" href="#/explore">${esc(t(lang, 'resetFilters'))}</a></section>`;
  return `<h1>${esc(t(lang, 'exploreTitle'))}</h1><p class="lead">${esc(t(lang, 'exploreIntro'))}</p>${filters}<div id="explore-results">${body}</div>`;
}

/** @param {Lang} lang @param {any} source */
export function sourceCard(lang, source) {
  return `<article class="card">
    <div class="card-top"><span class="chip chip-type type-${esc(source.sourceType)}" title="${esc(source.sourceTypeDescription)}">${esc(source.sourceTypeLabel)}</span><span class="muted">${esc(source.year)}</span></div>
    <h3><a href="${buildHash('source', source.id)}">${esc(source.title)}</a></h3>
    <p class="muted small">${esc(source.authors.slice(0, 3).join(', '))}${source.authors.length > 3 ? ' et al.' : ''} · ${esc(source.venue)}</p>
    <p>${esc(source.summary)}</p>
  </article>`;
}

/** @param {Lang} lang @param {any} meta @param {Record<string,string>} query @param {any} page */
export function sourcesView(lang, meta, query, page) {
  const typeOptions = /** @type {[string, string][]} */ ([['', t(lang, 'any')], ...Object.entries(meta.sourceTypes).map(([k, v]) => [k, /** @type {any} */ (v).label])]);
  const filters = `<form class="filters" data-filters="sources">
      <label class="field grow"><span>${esc(t(lang, 'filterWords'))}</span><input type="search" name="q" value="${esc(query.q ?? '')}" maxlength="100" data-filter /></label>
      ${select(lang, { label: t(lang, 'filterType'), name: 'type', value: query.type ?? '', options: typeOptions })}
      ${select(lang, { label: t(lang, 'sortBy'), name: 'sort', value: query.sort ?? 'year', options: [['year', t(lang, 'year')], ['title', 'A–Z'], ['type', t(lang, 'filterType')]] })}
    </form>`;
  const body = page.items.length
    ? `<p class="muted" aria-live="polite">${esc(t(lang, 'showing')(page.items.length, page.total))}</p><div class="grid">${page.items.map((/** @type {any} */ s) => sourceCard(lang, s)).join('')}</div>`
    : `<section class="panel notice" aria-live="polite"><p>${esc(t(lang, 'nothingMatches'))}</p><a class="button" href="#/sources">${esc(t(lang, 'resetFilters'))}</a></section>`;
  const kinds = Object.values(meta.sourceTypes).map((/** @type {any} */ v) => `<dt>${esc(v.label)}</dt><dd>${esc(v.description)}</dd>`).join('');
  return `<h1>${esc(t(lang, 'sourcesTitle'))}</h1><p class="lead">${esc(t(lang, 'sourcesIntro'))}</p>${filters}<div id="sources-results">${body}</div>
    <details class="panel"><summary>${esc(t(lang, 'sourceTypesHeading'))}</summary><dl class="defs">${kinds}</dl></details>`;
}

/** @param {Lang} lang @param {string} kind @param {string} id @param {string} name */
export function citePanel(lang, kind, id, name) {
  return `<section class="panel cite" data-cite-kind="${esc(kind)}" data-cite-id="${esc(id)}" data-cite-name="${esc(name)}" aria-labelledby="cite-h">
    <h2 id="cite-h">${esc(t(lang, 'cite'))}</h2>
    <div class="tabs" role="group" aria-label="${esc(t(lang, 'cite'))}">
      ${['text', 'bibtex', 'ris'].map((f, i) => `<button type="button" class="tab" data-cite-format="${f}" aria-pressed="${i === 0}">${esc(t(lang, f === 'text' ? 'formatText' : f === 'bibtex' ? 'formatBibtex' : 'formatRis'))}</button>`).join('')}
    </div>
    <pre class="cite-out" tabindex="0" data-cite-out>${esc(t(lang, 'loading'))}</pre>
    <div class="actions"><button type="button" class="button" data-cite-copy>${esc(t(lang, 'copyCitations'))}</button><a class="button" data-cite-download href="#">${esc(t(lang, 'downloadCitations'))}</a></div>
  </section>`;
}

/** @param {Lang} lang @param {any} claim @param {any} meta */
function feedbackLinks(lang, claim, meta) {
  const repo = String(meta.repository).replace(/\/$/, '');
  const link = (/** @type {string} */ kind, /** @type {string} */ labelKey) => {
    const title = `${kind}: ${claim.topic} (${claim.id})`;
    const body = `Topic: ${claim.topic}\nId: ${claim.id}\n\nWhat would you like us to know?\n`;
    return `<a class="button" rel="noopener" target="_blank" href="${esc(`${repo}/issues/new?${new URLSearchParams({ title, body, labels: kind })}`)}">${esc(t(lang, /** @type {any} */ (labelKey)))}</a>`;
  };
  return `<section class="panel"><h2>${esc(t(lang, 'feedbackHeading'))}</h2><div class="actions">${link('source_suggestion', 'feedbackSource')}${link('translation_issue', 'feedbackTranslation')}${link('correction', 'feedbackCorrection')}</div><p class="muted small">${esc(t(lang, 'feedbackNote'))}</p></section>`;
}

/** @param {Lang} lang @param {any} claim @param {any} meta @param {string} [from] */
export function claimDetailView(lang, claim, meta, from) {
  const r = claim.readiness;
  const done = r.checks.filter((/** @type {any} */ c) => c.done).length;
  const back = from ? `<a class="back" href="${buildHash('search', undefined, { q: from })}">← ${esc(t(lang, 'backToSearch'))}</a>` : `<a class="back" href="#/explore">← ${esc(t(lang, 'back'))}</a>`;
  const checks = r.checks.map((/** @type {any} */ c) => `<li class="${c.done ? 'done' : 'open'}"><span class="mark" aria-hidden="true">${c.done ? '✓' : '○'}</span><span><strong>${esc(c.label)}</strong><br /><span class="muted">${esc(c.detail)} · ${esc(t(lang, c.done ? 'checklistDone' : 'checklistOpen'))}</span></span></li>`).join('');
  const terms = claim.contestedTerms.length
    ? `<section class="panel note"><h2>${esc(t(lang, 'termHeading'))}: ${esc(claim.contestedTerms.join(', '))}</h2>${claim.termNotes.length ? claim.termNotes.map((/** @type {string} */ note) => `<p>${esc(note)}</p>`).join('') : `<p>${esc(t(lang, 'termPending'))}</p>`}</section>` : '';
  const sources = claim.sources.map((/** @type {any} */ s) => sourceCard(lang, s)).join('');
  const zuReviewed = claim.translation.method === 'human_reviewed';
  return `${back}
    <header class="claim-head"><div class="card-top">${gradeChip(lang, claim)}${claim.status === 'draft' ? `<span class="chip chip-warn">${esc(t(lang, 'notReviewed'))}</span>` : ''}</div>
      <h1>${esc(claim.topic)}</h1>
      <div class="actions no-print"><button type="button" class="button" data-share>${esc(t(lang, 'share'))}</button><button type="button" class="button" data-print>${esc(t(lang, 'print'))}</button></div></header>
    <div class="columns">
      <section class="panel" lang="en"><h2>${esc(t(lang, 'original'))}</h2><p class="statement">${esc(claim.statement.en)}</p></section>
      <section class="panel" lang="zu"><h2>${esc(t(lang, 'translationIsiZulu'))}</h2><p class="statement">${esc(claim.translation.zu)}</p>
        <p class="label ${zuReviewed ? 'label-ok' : 'label-warn'}">${esc(claim.translation.label)}</p></section>
    </div>
    <section class="panel"><h2>${esc(t(lang, 'whyFramed'))}</h2><p>${esc(claim.rationale)}</p><p class="muted small"><strong>${esc(t(lang, 'gradeHeading'))}:</strong> ${esc(claim.gradeLabel)}. ${esc(claim.gradeDescription)} · <strong>${esc(t(lang, 'reviewers'))}:</strong> ${claim.reviewers.length ? esc(claim.reviewers.map((/** @type {any} */ v) => `${v.name} (${v.date})`).join(', ')) : esc(t(lang, 'noReviewers'))}</p></section>
    ${terms}
    <section class="panel"><h2>${esc(t(lang, 'checklist'))}</h2><p><meter min="0" max="${r.checks.length}" value="${done}" aria-label="${done} of ${r.checks.length}">${done} / ${r.checks.length}</meter> <span class="muted">${done} / ${r.checks.length}</span></p><ul class="checks">${checks}</ul></section>
    <section><h2>${esc(t(lang, 'evidence'))}</h2>${claim.sourceCount < 2 ? `<p class="muted">${esc(t(lang, 'oneSourceNote'))}</p>` : ''}<div class="grid">${sources}</div></section>
    ${citePanel(lang, 'claims', claim.id, `${claim.id}-sources`)}
    ${feedbackLinks(lang, claim, meta)}`;
}

/** @param {Lang} lang @param {any} source */
export function sourceDetailView(lang, source) {
  const rows = [
    [t(lang, 'authors'), source.authors.join(', ')], [t(lang, 'venue'), source.venue], [t(lang, 'year'), source.year], [t(lang, 'licence'), `${source.licence}. ${source.licenceNote}`],
    ...(source.authorBackground ? [[t(lang, 'authorBackground'), source.authorBackground]] : []),
  ];
  return `<a class="back" href="#/sources">← ${esc(t(lang, 'back'))}</a>
    <header class="claim-head"><div class="card-top"><span class="chip chip-type type-${esc(source.sourceType)}">${esc(source.sourceTypeLabel)}</span></div><h1>${esc(source.title)}</h1><p class="muted">${esc(source.sourceTypeDescription)}</p>
      <div class="actions no-print"><a class="button button-primary" rel="noopener" target="_blank" href="${esc(source.doiUrl ?? source.url)}">${esc(t(lang, 'openOriginal'))} ↗</a></div></header>
    <dl class="defs panel">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <section class="panel"><h2>${esc(t(lang, 'summary'))}</h2><p>${esc(source.summary)}</p></section>
    <section class="panel"><h2>${esc(t(lang, 'usedIn'))}</h2><ul class="plain">${source.usedIn.map((/** @type {any} */ c) => `<li><a href="${buildHash('claim', c.id)}">${esc(c.topic)}</a> <span class="chip chip-${esc(c.status)}">${esc(t(lang, c.status === 'draft' ? 'draft' : 'published'))}</span></li>`).join('')}</ul></section>
    ${citePanel(lang, 'sources', source.id, source.id)}`;
}

/** @param {Lang} lang @param {any} meta */
export function methodView(lang, meta) {
  const rules = [1, 2, 3, 4, 5, 6, 7].map((n) => `<article class="panel"><span class="step">0${n}</span><h2>${esc(t(lang, /** @type {any} */ (`m${n}t`)))}</h2><p>${esc(t(lang, /** @type {any} */ (`m${n}`)))}</p></article>`).join('');
  const grades = Object.values(meta.grades).map((/** @type {any} */ g) => `<dt>${esc(g.label)}</dt><dd>${esc(g.description)}</dd>`).join('');
  return `<h1>${esc(t(lang, 'methodTitle'))}</h1><p class="lead">${esc(t(lang, 'methodIntro'))}</p><div class="grid">${rules}</div>
    <section class="panel"><h2>${esc(t(lang, 'gradesHeading'))}</h2><dl class="defs">${grades}</dl></section>
    <section class="panel"><h2>${esc(t(lang, 'sourceTypesHeading'))}</h2><dl class="defs">${Object.values(meta.sourceTypes).map((/** @type {any} */ v) => `<dt>${esc(v.label)}</dt><dd>${esc(v.description)}</dd>`).join('')}</dl></section>`;
}

/** @param {Lang} lang @param {any} spec @param {any} meta */
export function apiView(lang, spec, meta) {
  const rows = Object.entries(spec.paths).flatMap(([path, ops]) => Object.entries(/** @type {any} */ (ops)).map(([method, op]) => ({ path, method: method.toUpperCase(), op: /** @type {any} */ (op) })));
  const examples = {
    claimId: meta.examples.claimId, sourceId: meta.examples.sourceId,
  };
  const fill = (/** @type {string} */ path) => path.replace('{id}', path.includes('/claims') ? examples.claimId : examples.sourceId);
  const list = rows.map(({ path, method, op }) => {
    const url = fill(path);
    const runnable = method === 'GET' && !path.includes('/search') ;
    const tryUrl = path === '/api/v1/search' && method === 'GET' ? '/api/v1/search?q=pyramids' : url;
    return `<li class="endpoint"><div><span class="verb verb-${method.toLowerCase()}">${method}</span> <code>${esc(path)}</code></div><p class="muted">${esc(op.summary)}</p>${method === 'GET' && (runnable || path === '/api/v1/search') ? `<button type="button" class="button" data-api-run="${esc(tryUrl)}">${esc(t(lang, 'apiRun'))} <code>${esc(tryUrl)}</code></button>` : ''}</li>`;
  }).join('');
  return `<h1>${esc(t(lang, 'apiTitle'))}</h1><p class="lead">${esc(t(lang, 'apiIntro'))}</p>
    <div class="actions"><a class="button" href="${esc(API_BASE)}/api/v1/openapi.json" target="_blank" rel="noopener">${esc(t(lang, 'apiSpec'))} ↗</a></div>
    <section class="panel"><h2>${esc(t(lang, 'apiExample'))}</h2><pre class="cite-out" tabindex="0">curl "${esc(API_BASE || 'https://YOUR-HOST')}/api/v1/search?q=pyramids"</pre></section>
    <section><h2>${esc(t(lang, 'apiEndpoints'))}</h2><ul class="plain endpoints">${list}</ul><pre class="cite-out" tabindex="0" data-api-out aria-live="polite">${esc(t(lang, 'apiTry'))}…</pre></section>`;
}

/** @param {Lang} lang @param {any[]} cases */
export function discoveryView(lang, cases) {
  const languageNote = lang === 'zu' ? '<p class="panel language-note" lang="zu">Leli khasi le-Discovery litholakala ngesiNgisi okwamanje.</p>' : '';
  const comparisonRows = cases.map((item) => `<tr><th scope="row"><strong>${esc(item.title)}</strong><span>${esc(item.period)} · ${esc(item.region)}</span></th><td>${esc(item.comparison.work)}</td><td>${esc(item.comparison.support)}<br /><span class="muted">${esc(item.comparison.circulation)}</span></td><td>${esc(item.comparison.limit)}</td></tr>`).join('');
  const cards = cases.map((item) => `<article class="card discovery-card" id="${esc(item.id)}">
      <p class="eyebrow">${esc(item.region)} · ${esc(item.period)}</p>
      <h2>${esc(item.title)}</h2><p>${esc(item.finding)}</p>
      <p class="framing"><strong>${esc(t(lang, 'framingHeading'))}.</strong> ${esc(item.lens)}</p>
      <ul class="factor-list">${item.factors.map((/** @type {string} */ factor) => `<li>${esc(factor)}</li>`).join('')}</ul>
      <div class="chips">${item.sources.map((/** @type {{ label: string, url: string }} */ source) => `<a class="chip chip-type" rel="noopener" target="_blank" href="${esc(source.url)}">${esc(source.label)} ↗</a>`).join('')}</div>
    </article>`).join('');
  return `<div class="discovery-page" lang="en">${languageNote}<section class="hero hero-compact"><p class="eyebrow">inzulolwazi · Discover</p><h1>${esc(t(lang, 'discoveryTitle'))}</h1><p class="lead">${esc(t(lang, 'discoveryIntro'))}</p></section>
    <section class="panel note"><h2>${esc(t(lang, 'discoveryMethodTitle'))}</h2><p>${esc(t(lang, 'discoveryMethod'))}</p></section>
    <section class="panel african-frame"><h2>${esc(t(lang, 'africanFrameTitle'))}</h2><p>${esc(t(lang, 'africanFrameText'))}</p></section>
    <section class="comparison-section"><h2>${esc(t(lang, 'comparisonTitle'))}</h2><div class="comparison-scroll" tabindex="0" role="region" aria-label="Scrollable comparative case table"><table class="comparison-table"><thead><tr><th scope="col">${esc(t(lang, 'comparisonCase'))}</th><th scope="col">${esc(t(lang, 'comparisonWork'))}</th><th scope="col">${esc(t(lang, 'comparisonSupport'))}</th><th scope="col">${esc(t(lang, 'comparisonLimit'))}</th></tr></thead><tbody>${comparisonRows}</tbody></table></div></section>
    <section class="discovery-grid" aria-label="Comparative historical case studies">${cards}</section>
    <section class="panel protagoras"><h2>${esc(t(lang, 'protagorasTitle'))}</h2><p>${esc(t(lang, 'protagorasText'))} <a rel="noopener" target="_blank" href="https://atlas.perseus.tufts.edu/library/passage/urn%3Acts%3AgreekLit%3Atlg0059.tlg006.perseus-eng2%3A152-156/">Plato, Theaetetus 152a ↗</a></p></section>
    ${discoveryQuizView(lang)}</div>`;
}

/** @param {Lang} lang */
function discoveryQuizView(lang) {
  const questions = QUIZ_QUESTIONS.map((question, index) => `<fieldset class="quiz-question"><legend><span class="step">${String(index + 1).padStart(2, '0')}</span> ${esc(question.prompt)}</legend>
      ${question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="q${index}" value="${optionIndex}" required /><span>${esc(option.text)}</span></label>`).join('')}
    </fieldset>`).join('');
  const lensQuestions = LENS_QUESTIONS.map((question, index) => `<fieldset class="quiz-question lens-question"><legend><span class="step">L${index + 1}</span> ${esc(question.prompt)}</legend>
      ${question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="lens${index}" value="${optionIndex}" required /><span>${esc(option.text)}</span></label>`).join('')}
    </fieldset>`).join('');
  return `<section class="quiz-section" id="discovery-quiz"><h2>${esc(t(lang, 'quizTitle'))}</h2><p class="lead">${esc(t(lang, 'quizIntro'))}</p>
      <form class="quiz-form" data-discovery-quiz><h3>Part one · evidence check</h3>${questions}<h3>Part two · choose your lenses</h3><p class="muted">Choose the case or perspective you want to explore. These choices are preferences for this quiz, not fixed traits.</p>${lensQuestions}<button class="button button-primary" type="submit">${esc(t(lang, 'quizSubmit'))}</button></form>
      <div id="quiz-result" aria-live="polite"></div>
      <section class="panel leaderboard" id="quiz-leaderboard"><h3>${esc(t(lang, 'leaderboardTitle'))}</h3><p class="muted small">${esc(t(lang, 'leaderboardNote'))}</p><ol data-score-list></ol></section>
    </section>`;
}

/** @param {Lang} lang @param {{ correct: number, answers: number[], lensMix: {label: string, count: number}[], leaderboard: {score:number,date:string}[] }} result */
export function discoveryResultView(lang, result) {
  const mix = result.lensMix.map((item) => `<li><span>${esc(item.label)}</span><strong>${item.count} ${esc(t(lang, 'lensChoice'))}</strong></li>`).join('');
  const feedback = QUIZ_QUESTIONS.map((question, index) => {
    const answer = question.options[result.answers[index]];
    return `<li><strong>${answer.correct ? '✓' : '↗'} ${esc(answer.text)}</strong><p class="muted small">${esc(answer.why)} <a rel="noopener" target="_blank" href="${esc(question.source.url)}">${esc(question.source.label)} ↗</a></p></li>`;
  }).join('');
  const scores = result.leaderboard.map((item) => `<li><strong>${item.score} / ${QUIZ_QUESTIONS.length}</strong><span>${esc(new Date(item.date).toLocaleDateString())}</span></li>`).join('');
  return `<section class="panel quiz-result"><h3>${esc(t(lang, 'quizScore'))}: ${result.correct} / ${QUIZ_QUESTIONS.length} ${esc(t(lang, 'correctAnswers'))}</h3>
    <h4>${esc(t(lang, 'quizLensMix'))}</h4><ol class="lens-mix">${mix}</ol><p class="muted small">${esc(t(lang, 'quizNotIdentity'))}</p><h4>Review your answers</h4><ol class="quiz-feedback">${feedback}</ol>
    ${scores ? `<h4>${esc(t(lang, 'leaderboardTitle'))}</h4><ol class="leaderboard-list">${scores}</ol>` : ''}</section>`;
}
