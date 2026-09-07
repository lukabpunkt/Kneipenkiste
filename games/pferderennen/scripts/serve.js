/**
 * Minimal static server without dependencies.
 *
 * `npm run dev` uses Vite for live reload. This script is the fallback: it proves the game runs
 * without any build step at all — exactly the way it is later served from GitHub Pages.
 * Usage: node scripts/serve.js [--port=5173]
 */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

const portArg = process.argv.slice(2).find((arg) => arg.startsWith('--port='));
const PORT = portArg ? Number(portArg.split('=')[1]) : 5173;

/**
 * Resolves a URL to a path inside the project directory.
 * @param {string} url
 * @returns {string | null} absolute path, or null if it would escape the project
 */
function resolvePath(url) {
  const clean = decodeURIComponent(url.split('?')[0]);
  const relative = normalize(clean === '/' ? '/index.html' : clean).replace(/^(\.\.[/\\])+/, '');
  const absolute = join(ROOT, relative);
  return absolute.startsWith(ROOT) ? absolute : null;
}

const server = createServer((request, response) => {
  const path = resolvePath(request.url ?? '/');

  if (!path) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let stats;
  try {
    stats = statSync(path);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  const file = stats.isDirectory() ? join(path, 'index.html') : path;
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Pferderennen serving at http://localhost:${PORT}`);
});
