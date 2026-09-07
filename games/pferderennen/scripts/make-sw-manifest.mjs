/**
 * Writes the service worker's precache list from what is actually on disk.
 *
 * A hand-maintained list is a list that goes stale, and a stale one means a game that is
 * *almost* playable in flight mode — the worst possible outcome, because it looks fine until
 * somebody bets. So the list is generated, and CI re-runs this and fails if `sw.js` changes
 * (`npm run sw && git diff --exit-code sw.js`).
 *
 * It walks the same directories the browser can reach: the entry point, the stylesheets, every
 * ES module under src/, and the icons.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const SW = join(ROOT, 'sw.js');

/** Directories to walk, and which extensions inside them belong in the cache. */
const SOURCES = [
  { dir: 'src', extensions: ['.js', '.css'] },
  { dir: 'assets', extensions: ['.png', '.woff2', '.ogg', '.mp3'] },
];

/** Files at the root that the game needs. */
const ROOT_FILES = ['./', './index.html', './manifest.webmanifest'];

/**
 * Every matching file under a directory, as a relative path.
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {Promise<string[]>}
 */
async function walk(dir, extensions) {
  const found = [];
  const entries = await readdir(join(ROOT, dir), { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!extensions.some((extension) => entry.name.endsWith(extension))) continue;
    const full = join(entry.parentPath ?? entry.path, entry.name);
    found.push(`./${relative(ROOT, full).split(/[\\/]/).join('/')}`);
  }
  return found.sort();
}

const files = [...ROOT_FILES];
for (const { dir, extensions } of SOURCES) files.push(...(await walk(dir, extensions)));

const body = files.map((file) => `  '${file}',`).join('\n');
const source = await readFile(SW, 'utf8');
const next = source.replace(
  /\/\* --- precache:start --- \*\/[\s\S]*?\/\* --- precache:end --- \*\//,
  `/* --- precache:start --- */\nconst PRECACHE = [\n${body}\n];\n/* --- precache:end --- */`,
);

if (next === source) {
  process.stdout.write(`sw.js unverändert (${files.length} Dateien)\n`);
} else {
  await writeFile(SW, next);
  process.stdout.write(`sw.js aktualisiert (${files.length} Dateien)\n`);
}
