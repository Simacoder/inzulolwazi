import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { createAppServer, EXTENSION_ZIP_PATH } from '../backend/server.mjs';
import { createZip, crc32, filesIn } from '../backend/zip.mjs';
import { installedVersion, isChromiumBrowser, EXTENSION_STORE_URL, EXTENSION_ZIP_PATH as PAGE_ZIP_PATH, TRY_PAGES } from '../frontend/js/extension-install.mjs';
import { extensionView } from '../frontend/js/render.mjs';
import { parseHash } from '../frontend/js/util.mjs';

/** Read a ZIP back without any zip library, checking every file's CRC. @param {Buffer} zip */
function readZip(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'end of central directory');
  const count = zip.readUInt16LE(end + 10);
  let cursor = zip.readUInt32LE(end + 16);
  /** @type {Map<string, Buffer>} */
  const files = new Map();
  for (let i = 0; i < count; i += 1) {
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    const method = zip.readUInt16LE(cursor + 10);
    const crc = zip.readUInt32LE(cursor + 16);
    const size = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const local = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    assert.equal(method, 8);
    const data = inflateRawSync(zip.subarray(start, start + size));
    assert.equal(crc32(data), crc, `${name} crc`);
    files.set(name, data);
    cursor += 46 + nameLength + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
  }
  return files;
}

test('the zip writer round-trips files, including empty files and non-ASCII names, and is repeatable', () => {
  const input = [{ name: 'a/one.txt', data: Buffer.from('hello hello hello hello') }, { name: 'empty.txt', data: Buffer.alloc(0) }, { name: 'é/ü.txt', data: Buffer.from('ünïcode') }];
  const zip = createZip(input);
  const files = readZip(zip);
  assert.deepEqual([...files.keys()], input.map((file) => file.name));
  for (const file of input) assert.deepEqual(files.get(file.name), file.data);
  assert.deepEqual(createZip(input), zip, 'the same files give the same bytes');
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926, 'the standard CRC-32 check value');
});

const server = createAppServer();
let base = '';
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  base = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
});
after(() => new Promise((resolve) => { server.close(() => resolve(undefined)); }));

