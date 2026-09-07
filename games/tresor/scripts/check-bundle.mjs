/**
 * Bundle-Budget (Audit A5, Roadmap M5.6).
 *
 * Zwei Zahlen entscheiden, ob das Spiel auf einem alten Handy im WLAN einer Wohnung
 * startet oder nicht:
 *
 * 1. **Der Einstieg** — was geladen sein muss, bevor der Title-Screen steht. Alles, was
 *    hier landet, verzoegert den ersten Tap.
 * 2. **Das Ganze** — Einstieg plus alle Lazy-Chunks. Das ist, was ein Abend insgesamt
 *    kostet, wenn jemand einmal durchspielt.
 *
 * Die Buehne (PixiJS, GSAP, der ganze `src/game/`-Baum) darf **nicht** im Einstieg
 * liegen: Sie wird waehrend der Verhandlung nachgeladen (ADR-15). Genau das prueft der
 * Skript-Teil "Einstieg" mit — er faellt um, sobald ein statischer Import zurueckkommt.
 *
 * Laeuft nach `npm run build` gegen `dist/`.
 */

import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Budgets in KB (gzip). Aus Audit A5. */
const BUDGET = { entry: 40, total: 450 };

const dist = join(process.cwd(), 'dist');
const assets = join(dist, 'assets');

function gzipKb(path) {
  return gzipSync(readFileSync(path)).length / 1024;
}

/** Die Skript-Dateien, die `index.html` direkt laedt. */
function htmlScripts() {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  return [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) =>
    join(dist, match[1].replace(/^\/Tresor\//, ''))
  );
}

/**
 * Der **Einstieg** ist nicht nur die Datei aus dem `<script>`-Tag, sondern alles, was sie
 * statisch nachzieht: `import"./x.js"` laedt der Browser mit, bevor er die erste Zeile
 * ausfuehrt. Ein `import("./x.js")` mit Klammern dagegen ist lazy und zaehlt nicht.
 *
 * Genau diese Unterscheidung ist der Kern von ADR-15 — und nur wer der statischen Kette
 * folgt, sieht, ob die Buehne zurueck in den Start gerutscht ist.
 */
function staticClosure(roots) {
  const seen = new Set();
  const queue = [...roots];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    // Nur statische Importe: `import"./x.js"` und `from"./x.js"`, nie `import(...)`.
    for (const match of source.matchAll(/(?:^|[;}\s])(?:import|from)\s*["'](\.[^"']+\.js)["']/g)) {
      queue.push(join(assets, match[1].replace(/^\.\//, '')));
    }
  }
  return [...seen];
}

const jsFiles = readdirSync(assets)
  .filter((name) => name.endsWith('.js'))
  .map((name) => join(assets, name));

const entry = staticClosure(htmlScripts());
const entryKb = entry.reduce((sum, file) => sum + gzipKb(file), 0);
const totalKb = jsFiles.reduce((sum, file) => sum + gzipKb(file), 0);

const sorted = jsFiles
  .map((file) => ({ name: file.slice(assets.length + 1), kb: gzipKb(file) }))
  .sort((a, b) => b.kb - a.kb);

console.log('Die zehn groessten Chunks (gzip):');
for (const chunk of sorted.slice(0, 10)) {
  console.log(`  ${chunk.kb.toFixed(1).padStart(6)} KB  ${chunk.name}`);
}

console.log('');
console.log(`Einstieg: ${entryKb.toFixed(1)} KB (Budget ${BUDGET.entry} KB)`);
console.log(`Gesamt:   ${totalKb.toFixed(1)} KB (Budget ${BUDGET.total} KB)`);

const problems = [];
if (entryKb > BUDGET.entry) problems.push(`Einstieg ${entryKb.toFixed(1)} KB > ${BUDGET.entry} KB`);
if (totalKb > BUDGET.total) problems.push(`Gesamt ${totalKb.toFixed(1)} KB > ${BUDGET.total} KB`);

/*
 * Die Ursache soll im Klartext dastehen, nicht nur die Zahl. Vite benennt Chunks nach dem
 * Modul, das sie ausloest — taucht einer der Buehnen-Chunks in der statischen Kette auf,
 * ist irgendwo ein `import` ohne Klammern zurueckgekommen (ADR-15).
 */
const STAGE_CHUNKS = /^(StageApp|VaultRoom|RevealDirector|WebGLRenderer|WebGPURenderer|GraphicsContext|registry)-/;
for (const file of entry) {
  const name = file.slice(assets.length + 1);
  if (STAGE_CHUNKS.test(name)) {
    problems.push(`Buehnen-Chunk "${name}" haengt statisch am Einstieg — siehe ADR-15`);
  }
}

if (problems.length > 0) {
  console.error('\nBudget gerissen:');
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}

console.log('\nOK: Budget eingehalten, Buehne liegt im Lazy-Chunk.');
