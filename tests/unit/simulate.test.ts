/**
 * Property-Test: 10 000 Runden mit Zufallszuegen (Roadmap M0.5, Audit A0).
 *
 * Invarianten aus Architektur §5:
 * - Jede Runde endet (die Kiste liegt immer auf einer Zelle).
 * - Die Token-Summe stimmt: Kisten-Tokens + 1 je ausgeloester fremder Mine + Boni.
 * - Niemand trinkt negativ; wer trinkt, ist in eine fremde Mine getreten oder Feigling.
 * - `publicView` enthaelt nie eine ungeoeffnete Mine.
 * - Der eigene Trittstein aendert nichts an dem, was das Feld zeigt (ADR-2).
 * - Niemand steht je auf seiner eigenen Anklagebank.
 */

import { describe, expect, it } from 'vitest';
import { SIPS_PER_FOREIGN_MINE, treasureTokens } from '@/config/rules';
import { publicView } from '@/core/board';
import { cowards, masterBonuses } from '@/core/modes';
import { createSeededRng } from '@/core/rng';
import { simulateRound, summarise, type DigStrategy, type SimulatedRound } from '@/core/simulate';
import type { SecureRandom } from '@/core/rng';
import type { Modes } from '@/config/rules';
import { modes } from './helpers';

/**
 * Reproduzierbarer Ersatz fuer `secureRandom`. Produktiv steckt dort `crypto`; fuer
 * 10 000 Runden brauchen wir Wiederholbarkeit und Tempo.
 */
function seededSecure(seed: number): SecureRandom {
  const rng = createSeededRng(seed);
  return { int: (maxExclusive) => rng.int(maxExclusive) };
}

const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Prueft alle Invarianten fuer eine einzelne Runde. */
function checkInvariants(round: SimulatedRound, m: Modes, playerCount: number): void {
  const { result, board } = round;

  // 1. Die Runde ist zu Ende gegangen — mit einem echten Fund, nicht durch die Notbremse.
  expect(result.finderIds.length).toBe(board.treasure.length);
  expect(round.digCount).toBeGreaterThan(0);
  expect(round.digCount).toBeLessThanOrEqual(board.size * board.size);

  // 2. Token-Summe: Kisten + Leger + Boni.
  const expectedTokens =
    result.finderIds.length * treasureTokens(board.size, m) +
    result.kills.length +
    Object.values(masterBonuses(result.digs, m)).reduce((a, b) => a + b, 0);
  const actualTokens = Object.values(result.tokens).reduce((a, b) => a + b, 0);
  expect(actualTokens).toBe(expectedTokens);

  // 3. Schluecke sind positiv und haben einen Grund.
  const expectedSips = result.kills.length * SIPS_PER_FOREIGN_MINE + cowards(result.digs, m).length;
  let actualSips = 0;
  for (const drinker of result.drinkers) {
    expect(drinker.sips).toBeGreaterThan(0);
    expect(['mine', 'coward']).toContain(drinker.reason);
    actualSips += drinker.sips;
  }
  expect(actualSips).toBe(expectedSips);

  // 4. Der oeffentliche Blick verraet nichts Ungeoeffnetes.
  const view = publicView(board);
  const serialised = JSON.stringify(view);
  expect(serialised).not.toContain('"owners"');
  expect(serialised).not.toContain('"duds"');
  expect(view.minesRemaining).toBeGreaterThanOrEqual(0);
  expect(view.minesRemaining).toBeLessThanOrEqual(playerCount * 2);
  expect(view.chestsRemaining).toBe(0);

  for (const dig of result.digs) {
    /*
     * 5. Der eigene Trittstein aendert nie, was das Feld zeigt (ADR-2). Was oben drueber
     *    liegt, zeigt es weiterhin: Liegt in derselben Zelle noch ein fremder
     *    Blindgaenger, macht es "Pfff" und nennt dessen Leger — genau wie es das ohne die
     *    eigene Mine darunter taete. Nur wenn sonst nichts da ist, muss ein leeres Feld
     *    herauskommen.
     */
    if (dig.ownMineConsumed && dig.foreignMines.length === 0 && !dig.treasureFound) {
      expect(dig.kind).toBe(dig.dudOwners.length > 0 ? 'dud' : 'empty');
      expect(view.opened[dig.cell]?.blamed).toEqual(dig.dudOwners);
    }
    // 6. Niemand steht je auf seiner eigenen Anklagebank.
    expect(dig.foreignMines).not.toContain(dig.by);
    expect(dig.dudOwners).not.toContain(dig.by);
    expect(view.opened[dig.cell]?.blamed ?? []).not.toContain(dig.by);
  }
}

