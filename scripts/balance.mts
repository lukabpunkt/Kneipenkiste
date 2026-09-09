#!/usr/bin/env vite-node
/**
 * Balancing-Pass (Roadmap M6.2, Audit A6).
 *
 * Drei Tabellen, und die dritte ist die, um die es geht:
 *
 * 1. **Zufallswahl** — der schlechteste Fall. Bei acht Leuten auf zehn Balken kracht es
 *    in 98 % der Runden. Die Zahl sagt mehr über das Schubfachprinzip als über das Spiel.
 * 2. **Abgesprochen mit 20 % Wortbruch** — dasselbe Raster, aber mit dem Verhalten, das
 *    am Tisch entsteht: jeder hat einen eigenen Balken zugesagt, jeder Fünfte hält sich
 *    nicht daran.
 * 3. **Die Wortbruch-Kurve** — Kollisionsrate über der Bruch-Quote, bei frischer Brücke.
 *    Hier lässt sich ablesen, wie treulos eine Gruppe sein muss, damit sie im
 *    A6-Korridor von 40–70 % landet.
 * 4. **Die Sitzung** — acht Runden am Stück mit Schrumpfen und Reparatur. Das ist die
 *    Zahl, die A6 wirklich meint: Am Tisch ist die Balkenzahl kein Regler, sondern ein
 *    Ergebnis. Wer sich gut abspricht, schrumpft sich selbst in die Enge.
 *
 * Aufruf: `npm run balance -- [Runden] [Seed]`
 */

import {
  simulateDefectCurve,
  simulateMatrix,
  simulateSession,
  type SimulationReport,
} from '../src/core/simulate';

const rounds = Number(process.argv[2] ?? 20_000);
const seed = Number(process.argv[3] ?? 20260907);

const pct = (value: number): string => `${(value * 100).toFixed(1).padStart(5)} %`;

function zoneOf(report: SimulationReport): string {
  if (report.deathZone) return 'Todeszone';
  return report.plankCount === report.playerCount + 2 ? 'frisch' : 'geschrumpft';
}

function printMatrix(reports: SimulationReport[]): void {
  console.log('  n   B   Zone         Kollision   Massensturz   Alle sicher   Schlucke/Runde');
  console.log('  ────────────────────────────────────────────────────────────────────────────');

  let lastPlayerCount = 0;
  for (const report of reports) {
    if (report.playerCount !== lastPlayerCount && lastPlayerCount !== 0) console.log('');
    lastPlayerCount = report.playerCount;

    console.log(
      `  ${String(report.playerCount).padStart(1)}  ${String(report.plankCount).padStart(2)}  ` +
        `${zoneOf(report).padEnd(12)}${pct(report.collisionRate)}     ${pct(report.massCollisionRate)}` +
        `       ${pct(report.allSafeRate)}   ${report.sipsPerRound.toFixed(2).padStart(7)}`
    );
  }
}

console.log(`Balancing über ${rounds.toLocaleString('de-DE')} Runden je Zelle (Seed ${seed})`);

console.log('\n\n── 1. Zufallswahl: niemand spricht sich ab ──────────────────────────────────\n');
printMatrix(simulateMatrix(rounds, seed));

const DEFECT = 0.2;
console.log(
  `\n\n── 2. Abgesprochen, ${(DEFECT * 100).toFixed(0)} % brechen ihr Wort ` +
    '───────────────────────────────\n'
);
printMatrix(simulateMatrix(rounds, seed, { strategy: 'negotiated', defectRate: DEFECT }));

console.log('\n\n── 3. Wortbruch-Kurve bei frischer Brücke (B = n + 2) ───────────────────────\n');
const RATES = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.75, 1];
console.log(`  Bruch-Quote  ${RATES.map((r) => `${(r * 100).toFixed(0)}%`.padStart(6)).join('')}`);
console.log(`  ${'─'.repeat(13 + RATES.length * 6)}`);

for (let playerCount = 3; playerCount <= 8; playerCount += 1) {
  const curve = simulateDefectCurve(playerCount, rounds, seed, RATES);
  const cells = curve.map((report) => `${(report.collisionRate * 100).toFixed(0)}%`.padStart(6)).join('');
  console.log(`  n = ${playerCount}        ${cells}`);
}

console.log('\n\n── 4. Sitzung: 8 Runden mit Schrumpfen und Reparatur ────────────────────────\n');
console.log('   n   Bruch   Kollision   Todeszone   Ø Balken   Runden bis Todeszone   Schlucke/Runde');
console.log('  ───────────────────────────────────────────────────────────────────────────────────────');

const SESSION_ROUNDS = 8;
const SESSION_REPEATS = Math.max(1, Math.floor(rounds / SESSION_ROUNDS));

for (let playerCount = 3; playerCount <= 8; playerCount += 1) {
  for (const defectRate of [0.1, 0.2, 0.3]) {
    /* Viele kurze Sitzungen statt einer langen — eine Sitzung ist acht Runden, kein Marathon. */
    const runs = Array.from({ length: SESSION_REPEATS }, (_, i) =>
      simulateSession({ playerCount, rounds: SESSION_ROUNDS, seed: seed + i * 7919, defectRate })
    );
    const mean = (pick: (r: (typeof runs)[number]) => number): number =>
      runs.reduce((sum, run) => sum + pick(run), 0) / runs.length;

    const reached = runs.filter((run) => run.roundsToDeathZone !== null);
    const untilZone =
      reached.length === 0
        ? '     nie'
        : `${(reached.reduce((sum, run) => sum + (run.roundsToDeathZone ?? 0), 0) / reached.length)
            .toFixed(1)
            .padStart(5)} (${((reached.length / runs.length) * 100).toFixed(0)} %)`;

    console.log(
      `   ${playerCount}   ${`${(defectRate * 100).toFixed(0)} %`.padStart(5)}   ` +
        `${pct(mean((r) => r.collisionRate))}     ${pct(mean((r) => r.deathZoneRate))}   ` +
        `${mean((r) => r.averagePlankCount).toFixed(2).padStart(8)}   ${untilZone.padStart(20)}   ` +
        `${mean((r) => r.sipsPerRound).toFixed(2).padStart(12)}`
    );
  }
  console.log('');
}

/*
 * In der Todeszone steht "Massensturz 0,0 %" — nicht, weil es dort keine gäbe, sondern
 * weil `deathZone` als Outcome Vorrang hat (Architektur §5). Die Kollisionsspalte zählt
 * sie mit.
 */
console.log(
  '\n  Bei Bruch-Quote 0 kracht es ausserhalb der Todeszone nie — das ist kein Fehler,' +
    '\n  sondern der Beweis, dass die Absprache trägt, solange sie gehalten wird.' +
    '\n  Zielkorridor A6: 40–70 % Kollisionsrunden ausserhalb der Todeszone.'
);
