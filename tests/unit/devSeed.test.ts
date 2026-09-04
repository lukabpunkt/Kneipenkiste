/**
 * Der Test-Seed (Roadmap M1.7, ADR-11).
 *
 * `?seed=` macht die Kistenposition reproduzierbar — im Deploy-Build waere das das Ende
 * des Spiels, weil jeder die einzige Information ausrechnen koennte, die niemand am
 * Tisch kennt. Zwei Dinge halten das auseinander:
 *
 * 1. Dieser Test: Der Hook liefert nur dann etwas anderes als `crypto`, wenn ein Seed
 *    anliegt und er gueltig ist.
 * 2. Ein CI-Schritt, der das gebaute Bundle nach `?seed=` durchsucht.
 *
 * Der **gesperrte** Zustand wird hier bewusst nicht simuliert: Er ist keine
 * Laufzeit-Eigenschaft, sondern eine Bau-Eigenschaft. Ihn ueber einen injizierbaren
 * Schalter testbar zu machen, hat genau das kaputtgemacht, was er sichern soll — der
 * Bundler konnte den toten Zweig nicht mehr entfernen (ADR-11).
 */

import { describe, expect, it } from 'vitest';
import { secureRandom } from '@/core/rng';
import { secureSource, seedActive } from '@/ui/devSeed';

/*
 * Vitest laeuft mit `import.meta.env.DEV === true` — der Hook ist hier also aktiv, und
 * genau das macht ihn testbar. Der Produktionsfall wird im Bundle geprueft, nicht hier:
 * Ein Unit-Test kann nicht beweisen, dass ein Zweig wegoptimiert wurde.
 */

describe('Test-Seed', () => {
  it('liefert ohne ?seed= immer die sichere Quelle', () => {
    expect(secureSource('')).toBe(secureRandom);
    expect(secureSource('?dev=1')).toBe(secureRandom);
    expect(seedActive('')).toBe(false);
  });

  it('liefert mit ?seed= eine reproduzierbare Quelle', () => {
    const a = secureSource('?seed=42');
    const b = secureSource('?seed=42');

    expect(a).not.toBe(secureRandom);
    expect(seedActive('?seed=42')).toBe(true);

    const drawsA = Array.from({ length: 10 }, () => a.int(25));
    const drawsB = Array.from({ length: 10 }, () => b.int(25));
    expect(drawsA).toEqual(drawsB);
  });

  it('liefert bei verschiedenen Seeds verschiedene Kisten', () => {
    const first = secureSource('?seed=1').int(25);
    const second = secureSource('?seed=2').int(25);
    // Theoretisch koennten beide gleich sein — bei diesen beiden Seeds sind sie es nicht.
    expect(first).not.toBe(second);
  });

  it('faellt bei unsinnigen Seeds auf die sichere Quelle zurueck', () => {
    expect(secureSource('?seed=abc')).toBe(secureRandom);
    expect(secureSource('?seed=')).toBe(secureRandom);
  });

  it('bleibt im erlaubten Bereich', () => {
    const source = secureSource('?seed=7');
    for (let i = 0; i < 200; i++) {
      const value = source.int(36);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(36);
    }
  });
});
