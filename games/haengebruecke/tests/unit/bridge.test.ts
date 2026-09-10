import { describe, expect, it } from 'vitest';
import { canShrink, createBridge, isDeathZone, pickRottenPlank, repair, shrink, withoutSecrets } from '@/core/bridge';
import { createSeededRng } from '@/core/rng';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/config/rules';
import { bridgeOf } from './helpers';

const rng = (seed: number) => createSeededRng(seed);

describe('createBridge', () => {
  it('startet mit n + 2 Balken, durchnummeriert ab 1', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const bridge = createBridge(n);
      expect(bridge.count).toBe(n + 2);
      expect(bridge.planks).toEqual(Array.from({ length: n + 2 }, (_, i) => i + 1));
      expect(bridge.removed).toEqual([]);
    }
  });
});

describe('shrink', () => {
  it('nimmt genau einen Balken weg und merkt sich die Luecke', () => {
    const before = createBridge(5);
    const { bridge, removedPlank } = shrink(before, 5, rng(1));

    expect(bridge.count).toBe(before.count - 1);
    expect(removedPlank).toBeDefined();
    expect(bridge.planks).not.toContain(removedPlank);
    expect(bridge.removed).toEqual([removedPlank]);
    /* Die Nummern der uebrigen Balken bleiben — "Balken 4" heisst naechste Runde dasselbe. */
    expect(bridge.planks.every((p) => before.planks.includes(p))).toBe(true);
  });

  it('schrumpft bis B_min = n - 1 und keinen Balken weiter', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      let bridge = createBridge(n);
      for (let step = 0; step < 10; step += 1) bridge = shrink(bridge, n, rng(step + 7)).bridge;

      expect(bridge.count).toBe(n - 1);
      expect(canShrink(bridge, n)).toBe(false);
      /* An der Untergrenze passiert nichts mehr — auch nicht still. */
      const again = shrink(bridge, n, rng(99));
      expect(again.bridge).toBe(bridge);
      expect(again.removedPlank).toBeUndefined();
    }
  });

  it('traegt einen gesetzten morschen Balken weiter', () => {
    const bridge = pickRottenPlank(createBridge(4), rng(3));
    const { bridge: next } = shrink(bridge, 4, rng(4));
    expect(next.rottenPlank).toBe(bridge.rottenPlank);
  });
});

describe('repair', () => {
  it('baut die Bruecke auf n + 2 zurueck (ADR-2)', () => {
    const shrunk = shrink(shrink(createBridge(6), 6, rng(1)).bridge, 6, rng(2)).bridge;
    expect(shrunk.count).toBe(6);

    const repaired = repair(6);
    expect(repaired.count).toBe(8);
    expect(repaired.removed).toEqual([]);
  });
});

describe('isDeathZone', () => {
  it('gilt genau dann, wenn es weniger Balken als Spieler gibt', () => {
    expect(isDeathZone(bridgeOf(4), 5)).toBe(true);
    expect(isDeathZone(bridgeOf(5), 5)).toBe(false);
    expect(isDeathZone(bridgeOf(7), 5)).toBe(false);
  });
});

describe('pickRottenPlank', () => {
  it('trifft nur existierende Balken', () => {
    const bridge = shrink(createBridge(5), 5, rng(11)).bridge;
    for (let seed = 0; seed < 200; seed += 1) {
      const rotten = pickRottenPlank(bridge, rng(seed)).rottenPlank!;
      expect(bridge.planks).toContain(rotten);
    }
  });

  it('verteilt sich ueber alle Balken', () => {
    const bridge = createBridge(3);
    const seen = new Set<number>();
    for (let seed = 0; seed < 500; seed += 1) {
      seen.add(pickRottenPlank(bridge, rng(seed)).rottenPlank!);
    }
    expect(seen.size).toBe(bridge.count);
  });
});

describe('withoutSecrets', () => {
  it('laesst den morschen Balken weg', () => {
    const bridge = pickRottenPlank(createBridge(4), rng(5));
    expect(bridge.rottenPlank).toBeDefined();
    expect(withoutSecrets(bridge).rottenPlank).toBeUndefined();
  });
});
