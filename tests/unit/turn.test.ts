/**
 * Zugreihenfolge und Timer-Fallback (Roadmap M0.5, Audit A0).
 * Kernpunkt: Der Startspieler rotiert jede Runde, sonst hat Spieler 1 immer den
 * statistisch sichersten ersten Zug (GDD §7).
 */

import { describe, expect, it } from 'vitest';
import { dig } from '@/core/board';
import {
  nextPlayerIndex,
  playerAtTurn,
  randomClosedCell,
  startingPlayerIndex,
  turnOrder,
} from '@/core/turn';
import { buildBoard, fixedRandom, modes } from './helpers';

const ids = ['p1', 'p2', 'p3', 'p4'];

describe('Startspieler-Rotation (GDD §3.4)', () => {
  it('schiebt den Anfang jede Runde um eins weiter', () => {
    expect(startingPlayerIndex(1, 4)).toBe(0);
    expect(startingPlayerIndex(2, 4)).toBe(1);
    expect(startingPlayerIndex(4, 4)).toBe(3);
    expect(startingPlayerIndex(5, 4)).toBe(0);
  });

  it('gibt jedem Spieler in n Runden genau einmal den ersten Zug', () => {
    const starters = Array.from({ length: 4 }, (_, i) => turnOrder(ids, i + 1)[0]);
    expect(new Set(starters).size).toBe(4);
  });

  it('verlangt mindestens einen Spieler', () => {
    expect(() => startingPlayerIndex(1, 0)).toThrow(RangeError);
    expect(() => playerAtTurn([], 1, 0)).toThrow(RangeError);
    expect(() => nextPlayerIndex(0, 0)).toThrow(RangeError);
  });
});

describe('Zugreihenfolge', () => {
  it('laeuft ab dem Startspieler einmal im Kreis', () => {
    expect(turnOrder(ids, 1)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(turnOrder(ids, 3)).toEqual(['p3', 'p4', 'p1', 'p2']);
  });

  it('laeuft in der Grabphase endlos weiter', () => {
    // Runde 2 startet bei p2; nach vier Zuegen ist p2 wieder dran.
    expect(playerAtTurn(ids, 2, 0)).toBe('p2');
    expect(playerAtTurn(ids, 2, 3)).toBe('p1');
    expect(playerAtTurn(ids, 2, 4)).toBe('p2');
    expect(playerAtTurn(ids, 2, 9)).toBe('p3');
  });

  it('zaehlt den naechsten Spieler im Kreis', () => {
    expect(nextPlayerIndex(0, 4)).toBe(1);
    expect(nextPlayerIndex(3, 4)).toBe(0);
  });
});

describe('Zug-Timer-Fallback (GDD §3.4)', () => {
  const board = buildBoard({ playerCount: 4, mines: { 3: ['p2'] }, treasure: [20] });

  it('waehlt eine geschlossene Zelle', () => {
    expect(randomClosedCell(board, fixedRandom(7))).toBe(7);
  });

  it('trifft nie eine schon offene Platte', () => {
    const opened = dig(board, 0, 'p1', { modes: modes(), seed: 1 }).board;
    // Der Fake liefert Index 0 der **geschlossenen** Zellen — das ist jetzt Zelle 1.
    expect(randomClosedCell(opened, fixedRandom(0))).toBe(1);
  });

  it('meldet ein volles Feld statt zu raten', () => {
    let full = board;
    for (let cell = 0; cell < 25; cell++) {
      full = {
        ...full,
        opened: { ...full.opened, [cell]: { cell, by: 'p1', kind: 'empty', hint: 'cold', blamed: [] } },
      };
    }
    expect(randomClosedCell(full, fixedRandom(0))).toBeNull();
  });
});