test('the website serves the extension as a zip that holds exactly the extension folder', async () => {
  const response = await fetch(`${base}${EXTENSION_ZIP_PATH}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.match(response.headers.get('content-disposition') ?? '', /attachment; filename="inzulolwazi-extension\.zip"/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const zip = Buffer.from(await response.arrayBuffer());
  assert.equal(Number(response.headers.get('content-length')), zip.length);
  const files = readZip(zip);
  const expected = await filesIn(new URL('../extension', import.meta.url).pathname, 'inzulolwazi-extension');
  assert.deepEqual([...files.keys()], expected.map((file) => file.name));
  for (const file of expected) assert.deepEqual(files.get(file.name), file.data, file.name);
  assert.ok(files.has('inzulolwazi-extension/manifest.json') && files.has('inzulolwazi-extension/content/site-link.js') && files.has('inzulolwazi-extension/icons/icon-128.png'));
  const manifest = JSON.parse(String(files.get('inzulolwazi-extension/manifest.json')));
  assert.equal(manifest.manifest_version, 3);
  for (const name of files.keys()) assert.ok(!name.includes('..') && !name.startsWith('/'), name);
});

test('the download answers HEAD, and no other method', async () => {
  const head = await fetch(`${base}${EXTENSION_ZIP_PATH}`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'application/zip');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const post = await fetch(`${base}${EXTENSION_ZIP_PATH}`, { method: 'POST', body: '{}' });
  assert.equal(post.status, 404);
  assert.equal((await fetch(`${base}/downloads/other.zip`)).status, 404);
  assert.equal((await fetch(`${base}/downloads/../backend/server.mjs`)).status, 404);
});

test('the page and the server agree on where the download is', () => {
  assert.equal(PAGE_ZIP_PATH, EXTENSION_ZIP_PATH);
});

test('the Extension page is a route, and Chromium browsers are told apart from the rest', () => {
  assert.equal(parseHash('#/extension').name, 'extension');
  assert.equal(parseHash('#/extension?installed=1').query.installed, '1');
  const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const edge = `${chrome} Edg/130.0.0.0`;
  const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
  const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  assert.equal(isChromiumBrowser({ userAgent: chrome }), true);
  assert.equal(isChromiumBrowser({ userAgent: edge }), true);
  assert.equal(isChromiumBrowser({ userAgent: firefox }), false);
  assert.equal(isChromiumBrowser({ userAgent: safari }), false);
  assert.equal(isChromiumBrowser({ userAgent: firefox, brands: [{ brand: 'Brave' }, { brand: 'Chromium' }] }), true);
});

test('the install marker is trusted only when it is a plain version number', () => {
  assert.equal(installedVersion({ dataset: { inzulolwaziExtension: '0.3.0' } }), '0.3.0');
  for (const value of [undefined, '', 'x', '<img src=x>', '1.2', '1.2.3-beta']) assert.equal(installedVersion({ dataset: { inzulolwaziExtension: value } }), null, String(value));
});

const base_info = { installed: null, chromium: true, storeUrl: '', downloadUrl: '/downloads/inzulolwazi-extension.zip', justInstalled: false };

test('before install the page offers the download, says plainly why it is not one click, and lists the steps', () => {
  const html = extensionView('en', base_info);
  assert.match(html, /href="\/downloads\/inzulolwazi-extension\.zip" download/);
  assert.match(html, /Not installed yet/);
  assert.match(html, /only installs an extension in one click from the Chrome Web Store/);
  assert.match(html, /Load unpacked/);
  assert.match(html, /data-copy="chrome:\/\/extensions"/);
  assert.doesNotMatch(html, /href="chrome:/, 'web pages cannot link to chrome:// addresses');
  for (const page of TRY_PAGES) assert.ok(html.includes(page.url));
  assert.doesNotMatch(html, /\sstyle=|<script/i);
});

test('once installed the page says it is ready, and hides the install steps', () => {
  const html = extensionView('en', { ...base_info, installed: '0.3.0' });
  assert.match(html, /<strong>Installed ✓/);
  assert.match(html, /Version 0\.3\.0/);
  assert.match(html, /ready to work/);
  assert.doesNotMatch(html, /Load unpacked|download>/);
});

test('with a Web Store address the page shows Add to Chrome instead of the steps', () => {
  const html = extensionView('en', { ...base_info, storeUrl: 'https://chromewebstore.google.com/detail/example' });
  assert.match(html, /Add to Chrome/);
  assert.match(html, /href="https:\/\/chromewebstore\.google\.com\/detail\/example"/);
  assert.doesNotMatch(html, /Load unpacked/);
  assert.equal(EXTENSION_STORE_URL, '', 'no store address is set until the extension is listed');
});

test('other browsers are told to use a Chromium browser, a new install is welcomed, and text is escaped', () => {
  assert.match(extensionView('en', { ...base_info, chromium: false }), /Use Chrome, Edge, Brave or another Chromium browser/);
  assert.doesNotMatch(extensionView('en', { ...base_info, chromium: false }), /Download the extension/);
  assert.match(extensionView('en', { ...base_info, justInstalled: true }), /Thank you for installing/);
  assert.doesNotMatch(extensionView('en', { ...base_info, downloadUrl: '"><script>x</script>' }), /<script>/);
  assert.match(extensionView('zu', base_info), /Get the browser extension/, 'isiZulu falls back to English until it is translated and reviewed');
});

test('the home page links to the Extension page, and the nav and footer carry it', () => {
  const html = readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-nav="navExtension" href="#\/extension"/);
  assert.match(html, /<footer[^>]*>[\s\S]*href="#\/extension"/);
});
