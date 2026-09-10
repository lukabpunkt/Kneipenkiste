#!/usr/bin/env node
/**
 * Das animierte Bild für das README (Roadmap M6.3).
 *
 * Aufgenommen wird die Sequenz-Preview mit erzwungenem Sturz (ADR-25) — reproduzierbar,
 * ohne eine Runde durchspielen zu müssen. Kodiert mit dem eigenen GIF-Encoder in
 * `scripts/lib/`, weil auf dieser Maschine kein ffmpeg liegt.
 *
 * Die Bildfrequenz ergibt sich aus der Messung, nicht aus einem Wunsch: Ein Screenshot
 * dauert so lange, wie er dauert, und die Anzeigedauer im GIF wird auf den gemessenen
 * Mittelwert gesetzt. Sonst liefe der Loop schneller oder langsamer als die Show.
 *
 * Aufruf: `npm run build && npm run preview`, dann
 *         `node scripts/capture-gif.mjs [sequenz|all] [ausgabe.gif]`
 *
 * `all` hängt alle sechs Stürze hintereinander — das ist der Ersatz für das Video, das
 * A4 als SOLL verlangt. Ein GIF statt eines mp4, weil ein Encoder mehr als genug ist.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { encodeGif } from './lib/gif.mjs';
import { decodePng, downscale } from './lib/png.mjs';

const SEQUENCE = process.argv[2] ?? 'fall_hold_hands';
const OUT = process.argv[3] ?? (SEQUENCE === 'all' ? 'docs/screens/m4-falls.gif' : 'docs/screens/hero.gif');

const ALL_FALLS = [
  'fall_hold_hands',
  'fall_coyote_delay',
  'fall_seesaw',
  'fall_rope_swing',
  'fall_domino',
  'fall_bounce_wall',
];
const BASE = 'http://localhost:4173/Haengebruecke/?dev=1&panel=sequences';

/** Was ins Bild gehört: Brücke und Schlucht, nicht die Statusleiste des Dev-Panels. */
const CLIP = { x: 0, y: 120, width: 390, height: 620 };
/** Ab wann aufgenommen wird (ms nach dem Klick) — davor läuft der Anlauf. */
const START_MS = 5000;
const single = SEQUENCE !== 'all';
const FRAMES = single ? 30 : 16;
/** Halbe Auflösung fürs README; für sechs Sequenzen hintereinander ein Drittel. */
const SCALE = single ? 2 : 3;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });

await page.addInitScript(() => {
  const colors = [
    ['red', 'circle', 'Rudi'],
    ['blue', 'triangle', 'Blue'],
    ['green', 'square', 'Gustav'],
    ['yellow', 'star', 'Yoshi'],
    ['purple', 'diamond', 'Lilo'],
  ];
  localStorage.setItem(
    'haengebruecke.session.v1',
    JSON.stringify({
      version: 1,
      players: colors.map(([colorId, symbol, name], i) => ({ id: `p${i + 1}`, name, colorId, symbol })),
      settings: {
        modes: { flags: false, rotten: false, weights: false, fog: false, rope: false },
        negotiationSec: 10,
        thinkTimerSec: 0,
        pace: 'normal',
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
    })
  );
});

await page.goto(BASE);
await page.waitForSelector('[data-dev="sequences"]');

const shots = [];
const stamps = [];

for (const sequence of single ? [SEQUENCE] : ALL_FALLS) {
  /* Das Panel klappt beim Start weg — für den nächsten Durchgang wieder auf. */
  await page.evaluate(() => {
    const panel = document.querySelector('[data-dev="sequences"]');
    if (panel instanceof HTMLElement) panel.dataset.open = 'true';
  });
  await page.locator(`.dev-sequences__item[data-scenario="${sequence}"]`).click();
  await page.locator('.step__stage canvas').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(START_MS);

  for (let i = 0; i < FRAMES; i += 1) {
    stamps.push(Date.now());
    shots.push(await page.screenshot({ clip: CLIP, animations: 'allow' }));
  }

  if (single) break;

  /* Warten, bis die Bühne weg ist — sonst startet die nächste in die alte hinein. */
  for (let i = 0; i < 40 && (await page.locator('.step__stage canvas').count()) > 0; i += 1) {
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
  console.log(`${sequence}: ${FRAMES} Frames`);
}

await browser.close();

/*
 * Der Mittelwert der gemessenen Abstände ist die Anzeigedauer — so läuft es echtzeitnah.
 * Die Sprünge zwischen zwei Sequenzen (Bühne abräumen, neu starten) fallen als Ausreisser
 * heraus: Der Median wäre robuster, aber ein einzelner Sprung unter 96 Werten verschiebt
 * den Mittelwert kaum, und Ausreisser über einer Sekunde fliegen ohnehin raus.
 */
const gaps = stamps
  .slice(1)
  .map((stamp, i) => stamp - stamps[i])
  .filter((gap) => gap < 1000);
const delayMs = Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);

const frames = shots.map((buffer) => downscale(decodePng(buffer), SCALE));
const gif = encodeGif(frames, { delayMs, maxColors: 128 });

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, gif);

console.log(
  `${OUT}: ${frames.length} Frames à ${delayMs} ms, ${frames[0].width}×${frames[0].height}, ` +
    `${(gif.length / 1024).toFixed(0)} KB`
);

/* Zum Nachsehen, ob der Bruch im Fenster liegt: drei Einzelbilder als PNG daneben. */
if (process.env.GIF_DEBUG) {
  for (const index of [0, Math.floor(FRAMES / 2), FRAMES - 1]) {
    await writeFile(`/tmp/gif-frame-${index}.png`, shots[index]);
  }
  console.log('Einzelbilder in /tmp/gif-frame-*.png');
}
