/* Tells the Inzulolwazi website that the extension is installed, so its Extension page can say so.
 * It runs only on the website's own addresses (see manifest.json), writes one attribute, and reads nothing from the page. */
(function () {
  'use strict';
  try {
    document.documentElement.dataset.inzulolwaziExtension = chrome.runtime.getManifest().version;
    document.dispatchEvent(new CustomEvent('inzulolwazi:extension'));
  } catch { /* the extension was reloaded: nothing to announce */ }
})();
