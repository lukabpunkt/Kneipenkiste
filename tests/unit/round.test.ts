import { describe, expect, it } from 'vitest';
import { allChosen, choose, clearFlag, createRound, hasChosen, isRoundInDeathZone, randomPlank, resolveRound, setFlag, setWeight } from '@/core/round';
import { createBridge } from '@/core/bridge';
import { createSequencePicker } from '@/core/choreographer';
import { createSeededRng } from '@/core/rng';
import { noModes } from '@/core/modes';
import { MISC_SEQUENCES, OVERLAY_SEQUENCES } from '@/config/sequences';
import { bridgeOf, playerIds, roundOf } from './helpers';

const rng = (seed: number) => createSeededRng(seed);

const setup = (playerCount: number, modes = noModes(), plankCount?: number) => ({
  index: 0,
  playerIds: playerIds(playerCount),
  modes,
  bridge: plankCount === undefined ? createBridge(playerCount) : bridgeOf(plankCount),
});

describe('createRound', () => {
  it('zieht den morschen Balken nur im passenden Modus', () => {
    expect(createRound(setup(4), rng(1)).bridge.rottenPlank).toBeUndefined();
    expect(createRound(setup(4, { ...noModes(), rotten: true }), rng(1)).bridge.rottenPlank).toBeDefined();
  });

  it('startet ohne Wahlen', () => {
    const round = createRound(setup(5), rng(2));
    expect(round.choices).toEqual({});
    expect(allChosen(round)).toBe(false);
  });
});

describe('choose', () => {
  it('versiegelt und laesst kein Zurueck', () => {
    let round = createRound(setup(3), rng(3));
    round = choose(round, 'p1', { plank: 2 });
    expect(hasChosen(round, 'p1')).toBe(true);

    /* Zweiter Versuch prallt ab — sonst waere der Letzte im Vorteil. */
    const again = choose(round, 'p1', { plank: 4 });
    expect(again).toBe(round);
    expect(again.choices.p1).toEqual({ plank: 2 });
  });

  it('weist Balken zurueck, die es nicht gibt', () => {
    const round = createRound(setup(3, noModes(), 4), rng(4));
    expect(() => choose(round, 'p1', { plank: 9 })).toThrow(RangeError);
  });

  it('allChosen erst, wenn wirklich alle durch sind', () => {
    let round = createRound(setup(3), rng(5));
    for (const id of ['p1', 'p2']) round = choose(round, id, { plank: 1 });
    expect(allChosen(round)).toBe(false);
    round = choose(round, 'p3', { plank: 2 });
    expect(allChosen(round)).toBe(true);
  });
});

describe('Fahne und Gewicht', () => {
  it('setzt und nimmt Fahnen nur im Modus zurueck', () => {
    const flagRound = createRound(setup(3, { ...noModes(), flags: true }), rng(6));
    const flagged = setFlag(flagRound, 'p1', 3);
    expect(flagged.flags).toEqual({ p1: 3 });
    expect(clearFlag(flagged, 'p1').flags).toEqual({});
    /* Wer keine Fahne hat, aendert nichts. */
    expect(clearFlag(flagRound, 'p1')).toBe(flagRound);

    const plain = createRound(setup(3), rng(6));
    expect(setFlag(plain, 'p1', 3)).toBe(plain);
  });

  it('setzt Gewichte nur im Modus', () => {
    const weightRound = createRound(setup(3, { ...noModes(), weights: true }), rng(7));
    expect(setWeight(weightRound, 'p1', 3).weights).toEqual({ p1: 3 });

    const plain = createRound(setup(3), rng(7));
    expect(setWeight(plain, 'p1', 3)).toBe(plain);
  });
});

describe('randomPlank', () => {
  it('waehlt nur Balken, die es gibt', () => {
    const round = createRound(setup(3, noModes(), 4), rng(8));
    for (let seed = 0; seed < 100; seed += 1) {
      const choice = randomPlank(round, rng(seed));
      expect(round.bridge.planks).toContain((choice as { plank: number }).plank);
    }
  });
});

