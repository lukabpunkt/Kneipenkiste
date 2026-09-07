/**
 * Serviert `site/` genau so, wie GitHub Pages es später tut: unter dem Präfix
 * aus SITE_BASE (Default /Kneipenkiste/). So sieht man lokal dieselben Pfade wie
 * live — inklusive Service-Worker-Scopes.
 *
 *   npm run preview:site            → http://localhost:4300/Kneipenkiste/
 *   SITE_BASE=/ npm run preview:site → http://localhost:4300/
 *
 * Bewusst ohne Abhängigkeiten: ein kleiner Node-Server reicht.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const base = (process.env.SITE_BASE ?? '/Kneipenkiste/').replace(/\/?$/, '/');
const port = Number(process.env.PORT ?? 4300);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.map': 'application/json',
};

if (!existsSync(root)) {
  console.error('site/ fehlt — erst `npm run build:site` ausführen.');
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);

  if (path === base.slice(0, -1)) {
    res.writeHead(301, { Location: base });
    return res.end();
  }
  if (!path.startsWith(base)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`Nicht unter ${base}`);
  }
  path = path.slice(base.length);

  let file = normalize(join(root, path));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    file = join(root, '404.html');
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.statusCode = 404;
  }

  res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Kneipenkiste läuft: http://localhost:${port}${base}`);
});
