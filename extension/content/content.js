/* Inzulolwazi content script: finds loaded terms on the page, marks them, and shows the cited context.
 * Everything runs in this page. Nothing is sent anywhere. Links open only when the person clicks them. */
(function () {
  'use strict';
  const DATA = globalThis.INZ_DATA;
  const Matcher = globalThis.InzMatcher;
  if (!DATA || !Matcher || window.top !== window) return;

  const DEFAULTS = { autoScan: true, appBase: 'https://inzulolwazi-api.onrender.com', pausedHosts: [] };
  const MAX_MARKS_PER_ENTRY = 5;
  const SKIP = 'script,style,noscript,textarea,input,select,option,code,pre,svg,iframe,[contenteditable=""],[contenteditable="true"],mark.inz-mark,#inz-root';
  const entries = new Map(DATA.entries.map((entry) => [entry.id, entry]));
  const compiled = Matcher.compile(DATA.entries);
  /** @type {Map<string, number>} */
  let counts = new Map();
  /** @type {Map<string, number>} */
  let marked = new Map();
  let settings = { ...DEFAULTS };
  let scanning = false;
  let root = null;

  const host = location.hostname;
  const store = () => (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) || null;

  function loadSettings() {
    return new Promise((resolve) => {
      const area = store();
      if (!area) return resolve(DEFAULTS);
      area.get(DEFAULTS, (saved) => resolve({ ...DEFAULTS, ...saved }));
    });
  }

  /** Collect text nodes outside code, form fields and our own marks. */
  function textNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.length < 4) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode() && nodes.length < 20000) nodes.push(walker.currentNode);
    return nodes;
  }

  /** Wrap matches in one text node. Counts every match, but marks only the first few of each entry. */
  function markNode(node) {
    const matches = Matcher.findMatches(node.nodeValue, compiled);
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      counts.set(match.id, (counts.get(match.id) ?? 0) + 1);
      if ((marked.get(match.id) ?? 0) >= MAX_MARKS_PER_ENTRY) continue;
      marked.set(match.id, (marked.get(match.id) ?? 0) + 1);
      fragment.append(document.createTextNode(node.nodeValue.slice(cursor, match.start)));
      const mark = document.createElement('mark');
      mark.className = 'inz-mark';
      mark.dataset.inzId = match.id;
      mark.tabIndex = 0;
      mark.setAttribute('role', 'button');
      mark.setAttribute('aria-label', `African history context for ${match.text}`);
      mark.textContent = match.text;
      fragment.append(mark);
      cursor = match.end;
    }
    fragment.append(document.createTextNode(node.nodeValue.slice(cursor)));
    node.parentNode.replaceChild(fragment, node);
  }

  function clearMarks() {
    document.querySelectorAll('mark.inz-mark').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent)));
    document.body.normalize();
    counts = new Map();
    marked = new Map();
  }

  /** Scan in small slices so a long page does not freeze. */
  async function scan() {
    if (scanning || !document.body) return summary();
    scanning = true;
    clearMarks();
    const nodes = textNodes();
    for (let i = 0; i < nodes.length; i += 200) {
      nodes.slice(i, i + 200).forEach(markNode);
      if (i + 200 < nodes.length) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    scanning = false;
    render();
    report();
    return summary();
  }

  function summary() {
    return {
      host,
      paused: settings.pausedHosts.includes(host),
      items: Matcher.summarise([...counts].flatMap(([id, count]) => Array.from({ length: count }, () => ({ id })))).map(({ id, count }) => ({ id, count, label: entries.get(id).label, kind: entries.get(id).kind })),
    };
  }

  function report() {
    try { chrome.runtime.sendMessage({ type: 'inz:count', count: counts.size }); } catch { /* the extension was reloaded: nothing to report to */ }
  }

  // ---- Panel ----------------------------------------------------------------------------------

  const STYLE = `
    :host{all:initial}
    *{box-sizing:border-box}
    .pill{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;align-items:center;gap:8px;padding:9px 14px;border:0;border-radius:999px;background:#1a365d;color:#f7efe8;font:600 14px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.3)}
    .pill:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #e67e22;outline-offset:2px}
    .dot{display:inline-grid;place-items:center;min-width:22px;height:22px;border-radius:999px;background:#e67e22;color:#1a1a1a;font-size:12px}
    .panel{position:fixed;right:16px;bottom:64px;z-index:2147483647;width:min(400px,calc(100vw - 32px));max-height:min(70vh,640px);display:flex;flex-direction:column;border-radius:14px;background:#fffaf5;color:#1a2433;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35);border:1px solid #d9c7b8}
    .panel[hidden]{display:none}
    header{display:flex;gap:8px;align-items:start;padding:14px 16px 8px}
    header h2{margin:0;font:700 16px/1.3 Georgia,serif;color:#1a365d}
    header p{margin:2px 0 0;font-size:12px;color:#4a5568}
    .x{margin-left:auto;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#1a365d;padding:2px 6px}
    .list{overflow:auto;padding:0 12px 8px}
    details{margin:8px 0;border:1px solid #e2d4c9;border-radius:10px;background:#fff}
    summary{cursor:pointer;padding:10px 12px;font-weight:600;color:#1a365d;list-style:none;display:flex;gap:8px;align-items:center}
    summary::-webkit-details-marker{display:none}
    summary .n{margin-left:auto;font-weight:500;font-size:12px;color:#4a5568}
    .body{padding:0 12px 12px}
    .tag{display:inline-block;margin:0 0 6px;padding:2px 8px;border-radius:999px;background:#f4e3d2;color:#7a3d00;font-size:11px;font-weight:700;letter-spacing:.02em}
    .body h3{margin:10px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#7a3d00}
    .body p{margin:0}
    ul{margin:4px 0 0;padding-left:18px}
    li{margin:3px 0}
    a{color:#1a4f9c}
    .more{display:inline-block;margin-top:10px;padding:7px 12px;border-radius:999px;background:#1a365d;color:#fff;text-decoration:none;font-weight:600}
    footer{padding:8px 16px 12px;border-top:1px solid #e2d4c9;font-size:11px;color:#4a5568;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    footer button{border:0;background:none;color:#1a4f9c;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
    @media (prefers-color-scheme:dark){.panel{background:#162131;color:#eadfd5;border-color:#33465c}header h2,.x,summary{color:#f0d9c4}details{background:#1c2a3d;border-color:#33465c}.tag{background:#4a3524;color:#ffd2a3}.body h3{color:#ffb878}a,footer button{color:#8ec1ff}header p,footer,summary .n{color:#b9c3cf}footer{border-color:#33465c}}
  `;

  const TAGS = { term: 'Term history note', claim: 'Research lead · draft, not yet reviewed' };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'text') node.textContent = value; else if (key === 'class') node.className = value; else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  function card(entry, count) {
    const sources = el('ul', {}, entry.sources.map((source) => el('li', {}, [
      el('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer', text: source.label }),
      document.createTextNode(` · ${source.type}`),
    ])));
    const details = el('details', { 'data-id': entry.id }, [
      el('summary', {}, [document.createTextNode(entry.label), el('span', { class: 'n', text: `${count} on this page` })]),
      el('div', { class: 'body' }, [
        el('span', { class: 'tag', text: TAGS[entry.kind] }),
        el('p', { text: entry.summary }),
        el('h3', { text: 'African-centred reading' }),
        el('p', { text: entry.framing }),
        el('h3', { text: 'Sources' }),
        sources,
        el('a', { class: 'more', href: settings.appBase.replace(/\/$/, '') + '/' + entry.appPath, target: '_blank', rel: 'noopener noreferrer', text: 'See the full evidence ↗' }),
      ]),
    ]);
    return details;
  }

  function render() {
    root?.remove();
    root = null;
    if (!counts.size || settings.pausedHosts.includes(host)) return;
    const hostEl = el('div', { id: 'inz-root' });
    const shadow = hostEl.attachShadow({ mode: 'open' });
    const panel = el('section', { class: 'panel', role: 'dialog', 'aria-label': 'African history context', hidden: '' });
    const list = el('div', { class: 'list' }, [...counts].map(([id, count]) => card(entries.get(id), count)));
    const close = el('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×' });
    const pause = el('button', { type: 'button', text: 'Pause on this site' });
    const hide = el('button', { type: 'button', text: 'Hide until reload' });
    panel.append(
      el('header', {}, [el('div', {}, [
        el('h2', { text: 'African history context' }),
        el('p', { text: 'Notes from cited sources on terms found here. This is context, not a verdict on the page.' }),
      ]), close]),
      list,
      el('footer', {}, [el('span', { text: 'Inzulolwazi · runs in your browser' }), pause, hide]),
    );
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const pill = el('button', { class: 'pill', type: 'button', 'aria-expanded': 'false', 'aria-label': `African history context: ${counts.size} notes on this page` }, [
      document.createTextNode('Inzulolwazi'), el('span', { class: 'dot', text: String(counts.size), title: `${total} mentions` }),
    ]);
    const setOpen = (open) => { panel.hidden = !open; pill.setAttribute('aria-expanded', String(open)); };
    pill.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => { setOpen(false); pill.focus(); });
    hide.addEventListener('click', () => hostEl.remove());
    pause.addEventListener('click', () => {
      const next = [...new Set([...settings.pausedHosts, host])];
      settings.pausedHosts = next;
      store()?.set({ pausedHosts: next });
      clearMarks();
      render();
    });
    shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); pill.focus(); } });
    shadow.append(el('style', { text: STYLE }), panel, pill);
    hostEl.showPanel = (id) => {
      setOpen(true);
      list.querySelectorAll('details').forEach((item) => { item.open = item.dataset.id === id; });
      list.querySelector(`details[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
      list.querySelector(`details[data-id="${id}"] summary`)?.focus();
    };
    document.documentElement.append(hostEl);
    root = hostEl;
  }

  function openEntry(id) {
    if (!root) return false;
    root.showPanel(id);
    return true;
  }

  document.addEventListener('click', (event) => {
    const mark = event.target instanceof Element ? event.target.closest('mark.inz-mark') : null;
    if (mark) { event.preventDefault(); event.stopPropagation(); openEntry(mark.dataset.inzId); }
  }, true);
  document.addEventListener('keydown', (event) => {
    const mark = event.target instanceof Element ? event.target.closest('mark.inz-mark') : null;
    if (mark && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openEntry(mark.dataset.inzId); }
  });

  // ---- Messages from the popup ---------------------------------------------------------------

  try {
    chrome.runtime.onMessage.addListener((message, _sender, respond) => {
      if (message?.type === 'inz:getMatches') {
        respond(summary());
      } else if (message?.type === 'inz:rescan') {
        const unpause = Boolean(message.unpause);
        if (unpause) { settings.pausedHosts = settings.pausedHosts.filter((item) => item !== host); store()?.set({ pausedHosts: settings.pausedHosts }); }
        scan().then(respond);
        return true;
      } else if (message?.type === 'inz:open') {
        respond({ opened: openEntry(message.id) });
      } else if (message?.type === 'inz:clear') {
        clearMarks(); render(); respond(summary());
      }
      return false;
    });
  } catch { /* running outside an extension */ }

  loadSettings().then((loaded) => {
    settings = loaded;
    try { if (location.origin === new URL(settings.appBase).origin) return; } catch { settings.appBase = DEFAULTS.appBase; }
    if (settings.autoScan && !settings.pausedHosts.includes(host)) scan();
  });
})();
