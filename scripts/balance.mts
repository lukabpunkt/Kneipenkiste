#!/usr/bin/env vite-node
/**
 * Balancing-Matrix (Roadmap M6.2, Audit A6).
 *
 * Wie oft kracht es bei rein zufälliger Wahl — je Spielerzahl und Balkenzahl?
 * Das ist die Untergrenze: Echte Gruppen sprechen sich ab und liegen darunter, bis
 * jemand lügt. Zielkorridor aus A6: 40–70 % Kollisionsrunden außerhalb der Todeszone.
 *
 * Aufruf: `npm run balance -- [Runden] [Seed]`
 */

import { simulateMatrix } from '../src/core/simulate';

const rounds = Number(process.argv[2] ?? 20_000);
const seed = Number(process.argv[3] ?? 20260907);

console.log(`Balancing über ${rounds.toLocaleString('de-DE')} Runden je Zelle (Seed ${seed})\n`);
console.log('  n   B   Zone      Kollision   Massensturz   Alle sicher   Schlucke/Runde');
console.log('  ─────────────────────────────────────────────────────────────────────────');

let lastPlayerCount = 0;
for (const report of simulateMatrix(rounds, seed)) {
  if (report.playerCount !== lastPlayerCount && lastPlayerCount !== 0) console.log('');
  lastPlayerCount = report.playerCount;

  const pct = (value: number): string => `${(value * 100).toFixed(1).padStart(5)} %`;
  const zone = report.deathZone ? 'Todeszone' : report.plankCount === report.playerCount + 2 ? 'frisch   ' : 'geschrumpft';

  console.log(
    `  ${String(report.playerCount).padStart(1)}  ${String(report.plankCount).padStart(2)}  ${zone.padEnd(11)}` +
      `${pct(report.collisionRate)}     ${pct(report.massCollisionRate)}       ${pct(report.allSafeRate)}   ` +
      `${report.sipsPerRound.toFixed(2).padStart(7)}`
  );
}

/*
 * In der Todeszone steht "Massensturz 0,0 %" — nicht, weil es dort keine gäbe, sondern
 * weil `deathZone` als Outcome Vorrang hat (Architektur §5). Die Kollisionsspalte zählt
 * sie mit.
 */
console.log(
  '\n  Zufallswahl ist die Untergrenze: Echte Gruppen sprechen sich ab und liegen darunter,' +
    '\n  bis jemand lügt. Zielkorridor A6: 40–70 % Kollisionsrunden außerhalb der Todeszone.'
);
