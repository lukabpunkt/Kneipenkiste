/**
 * Kronzeuge (Backlog nach 1.0, ADR-33).
 *
 * `applyCrownWitness()` ist eine reine Funktion im Regelkern und wird geprüft wie jede
 * andere Regel. Die wichtigste Zusicherung steht ganz unten: **Der Tresor verliert
 * nichts.** Was der Verpfeifer spart, trinkt der Verpfiffene — sonst wäre Auspacken ein
 * Rabatt für alle und der Verrat gratis.
 */

import { describe, expect, it } from 'vitest';
import { WITNESS_DIVISOR } from '@/config/rules';
import { applyCrownWitness, canTestify, resolveRound, totalSips } from '@/core/payout';
import { createSeededRng } from '@/core/rng';
import type { RoundResult } from '@/core/types';
import { vaultSpec } from '@/core/vault';
import { makeIds, makeSettings, makeSetup } from './helpers';

const settings = makeSettings({}, { witness: true });

/** Eine Runde mit vorgegebenen Wahlen. */
function round(steals: boolean[], vault = 8, overrides = {}): RoundResult {
  return resolveRound(
    makeIds(steals.length),
    makeSetup({ vault, steals, ...overrides }),
    settings
  );
}

/** Wieviel jemand aus einem bestimmten Grund trinkt. */
function sipsBy(result: RoundResult, playerId: string, reason: string): number {
  return result.drinkers
    .filter((drinker) => drinker.playerId === playerId && drinker.reason === reason)
    .reduce((sum, drinker) => sum + drinker.sips, 0);
}

/* ------------------------------------------------------------------ */
/* Wann überhaupt                                                      */
/* ------------------------------------------------------------------ */

describe('canTestify()', () => {
  it('erlaubt Auspacken erst ab zwei Dieben', () => {
    expect(canTestify(round([false, false, false, false]), settings)).toBe(false);
    // Beim Alleingang gibt es niemanden zu nennen.
    expect(canTestify(round([true, false, false, false]), settings)).toBe(false);
    expect(canTestify(round([true, true, false, false]), settings)).toBe(true);
    expect(canTestify(round([true, true, true, true]), settings)).toBe(true);
  });

  it('gilt nur bei eingeschaltetem Modus', () => {
    const off = makeSettings();
    const result = resolveRound(makeIds(4), makeSetup({ vault: 8, steals: [true, true, false, false] }), off);
    expect(canTestify(result, off)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Die Umlage                                                          */
/* ------------------------------------------------------------------ */

describe('applyCrownWitness()', () => {
  it('halbiert den Anteil des Verpfeifers und legt ihn dem Verpfiffenen auf', () => {
    // Zwei Diebe, V = 8 → je 4.
    const before = round([true, true, false, false], 8);
    expect(sipsBy(before, 'p0', 'split')).toBe(4);
    expect(sipsBy(before, 'p1', 'split')).toBe(4);

    const after = applyCrownWitness(before, { witnessId: 'p0', accusedId: 'p1' });
    expect(sipsBy(after, 'p0', 'split')).toBe(4 / WITNESS_DIVISOR);
    expect(sipsBy(after, 'p1', 'split')).toBe(6);
  });

  it('rundet zugunsten des Hauses auf', () => {
    // Zwei Diebe, V = 7 → je ⌈3,5⌉ = 4. Halbiert: ⌈2⌉ = 2, der andere nimmt 2 dazu.
    const after = applyCrownWitness(round([true, true, false, false], 7), {
      witnessId: 'p1',
      accusedId: 'p0',
    });
    expect(sipsBy(after, 'p1', 'split')).toBe(2);
    expect(sipsBy(after, 'p0', 'split')).toBe(6);
  });

  it('rührt die dritten Diebe nicht an', () => {
    // Drei Diebe, V = 9 → je 3. Nur zwei sind am Deal beteiligt.
    const after = applyCrownWitness(round([true, true, true, false], 9), {
      witnessId: 'p0',
      accusedId: 'p2',
    });
    expect(sipsBy(after, 'p0', 'split')).toBe(2);
    expect(sipsBy(after, 'p1', 'split')).toBe(3);
    expect(sipsBy(after, 'p2', 'split')).toBe(4);
  });

  it('lässt Meineidige nicht auspacken', () => {
    const ids = makeIds(4);
    const oathSettings = makeSettings({}, { witness: true, oath: true });
    const result = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [true, true, false, false], oaths: [ids[0]!] }),
      oathSettings
    );
    /*
     * Der ganze Schluck eines Meineidigen läuft unter `perjury` — er hat keinen
     * Beuteanteil, den er halbieren könnte. Das ist die Regel, nicht ein Nebeneffekt.
     */
    expect(() => applyCrownWitness(result, { witnessId: 'p0', accusedId: 'p1' })).toThrow(/Eid/);
  });

  it('legt dem verpfiffenen Meineidigen einen eigenen Beuteanteil auf', () => {
    const ids = makeIds(4);
    const oathSettings = makeSettings({}, { witness: true, oath: true });
    const before = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [true, true, false, false], oaths: [ids[1]!] }),
      oathSettings
    );
    expect(before.perjurers).toEqual(['p1']);
    expect(sipsBy(before, 'p1', 'split')).toBe(0);

    const after = applyCrownWitness(before, { witnessId: 'p0', accusedId: 'p1' });
    // Er zahlt seinen Eid **und** übernimmt, was der Kronzeuge gespart hat.
    expect(sipsBy(after, 'p1', 'perjury')).toBe(sipsBy(before, 'p1', 'perjury'));
    expect(sipsBy(after, 'p1', 'split')).toBe(2);
    expect(totalSips(after)).toBe(totalSips(before));
  });

  it('lässt den Meineid des Verpfiffenen unberührt', () => {
    const ids = makeIds(4);
    const oathSettings = makeSettings({}, { witness: true, oath: true });
    const before = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [true, true, false, false], oaths: [ids[0]!] }),
      oathSettings
    );
    expect(before.perjurers).toEqual(['p0']);
    const perjuryBefore = sipsBy(before, 'p0', 'perjury');
    expect(perjuryBefore).toBeGreaterThan(0);

    const after = applyCrownWitness(before, { witnessId: 'p1', accusedId: 'p0' });
    /*
     * Der Deal handelt von der Beute, nicht vom gebrochenen Eid. Wer schwört und stiehlt,
     * zahlt das voll — auch wenn er verpfiffen wird (GDD §3.7: "Ein Eid ist ein Eid").
     */
    expect(sipsBy(after, 'p0', 'perjury')).toBe(perjuryBefore);
  });

  it('merkt sich, wer wen verpfiffen hat', () => {
    const after = applyCrownWitness(round([true, true, false, false]), {
      witnessId: 'p1',
      accusedId: 'p0',
    });
    expect(after.witnessId).toBe('p1');
    expect(after.accusedId).toBe('p0');
  });
});

