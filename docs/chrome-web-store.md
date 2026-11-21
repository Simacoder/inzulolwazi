# Chrome Web Store checklist

One-click install needs a Web Store listing. Before submitting:

1. Register a developer account (one-time fee) at the Chrome Web Store developer dashboard.
2. Zip the contents of `extension/` (the download route's zip works; the folder must be at the top level of the upload).
3. Provide: a 128px icon (done), at least one 1280x800 screenshot, a short and a long description, and a privacy statement. Permissions are only `storage` and `contextMenus`, and no page content leaves the browser.
4. Have the word list (`extension/data/framing-cues.json`) and sources reviewed before public release.
5. After approval, set `EXTENSION_STORE_URL` in `frontend/js/extension-install.mjs`, and run `npm run check`.
