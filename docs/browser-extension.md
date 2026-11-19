# Browser extension

A Chrome extension (Manifest V3) that carries the app's term-history notes onto the rest of the internet. While someone reads any web page, it flags the loaded terms and topics that the corpus has a note on, and shows the African-centred reading and the cited sources beside them. It adds context. It does not rate or correct the page.

Added at the project owner's request, so it is listed here. It lives in `extension/` and has no runtime dependencies.

## What it flags

Only words the corpus already covers, taken from `content/`:

- Every glossary term and its aliases: Bantu, Khoisan, Colonial classification of peoples, Hamitic theory, Great Zimbabwe.
- Three claims that add topics the glossary does not: Giza, the Lebombo and Ishango bones, and Chancellor Williams.
- Generic aliases are left out (`classification`, `Zimbabwe`, `house in stone`) because they appear on pages that have nothing to do with the term. The list is `GENERIC_ALIASES` in `scripts/build-extension.mjs`, and a test enforces it.

The page text is matched as whole words, in any case, with the longest phrase winning. Up to five mentions of each term are underlined per page. All mentions are counted.

## What it shows

A small "Inzulolwazi" pill with a count appears on pages with matches. It opens a panel with one card per term:

- A tag: "Term history note" for glossary terms, or "Research lead · draft, not yet reviewed" for claims. Every claim in the corpus is still a draft, and the extension says so (rules 2 and 10).
- The corpus summary, then the African-centred reading (rule 25), then the sources with their type labels (rule 5).
- "See the full evidence" opens the matching claim or glossary page in the app.

The toolbar popup lists the same notes, lets the person scan again, pause a site, turn automatic scanning off, search the app, and set the app address. Right-clicking selected text offers "Look up in Inzulolwazi".

## Data

`scripts/build-extension.mjs` selects and copies from `content/glossary.json`, `content/claims.json` and `content/sources.json` into `extension/data/index.json` and `index.js`. It writes no facts of its own (rule 15). Run `npm run build:extension` after any content change. `node scripts/build-extension.mjs --check` and a test fail if the generated files are stale.

## Privacy

- Pages are scanned inside the browser. The content script has no `fetch`, no network call and no analytics, and a test checks this.
- Permissions are `storage` (settings) and `contextMenus` only. There are no host permissions.
- Nothing is sent anywhere until the person clicks a link or runs a search, which opens the app in a new tab.
- Settings (automatic scan, paused sites, app address) sync through Chrome's own storage. No account, no name.
- The extension does not run on the app itself.

## Limits

- English only. The isiZulu translations and their review flags are not carried into the extension yet.
- Text that a page adds after it loads is picked up when the person scans again.
- Eight topics is a proof of concept. A flagged term means "the corpus has a note", not "this page is wrong".
- Chrome and Chromium browsers. The extension has not been submitted to the Chrome Web Store.

## Install for a demo

1. Open `chrome://extensions` and turn on Developer mode.
2. Choose "Load unpacked" and pick the `extension/` folder.
3. Pin the Inzulolwazi icon.
4. Open any page that mentions these terms, or serve the demo page: `cd extension/demo && python3 -m http.server 8081`, then open `http://localhost:8081/demo.html`.

## Checks

`tests/extension.test.mjs` covers the matcher, the data against the corpus, the manifest and the privacy rules. The behaviour in a real browser was checked by loading the extension into Chromium.
