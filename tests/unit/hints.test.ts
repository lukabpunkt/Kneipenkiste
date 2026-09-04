/**
 * Das Hinweis-Modell (A0-Audit: Verschiedenheit, 0-Schmuggler-Fall, p_true-Statistik,
 * Typ-Vielfalt, Spuerhund).
 *
 * Der wichtigste Test dieser Datei ist der statistische: Design-Pfeiler 2 ("falsche
 * Sicherheit") ist eine Zahl, und diese Zahl muss stimmen.
 */

import { describe, expect, it } from 'vitest';
import { HINT_TRUTH_PROBABILITY, hintCount } from '@/config/rules';
import { generateDogHint, generateHints, type HintInput } from '@/core/hints';
import type { Pack, PlayerId } from '@/core/types';
import { rngFor } from './helpers';

function input(amounts: number[], playerCount = amounts.length + 1): HintInput {
  const travelerIds: PlayerId[] = amounts.map((_, i) => `t${i}`);
  const packs: Record<PlayerId, Pack> = {};
  travelerIds.forEach((id, i) => {
    packs[id] = { playerId: id, amount: amounts[i]! };
  });
  return { travelerIds, packs, playerCount };
}

describe('hintCount', () => {
  it('folgt h(n) = floor((n-1)/2), geklemmt auf [1, 3]', () => {
    expect(hintCount(4)).toBe(1);
    expect(hintCount(5)).toBe(2);
    expect(hintCount(6)).toBe(2);
    expect(hintCount(7)).toBe(3);
    expect(hintCount(8)).toBe(3);
    /* Auch ausserhalb des erlaubten Bereichs bleibt h im Rahmen. */
    expect(hintCount(2)).toBe(1);
    expect(hintCount(20)).toBe(3);
  });
});

describe('generateHints', () => {
  it('erzeugt h(n) Hinweise auf verschiedene Koffer', () => {
    for (let n = 4; n <= 8; n++) {
      const amounts = Array.from({ length: n - 1 }, (_, i) => (i % 2 === 0 ? 3 : 0));
      for (let seed = 0; seed < 50; seed++) {
        const hints = generateHints(input(amounts, n), rngFor(seed));
        expect(hints).toHaveLength(hintCount(n));
        const suitcases = new Set(hints.map((h) => h.suitcaseOf));
        expect(suitcases.size).toBe(hints.length);
      }
    }
  });

  it('benutzt keinen Hinweis-Typ zweimal in derselben Runde', () => {
    for (let seed = 0; seed < 200; seed++) {
      const hints = generateHints(input([2, 0, 4, 0, 1, 0, 3], 8), rngFor(seed));
      const types = new Set(hints.map((h) => h.type));
      expect(types.size).toBe(hints.length);
    }
  });

  it('markiert bei einer ehrlichen Runde jeden Hinweis als falsch', () => {
    for (let seed = 0; seed < 200; seed++) {
      const hints = generateHints(input([0, 0, 0, 0, 0, 0, 0], 8), rngFor(seed));
      expect(hints).toHaveLength(3);
      expect(hints.every((h) => h.truthful === false)).toBe(true);
    }
  });

  it('zeigt zwangslaeufig auf Schmuggler, wenn alle schmuggeln', () => {
    for (let seed = 0; seed < 200; seed++) {
      const hints = generateHints(input([1, 2, 3, 4, 5, 6, 1], 8), rngFor(seed));
      expect(hints.every((h) => h.truthful === true)).toBe(true);
    }
  });

  it('zeigt echte Hinweise auf Schmuggler und falsche auf saubere Koffer', () => {
    const amounts = [0, 5, 0, 2, 0, 3, 0];
    const smugglers = new Set(['t1', 't3', 't5']);
    for (let seed = 0; seed < 300; seed++) {
      for (const hint of generateHints(input(amounts, 8), rngFor(seed))) {
        expect(smugglers.has(hint.suitcaseOf)).toBe(hint.truthful);
      }
    }
  });

  it('trifft p_true = 0.6 ueber 20 000 Runden (± 0.03)', () => {
    /*
     * Gemessen wird an einer Runde mit genug Schmugglern *und* genug sauberen Koffern —
     * nur dort kann der Muenzwurf frei fallen. Sind die Sauberen aufgebraucht, erzwingt
     * das Modell einen echten Hinweis, und der Anteil waere kuenstlich hoch.
     */
    const amounts = [4, 3, 2, 0, 0, 0, 0];
    let truthful = 0;
    let total = 0;

    for (let seed = 0; seed < 20_000; seed++) {
      for (const hint of generateHints(input(amounts, 8), rngFor(seed * 7919 + 13))) {
        total += 1;
        if (hint.truthful) truthful += 1;
      }
    }

    expect(total).toBe(60_000);
    expect(truthful / total).toBeCloseTo(HINT_TRUTH_PROBABILITY, 2);
    expect(Math.abs(truthful / total - HINT_TRUTH_PROBABILITY)).toBeLessThan(0.03);
  });

  it('verraet die Menge nicht — dieselbe Hinweis-Verteilung bei 1 und bei 6 Stueck', () => {
    /*
     * "Hinweise sagen nichts ueber die Menge" (GDD §3.3) ist keine Formulierung, sondern
     * eine Eigenschaft: Wer nur die Hinweise sieht, kann 1 und 6 nicht unterscheiden.
     */
    for (let seed = 0; seed < 500; seed++) {
      const small = generateHints(input([1, 0, 0, 0, 0, 0, 0], 8), rngFor(seed));
      const large = generateHints(input([6, 0, 0, 0, 0, 0, 0], 8), rngFor(seed));
      expect(small.map((h) => ({ type: h.type, suitcaseOf: h.suitcaseOf }))).toEqual(
        large.map((h) => ({ type: h.type, suitcaseOf: h.suitcaseOf }))
      );
    }
  });
});

