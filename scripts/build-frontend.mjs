/**
 * Builds the static frontend into dist/ for hosting apart from the backend (for example on Vercel).
 *
 *   API_BASE_URL=https://inzulolwazi-api.onrender.com npm run build:frontend
 *
 * It copies frontend/, writes the API address into js/config.mjs, and adds a Content-Security-Policy meta tag that
 * allows requests to that address and nowhere else. Without API_BASE_URL the build talks to its own origin.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string | undefined} value */
export function normaliseApiBase(value) {
  const raw = (value ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  const url = new URL(raw);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('API_BASE_URL must use https');
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('API_BASE_URL must be an origin only, such as https://example.onrender.com');
  return url.origin;
}

/** @param {string} apiBase */
export function contentSecurityPolicy(apiBase) {
  return `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'${apiBase ? ` ${apiBase}` : ''}; base-uri 'self'; form-action 'self'`;
}

/**
 * @param {{ apiBase?: string, out?: string }} [options]
 */
export async function buildFrontend(options = {}) {
  const apiBase = normaliseApiBase(options.apiBase ?? process.env.API_BASE_URL);
  const out = options.out ?? path.join(root, 'dist');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, 'frontend'), out, { recursive: true });
  await writeFile(path.join(out, 'js', 'config.mjs'), `/** Written by scripts/build-frontend.mjs. */\nexport const API_BASE = ${JSON.stringify(apiBase)};\n`);
  const indexPath = path.join(out, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  const tag = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(apiBase)}" />`;
  await writeFile(indexPath, html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${tag}`));
  return { out, apiBase };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { out, apiBase } = await buildFrontend();
  console.log(`Frontend built in ${out}. API: ${apiBase || 'same origin'}`);
}