describe('resolveRound', () => {
  it('schrumpft die Bruecke bei Frieden und repariert sie nach einem Krach', () => {
    const peaceful = resolveRound(roundOf({ picks: [1, 2, 3], plankCount: 5 }), { rng: rng(9) });
    expect(peaceful.outcome).toBe('allSafe');
    expect(peaceful.nextBridge.count).toBe(4);
    expect(peaceful.removedPlank).toBeDefined();
    expect(peaceful.nextBridge.removed).toEqual([peaceful.removedPlank]);

    const crash = resolveRound(roundOf({ picks: [1, 1, 3], plankCount: 4 }), { rng: rng(9) });
    expect(crash.nextBridge.count).toBe(5);
    expect(crash.nextBridge.removed).toEqual([]);
    expect(crash.removedPlank).toBeUndefined();
  });

  it('gibt den morschen Balken nicht an die naechste Runde weiter', () => {
    const result = resolveRound(
      roundOf({ picks: [1, 2, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 4 }),
      { rng: rng(10) }
    );
    expect(result.bridge.rottenPlank).toBe(4);
    /* Sonst waere er zwei Runden lang derselbe. */
    expect(result.nextBridge.rottenPlank).toBeUndefined();
  });

  it('waehlt fuer jeden Kollisionsbalken eine Fall- und fuer jeden Sicheren eine Safe-Sequenz', () => {
    const result = resolveRound(roundOf({ picks: [1, 1, 3, 4], plankCount: 6 }), { rng: rng(11) });

    expect(Object.keys(result.sequenceIds.fall)).toEqual(['1']);
    expect(Object.keys(result.sequenceIds.safe).sort()).toEqual(['p3', 'p4']);
    expect(result.sequenceIds.misc).toEqual([MISC_SEQUENCES.repairCarpenter]);
  });

  it('haengt bei Frieden das Abfaulen ans Nachspiel', () => {
    const result = resolveRound(roundOf({ picks: [1, 2, 3], plankCount: 5 }), { rng: rng(12) });
    expect(result.sequenceIds.misc).toEqual([MISC_SEQUENCES.allSafeRot]);
  });

  it('kuendigt die Todeszone vor dem Nachspiel an', () => {
    const result = resolveRound(roundOf({ picks: [1, 1, 2], plankCount: 2 }), { rng: rng(13) });
    expect(result.sequenceIds.misc).toEqual([MISC_SEQUENCES.deathzoneSign, MISC_SEQUENCES.repairCarpenter]);
  });

  it('legt Overlays fuer Morsch und Fahnenflucht an', () => {
    const rotten = resolveRound(
      roundOf({ picks: [2, 1, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 }),
      { rng: rng(14) }
    );
    expect(rotten.sequenceIds.overlays).toEqual([OVERLAY_SEQUENCES.rottenCrack]);
    /* Der Durchgebrochene bekommt keine Sicher-Sequenz. */
    expect(rotten.sequenceIds.safe.p1).toBeUndefined();

    const deserter = resolveRound(
      roundOf({ picks: [5, 1, 3], plankCount: 5, modes: { flags: true }, flags: { p1: 3 } }),
      { rng: rng(15) }
    );
    expect(deserter.sequenceIds.overlays).toEqual([OVERLAY_SEQUENCES.deserterStamp]);
  });

  it('ist deterministisch: gleicher Seed, gleiches Ergebnis', () => {
    const round = roundOf({ picks: [1, 1, 3, 3, 5], plankCount: 7, seed: 4242 });
    const a = resolveRound(round, { rng: rng(1), picker: createSequencePicker(round.seed) });
    const b = resolveRound(round, { rng: rng(1), picker: createSequencePicker(round.seed) });
    expect(a).toEqual(b);
  });

  it('faengt mit leerer Verteilung an — die fuellt erst der Distribute-Screen', () => {
    const result = resolveRound(roundOf({ picks: [1, 1, 3] }), { rng: rng(16) });
    expect(result.distribution).toEqual([]);
  });
});

describe('isRoundInDeathZone', () => {
  it('erkennt zu wenige Balken', () => {
    expect(isRoundInDeathZone(roundOf({ picks: [1, 1, 2], plankCount: 2 }))).toBe(true);
    expect(isRoundInDeathZone(roundOf({ picks: [1, 2, 3], plankCount: 5 }))).toBe(false);
  });
});

describe('Voreinstellungen', () => {
  it('rechnet ohne uebergebene Quellen mit crypto und frischem Picker', () => {
    const result = resolveRound(roundOf({ picks: [1, 2, 3], plankCount: 5 }));
    expect(result.removedPlank).toBeDefined();
    expect(createBridge(3).planks).toContain(result.removedPlank);
  });
});