describe('Randfaelle', () => {
  it('wertet einen fehlenden Pack-Eintrag als sauber', () => {
    /* Kann nur auftreten, wenn jemand die Runde ohne vollstaendiges Packen weiterreicht —
       der Kern soll dann nicht raten, sondern "sauber" annehmen. */
    const partial: HintInput = {
      travelerIds: ['t0', 't1', 't2', 't3'],
      packs: { t0: { playerId: 't0', amount: 4 } },
      playerCount: 5,
    };
    const hints = generateHints(partial, rngFor(1));
    for (const hint of hints) {
      expect(hint.truthful).toBe(hint.suitcaseOf === 't0');
    }
  });

  it('erzeugt nicht mehr Hinweise, als es Koffer gibt', () => {
    /* h waere hier 3, es reisen aber nur zwei. */
    const tiny: HintInput = {
      travelerIds: ['t0', 't1'],
      packs: { t0: { playerId: 't0', amount: 2 }, t1: { playerId: 't1', amount: 0 } },
      playerCount: 8,
    };
    for (let seed = 0; seed < 50; seed++) {
      const hints = generateHints(tiny, rngFor(seed));
      expect(hints).toHaveLength(2);
      expect(new Set(hints.map((h) => h.suitcaseOf)).size).toBe(2);
    }
  });

  it('erzeugt ohne Reisende gar keine Hinweise', () => {
    expect(generateHints({ travelerIds: [], packs: {}, playerCount: 4 }, rngFor(1))).toEqual([]);
  });
});

describe('generateDogHint', () => {
  it('bellt genau dann, wenn wirklich Ware im Koffer ist', () => {
    for (let seed = 0; seed < 300; seed++) {
      const dog = generateDogHint(input([0, 4, 0, 0], 5), rngFor(seed));
      expect(dog).not.toBeNull();
      expect(dog!.suitcaseOf).toBe('t1');
      expect(dog!.barks).toBe(true);
    }
  });

  it('schnueffelt bei einer ehrlichen Runde und bellt nicht', () => {
    const dog = generateDogHint(input([0, 0, 0, 0], 5), rngFor(7));
    expect(dog).not.toBeNull();
    expect(dog!.barks).toBe(false);
  });

  it('gibt null zurueck, wenn niemand reist', () => {
    expect(generateDogHint(input([], 1), rngFor(1))).toBeNull();
  });
});
