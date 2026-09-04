/**
 * Auszahlung (Roadmap M0.5, Audit A0):
 * 2 Schluecke pro fremder Mine, 1 Token je Leger, Finder 4/6 bzw. 2/3 bei zwei Kisten,
 * Preis der Gier gibt beides, Kettenreaktion kostet niemanden etwas.
 */

import { describe, expect, it } from 'vitest';
import { dig } from '@/core/board';
import {
  applyDistribution,
  digPayout,
  distributeOrder,
  finishRound,
  totalSips,
  validateDistribution,
} from '@/core/payout';
import type { DigResult, RoundResult } from '@/core/types';
import { buildBoard, modes } from './helpers';

const seed = 99;

/** Spielt eine Liste von Zuegen auf einem vorbereiteten Feld durch. */
function play(board: Parameters<typeof dig>[0], turns: [number, string][], m = modes()) {
  let current = board;
  const digs: DigResult[] = [];
  for (const [cell, by] of turns) {
    const outcome = dig(current, cell, by, { modes: m, seed });
    current = outcome.board;
    digs.push(outcome.result);
  }
  return { board: current, digs };
}

describe('digPayout — die Sofort-Konsequenz', () => {
  const board = buildBoard({
    playerCount: 4,
    mines: { 3: ['p2'], 9: ['p2', 'p3'], 12: ['p1'] },
    treasure: [20],
  });

  it('kostet 2 Schluecke pro fremder Mine und gibt jedem Leger ein Token', () => {
    const { digs } = play(board, [[3, 'p1']]);
    const payout = digPayout(digs[0]!, 5, modes());

    expect(payout.sips).toBe(2);
    expect(payout.tokens).toEqual({ p2: 1 });
    expect(payout.kills).toEqual([{ layer: 'p2', victim: 'p1', cell: 3 }]);
  });

  it('verdoppelt bei einem Stapel und zahlt beiden Legern', () => {
    const { digs } = play(board, [[9, 'p1']]);
    const payout = digPayout(digs[0]!, 5, modes());

    expect(payout.sips).toBe(4);
    expect(payout.tokens).toEqual({ p2: 1, p3: 1 });
    expect(payout.kills).toHaveLength(2);
  });

  it('kostet beim eigenen Trittstein und beim leeren Feld nichts', () => {
    const { digs } = play(board, [
      [12, 'p1'],
      [0, 'p1'],
    ]);
    for (const result of digs) {
      expect(digPayout(result, 5, modes())).toEqual({ sips: 0, tokens: {}, kills: [] });
    }
  });

  it('gibt dem Finder 4 Tokens auf 5 × 5 und 6 auf 6 × 6', () => {
    const small = play(board, [[20, 'p1']]).digs[0]!;
    expect(digPayout(small, 5, modes()).tokens).toEqual({ p1: 4 });
    expect(digPayout(small, 6, modes()).tokens).toEqual({ p1: 6 });
  });

  it('halbiert die Kisten-Tokens im Modus "Zwei Kisten"', () => {
    const m = modes({ twoChests: true });
    const two = buildBoard({ playerCount: 4, treasure: [20, 4], modes: m });
    const result = play(two, [[20, 'p1']], m).digs[0]!;

    expect(digPayout(result, 5, m).tokens).toEqual({ p1: 2 });
    expect(digPayout(result, 6, m).tokens).toEqual({ p1: 3 });
  });

  it('zahlt beim Preis der Gier beides', () => {
    const greedy = buildBoard({ playerCount: 4, mines: { 20: ['p2'] }, treasure: [20] });
    const result = play(greedy, [[20, 'p1']]).digs[0]!;
    const payout = digPayout(result, 5, modes());

    expect(payout.sips).toBe(2);
    expect(payout.tokens).toEqual({ p2: 1, p1: 4 });
  });

  it('laesst den Blindgaenger folgenlos', () => {
    const m = modes({ doubleAgent: true });
    const dudBoard = buildBoard({ playerCount: 4, duds: { 3: ['p2'] }, treasure: [20], modes: m });
    const result = play(dudBoard, [[3, 'p1']], m).digs[0]!;

    expect(digPayout(result, 5, m)).toEqual({ sips: 0, tokens: {}, kills: [] });
  });

  it('laesst die Kettenreaktion niemanden trinken (GDD §3.6)', () => {
    const m = modes({ chainReaction: true });
    const chained = buildBoard({
      playerCount: 4,
      mines: { 6: ['p2'], 0: ['p3'], 12: ['p4'] },
      treasure: [24],
      modes: m,
    });
    const result = play(chained, [[6, 'p1']], m).digs[0]!;
    const payout = digPayout(result, 5, m);

    expect(result.chainReveals).toHaveLength(2);
    // Nur die Mine unter der getippten Platte zaehlt — die Nachbarn sind Gratis-Information.
    expect(payout.sips).toBe(2);
    expect(payout.tokens).toEqual({ p2: 1 });
  });
});

