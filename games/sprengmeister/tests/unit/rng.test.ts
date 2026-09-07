/**
 * Zufall (Roadmap M0.4, Audit A0).
 *
 * Der wichtigste Punkt: Die Kiste faellt ueber `crypto.getRandomValues`, **uniform**
 * ueber alle Zellen. Ein Modulo-Bias waere hier ein Balancing-Fehler, den niemand
 * bemerkt und der trotzdem jede Runde schief zieht.
 */

import { describe, expect, it } from 'vitest';
import {
  createId,
  createSeed,
  createSeededRng,
  secureRandom,
  secureRandomFloat,
  secureRandomInt,
} from '@/core/rng';

describe('Sicherer Zufall', () => {
  it('liefert Gleitkommazahlen in [0, 1)', () => {
    for (let i = 0; i < 500; i++) {
      const value = secureRandomFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('liefert Ganzzahlen im Bereich', () => {
    for (let i = 0; i < 500; i++) {
      const value = secureRandomInt(25);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(25);
    }
    expect(secureRandomInt(1)).toBe(0);
  });

  it('weist unsinnige Grenzen ab', () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError);
    expect(() => secureRandomInt(-3)).toThrow(RangeError);
    expect(() => secureRandomInt(2.5)).toThrow(RangeError);
  });

  it('verteilt die Kistenposition gleichmaessig ueber ein 5 × 5-Feld', () => {
    // 25 Zellen, 25 000 Ziehungen → je ~1000. Die Schranken sind weit genug, um nicht
    // zufaellig rot zu werden, und eng genug, um einen echten Bias zu fangen.
    const counts = new Array<number>(25).fill(0);
    for (let i = 0; i < 25_000; i++) counts[secureRandomInt(25)]! += 1;

    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });

  it('stellt dieselbe Quelle als injizierbares Objekt bereit', () => {
    expect(secureRandom.int(10)).toBeLessThan(10);
  });

  it('erzeugt Seeds und IDs', () => {
    expect(Number.isInteger(createSeed())).toBe(true);
    expect(new Set(Array.from({ length: 200 }, () => createId())).size).toBe(200);
    expect(createId('round')).toMatch(/^round_/);
  });
});

describe('Seedbarer PRNG', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
    expect(a.seed).toBe(42);
  });

  it('liefert bei verschiedenen Seeds verschiedene Folgen', () => {
    expect(createSeededRng(1).next()).not.toBe(createSeededRng(2).next());
  });

  it('deckt die Hilfsfunktionen ab', () => {
    const rng = createSeededRng(7);

    expect(rng.int(5)).toBeLessThan(5);
    expect(rng.range(10, 20)).toBeGreaterThanOrEqual(10);

    const between = rng.intBetween(3, 5);
    expect(between).toBeGreaterThanOrEqual(3);
    expect(between).toBeLessThanOrEqual(5);

    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
    expect(rng.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
    expect(typeof rng.chance(0.5)).toBe('boolean');
    expect(() => rng.int(0)).toThrow(RangeError);
  });

  it('mischt, ohne das Original anzufassen', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = createSeededRng(3).shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled).not.toBe(original);
  });

  it('waehlt gewichtet — schwere Optionen kommen oefter', () => {
    const rng = createSeededRng(11);
    const items = [
      { id: 'oft', weight: 9 },
      { id: 'selten', weight: 1 },
    ];

    let oft = 0;
    for (let i = 0; i < 2000; i++) {
      if (rng.weighted(items, (item) => item.weight).id === 'oft') oft += 1;
    }
    expect(oft).toBeGreaterThan(1700);
    expect(oft).toBeLessThan(1950);
  });

  it('weist leere Listen und ungueltige Gewichte ab', () => {
    const rng = createSeededRng(1);

    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.weighted([], () => 1)).toThrow(RangeError);
    expect(() => rng.weighted([{ w: 0 }], (i) => i.w)).toThrow(RangeError);
    expect(() => rng.weighted([{ w: -1 }], (i) => i.w)).toThrow(RangeError);
    expect(() => rng.weighted([{ w: Infinity }], (i) => i.w)).toThrow(RangeError);
  });

  it('trifft auch bei Rundungsfehlern eine Wahl', () => {
    // `weighted` faellt im Zweifel auf das letzte Element zurueck, statt undefined zu liefern.
    const rng = createSeededRng(5);
    const items = [{ w: 1e-12 }, { w: 1e-12 }];
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.weighted(items, (item) => item.w));
  });
});
