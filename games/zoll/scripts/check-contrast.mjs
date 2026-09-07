#!/usr/bin/env node
/**
 * Kontrast-Prüfung (Audit A5: ≥ 4.5:1).
 *
 * Geprüft werden die Paarungen, die im Spiel wirklich vorkommen — nicht alle
 * Kombinationen, die die Tokens hergeben. Der kritische Fall ist die Zollhalle: Sie ist
 * die einzige **helle** Bühne der Spielefamilie, und heller Text darauf ist der Fehler,
 * den man am Schreibtisch nie sieht und auf einer Party sofort.
 */

import { readFile } from 'node:fs/promises';

const TOKENS = 'src/styles/tokens.css';
const AA = 4.5;
/** Große Schrift (≥ 24 px oder ≥ 19 px fett) darf bei 3:1 bleiben. */
const AA_LARGE = 3;

/** Relative Luminanz nach WCAG 2.1. */
function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

async function tokens() {
  const css = await readFile(TOKENS, 'utf8');
  const map = new Map();
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    map.set(name, value);
  }
  return map;
}

/** Was im Spiel wirklich übereinander liegt. */
const PAIRS = [
  ['Menü: Text auf Hintergrund', 'c-paper', 'c-bg-deep', AA],
  ['Menü: Text auf Panel', 'c-paper', 'c-bg-panel', AA],
  ['Menü: Text auf erhöhtem Panel', 'c-paper', 'c-bg-panel-raised', AA],
  ['CTA: ink auf Zoll-Gelb', 'c-ink', 'c-customs', AA],
  ['Halle: ink auf Wand', 'c-ink', 'c-hall-wall', AA],
  ['Halle: ink auf Boden', 'c-ink', 'c-hall-floor', AA],
  ['Halle: ink auf Papier', 'c-ink', 'c-paper', AA],
  ['Röntgen: Glow auf Monitor', 'c-xray-glow', 'c-xray-bg', AA],
  ['Banner: paper auf Alarm', 'c-paper', 'c-alarm', AA_LARGE],
  ['Banner: ink auf OK-Grün', 'c-ink', 'c-ok', AA],
  ['Banner: paper auf Belästigung', 'c-paper', 'c-busted', AA_LARGE],
  ['Result: Zoll-Gelb auf Hintergrund', 'c-customs', 'c-bg-deep', AA_LARGE],
  ['Result: Alarm auf Panel', 'c-alarm', 'c-bg-panel', AA_LARGE],
  ['Result: OK-Grün auf Panel', 'c-ok', 'c-bg-panel', AA],
];

/**
 * Spielerfarben als Badge-Hintergrund. Der Vordergrund folgt `textColorOn()`:
 * Gelb, Cyan und Grün bekommen `ink`, alle anderen `paper`.
 */
/* `textColorOn()` gibt seit M5 fuer jede Spielerfarbe `ink` zurueck — siehe theme.ts. */
const DARK_TEXT = new Set(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']);
const PLAYERS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

async function main() {
  const map = await tokens();
  const rows = [];
  let failed = 0;

  const check = (label, fg, bg, min) => {
    const a = map.get(fg);
    const b = map.get(bg);
    if (!a || !b) {
      rows.push([label, '—', 'TOKEN FEHLT']);
      failed += 1;
      return;
    }
    const value = ratio(a, b);
    const ok = value >= min;
    if (!ok) failed += 1;
    rows.push([label, `${value.toFixed(2)}:1`, ok ? `ok (≥ ${min})` : `ZU WENIG (< ${min})`]);
  };

  for (const [label, fg, bg, min] of PAIRS) check(label, fg, bg, min);

  for (const player of PLAYERS) {
    const fg = DARK_TEXT.has(player) ? 'c-ink' : 'c-paper';
    /* Namen auf Badges sind fett, aber klein — also der strenge Wert. */
    check(`Spielerfarbe ${player}`, fg, `c-player-${player}`, AA);
  }

  const width = Math.max(...rows.map((r) => r[0].length));
  for (const [label, value, note] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value.padStart(8)}  ${note}`);
  }

  if (failed > 0) {
    console.error(`\ncheck:contrast — ${failed} Paarung(en) unter der Grenze (Audit A5).`);
    process.exitCode = 1;
  } else {
    console.log(`\ncheck:contrast — alle ${rows.length} Paarungen bestehen.`);
  }
}

await main();
