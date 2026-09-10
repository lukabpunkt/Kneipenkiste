#!/usr/bin/env node
/**
 * Bilder der Menü-Screens für den Look-Check (Audit A5).
 *
 * `capture-screens.mjs` fotografiert die Bühne, `capture-falls.mjs` die Stürze — hier
 * geht es um alles, was in DOM und SVG lebt: der Titel-Loop in vier Momenten, die
 * Absprache mit Modus-Chips und Fahnen-Streit, das Result mit Zusammenstoß-Grafik.
 *
 * Aufruf: `npm run build && npm run preview` in einem Terminal, dann
 *         `node scripts/capture-ui.mjs [ausgabeordner]`
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const OUT_DIR = process.argv[2] ?? 'docs/screens';
const BASE = 'http://localhost:4173/Haengebruecke/';

/** Wo im Titel-Loop (9 s) etwas passiert. */
const TITLE_MOMENTS = [
  ['walk', 1000],
  ['stand', 1900],
  ['break', 3400],
  ['mist', 4700],
  ['back', 6600],
];

const SESSION = (players, modes) => ({
  version: 1,
  players,
  settings: {
    modes,
    negotiationSec: 20,
    thinkTimerSec: 0,
    pace: 'short',
    sound: false,
    music: 0,
    haptics: false,
    lowEffects: false,
    locale: 'de',
  },
  roundIndex: 0,
  bridge: { count: 7, planks: [1, 2, 3, 4, 5, 6, 7], removed: [] },
  ropeUsage: {},
  stats: {},
  history: [],
});

const PLAYERS = [
  ['red', 'circle', 'Rudi'],
  ['blue', 'triangle', 'Blue'],
  ['green', 'square', 'Gustav'],
  ['yellow', 'star', 'Yoshi'],
  ['purple', 'diamond', 'Lilo'],
].map(([colorId, symbol, name], i) => ({ id: `p${i + 1}`, name, colorId, symbol }));

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });

const problems = [];
page.on('pageerror', (error) => problems.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(message.text());
});

await page.addInitScript(
  ({ session }) => {
    /* Teilen gibt es nur mit Web-Share-API — für das Bild wird sie vorgetäuscht. */
    navigator.share ??= () => Promise.resolve();
    localStorage.setItem('haengebruecke.session.v1', JSON.stringify(session));
  },
  {
    session: SESSION(PLAYERS, { flags: true, rotten: true, weights: true, fog: false, rope: true }),
  }
);

/* --- Titel: der Loop in fünf Momenten --- */
await page.goto(BASE);
await page.waitForSelector('.title__hiker');
let elapsed = 0;
for (const [name, at] of TITLE_MOMENTS) {
  await page.waitForTimeout(at - elapsed);
  elapsed = at;
  await page.screenshot({ path: path.join(OUT_DIR, `m5-title-${name}.png`) });
}
console.log(`Titel: ${TITLE_MOMENTS.length} Bilder`);

/* --- Absprache: Modus-Chips, Einmal-Hinweis, Fahnen-Streit --- */
await page.getByRole('button', { name: 'Spielen' }).click();
await page.getByRole('button', { name: 'Auf die Brücke' }).click();
await page.waitForSelector('[data-screen="negotiation"]');
await page.screenshot({ path: path.join(OUT_DIR, 'm5-negotiation.png'), fullPage: true });

for (const index of [0, 1]) {
  await page.locator('.flag-row__player').nth(index).locator('.flag-row__plank[data-plank="3"]').click();
}
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT_DIR, 'm5-flag-conflict.png'), fullPage: true });
console.log('Absprache: 2 Bilder');

/* --- Eine Runde bis zum Result: zwei auf einem Balken, einer am Seil --- */
await page.getByRole('button', { name: 'Alle bereit' }).click();
for (const pick of ['3', '3', '5', '6', 'rope']) {
  await page.waitForSelector('[data-screen="pass"][data-armed="true"]', { timeout: 20_000 });
  await page.locator('[data-screen="pass"]').click({ delay: 40 });
  await page.waitForSelector('[data-screen="choose"]');
  if (pick === 'rope') await page.getByRole('button', { name: 'Seil nehmen (einmalig)' }).click();
  else await page.locator(`[data-screen="choose"] .plank[data-plank="${pick}"]`).click();
}

await page.waitForSelector('[data-screen="sealed"]', { timeout: 20_000 });
await page.getByRole('button', { name: 'Der Schritt' }).click();
await page.waitForSelector('.step__stage canvas', { timeout: 30_000 });
await page.waitForTimeout(3800);
await page.screenshot({ path: path.join(OUT_DIR, 'm5-step-rope.png') });

const skip = page.locator('.step__skip');
await skip.waitFor({ state: 'visible' });
for (let i = 0; i < 80 && (await skip.isDisabled()); i += 1) await page.waitForTimeout(500);
await skip.click().catch(() => undefined);

for (let guard = 0; guard < 60; guard += 1) {
  if (await page.locator('[data-screen="result"]').isVisible().catch(() => false)) break;
  const target = page.locator('[data-screen="distribute"] button:not([disabled])').first();
  if ((await target.count()) > 0) await target.click().catch(() => undefined);
  else await page.waitForTimeout(200);
}

await page.waitForSelector('[data-screen="result"]', { timeout: 30_000 });
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT_DIR, 'm5-result.png'), fullPage: true });
console.log('Runde: 2 Bilder');

if (problems.length > 0) {
  console.error('Konsole meldet:', problems.slice(0, 5).join(' | '));
  process.exitCode = 1;
}

await browser.close();