describe('Property-Test: 10 000 Runden', () => {
  /**
   * Vier Modus-Kombinationen und Spielerzahlen von 3 bis 8, damit die 10 000 Runden
   * nicht alle dasselbe Feld sehen. Klassik hat das groesste Kontingent, damit die
   * Standardregeln am haeufigsten durchlaufen.
   */
  const SETUPS: { name: string; modes: Modes; share: number }[] = [
    { name: 'Klassik', modes: modes(), share: 0.4 },
    {
      name: 'Doppelagent + Kettenreaktion',
      modes: modes({ doubleAgent: true, chainReaction: true }),
      share: 0.2,
    },
    {
      name: 'Zwei Kisten + Nachtgraeber',
      modes: modes({ twoChests: true, nightDigger: true }),
      share: 0.2,
    },
    { name: 'Sprengmeister-Bonus', modes: modes({ masterBonus: true }), share: 0.2 },
  ];

  const TOTAL = 10_000;

  it('haelt alle Invarianten ueber 10 000 Runden', () => {
    let checked = 0;

    for (const [setupIndex, setup] of SETUPS.entries()) {
      const count = Math.round(TOTAL * setup.share);

      for (let i = 0; i < count; i++) {
        const playerCount = 3 + (i % 6);
        const round = simulateRound({
          playerIds: ids(playerCount),
          modes: setup.modes,
          rnd: seededSecure(setupIndex * 1_000_003 + i),
          seed: i,
          roundIndex: (i % 7) + 1,
        });

        checkInvariants(round, setup.modes, playerCount);
        checked += 1;
      }
    }

    expect(checked).toBe(TOTAL);
  }, 120_000);
});

describe('Balancing-Kennzahlen (Roadmap M6.2)', () => {
  /**
   * Kein Pass/Fail-Kriterium fuer M0 — die Zielwerte aus Audit A6 (Median 4-8 Grabungen,
   * 1-3 Explosionen, 5-15 % Preis der Gier) werden erst nach dem Playtest scharf gestellt.
   * Hier steht nur, dass die Simulation plausible Zahlen liefert und nie haengenbleibt.
   */
  function runWith(playerCount: number, m: Modes, strategy: DigStrategy, count = 1000) {
    const rounds: SimulatedRound[] = [];
    for (let i = 0; i < count; i++) {
      rounds.push(
        simulateRound({
          playerIds: ids(playerCount),
          modes: m,
          rnd: seededSecure(i + playerCount * 7919),
          seed: i,
          strategy,
        })
      );
    }
    return summarise(rounds);
  }

  const run = (playerCount: number, m: Modes, count = 1000) => runWith(playerCount, m, 'random', count);

  it('beendet jede Runde — bei 4 und bei 8 Spielern', () => {
    for (const playerCount of [4, 8]) {
      const summary = run(playerCount, modes());
      expect(summary.unfinished).toBe(0);
      expect(summary.digsMin).toBeGreaterThan(0);
      expect(summary.digsMax).toBeLessThanOrEqual(playerCount < 6 ? 25 : 36);
    }
  });

  it('liefert eine Statistik, die man lesen kann', () => {
    const summary = run(5, modes());

    expect(summary.rounds).toBe(1000);
    expect(summary.digsMedian).toBeGreaterThan(0);
    expect(summary.blastsMean).toBeGreaterThan(0);
    expect(summary.greedRate).toBeGreaterThanOrEqual(0);
    expect(summary.greedRate).toBeLessThan(1);
  });

  it('macht die Runden im Kettenreaktions-Modus nicht laenger', () => {
    // Die Kettenreaktion raeumt Minen ab, ohne Zellen zu verbrauchen, die noch die Kiste
    // tragen koennten — sie darf die Rundenlaenge also hoechstens senken.
    const plain = run(6, modes(), 400);
    const chained = run(6, modes({ chainReaction: true }), 400);
    expect(chained.digsMedian).toBeLessThanOrEqual(plain.digsMedian + 1);
  });

  it('summarise() kommt mit einer leeren Liste klar', () => {
    expect(summarise([])).toEqual({
      rounds: 0,
      digsMedian: 0,
      digsMin: 0,
      digsMax: 0,
      blastsMean: 0,
      greedRate: 0,
      unfinished: 0,
    });
  });

  it('findet die Kiste mit Hinweisen deutlich schneller als blind', () => {
    /*
     * Der Unterschied zwischen den beiden Strategien ist die Daseinsberechtigung der
     * Temperatur-Hinweise (ADR-3): Blind ist der Median der halbe Feldinhalt, mit
     * Hinweisen liegt er im Zielband aus Audit A6 (4-8 Grabungen).
     */
    const blind = run(4, modes(), 500);
    const clever = runWith(4, modes(), 'hints', 500);

    expect(clever.digsMedian).toBeLessThan(blind.digsMedian);
    expect(clever.digsMedian).toBeLessThanOrEqual(8);
    expect(clever.unfinished).toBe(0);
  });

  it('graebt im Nachtgraeber-Modus auch mit Hinweis-Strategie blind', () => {
    // Ohne Hinweise hat die Heuristik nichts, woran sie sich festhalten koennte.
    const dark = runWith(5, modes({ nightDigger: true }), 'hints', 300);
    const blind = run(5, modes({ nightDigger: true }), 300);
    expect(dark.digsMedian).toBe(blind.digsMedian);
  });

  it('respektiert die Notbremse `maxDigs`', () => {
    const round = simulateRound({
      playerIds: ids(4),
      modes: modes(),
      rnd: seededSecure(1),
      seed: 1,
      maxDigs: 1,
    });
    expect(round.digCount).toBe(1);
  });
});
