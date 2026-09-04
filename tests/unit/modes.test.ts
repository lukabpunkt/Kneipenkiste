/**
 * Modi (Roadmap M0.5, Audit A0) — die Teile, die nicht schon in `board.test.ts` und
 * `payout.test.ts` stecken: Modus-Abfragen, Sequenz-Filter und die Bonus-Rechnung
 * fuer sich genommen.
 */

import { describe, expect, it } from 'vitest';
import { boardSizeFor, chestCount, loadoutFor, treasureTokens } from '@/config/rules';
import {
  activeModes,
  anyModeActive,
  cowards,
  dudsEnabled,
  masterBonuses,
  sequenceAllowed,
} from '@/core/modes';
import type { DigResult } from '@/core/types';
import { modes } from './helpers';

/** Ein Ergebnis, das nur die Felder traegt, die die Bonus-Rechnung liest. */
function digResult(patch: Partial<DigResult>): DigResult {
  return {
    cell: 0,
    by: 'p1',
    kind: 'empty',
    hint: 'cold',
    foreignMines: [],
    dudOwners: [],
    ownMineConsumed: false,
    ownDudConsumed: false,
    treasureFound: false,
    chainReveals: [],
    roundOver: false,
    sequenceId: '',
    ...patch,
  };
}

describe('Modus-Abfragen', () => {
  it('meldet, ob und welche Modi laufen', () => {
    expect(anyModeActive(modes())).toBe(false);
    expect(activeModes(modes())).toEqual([]);

    const m = modes({ doubleAgent: true, twoChests: true });
    expect(anyModeActive(m)).toBe(true);
    expect(activeModes(m)).toEqual(['doubleAgent', 'twoChests']);
    expect(dudsEnabled(m)).toBe(true);
  });
});

describe('Modus-Parameter (rules.ts)', () => {
  it('Doppelagent tauscht eine Mine gegen einen Blindgaenger', () => {
    expect(loadoutFor(modes())).toEqual({ mine: 2, dud: 0 });
    expect(loadoutFor(modes({ doubleAgent: true }))).toEqual({ mine: 1, dud: 1 });
  });

  it('Zwei Kisten verdoppelt die Kisten und halbiert die Tokens', () => {
    expect(chestCount(modes())).toBe(1);
    expect(chestCount(modes({ twoChests: true }))).toBe(2);

    expect(treasureTokens(5, modes())).toBe(4);
    expect(treasureTokens(6, modes())).toBe(6);
    expect(treasureTokens(5, modes({ twoChests: true }))).toBe(2);
    expect(treasureTokens(6, modes({ twoChests: true }))).toBe(3);
  });

  it('skaliert die Feldgroesse mit der Spielerzahl (GDD §7)', () => {
    expect(boardSizeFor(3)).toBe(5);
    expect(boardSizeFor(5)).toBe(5);
    expect(boardSizeFor(6)).toBe(6);
    expect(boardSizeFor(8)).toBe(6);
  });
});

describe('Sequenz-Filter (Architektur §6)', () => {
  it('nimmt `hit_dud_then_boom` im Doppelagent-Modus aus der Auswahl', () => {
    const dudThenBoom = { excludeInModes: ['doubleAgent'] as const };

    expect(sequenceAllowed(dudThenBoom, modes())).toBe(true);
    expect(sequenceAllowed(dudThenBoom, modes({ doubleAgent: true }))).toBe(false);
  });

  it('laesst Sequenzen ohne Filter immer zu', () => {
    expect(sequenceAllowed({}, modes({ doubleAgent: true, chainReaction: true }))).toBe(true);
    expect(sequenceAllowed({ excludeInModes: undefined }, modes())).toBe(true);
  });
});

describe('Sprengmeister-Bonus, isoliert', () => {
  const m = modes({ masterBonus: true });

  it('zaehlt nur verschiedene Opfer', () => {
    const twoVictims = [
      digResult({ kind: 'crater', by: 'p1', foreignMines: ['p2'] }),
      digResult({ kind: 'crater', by: 'p3', foreignMines: ['p2'] }),
    ];
    expect(masterBonuses(twoVictims, m)).toEqual({ p2: 1 });

    const sameVictim = [
      digResult({ kind: 'crater', by: 'p1', foreignMines: ['p2'] }),
      digResult({ kind: 'crater', by: 'p1', foreignMines: ['p2'] }),
    ];
    expect(masterBonuses(sameVictim, m)).toEqual({});
  });

  it('zaehlt den Preis der Gier mit', () => {
    const digs = [
      digResult({ kind: 'crater', by: 'p1', foreignMines: ['p2'] }),
      digResult({ kind: 'greed', by: 'p3', foreignMines: ['p2'], treasureFound: true }),
    ];
    expect(masterBonuses(digs, m)).toEqual({ p2: 1 });
  });

  it('ignoriert Krater, die eine Kettenreaktion aufgerissen hat', () => {
    // Solche Zellen erzeugen kein eigenes DigResult — sie stehen nur in `chainReveals`.
    const digs = [
      digResult({
        kind: 'crater',
        by: 'p1',
        foreignMines: ['p2'],
        chainReveals: [
          { cell: 5, owners: ['p2'], hint: 'cold' },
          { cell: 7, owners: ['p2'], hint: 'cold' },
        ],
      }),
    ];
    expect(masterBonuses(digs, m)).toEqual({});
  });

  it('schweigt, wenn der Modus aus ist', () => {
    const digs = [
      digResult({ kind: 'crater', by: 'p1', foreignMines: ['p2'] }),
      digResult({ kind: 'crater', by: 'p3', foreignMines: ['p2'] }),
    ];
    expect(masterBonuses(digs, modes())).toEqual({});
    expect(cowards(digs, modes())).toEqual([]);
  });

  it('erkennt den Feigling erst, wenn alle eigenen Sprengkoerper weg sind', () => {
    const one = [digResult({ by: 'p1', ownMineConsumed: true })];
    expect(cowards(one, m)).toEqual([]);

    const both = [
      digResult({ by: 'p1', ownMineConsumed: true }),
      digResult({ by: 'p1', ownMineConsumed: true }),
    ];
    expect(cowards(both, m)).toEqual(['p1']);
  });

  it('zaehlt einen Doppeltreffer auf einer Zelle als zwei', () => {
    // Beide eigenen Sprengkoerper koennen nie auf derselben Zelle liegen — der Fall
    // steht hier trotzdem, damit die Rechnung nicht an der Zellenzahl haengt.
    const stacked = [digResult({ by: 'p1', ownMineConsumed: true, ownDudConsumed: true })];
    expect(cowards(stacked, modes({ masterBonus: true, doubleAgent: true }))).toEqual(['p1']);
  });
});
