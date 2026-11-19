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

## Reading notes: summary, wording check and references

The first card in the panel is "Reading notes". It is computed in the browser from the page's main text (`extension/content/reading.js`).

- **Extract.** Three sentences from the page, chosen because the words in them recur, kept in their original order. They are the page's own words. Nothing is generated.
- **Wording check.** The page is checked against a short word list (`extension/framing-cues.json`) of phrases that outsiders have often used about African peoples and places, in two groups: wording that casts people as lesser or other (for example "primitive", "the natives", "dark continent") and wording that puts outsiders at the centre (for example "lost city", "must have been built by", "civilising mission", "Hamitic"). It lists each phrase found with a short surrounding quote and the reason it is flagged, and gives a band of **few**, **some** or **many** signals. Each phrase has a weight; one repeated word counts at most five times, and long pages are scaled by length.
- **Read alongside.** Sources in the corpus whose author is recorded as affiliated with an African institution, with their links. Sources about topics found on the page come first. **Copy reading notes** puts the band, the phrases found and these links on the clipboard to share. It never includes the page's text.

### What it is, and what it does not claim

- It checks **wording**. It does not decide whether a page is "Western", does not judge the writer, and cannot tell who wrote a page. Wording signals are evidence for "read this with care", not proof of anything.
- It cannot read tone, cannot judge a whole book from one page, and a page with no matches may still carry outside framing. Confidence is never higher than "medium", and pages under 120 words are not checked.
- The word list is a **draft**. It is a heuristic, not historical content, so a history reviewer should sign it off before the extension is published. The panel says "draft word list".
- Messages describe the page's wording and use "you may want to", not instructions.
- The corpus records affiliations, not identities, so the references say "author affiliation recorded in the corpus" and name the institution. Today only two sources qualify (Nelson Mandela University; the University of Cape Town alongside Cambridge and Oxford). Growing this list means adding African-authored sources to `content/sources.json` with a reviewer, then listing them in `AFRICAN_INSTITUTIONS` in `scripts/build-extension.mjs`. A test checks each entry against the source's recorded background.

## Data

`scripts/build-extension.mjs` selects and copies from `content/glossary.json`, `content/claims.json`, `content/sources.json` and the draft word list `extension/framing-cues.json` into `extension/data/index.json` and `index.js`. It writes no facts of its own (rule 15). Run `npm run build:extension` after any content change. `node scripts/build-extension.mjs --check` and a test fail if the generated files are stale.

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
4. Open any page that mentions these terms, or serve the demo pages: `cd extension/demo && python3 -m http.server 8081`, then open `http://localhost:8081/demo.html` (terms) and `http://localhost:8081/demo-old-style.html` (wording check). Both are test fixtures, not sources.

## Checks

`tests/extension.test.mjs` covers the matcher, the data against the corpus, the manifest and the privacy rules. The behaviour in a real browser was checked by loading the extension into Chromium.
