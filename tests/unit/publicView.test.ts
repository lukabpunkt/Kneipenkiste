/**
 * Der Privatsphaere-Test (CLAUDE.md, Standing Audit).
 *
 * Er prueft nicht nur einzelne Felder, sondern serialisiert die komplette Projektion und
 * sucht darin nach den Geheimnissen. Ein spaeter dazugebautes Feld faellt damit auf,
 * ohne dass jemand daran denken muss, den Test zu erweitern.
 */

import { describe, expect, it } from 'vitest';
import { chooseView, publicView, resultView, type ViewPhase } from '@/core/publicView';
import { resolveRound } from '@/core/round';
import { createSeededRng } from '@/core/rng';
import { GIVING_SAFE, GIVING_SAFE_DEATH_ZONE } from '@/config/rules';
import { roundOf } from './helpers';

const PHASES: ViewPhase[] = ['NEGOTIATION', 'PASS', 'CHOOSE', 'SEALED'];

const secretRound = () =>
  roundOf({
    picks: [3, 3, 7, 5],
    plankCount: 8,
    modes: { flags: true, rotten: true, weights: true },
    rottenPlank: 7,
    flags: { p1: 6 },
    weights: { p1: 3, p2: 2 },
  });

describe('publicView verraet keine Wahlen', () => {
  it('enthaelt in keiner Phase fremde Wahlen, Gewichte oder den morschen Balken', () => {
    const round = secretRound();

    for (const phase of PHASES) {
      const view = publicView(round, phase);
      /*
       * `modes` heisst legitim "weights" und "rotten" — das sind die eingeschalteten Modi,
       * nicht die Werte. Der Rest der Projektion darf diese Woerter nirgends tragen.
       */
      const { modes: _modes, ...rest } = view;
      const serialized = JSON.stringify(rest);

      expect(serialized).not.toContain('choices');
      expect(serialized).not.toContain('weights');
      expect(serialized).not.toContain('rottenPlank');
      expect(view.bridge.rottenPlank).toBeUndefined();
    }
  });

  it('zeigt, WER versiegelt hat — nicht, WAS', () => {
    const round = secretRound();
    delete round.choices.p4;

    const view = publicView(round, 'CHOOSE');
    expect(view.sealedBy).toEqual(['p1', 'p2', 'p3']);
    expect(Object.keys(view)).not.toContain('choices');
  });

  it('zeigt Fahnen — die sind oeffentlich, das ist ihr ganzer Sinn', () => {
    const view = publicView(secretRound(), 'NEGOTIATION');
    expect(view.planks.find((p) => p.id === 6)!.flaggedBy).toEqual(['p1']);
    expect(view.planks.find((p) => p.id === 3)!.flaggedBy).toEqual([]);
  });

  it('zeigt keine Fahnen, wenn der Modus aus ist', () => {
    const round = roundOf({ picks: [1, 2, 3], flags: { p1: 2 } });
    expect(publicView(round, 'NEGOTIATION').planks.every((p) => p.flaggedBy.length === 0)).toBe(true);
  });

  it('nennt die Regelzeile dieser Runde', () => {
    expect(publicView(roundOf({ picks: [1, 2, 3], plankCount: 5 }), 'NEGOTIATION').givingPerSafePlayer).toBe(
      GIVING_SAFE
    );

    const tight = publicView(roundOf({ picks: [1, 1, 2], plankCount: 2 }), 'NEGOTIATION');
    expect(tight.deathZone).toBe(true);
    expect(tight.givingPerSafePlayer).toBe(GIVING_SAFE_DEATH_ZONE);
  });

  it('zeigt nur die verbliebenen Balken, aber merkt sich die Luecken', () => {
    const round = roundOf({ picks: [1, 2, 3], plankCount: 5 });
    round.bridge = { count: 3, planks: [1, 3, 5], removed: [2, 4] };

    const view = publicView(round, 'NEGOTIATION');
    expect(view.planks.map((p) => p.id)).toEqual([1, 3, 5]);
    expect(view.bridge.removed).toEqual([2, 4]);
  });
});

