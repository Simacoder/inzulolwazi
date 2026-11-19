/* Popup: shows what was found on the current page and the extension's settings. */
const DEFAULTS = { autoScan: true, appBase: 'https://inzulolwazi-api.onrender.com', pausedHosts: [] };
const $ = (id) => document.getElementById(id);
let tabId = null;
let host = '';

const BAND_TEXT = {
  few: 'Wording check: few signals found.',
  some: 'Wording check: some signals of outside-centred wording. Reading notes list them and sources to read alongside.',
  many: 'Wording check: many signals of outside-centred wording. You may want to read with care. Reading notes list them.',
  short: 'Wording check: not enough text on this page.',
};

function show(result) {
  const items = $('items');
  items.replaceChildren();
  if (!result) {
    $('status').textContent = 'This page cannot be scanned. Browser pages and the Chrome Web Store are off limits to extensions.';
    $('scan').hidden = true;
    return;
  }
  $('scan').hidden = false;
  const band = result.framing?.band;
  $('reading').hidden = !band;
  $('open-reading').hidden = !band || band === 'short' || result.paused;
  if (band) $('reading').textContent = BAND_TEXT[band];
  host = result.host;
  $('site').textContent = host;
  $('pause').checked = result.paused;
  if (result.paused) {
    $('status').textContent = 'Paused on this site.';
    return;
  }
  $('status').textContent = result.items.length
    ? `${result.items.length} ${result.items.length === 1 ? 'note' : 'notes'} found. Choose one to read it on the page.`
    : 'No loaded terms found on this page.';
  for (const item of result.items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.append(document.createTextNode(item.label));
    const small = document.createElement('small');
    small.textContent = `${item.count}×`;
    button.append(small);
    button.addEventListener('click', async () => {
      await chrome.tabs.sendMessage(tabId, { type: 'inz:open', id: item.id });
      window.close();
    });
    const li = document.createElement('li');
    li.append(button);
    items.append(li);
  }
}

async function ask(message) {
  try { return await chrome.tabs.sendMessage(tabId, message); } catch { return null; }
}

async function init() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  $('auto').checked = settings.autoScan;
  $('base').value = settings.appBase;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  show(tabId === null ? null : await ask({ type: 'inz:getMatches' }));
}

$('scan').addEventListener('click', async () => {
  $('status').textContent = 'Scanning…';
  show(await ask({ type: 'inz:rescan', unpause: false }));
});

$('open-reading').addEventListener('click', async () => {
  await chrome.tabs.sendMessage(tabId, { type: 'inz:open', id: 'reading' });
  window.close();
});

$('auto').addEventListener('change', (event) => chrome.storage.sync.set({ autoScan: event.target.checked }));

$('pause').addEventListener('change', async (event) => {
  const { pausedHosts } = await chrome.storage.sync.get(DEFAULTS);
  const next = event.target.checked ? [...new Set([...pausedHosts, host])] : pausedHosts.filter((item) => item !== host);
  await chrome.storage.sync.set({ pausedHosts: next });
  show(await ask(event.target.checked ? { type: 'inz:clear' } : { type: 'inz:rescan', unpause: true }));
});

$('base').addEventListener('change', (event) => {
  const value = event.target.value.trim();
  try { chrome.storage.sync.set({ appBase: new URL(value).origin }); } catch { event.target.value = DEFAULTS.appBase; }
});

$('search').addEventListener('submit', async (event) => {
  event.preventDefault();
  const question = $('q').value.trim();
  if (!question) return;
  const { appBase } = await chrome.storage.sync.get(DEFAULTS);
  await chrome.tabs.create({ url: `${appBase.replace(/\/$/, '')}/#/search?q=${encodeURIComponent(question)}` });
  window.close();
});

init();
