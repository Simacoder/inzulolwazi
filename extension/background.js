/* Inzulolwazi service worker: right-click lookup and the toolbar badge. No data leaves the browser until a link is opened. */
const DEFAULT_BASE = 'https://inzulolwazi-api.onrender.com';

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.contextMenus.create({ id: 'inz-lookup', title: 'Look up “%s” in Inzulolwazi', contexts: ['selection'] });
  if (details.reason !== 'install') return;
  // Open the website's Extension page so a new user sees that it worked and where to try it.
  const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULT_BASE });
  await chrome.tabs.create({ url: `${appBase.replace(/\/$/, '')}/#/extension?installed=1` });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'inz-lookup' || !info.selectionText) return;
  const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULT_BASE });
  const question = info.selectionText.trim().slice(0, 120);
  await chrome.tabs.create({ url: `${appBase.replace(/\/$/, '')}/#/search?q=${encodeURIComponent(question)}` });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'inz:count' || !sender.tab?.id) return;
  const text = message.count ? String(message.count) : '';
  chrome.action.setBadgeText({ tabId: sender.tab.id, text });
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#b85c00' });
});
