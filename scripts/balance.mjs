#!/usr/bin/env node
/**
 * Balancing-Analyse (Roadmap M6.2).
 *
 * Fährt die Simulation über einen Parameterraum und misst gegen die Ziele aus dem
 * A6-Audit:
 *   - Anteil Runden mit mindestens einem Fang: 40–70 %
 *   - Anteil „Belästigung"-Runden: ≤ 30 %
 *
 * Das Ergebnis ist **kein Ersatz für den Playtest.** Es sagt, was die Zahlen tun; ob es
 * Spaß macht, sagt nur ein Tisch. Aber wenn der Tisch sagt „der Beamte fängt immer" und
 * die Simulation dasselbe sagt, weiß man wenigstens, wo man drehen muss.
 *
 * Aufruf: `npm run balance` (schreibt eine Tabelle nach stdout).
 */

import { createSeededRng } from '../src/core/rng.ts';
import { defaultConfig, simulate } from '../src/core/simulate.ts';
import { modeFlags } from '../src/core/modes.ts';

const ROUNDS = 20_000;
const TARGET_CATCH = [0.4, 0.7];
const TARGET_HARASSMENT = 0.3;

/** Wie oft schmuggelt jemand? Die Unbekannte, die der Playtest liefern muss. */
const CHANCES = [0.3, 0.4, 0.5, 0.55, 0.65, 0.8];

function row(label, result) {
  const mark = (ok) => (ok ? ' ' : '←');
  const catchOk = result.roundsWithCatch >= TARGET_CATCH[0] && result.roundsWithCatch <= TARGET_CATCH[1];
  const harassOk = result.harassmentRounds <= TARGET_HARASSMENT;

  console.log(
    `  ${label.padEnd(26)} ` +
      `${(result.roundsWithCatch * 100).toFixed(1).padStart(5)} %${mark(catchOk)} ` +
      `${(result.harassmentRounds * 100).toFixed(1).padStart(5)} %${mark(harassOk)} ` +
      `${(result.hitRate * 100).toFixed(0).padStart(4)} % ` +
      `${result.smuggledThrough.toFixed(2).padStart(6)} ` +
      `${result.sipsTravelers.toFixed(1).padStart(6)} ` +
      `${result.sipsOfficer.toFixed(1).padStart(6)}`
  );
}

function header(title) {
  console.log(`\n${title}`);
  console.log(
    '  ' +
      'Fall'.padEnd(26) +
      ' Fang%  ' +
      ' Beläst% ' +
      ' Quote ' +
      '  durch ' +
      'Schl.R ' +
      'Schl.B'
  );
}

function main() {
  console.log('Balancing-Analyse — je Zeile 20 000 simulierte Runden.');
  console.log(`Ziele (A6): Fang-Anteil ${TARGET_CATCH[0] * 100}–${TARGET_CATCH[1] * 100} %, Belästigung ≤ ${TARGET_HARASSMENT * 100} %.`);
  console.log('"←" markiert, was das Ziel verfehlt.');

  header('Wie oft geschmuggelt wird (6 Spieler, Beamter folgt Hinweisen)');
  for (const chance of CHANCES) {
    row(
      `${(chance * 100).toFixed(0)} % schmuggeln`,
      simulate(
        defaultConfig({ rounds: ROUNDS, smuggler: { chance, greed: 0.5 } }),
        createSeededRng(11)
      )
    );
  }

  header('Spielerzahl (55 % schmuggeln)');
  for (const playerCount of [4, 5, 6, 7, 8]) {
    row(
      `${playerCount} Spieler (k=${playerCount <= 4 ? 1 : playerCount <= 6 ? 2 : 3})`,
      simulate(defaultConfig({ rounds: ROUNDS, playerCount }), createSeededRng(12))
    );
  }

  header('Wie gut der Beamte spielt (6 Spieler, 55 %)');
  for (const [label, config] of [
    ['würfelt nur', { officer: 'random' }],
    ['folgt Hinweisen halb', { officer: 'hints', ignoreHint: 0.5 }],
    ['folgt Hinweisen meist', { officer: 'hints', ignoreHint: 0.25 }],
    ['folgt Hinweisen immer', { officer: 'hints', ignoreHint: 0 }],
    ['winkt alle durch', { officer: 'never' }],
  ]) {
    row(label, simulate(defaultConfig({ rounds: ROUNDS, ...config }), createSeededRng(13)));
  }

  header('Modi (6 Spieler, 55 %)');
  for (const [label, modes] of [
    ['Klassik', {}],
    ['Spürhund (k−1)', { sniffer: true }],
    ['Hochsaison (k+1, bis 10)', { highSeason: true }],
    ['Spürhund + Hochsaison', { sniffer: true, highSeason: true }],
  ]) {
    row(
      label,
      simulate(defaultConfig({ rounds: ROUNDS, modes: modeFlags(modes) }), createSeededRng(14))
    );
  }

  /*
   * Der wichtigste Vergleich: Was **bringen** die Hinweise überhaupt?
   *
   * Design-Pfeiler 2 verlangt, dass sie gut genug sind, um ihnen zu glauben. Gemessen
   * wird das als Vorsprung der Trefferquote gegenüber blindem Raten. Ist der Vorsprung
   * null, sind die Hinweise Dekoration; ist er sehr groß, gibt es nichts zu entscheiden.
   */
  console.log('\nWas die Hinweise wert sind (6 Spieler)');
  console.log('  ' + 'Schmuggel-Anteil'.padEnd(20) + ' Raten  Hinweis  Vorsprung');
  for (const chance of CHANCES) {
    const blind = simulate(
      defaultConfig({ rounds: ROUNDS, officer: 'random', smuggler: { chance, greed: 0.5 } }),
      createSeededRng(15)
    );
    const guided = simulate(
      defaultConfig({ rounds: ROUNDS, officer: 'hints', ignoreHint: 0, smuggler: { chance, greed: 0.5 } }),
      createSeededRng(15)
    );
    const edge = (guided.hitRate - blind.hitRate) * 100;
    console.log(
      `  ${`${(chance * 100).toFixed(0)} % schmuggeln`.padEnd(20)}` +
        `${(blind.hitRate * 100).toFixed(0).padStart(5)} % ` +
        `${(guided.hitRate * 100).toFixed(0).padStart(6)} % ` +
        `${(edge >= 0 ? '+' : '') + edge.toFixed(1).padStart(6)} Punkte`
    );
  }

  console.log('\nSchl.R / Schl.B = Schlücke je Runde für Reisende bzw. Beamten.');
}

main();