describe('chooseView zeigt nur das eigene Handy', () => {
  it('verraet weder fremde Wahlen noch fremde Gewichte', () => {
    const round = secretRound();
    const view = chooseView(round, 'p1');
    const serialized = JSON.stringify(view);

    expect(view.ownChoice).toEqual({ plank: 3 });
    expect(view.ownFlag).toBe(6);
    expect(view.ownWeight).toBe(3);

    /* p2 hat Gewicht 2 und steht auf 3 — beides taucht hier nicht auf. */
    expect(serialized).not.toContain('p2');
    expect(serialized).not.toContain('p3');
    expect(view.bridge.rottenPlank).toBeUndefined();
  });

  it('zeigt vor der eigenen Wahl gar keine Wahl', () => {
    const round = roundOf({ picks: [1, 2, 3], plankCount: 5 });
    delete round.choices.p2;
    expect(chooseView(round, 'p2').ownChoice).toBeUndefined();
  });

  it('laesst Fahne und Gewicht weg, wenn die Modi aus sind', () => {
    const round = roundOf({ picks: [1, 2, 3], flags: { p1: 2 }, weights: { p1: 3 } });
    const view = chooseView(round, 'p1');
    expect(view.ownFlag).toBeUndefined();
    expect(view.ownWeight).toBeUndefined();
  });

  it('blendet das Seil aus, wenn es verbraucht ist', () => {
    const round = roundOf({ picks: [1, 2, 3], modes: { rope: true } });
    expect(chooseView(round, 'p1', {}).ropeAvailable).toBe(true);
    expect(chooseView(round, 'p1', { p1: 1 }).ropeAvailable).toBe(false);
  });

  it('weist Spieler ab, die gar nicht mitspielen', () => {
    expect(() => chooseView(roundOf({ picks: [1, 2, 3] }), 'p9')).toThrow();
  });
});

describe('resultView — ab hier ist alles oeffentlich', () => {
  it('zeigt Wahlen, den morschen Balken und die naechste Bruecke', () => {
    const round = secretRound();
    const result = resolveRound(round, { rng: createSeededRng(7) });
    const view = resultView(result);

    expect(view.planks.find((p) => p.id === 3)!.players).toEqual(['p1', 'p2']);
    expect(view.planks.find((p) => p.id === 3)!.collision).toBe(true);
    expect(view.rottenPlank).toBe(7);
    expect(view.repaired).toBe(true);
    expect(view.nextPlankCount).toBe(6);
  });

  it('nennt die leeren Balken', () => {
    const result = resolveRound(roundOf({ picks: [1, 2, 3], plankCount: 5 }), { rng: createSeededRng(8) });
    const view = resultView(result);

    expect(view.emptyPlanks).toEqual([4, 5]);
    expect(view.repaired).toBe(false);
    expect(view.removedPlank).toBeDefined();
  });

  it('stellt Fahne und tatsaechliche Wahl nebeneinander', () => {
    const result = resolveRound(
      roundOf({ picks: [5, 1, 2], plankCount: 6, modes: { flags: true }, flags: { p1: 3 } }),
      { rng: createSeededRng(9) }
    );
    const view = resultView(result);

    expect(view.planks.find((p) => p.id === 3)!.flaggedBy).toEqual(['p1']);
    expect(view.planks.find((p) => p.id === 5)!.players).toEqual(['p1']);
    expect(view.deserters).toEqual(['p1']);
  });

  it('reicht die Rucksaecke an die Buehne durch — aber nur im Modus (Roadmap M5.2)', () => {
    const withMode = resultView(
      resolveRound(
        roundOf({ picks: [1, 2, 3], plankCount: 5, modes: { weights: true }, weights: { p1: 3, p2: 1, p3: 2 } }),
        { rng: createSeededRng(11) }
      )
    );
    expect(withMode.weights).toEqual({ p1: 3, p2: 1, p3: 2 });

    /* Ohne den Modus gibt es keine Gewichte — und damit auch nichts zu zeigen. */
    const withoutMode = resultView(
      resolveRound(roundOf({ picks: [1, 2, 3], plankCount: 5, weights: { p1: 3 } }), {
        rng: createSeededRng(11),
      })
    );
    expect(withoutMode.weights).toBeUndefined();
  });

  it('verschweigt den morschen Balken, wenn der Modus aus war', () => {
    const round = roundOf({ picks: [1, 2, 3], plankCount: 5, rottenPlank: 4 });
    const view = resultView(resolveRound(round, { rng: createSeededRng(10) }));
    expect(view.rottenPlank).toBeUndefined();
  });
});
