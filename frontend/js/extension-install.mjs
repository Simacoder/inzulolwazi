/**
 * Helpers for the Extension page: where the download is, whether the browser can take the extension, and whether it
 * is already installed.
 */

/**
 * Chrome only installs an extension in one click from the Chrome Web Store. Once the extension is listed there,
 * put its address here and the page shows an "Add to Chrome" button in place of the download steps.
 */
export const EXTENSION_STORE_URL = '';

/** Served by the backend, zipped from the extension/ folder. */
export const EXTENSION_ZIP_PATH = '/downloads/inzulolwazi-extension.zip';

/** Pages worth trying once the extension is installed. They mention terms the extension has notes on. */
export const TRY_PAGES = [
  { label: 'Bantu peoples', url: 'https://en.wikipedia.org/wiki/Bantu_peoples' },
  { label: 'Khoisan', url: 'https://en.wikipedia.org/wiki/Khoisan' },
  { label: 'Great Zimbabwe', url: 'https://en.wikipedia.org/wiki/Great_Zimbabwe' },
];

/**
 * Chrome, Edge, Brave, Opera and other Chromium browsers can load the extension. Firefox and Safari cannot.
 * @param {{ userAgent?: string, brands?: { brand: string }[] }} browser
 */
export function isChromiumBrowser(browser) {
  if (browser.brands?.some((item) => /^(Chromium|Google Chrome|Microsoft Edge)$/.test(item.brand))) return true;
  return /\b(Chrome|Chromium|Edg)\//.test(browser.userAgent ?? '');
}

/**
 * The version the extension reported on this page, or null when it is not installed.
 * @param {{ dataset: DOMStringMap }} root
 */
export function installedVersion(root) {
  const version = root.dataset.inzulolwaziExtension;
  return version && /^\d+\.\d+\.\d+$/.test(version) ? version : null;
}