/* ------------------------------------------------------------------ */
/* Was nicht geht                                                      */
/* ------------------------------------------------------------------ */

describe('applyCrownWitness() lehnt ab', () => {
  const base = round([true, true, false, false]);

  it('wenn es nur einen Dieb gibt', () => {
    expect(() =>
      applyCrownWitness(round([true, false, false, false]), { witnessId: 'p0', accusedId: 'p1' })
    ).toThrow(/mehr als einen Dieb/);
  });

  it('wenn der Verpfeifer gar nicht gestohlen hat', () => {
    expect(() => applyCrownWitness(base, { witnessId: 'p2', accusedId: 'p1' })).toThrow(/nicht gestohlen/);
  });

  it('wenn der Verpfiffene gar nicht gestohlen hat', () => {
    expect(() => applyCrownWitness(base, { witnessId: 'p0', accusedId: 'p2' })).toThrow(/verpfiffen/);
  });

  it('wenn sich jemand selbst verpfeift', () => {
    expect(() => applyCrownWitness(base, { witnessId: 'p0', accusedId: 'p0' })).toThrow(/selbst/);
  });

  it('wenn in der Runde schon jemand ausgepackt hat', () => {
    const once = applyCrownWitness(base, { witnessId: 'p0', accusedId: 'p1' });
    expect(() => applyCrownWitness(once, { witnessId: 'p1', accusedId: 'p0' })).toThrow(/schon jemand/);
  });
});

/* ------------------------------------------------------------------ */
/* Die Kernzusicherung                                                 */
/* ------------------------------------------------------------------ */

describe('Property-Test über 2 000 Deals', () => {
  it('verschiebt Schlücke, ohne welche zu erzeugen oder zu verlieren', () => {
    const rng = createSeededRng(555_666);
    const spec = vaultSpec(settings);

    for (let run = 0; run < 2000; run++) {
      const n = rng.intBetween(3, 8);
      const ids = makeIds(n);

      // Mindestens zwei Diebe erzwingen — sonst gibt es nichts zu handeln.
      const steals = ids.map(() => rng.chance(0.5));
      steals[0] = true;
      steals[1] = true;

      const oath = rng.chance(0.4);
      const mode = makeSettings({}, { witness: true, oath, mole: rng.chance(0.3) });
      const moleId = mode.modes.mole ? rng.pick(ids) : undefined;

      const before = resolveRound(
        ids,
        makeSetup({
          vault: rng.intBetween(spec.startVault, spec.jackpotAt),
          steals,
          seed: rng.int(0xffffffff),
          oaths: oath ? ids.filter(() => rng.chance(0.5)) : [],
          ...(moleId !== undefined ? { moleId } : {}),
        }),
        mode
      );
      if (before.thieves.length < 2) continue;

      // Meineidige koennen nicht auspacken — sie haben keinen Beuteanteil (ADR-33).
      const candidates = before.thieves.filter((id) => !before.perjurers.includes(id));
      if (candidates.length === 0) continue;
      const witnessId = rng.pick(candidates);
      const others = before.thieves.filter((id) => id !== witnessId);
      const accusedId = rng.pick(others);

      const after = applyCrownWitness(before, { witnessId, accusedId });

      // 1. Die Summe bleibt: Der Deal verschiebt, er erlässt nicht.
      expect(totalSips(after)).toBe(totalSips(before));

      // 2. Der Verpfeifer trinkt nie mehr als vorher, der Verpfiffene nie weniger.
      expect(sipsBy(after, witnessId, 'split')).toBeLessThanOrEqual(sipsBy(before, witnessId, 'split'));
      expect(sipsBy(after, accusedId, 'split')).toBeGreaterThanOrEqual(sipsBy(before, accusedId, 'split'));

      // 3. Niemand trinkt eine negative oder gebrochene Zahl.
      for (const drinker of after.drinkers) {
        expect(Number.isInteger(drinker.sips)).toBe(true);
        expect(drinker.sips).toBeGreaterThanOrEqual(0);
      }

      // 4. Wer nicht am Deal beteiligt war, merkt nichts davon.
      for (const id of ids) {
        if (id === witnessId || id === accusedId) continue;
        expect(sipsBy(after, id, 'split')).toBe(sipsBy(before, id, 'split'));
        expect(sipsBy(after, id, 'perjury')).toBe(sipsBy(before, id, 'perjury'));
      }
    }
  });
});
