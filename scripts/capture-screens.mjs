#!/usr/bin/env node
/**
 * Bühnen-Screenshots für den Look-Check (Audit A2).
 *
 * Spielt eine Runde bis in die Schlucht und hält die Zeitachse an mehreren Stellen an:
 * Aufstellung, Anlauf, Schritt, Knarren, Blickkontakt, Bruch, Nachspiel. Genau diese
 * Bilder prüft A2 gegen Art Direction §1/§5/§6 — von Hand nachzuklicken wäre jedes Mal
 * ein anderer Moment.
 *
 * Aufruf: `npm run build && npm run preview` in einem Terminal, dann
 *         `node scripts/capture-screens.mjs [ausgabeordner] [spielerzahl] [praefix]`
 *
 * Das Präfix benennt den Meilenstein, dessen Look-Check die Bilder belegen — die Show
 * ändert sich, und ein Bild von heute unter dem Namen von gestern wäre eine Fälschung.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const OUT_DIR = process.argv[2] ?? 'docs/screens';
const PLAYERS = Number(process.argv[3] ?? 5);
const PREFIX = process.argv[4] ?? 'm3';
const BASE = 'http://localhost:4173/Haengebruecke/?dev=1';

/** Wer wohin tritt: die ersten beiden auf denselben Balken — sonst gibt es nichts zu sehen. */
function picks(count) {
  return Array.from({ length: count }, (_, i) => (i === 0 ? 3 : i === 1 ? 3 : i + 2));
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, locale: 'de-DE' });

const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(e.message));

await page.addInitScript((count) => {
  const colors = [
    ['red', 'circle', 'Rudi'], ['blue', 'triangle', 'Blue'], ['green', 'square', 'Gustav'],
    ['yellow', 'star', 'Yoshi'], ['purple', 'diamond', 'Lilo'], ['orange', 'heart', 'Olli'],
    ['pink', 'bolt', 'Pinky'], ['cyan', 'cross', 'Turbo'],
  ];
  localStorage.setItem('haengebruecke.session.v1', JSON.stringify({
    version: 1,
    players: Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`, name: colors[i][2], colorId: colors[i][0], symbol: colors[i][1],
    })),
    settings: {
      modes: { flags: false, rotten: false, weights: false, fog: false, rope: false },
      negotiationSec: 10, thinkTimerSec: 0, pace: 'normal',
      sound: false, music: 0, haptics: false, lowEffects: false, locale: 'de',
    },
    roundIndex: 0,
    bridge: { count: count + 2, planks: Array.from({ length: count + 2 }, (_, i) => i + 1), removed: [] },
    ropeUsage: {}, stats: {}, history: [],
  }));
}, PLAYERS);

await page.goto(BASE);
await page.getByRole('button', { name: 'Spielen' }).click();
await page.getByRole('button', { name: 'Auf die Brücke' }).click();
await page.screenshot({ path: path.join(OUT_DIR, `${PREFIX}-negotiation-${PLAYERS}.png`) });
await page.getByRole('button', { name: 'Alle bereit' }).click();

for (const pick of picks(PLAYERS)) {
  await page.locator('[data-screen="pass"][data-armed="true"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-screen="pass"]').click();
  await page.locator(`.plank[data-plank="${pick}"]`).click();
}

await page.locator('[data-screen="sealed"] .btn:not([disabled])').waitFor({ timeout: 20_000 });
await page.getByRole('button', { name: 'Der Schritt' }).click();
await page.locator('.step__stage canvas').waitFor({ timeout: 20_000 });

/*
 * Die Momente, die der Look-Check sehen will.
 *
 * Feste Zeitpunkte für alles ausser dem Nachspiel: Wann das kommt, hängt von Spielerzahl,
 * Tempo und Zahl der Brüche ab — eine geratene Zahl liefert je nach Runde ein Bild vom
 * Verteilen-Screen. Deshalb wird bis zum Ende der Show mitgeschnitten und der letzte
 * Frame **mit Canvas** als `aftermath` behalten.
 */
const moments = [
  ['lineup', 900],
  ['run', 2400],
  ['step', 3900],
  ['creak', 4900],
  ['eyecontact', 5600],
  ['break', 7000],
  ['climb', 9500],
];

let elapsed = 0;
for (const [name, at] of moments) {
  await page.waitForTimeout(Math.max(0, at - elapsed));
  elapsed = at;
  await page.screenshot({ path: path.join(OUT_DIR, `${PREFIX}-${name}-${PLAYERS}.png`) });
}

/* Messwerte holen, **solange die Bühne steht** — beim Abräumen meldet sie sich ab. */
const stats = await page.evaluate(() => globalThis.__stageStats?.());
if (stats) {
  const sorted = [...stats.frameTimes].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  console.log(
    `Frames: p50 ${at(0.5).toFixed(1)} ms · p95 ${at(0.95).toFixed(1)} ms · ` +
      `${stats.drawCalls} Draw-Calls · ${stats.particles} Partikel`
  );
} else {
  console.log('Keine Messwerte — läuft die Bühne?');
}

/*
 * Abbruchbedingung ist das **Canvas**, nicht der Screen: Die Bühne wird abgeräumt, bevor
 * der Router den Screen austauscht — wer auf den Screen wartet, fotografiert die leere
 * Farbfläche dahinter.
 */
const aftermathPath = path.join(OUT_DIR, `${PREFIX}-aftermath-${PLAYERS}.png`);
for (let i = 0; i < 40; i += 1) {
  if ((await page.locator('.step__stage canvas').count()) === 0) break;
  await page.screenshot({ path: aftermathPath });
  await page.waitForTimeout(400);
}

console.log('Endstand:', await page.evaluate(() => document.querySelector('[data-screen]')?.dataset.screen));

console.log(`${moments.length + 1} Bilder in ${OUT_DIR} (n = ${PLAYERS}).`);
if (problems.length > 0) {
  console.error('Konsole meldet:', problems.slice(0, 5).join(' | '));
  process.exitCode = 1;
}

await browser.close();
