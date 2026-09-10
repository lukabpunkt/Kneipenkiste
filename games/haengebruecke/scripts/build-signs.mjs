#!/usr/bin/env node
/**
 * Nummernschilder 1–10 als fertige SVGs (Art Direction §3).
 *
 * Warum gebacken statt als PIXI-`Text` zur Laufzeit?
 *
 * 1. **Draw-Batches.** Jedes `Text`-Objekt bekommt seine eigene Textur. Bei zehn Balken
 *    wären das zehn Texturwechsel in einem Frame — Audit A2 lässt drei zu.
 * 2. **Verlässlichkeit.** Ein `Text` rastert einmal beim Erzeugen. Ist die Schrift dann
 *    noch nicht geladen, bleibt das Schild für den Rest der Runde leer, und zwar
 *    lautlos — genau das ist beim ersten Versuch passiert.
 *
 * Die Zahl ist keine Sprache, sondern eine Balkennummer — sie muss nicht übersetzt
 * werden und darf deshalb in die Textur.
 *
 * Aufruf: `node scripts/build-signs.mjs` (läuft in `build:atlas` mit).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = 'assets-src/svg/signs';
/** So viele Balken kann es höchstens geben: `B_0 = n + 2` bei acht Spielern. */
const MAX_PLANKS = 10;

function sign(number) {
  /* Zweistellige Zahlen brauchen mehr Platz — sonst klebt die 10 am Rahmen. */
  const fontSize = number >= 10 ? 40 : 50;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Nummernschild ${number}: eingebranntes Holz an einer Schnur (Art Direction §3).
     Erzeugt von scripts/build-signs.mjs — nicht von Hand ändern. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 96" width="84" height="96">
  <path d="M42 4 v18" stroke="#1A1024" stroke-width="6" stroke-linecap="round"/>
  <rect x="8" y="22" width="68" height="66" rx="9" fill="#D9B77A" stroke="#1A1024" stroke-width="8"/>
  <rect x="17" y="31" width="50" height="48" rx="5" fill="none" stroke="#8C6B3A" stroke-width="4"/>
  <text x="42" y="72" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
        font-weight="bold" text-anchor="middle" fill="#1A1024">${number}</text>
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });
for (let number = 1; number <= MAX_PLANKS; number += 1) {
  await writeFile(path.join(OUT_DIR, `num_${number}.svg`), sign(number));
}
console.log(`build:signs — ${MAX_PLANKS} Nummernschilder geschrieben.`);