describe('finishRound — die Runde zusammengefasst', () => {
  function round(m = modes()): RoundResult {
    const board = buildBoard({
      playerCount: 4,
      mines: { 3: ['p2'], 9: ['p2', 'p3'], 12: ['p1'] },
      treasure: [20],
      modes: m,
    });
    const played = play(
      board,
      [
        [12, 'p1'], // eigener Trittstein, stumm
        [3, 'p2'], // p2 tritt in die eigene Mine → ebenfalls stumm
        [9, 'p4'], // Stapel: p2 und p3 erwischen p4
        [20, 'p1'], // p1 findet die Kiste
      ],
      m
    );
    return finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });
  }

  it('sammelt Trinker, Kills und Tokens', () => {
    const result = round();

    expect(result.drinkers).toEqual([{ playerId: 'p4', sips: 4, reason: 'mine' }]);
    expect(result.kills).toEqual([
      { layer: 'p2', victim: 'p4', cell: 9 },
      { layer: 'p3', victim: 'p4', cell: 9 },
    ]);
    expect(result.tokens).toEqual({ p2: 1, p3: 1, p1: 4 });
    expect(result.finderIds).toEqual(['p1']);
  });

  it('legt das komplette Feld als Replay bei', () => {
    const result = round();
    expect(result.replay).toHaveLength(25);
    expect(result.replay[3]!.opened?.kind).toBe('empty'); // p2s eigene Mine, stumm
  });

  it('schickt den Finder zuerst zum Verteilen (Architektur §3)', () => {
    expect(distributeOrder(round())).toEqual(['p1', 'p2', 'p3']);
  });

  it('addiert mehrere Explosionen desselben Spielers zu einer Zeile', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p2'], 9: ['p3'] }, treasure: [20] });
    const played = play(board, [
      [3, 'p1'],
      [9, 'p1'],
    ]);
    const result = finishRound({ index: 1, seed, modes: modes(), board: played.board, digs: played.digs });

    expect(result.drinkers).toEqual([{ playerId: 'p1', sips: 4, reason: 'mine' }]);
  });
});

