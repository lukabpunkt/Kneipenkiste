/**
 * Zufall (Architektur §1). Zwei Quellen, strikt getrennt:
 * `crypto` fuer alles, was das Spiel entscheidet — mulberry32 fuer die Show.
 */

import { describe, expect, it } from 'vitest';
import { createId, createSeed, createSeededRng, secureRandomFloat, secureRandomInt } from '@/core/rng';

describe('secureRandomFloat', () => {
  it('bleibt in [0, 1)', () => {
    for (let i = 0; i < 5000; i++) {
      const value = secureRandomFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('ist grob gleichverteilt', () => {
    const buckets = new Array(10).fill(0);
    const runs = 50_000;
    for (let i = 0; i < runs; i++) buckets[Math.floor(secureRandomFloat() * 10)]! += 1;
    for (const count of buckets) {
      expect(Math.abs(count / runs - 0.1)).toBeLessThan(0.01);
    }
  });
});

describe('secureRandomInt', () => {
  it('bleibt in [0, max)', () => {
    for (let i = 0; i < 2000; i++) {
      const value = secureRandomInt(7);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it('liefert bei 1 immer 0', () => {
    expect(secureRandomInt(1)).toBe(0);
  });

  it('lehnt ungueltige Obergrenzen ab', () => {
    expect(() => secureRandomInt(0)).toThrow(/positive Ganzzahl/);
    expect(() => secureRandomInt(-3)).toThrow(/positive Ganzzahl/);
    expect(() => secureRandomInt(2.5)).toThrow(/positive Ganzzahl/);
  });

  it('hat keinen Modulo-Bias (Rejection Sampling)', () => {
    const counts = new Array(3).fill(0);
    const runs = 60_000;
    for (let i = 0; i < runs; i++) counts[secureRandomInt(3)]! += 1;
    for (const count of counts) {
      expect(Math.abs(count / runs - 1 / 3)).toBeLessThan(0.01);
    }
  });
});

describe('createSeed / createId', () => {
  it('liefert unterschiedliche Seeds', () => {
    const seeds = new Set(Array.from({ length: 500 }, () => createSeed()));
    expect(seeds.size).toBeGreaterThan(490);
  });

  it('baut IDs mit Praefix', () => {
    expect(createId()).toMatch(/^p_/);
    expect(createId('round')).toMatch(/^round_/);
  });
});

describe('createSeededRng', () => {
  it('ist bei gleichem Seed reproduzierbar', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('merkt sich den Seed', () => {
    expect(createSeededRng(7).seed).toBe(7);
  });

  it('liefert Werte in [0, 1)', () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 5000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int / range / intBetween halten ihre Grenzen', () => {
    const rng = createSeededRng(3);
    for (let i = 0; i < 2000; i++) {
      expect(rng.int(5)).toBeLessThan(5);
      const r = rng.range(2, 6);
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThan(6);
      const between = rng.intBetween(3, 8);
      expect(between).toBeGreaterThanOrEqual(3);
      expect(between).toBeLessThanOrEqual(8);
    }
    expect(() => rng.int(0)).toThrow(/positive Ganzzahl/);
  });

  it('pick nimmt ein Element und wirft bei leerem Array', () => {
    const rng = createSeededRng(9);
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(() => rng.pick([])).toThrow(/leerem Array/);
  });

  it('shuffle permutiert, ohne das Original anzufassen', () => {
    const rng = createSeededRng(11);
    const source = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = rng.shuffle(source);
    expect(shuffled).not.toBe(source);
    expect([...shuffled].sort()).toEqual([...source].sort());
    expect(source).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('shuffle trifft ueber viele Seeds verschiedene Permutationen', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      seen.add(createSeededRng(seed).shuffle(['a', 'b', 'c']).join(''));
    }
    expect(seen.size).toBe(6);
  });

  it('weighted respektiert die Gewichte und prueft sie', () => {
    const rng = createSeededRng(5);
    const items = [
      { id: 'a', w: 9 },
      { id: 'b', w: 1 },
    ];
    let a = 0;
    for (let i = 0; i < 5000; i++) {
      if (rng.weighted(items, (x) => x.w).id === 'a') a += 1;
    }
    expect(a / 5000).toBeGreaterThan(0.85);
    expect(() => rng.weighted([], () => 1)).toThrow(/leerem Array/);
    expect(() => rng.weighted(items, () => 0)).toThrow(/> 0/);
    expect(() => rng.weighted(items, () => Number.POSITIVE_INFINITY)).toThrow(/> 0/);
  });

  it('chance trifft ungefaehr die Wahrscheinlichkeit', () => {
    const rng = createSeededRng(13);
    let hits = 0;
    for (let i = 0; i < 20_000; i++) if (rng.chance(0.3)) hits += 1;
    expect(Math.abs(hits / 20_000 - 0.3)).toBeLessThan(0.02);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });
});
