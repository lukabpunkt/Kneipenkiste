/**
 * Zufall (A0-Audit: `Math.random` in `src/core/` → 0 Treffer; Hinweise, Diplomat und
 * Item-Set laufen ueber `crypto`).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECURE_RNG, createSeed, createSeededRng, secureRandomFloat, secureRandomInt } from '@/core/rng';

/**
 * Kommentare raus, bevor gegrept wird — `rng.ts` *erklaert* die Regel im Doc-Comment,
 * und ein Test, der daran scheitert, misst die falsche Sache.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function coreFiles(dir = 'src/core', out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) coreFiles(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('Fairness', () => {
  it('benutzt in src/core/ nirgends Math.random', () => {
    const offenders = coreFiles().filter((file) =>
      /Math\.random/.test(stripComments(readFileSync(file, 'utf8')))
    );
    expect(offenders).toEqual([]);
  });

  it('zieht Hinweise, Diplomat und Item-Set produktiv ueber crypto', () => {
    /* Der Default-Parameter ist die Stelle, an der das haengt — er muss SECURE_RNG sein. */
    const hints = readFileSync('src/core/hints.ts', 'utf8');
    const round = readFileSync('src/core/round.ts', 'utf8');
    expect(hints).toContain('rng: RandomSource = SECURE_RNG');
    expect(round).toContain('rng: RandomSource = SECURE_RNG');
  });
});

describe('secureRandom', () => {
  it('liefert Werte in [0, 1)', () => {
    for (let i = 0; i < 1_000; i++) {
      const value = secureRandomFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('liefert Ganzzahlen in [0, max)', () => {
    for (let i = 0; i < 1_000; i++) {
      const value = secureRandomInt(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
    expect(secureRandomInt(1)).toBe(0);
  });

  it('verteilt gleichmaessig genug (Chi-Quadrat-Gefuehl, nicht -Test)', () => {
    const counts = new Array<number>(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[secureRandomInt(6)]! += 1;
    for (const count of counts) expect(Math.abs(count - 10_000)).toBeLessThan(600);
  });

  it('weist unsinnige Obergrenzen ab', () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError);
    expect(() => secureRandomInt(-3)).toThrow(RangeError);
    expect(() => secureRandomInt(2.5)).toThrow(RangeError);
  });

  it('erzeugt uint32-Seeds', () => {
    for (let i = 0; i < 100; i++) {
      const seed = createSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});

describe('SECURE_RNG als RandomSource', () => {
  it('deckt dieselbe API ab wie der seedbare PRNG', () => {
    const seeded = createSeededRng(1);
    for (const key of Object.keys(seeded)) {
      if (key === 'seed') continue;
      expect(typeof (SECURE_RNG as unknown as Record<string, unknown>)[key]).toBe('function');
    }
  });

  it('picked, mischt, gewichtet und wuerfelt', () => {
    expect([1, 2, 3]).toContain(SECURE_RNG.pick([1, 2, 3]));
    expect(SECURE_RNG.shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3]);
    expect(SECURE_RNG.weighted(['a'], () => 1)).toBe('a');
    expect(typeof SECURE_RNG.chance(0.5)).toBe('boolean');

    const range = SECURE_RNG.range(2, 3);
    expect(range).toBeGreaterThanOrEqual(2);
    expect(range).toBeLessThan(3);

    const between = SECURE_RNG.intBetween(4, 6);
    expect([4, 5, 6]).toContain(between);
  });

  it('mischt ohne Elemente zu verlieren oder zu erfinden', () => {
    const source = Array.from({ length: 30 }, (_, i) => i);
    for (let i = 0; i < 200; i++) {
      expect([...SECURE_RNG.shuffle(source)].sort((a, b) => a - b)).toEqual(source);
    }
  });

  it('beachtet Gewichte', () => {
    let heavy = 0;
    for (let i = 0; i < 4_000; i++) {
      if (SECURE_RNG.weighted(['leicht', 'schwer'], (id) => (id === 'schwer' ? 9 : 1)) === 'schwer') {
        heavy += 1;
      }
    }
    expect(heavy / 4_000).toBeGreaterThan(0.85);
  });

  it('weist leere Auswahl und kaputte Gewichte ab', () => {
    expect(() => SECURE_RNG.pick([])).toThrow(RangeError);
    expect(() => SECURE_RNG.weighted([], () => 1)).toThrow(RangeError);
    expect(() => SECURE_RNG.weighted(['a'], () => 0)).toThrow(RangeError);
    expect(() => SECURE_RNG.weighted(['a'], () => Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => SECURE_RNG.int(0)).toThrow(RangeError);
  });
});

describe('createSeededRng', () => {
  it('ist bei gleichem Seed reproduzierbar und bei anderem verschieden', () => {
    const a = Array.from({ length: 20 }, () => createSeededRng(7).next());
    const b = Array.from({ length: 20 }, () => createSeededRng(7).next());
    expect(a).toEqual(b);
    expect(createSeededRng(7).next()).not.toBe(createSeededRng(8).next());
  });

  it('merkt sich seinen Seed', () => {
    expect(createSeededRng(1234).seed).toBe(1234);
  });

  it('deckt die gesamte API ab', () => {
    const rng = createSeededRng(99);
    expect([1, 2, 3]).toContain(rng.pick([1, 2, 3]));
    expect(rng.shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3]);
    expect(rng.weighted(['a', 'b'], () => 1)).toMatch(/a|b/);
    expect(typeof rng.chance(0.5)).toBe('boolean');
    expect(rng.range(0, 1)).toBeLessThan(1);
    expect([2, 3]).toContain(rng.intBetween(2, 3));
    expect(() => rng.int(-1)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.weighted([], () => 1)).toThrow(RangeError);
    expect(() => rng.weighted(['a'], () => -1)).toThrow(RangeError);
  });
});