describe('Sprengmeister-Bonus (GDD §3.6)', () => {
  const m = modes({ masterBonus: true });

  it('gibt ein Extra-Token, wenn eine Mine zwei verschiedene Spieler erwischt', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p2'], 9: ['p2'] }, treasure: [20], modes: m });
    const played = play(
      board,
      [
        [3, 'p1'],
        [9, 'p4'],
      ],
      m
    );
    const result = finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });

    // 2 Tokens fuer die Treffer + 1 Bonus.
    expect(result.tokens['p2']).toBe(3);
  });

  it('gibt keinen Bonus, wenn zweimal derselbe Spieler drauftritt', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p2'], 9: ['p2'] }, treasure: [20], modes: m });
    const played = play(
      board,
      [
        [3, 'p1'],
        [9, 'p1'],
      ],
      m
    );
    const result = finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });

    expect(result.tokens['p2']).toBe(2);
  });

  it('laesst den "Feigling" trinken, der nur seine eigenen Minen aufgraebt', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p1'], 9: ['p1'] }, treasure: [20], modes: m });
    const played = play(
      board,
      [
        [3, 'p1'],
        [9, 'p1'],
      ],
      m
    );
    const result = finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });

    expect(result.drinkers).toEqual([{ playerId: 'p1', sips: 1, reason: 'coward' }]);
  });

  it('verschont, wer erst einen seiner Trittsteine benutzt hat', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p1'], 9: ['p1'] }, treasure: [20], modes: m });
    const played = play(board, [[3, 'p1']], m);
    const result = finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });

    expect(result.drinkers).toEqual([]);
  });

  it('bleibt aus, wenn der Modus nicht aktiv ist', () => {
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p1'], 9: ['p1'] }, treasure: [20] });
    const played = play(board, [
      [3, 'p1'],
      [9, 'p1'],
    ]);
    const result = finishRound({ index: 1, seed, modes: modes(), board: played.board, digs: played.digs });

    expect(result.drinkers).toEqual([]);
  });

  it('zaehlt im Doppelagent-Modus Mine und Blindgaenger zusammen', () => {
    const both = modes({ masterBonus: true, doubleAgent: true });
    const board = buildBoard({
      playerCount: 4,
      mines: { 3: ['p1'] },
      duds: { 9: ['p1'] },
      treasure: [20],
      modes: both,
    });
    const played = play(
      board,
      [
        [3, 'p1'],
        [9, 'p1'],
      ],
      both
    );
    const result = finishRound({ index: 1, seed, modes: both, board: played.board, digs: played.digs });

    expect(result.drinkers).toEqual([{ playerId: 'p1', sips: 1, reason: 'coward' }]);
  });

  it('nimmt einen Bonus-Empfaenger in die Verteil-Reihenfolge auf', () => {
    /*
     * Der Bonus kann jemandem ein Token geben, der sonst nirgends auftaucht — dann muss
     * er trotzdem verteilen duerfen. Hier trifft p2 zwei Spieler, waehrend p1 die Kiste hebt.
     */
    const board = buildBoard({ playerCount: 4, mines: { 3: ['p2'], 9: ['p2'] }, treasure: [20], modes: m });
    const played = play(
      board,
      [
        [3, 'p1'],
        [9, 'p3'],
        [20, 'p4'],
      ],
      m
    );
    const result = finishRound({ index: 1, seed, modes: m, board: played.board, digs: played.digs });

    expect(distributeOrder(result)).toEqual(['p4', 'p2']);
  });
});

describe('Verteilung (GDD §3.5)', () => {
  const round: RoundResult = {
    index: 1,
    size: 5,
    seed,
    modes: modes(),
    digs: [],
    drinkers: [{ playerId: 'p3', sips: 2, reason: 'mine' }],
    kills: [],
    tokens: { p1: 4 },
    distribution: [],
    finderIds: ['p1'],
    replay: [],
  };

  it('akzeptiert eine Verteilung, die genau aufgeht', () => {
    expect(validateDistribution(round, 'p1', { p2: 1, p3: 3 })).toEqual({ ok: true });
    expect(validateDistribution(round, 'p1', { p2: 4 })).toEqual({ ok: true });
  });

  it('verbietet die Verteilung an sich selbst (GDD §3.5)', () => {
    expect(validateDistribution(round, 'p1', { p1: 4 })).toEqual({ ok: false, reason: 'self' });
    // Null an sich selbst ist harmlos — der Screen zeigt jeden Badge an.
    expect(validateDistribution(round, 'p1', { p1: 0, p2: 4 })).toEqual({ ok: true });
  });

  it('besteht auf der genauen Anzahl und weist negative Werte ab', () => {
    expect(validateDistribution(round, 'p1', { p2: 3 })).toEqual({ ok: false, reason: 'amount' });
    expect(validateDistribution(round, 'p1', { p2: 5 })).toEqual({ ok: false, reason: 'amount' });
    expect(validateDistribution(round, 'p1', { p2: 5, p3: -1 })).toEqual({ ok: false, reason: 'negative' });
  });

  it('traegt die Verteilung ein und rechnet die Gesamtschluecke zusammen', () => {
    const after = applyDistribution(round, 'p1', { p2: 1, p3: 3, p4: 0 });

    expect(after.distribution).toEqual([
      { from: 'p1', to: 'p2', sips: 1 },
      { from: 'p1', to: 'p3', sips: 3 },
    ]);
    // p3 hatte schon 2 aus der Explosion.
    expect(totalSips(after)).toEqual({ p3: 5, p2: 1 });
  });

  it('nennt bei leeren Token-Konten niemanden', () => {
    expect(distributeOrder({ ...round, tokens: {}, finderIds: [] })).toEqual([]);
  });
});
