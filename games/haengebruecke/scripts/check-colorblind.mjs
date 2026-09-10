#!/usr/bin/env node
/**
 * Deuteranopie-Check (Audit A2).
 *
 * Acht Wanderer auf einer Brücke müssen auch dann auseinanderzuhalten sein, wenn Rot und
 * Grün zusammenfallen. Zwei Teile:
 *
 * 1. **Prüfbar:** Jede Spielerfarbe trägt ein eigenes Symbol auf dem Rucksack. Das ist
 *    die Absicherung, die nicht von Farbwahrnehmung abhängt — und die einzige, die ein
 *    Skript zusichern kann.
 * 2. **Zu sehen:** Aus dem Bühnen-Screenshot wird eine simulierte Fassung gerechnet
 *    (Brettel/Viénot im LMS-Raum, dasselbe Verfahren wie in den Browser-Werkzeugen).
 *    Ob acht Wanderer darauf noch acht sind, entscheidet ein Blick — nicht ein
 *    Schwellwert, den ich mir ausgedacht habe.
 *
 * Aufruf: `npm run check:colorblind` (nach `npm run capture:screens`)
 */

import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { PLAYER_COLORS } from '../src/config/theme.ts';

const SOURCE = process.argv[2] ?? 'docs/screens/m3-creak-8.png';
const TARGET = process.argv[3] ?? 'docs/screens/m3-deuteranopia-8.png';

/* --- Teil 1: das, was sich zusichern lässt --- */

const symbols = new Set(PLAYER_COLORS.map((color) => color.symbol));
console.log(`${PLAYER_COLORS.length} Spielerfarben · ${symbols.size} verschiedene Symbole`);

if (symbols.size !== PLAYER_COLORS.length) {
  console.error('Zwei Spieler teilen sich ein Symbol — dann trägt nur noch die Farbe.');
  process.exit(1);
}

/* --- Teil 2: das, was man ansehen muss --- */

if (!existsSync(SOURCE)) {
  console.error(`${SOURCE} fehlt — erst \`npm run capture:screens\` laufen lassen.`);
  process.exit(1);
}

/**
 * Deuteranopie-Matrix im sRGB-Raum (Machado/Oliveira/Fernandes, Schweregrad 1.0).
 *
 * Eine Näherung: Die exakte Simulation läuft über LMS und braucht Gamma hin und zurück.
 * Für die Frage "sind acht Hüte noch acht Hüte" reicht die Matrix — und sie ist genau
 * die, die Chrome DevTools unter "Deuteranopia" anwendet.
 */
const MATRIX = [
  [0.367322, 0.860646, -0.227968, 0],
  [0.280085, 0.672501, 0.047413, 0],
  [-0.011820, 0.042940, 0.968881, 0],
];

await sharp(SOURCE).recomb(MATRIX.map((row) => row.slice(0, 3))).toFile(TARGET);

console.log(`Simuliert: ${TARGET}`);
console.log('Ansehen (A2, manuell): Sind die acht Hüte auf der Brücke noch acht?');
