#!/usr/bin/env node
/**
 * Ein Bilderstreifen je Fall-Sequenz (Audit A4).
 *
 * A4 fragt pro Sequenz: **Ist in einer Sekunde lesbar, wer fällt und mit wem?** Das lässt
 * sich nur ansehen, nicht messen — und nur, wenn man dieselbe Sequenz reproduzierbar
 * bekommt. Der Sequenz-Preview erzwingt sie (`setForcedFall`), sonst zeigte ein Knopf
 * namens "seesaw" irgendeinen Sturz.
 *
 * Fünf Momente je Sequenz: Blickkontakt, Bruch, Gag, Gag-Fortsetzung, Aufstieg.
 *
 * Aufruf: `npm run build && npm run preview` in einem Terminal, dann
 *         `node scripts/capture-falls.mjs [ausgabeordner] [sequenz ...]`
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const OUT_DIR = process.argv[2] ?? 'docs/screens/falls';
const WANTED = process.argv.slice(3);
const BASE = 'http://localhost:4173/Haengebruecke/?dev=1&panel=sequences';

/** Wann im Ablauf fotografiert wird (ms nach dem Klick auf das Szenario). */
const MOMENTS = [
  ['eye', 5300],
  ['snap', 6300],
  ['gag', 7200],
  ['gag2', 8100],
  ['climb', 9400],
];

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, locale: 'de-DE' });

const problems = [];
page.on('pageerror', (error) => problems.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(message.text());
});

await page.addInitScript(() => {
  const colors = [
    ['red', 'circle', 'Rudi'], ['blue', 'triangle', 'Blue'], ['green', 'square', 'Gustav'],
    ['yellow', 'star', 'Yoshi'], ['purple', 'diamond', 'Lilo'],
  ];
  localStorage.setItem('haengebruecke.session.v1', JSON.stringify({
    version: 1,
    players: colors.map(([colorId, symbol, name], i) => ({ id: `p${i + 1}`, name, colorId, symbol })),
    settings: {
      modes: { flags: false, rotten: false, weights: false, fog: false, rope: false },
      negotiationSec: 10, thinkTimerSec: 0, pace: 'normal',
      sound: false, music: 0, haptics: false, lowEffects: false, locale: 'de',
    },
    roundIndex: 0,
    bridge: { count: 7, planks: [1, 2, 3, 4, 5, 6, 7], removed: [] },
    ropeUsage: {}, stats: {}, history: [],
  }));
});

await page.goto(BASE);
await page.waitForSelector('[data-dev="sequences"]');

const available = await page
  .locator('.dev-sequences__item')
  .evaluateAll((nodes) => nodes.map((node) => node.dataset.scenario));
const sequences = (WANTED.length > 0 ? WANTED : available.filter((id) => id.startsWith('fall_')));

for (const id of sequences) {
  if (!available.includes(id)) {
    console.error(`Kein Szenario "${id}". Vorhanden: ${available.join(', ')}`);
    process.exitCode = 1;
    continue;
  }

  /* Das Panel klappt beim Start weg — für den nächsten Durchgang wieder auf. */
  await page.evaluate(() => {
    const panel = document.querySelector('[data-dev="sequences"]');
    if (panel) panel.dataset.open = 'true';
  });
  await page.locator(`.dev-sequences__item[data-scenario="${id}"]`).click();
  await page.locator('.step__stage canvas').waitFor({ timeout: 30_000 });

  let elapsed = 0;
  for (const [name, at] of MOMENTS) {
    await page.waitForTimeout(at - elapsed);
    elapsed = at;
    await page.screenshot({ path: path.join(OUT_DIR, `${id}-${name}.png`) });
  }

  /* Warten, bis die Bühne weg ist — sonst startet das nächste Szenario in die alte hinein. */
  for (let i = 0; i < 30 && (await page.locator('.step__stage canvas').count()) > 0; i += 1) {
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  console.log(`${id}: ${MOMENTS.length} Bilder`);
}

if (problems.length > 0) {
  console.error('Konsole meldet:', problems.slice(0, 5).join(' | '));
  process.exitCode = 1;
}

await browser.close();
