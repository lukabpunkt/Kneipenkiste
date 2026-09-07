/**
 * Renders the PWA icons from the game's own horse portrait.
 *
 * The icons are not artwork somebody drew once and dropped into a folder — they come out of the
 * same `render/horsePortrait.js` the betting cards use, so they can never drift away from the
 * game. This script drives a headless browser because that drawing code needs a real Canvas 2D;
 * Playwright is already here for the end-to-end tests, so it costs nothing extra.
 *
 * Run with `npm run icons`. It writes assets/icons/ and only needs re-running when the portrait
 * or the palette changes.
 */

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const OUT = join(ROOT, 'assets', 'icons');

/** Hopfen Hengst: the warm coat is the one that still reads against a dark ground at 48 px. */
const HORSE_INDEX = 4;
/** The ground the portrait sits on — deep ink, so the horse is the bright thing in a dock. */
const GROUND = ['#4a3350', '#2b1d2e'];

/** What to write. A maskable icon keeps its subject inside the safe circle, hence the bigger inset. */
const ICONS = [
  { file: 'icon-192.png', size: 192, inset: 0.1 },
  { file: 'icon-512.png', size: 512, inset: 0.1 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.22 },
  // iOS ignores the manifest and looks for this one; it is never masked, so it keeps the padding.
  { file: 'apple-touch-icon.png', size: 180, inset: 0.1 },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

/** Serves the repository so the browser can import the real modules. */
function serve() {
  const server = createServer(async (request, response) => {
    const path = join(ROOT, decodeURIComponent(request.url.split('?')[0]));
    try {
      const body = await readFile(path);
      response.writeHead(200, {
        'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

const server = await serve();
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`);

await mkdir(OUT, { recursive: true });

for (const { file, size, inset } of ICONS) {
  const base64 = await page.evaluate(
    async ({ size, inset, horseIndex, ground }) => {
      const { drawPortrait } = await import('/src/render/horsePortrait.js');
      const { HORSES } = await import('/src/data/horses.js');

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const backdrop = ctx.createLinearGradient(0, 0, 0, size);
      backdrop.addColorStop(0, ground[0]);
      backdrop.addColorStop(1, ground[1]);
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, size, size);

      const pad = size * inset;
      ctx.translate(pad, pad);
      drawPortrait(ctx, HORSES[horseIndex], size - pad * 2);

      return canvas.toDataURL('image/png').split(',')[1];
    },
    { size, inset, horseIndex: HORSE_INDEX, ground: GROUND },
  );

  await writeFile(join(OUT, file), Buffer.from(base64, 'base64'));
  process.stdout.write(`${file}  ${size}x${size}\n`);
}

await browser.close();
server.close();
