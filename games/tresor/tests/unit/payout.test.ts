/**
 * Auszahlungs-Matrix (Audit A0, GDD §3.5, Architektur §5).
 *
 * Das ist der Pflichttest des Projekts: n 3-8 x k 0-n x Haerte x Modi-Kombinationen,
 * dazu die expliziten GDD-Beispiele und ein Property-Test ueber 10 000 Zufallsrunden.
 */

import { describe, expect, it } from 'vitest';
import {
  BANK_FEE_SIPS,
  DEFAULT_SETTINGS,
  HARDNESS_IDS,
  MOLE_PENALTY_DIVISOR,
  PERJURY_MULTI_FACTOR,
  PERJURY_SOLO_SIPS,
  hardnessSpec,
  type Hardness,
  type Settings,
} from '@/config/rules';
import { applyDistribution, previewPayouts, resolveRound, sipsFor, totalSips } from '@/core/payout';
import { createSeededRng } from '@/core/rng';
import { OUTCOMES, type Outcome, type RoundResult } from '@/core/types';
import { vaultSpec } from '@/core/vault';
import { makeIds, makeSettings, makeSetup, resolve, sips } from './helpers';

/* ------------------------------------------------------------------ */
/* Die Beispiele aus dem GDD (§3.5) — woertlich                        */
/* ------------------------------------------------------------------ */

describe('GDD §3.5, n = 4, V = 8', () => {
  const settings = DEFAULT_SETTINGS;

  it('ein Dieb verteilt 8', () => {
    const result = resolve(4, 1, 8, settings);
    expect(result.outcome).toBe('soloSteal');
    expect(result.distributorId).toBe('p0');
    expect(result.distributableSips).toBe(8);
    expect(result.drinkers).toHaveLength(0);
  });

  it('zwei Diebe trinken je 4', () => {
    const result = resolve(4, 2, 8, settings);
    expect(result.outcome).toBe('multiSteal');
    expect(sips(result, 'p0')).toBe(4);
    expect(sips(result, 'p1')).toBe(4);
    expect(sips(result, 'p2')).toBe(0);
    expect(sips(result, 'p3')).toBe(0);
  });

  it('vier Diebe trinken je 2 — "Schlaegerei"', () => {
    const result = resolve(4, 4, 8, settings);
    expect(result.outcome).toBe('allSteal');
    for (const id of makeIds(4)) expect(sips(result, id)).toBe(2);
  });

  it('alle teilen: je 1 Gebuehr, Tresor waechst auf 10', () => {
    const result = resolve(4, 0, 8, settings);
    expect(result.outcome).toBe('allShare');
    for (const id of makeIds(4)) expect(sips(result, id)).toBe(BANK_FEE_SIPS);
    expect(result.nextVault).toBe(10);
  });
});

/* ------------------------------------------------------------------ */
/* Vollstaendige Matrix                                                */
/* ------------------------------------------------------------------ */

describe('Matrix n 3-8 x k 0-n x Haerte', () => {
  for (const hardness of HARDNESS_IDS) {
    const settings = makeSettings({ hardness });
    const spec = hardnessSpec(hardness);

    for (let n = 3; n <= 8; n++) {
      for (let k = 0; k <= n; k++) {
        it(`${hardness}, n=${n}, k=${k}`, () => {
          const vault = spec.startVault + 2; // sicher unter dem Deckel
          const result = resolve(n, k, vault, settings);

          expect(result.thieves).toHaveLength(k);
          expect(result.sharers).toHaveLength(n - k);
          expect(result.outcome).toBe(
            k === 0 ? 'allShare' : k === 1 ? 'soloSteal' : k === n ? 'allSteal' : 'multiSteal'
          );

          if (k === 0) {
            expect(totalSips(result)).toBe(n * BANK_FEE_SIPS);
            expect(result.nextVault).toBe(Math.min(vault + spec.growth, spec.cap));
          } else if (k === 1) {
            expect(result.distributableSips).toBe(vault);
            expect(result.nextVault).toBe(spec.startVault);
          } else {
            const share = Math.ceil(vault / k);
            for (const id of result.thieves) expect(sips(result, id)).toBe(share);
            for (const id of result.sharers) expect(sips(result, id)).toBe(0);
            expect(result.nextVault).toBe(spec.startVault);
          }
        });
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* Jackpot (GDD §3.2)                                                  */
/* ------------------------------------------------------------------ */

describe('Jackpot', () => {
  for (const hardness of HARDNESS_IDS) {
    const spec = hardnessSpec(hardness);

    it(`${hardness}: V == V_max und k == 0 → jeder ⌈V/n⌉, Reset`, () => {
      const settings = makeSettings({ hardness });
      const result = resolve(5, 0, spec.cap, settings);
      expect(result.outcome).toBe('jackpot');
      const each = Math.ceil(spec.cap / 5);
      for (const id of makeIds(5)) expect(sips(result, id)).toBe(each);
      expect(result.nextVault).toBe(spec.startVault);
    });

    it(`${hardness}: V == V_max, aber jemand stiehlt → kein Jackpot`, () => {
      const settings = makeSettings({ hardness });
      const result = resolve(5, 2, spec.cap, settings);
      expect(result.outcome).toBe('multiSteal');
      expect(result.nextVault).toBe(spec.startVault);
    });
  }

  it('der Deckel stoppt das Wachstum, bis der Tresor platzt', () => {
    const settings = makeSettings({ hardness: 'normal' });
    // 15 + 2 = 17 > 16 → auf den Deckel gestutzt.
    expect(resolve(4, 0, 15, settings).nextVault).toBe(16);
  });
});

/* ------------------------------------------------------------------ */
/* Highroller (GDD §3.7)                                               */
/* ------------------------------------------------------------------ */

describe('Highroller', () => {
  const settings = makeSettings({}, { highroller: true });

  it('startet bei 6 und waechst um 4', () => {
    expect(vaultSpec(settings).startVault).toBe(6);
    expect(resolve(4, 0, 6, settings).nextVault).toBe(10);
  });

  it('hat keinen Deckel — der Tresor waechst ueber 24 hinaus', () => {
    expect(resolve(4, 0, 22, settings).nextVault).toBe(26);
  });

  it('platzt ab 24', () => {
    const result = resolve(4, 0, 26, settings);
    expect(result.outcome).toBe('jackpot');
    expect(sips(result, 'p0')).toBe(Math.ceil(26 / 4));
    expect(result.nextVault).toBe(6);
  });

  it('ueberschreibt die Haerte', () => {
    const hard = makeSettings({ hardness: 'hard' }, { highroller: true });
    expect(vaultSpec(hard)).toEqual(vaultSpec(settings));
  });
});

/* ------------------------------------------------------------------ */
/* Eid-Modus (GDD §3.7)                                                */
/* ------------------------------------------------------------------ */

describe('Eid', () => {
  const settings = makeSettings({}, { oath: true });

  it('Alleindieb mit Meineid trinkt 2 und verteilt V−2', () => {
    const result = resolve(4, 1, 8, settings, { oaths: ['p0'] });
    expect(result.perjurers).toEqual(['p0']);
    expect(sips(result, 'p0')).toBe(PERJURY_SOLO_SIPS);
    expect(result.distributableSips).toBe(6);
    expect(result.overlayIds).toContain('perjury_seal_break');
  });

  it('Alleindieb ohne Schwur verteilt alles und trinkt nichts', () => {
    const result = resolve(4, 1, 8, settings, { oaths: ['p1'] });
    expect(result.perjurers).toEqual([]);
    expect(sips(result, 'p0')).toBe(0);
    expect(result.distributableSips).toBe(8);
    expect(result.overlayIds).toEqual([]);
  });

  it('Mit-Dieb mit Meineid trinkt das Doppelte', () => {
    const result = resolve(4, 2, 8, settings, { oaths: ['p1'] });
    const share = Math.ceil(8 / 2);
    expect(sips(result, 'p0')).toBe(share);
    expect(sips(result, 'p1')).toBe(share * PERJURY_MULTI_FACTOR);
    expect(result.drinkers.find((d) => d.playerId === 'p1')?.reason).toBe('perjury');
  });

  it('bei kleinem Tresor bleibt nichts zu verteilen — aber nie weniger als 0', () => {
    const result = resolve(4, 1, 1, settings, { oaths: ['p0'] });
    expect(result.distributableSips).toBe(0);
    expect(sips(result, 'p0')).toBe(PERJURY_SOLO_SIPS);
  });

  it('ohne Eid-Modus gibt es keinen Meineid, auch mit gefuellten oaths', () => {
    const result = resolve(4, 1, 8, DEFAULT_SETTINGS, { oaths: ['p0'] });
    expect(result.perjurers).toEqual([]);
    expect(result.distributableSips).toBe(8);
  });

  it('wer schwoert und teilt, ist kein Meineidiger', () => {
    const result = resolve(4, 1, 8, settings, { oaths: ['p0', 'p2', 'p3'] });
    expect(result.perjurers).toEqual(['p0']);
  });
});

/* ------------------------------------------------------------------ */
/* Maulwurf-Modus (GDD §3.7)                                           */
/* ------------------------------------------------------------------ */

describe('Maulwurf', () => {
  const settings = makeSettings({}, { mole: true });

  it('steht immer in thieves — auch wenn die Wahl "share" waere', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false, false], moleId: 'p2' });
    const result = resolveRound(makeIds(4), setup, settings);
    expect(result.thieves).toContain('p2');
    expect(result.outcome).toBe('soloSteal');
    expect(result.choices['p2']).toBe('steal');
  });

  it('trinkt bei k >= 2 nur die Haelfte (aufgerundet)', () => {
    const result = resolve(4, 2, 8, settings, { moleId: 'p1' });
    const share = Math.ceil(8 / 2);
    expect(sips(result, 'p0')).toBe(share);
    expect(sips(result, 'p1')).toBe(Math.ceil(share / MOLE_PENALTY_DIVISOR));
  });

  it('ist nie Meineidiger, auch wenn er geschworen hat', () => {
    const both = makeSettings({}, { mole: true, oath: true });
    const result = resolve(4, 2, 8, both, { moleId: 'p1', oaths: ['p0', 'p1'] });
    expect(result.perjurers).toEqual(['p0']);
    // Volle Strafe fuer p0, halbe fuer den Maulwurf.
    expect(sips(result, 'p0')).toBe(4 * PERJURY_MULTI_FACTOR);
    expect(sips(result, 'p1')).toBe(2);
  });

  it('bringt das mole_reveal-Overlay mit', () => {
    const result = resolve(4, 2, 8, settings, { moleId: 'p1' });
    expect(result.overlayIds).toEqual(['mole_reveal']);
  });

  it('kombiniert beide Overlays in der GDD-Reihenfolge', () => {
    const both = makeSettings({}, { mole: true, oath: true });
    const result = resolve(4, 2, 8, both, { moleId: 'p1', oaths: ['p0'] });
    expect(result.overlayIds).toEqual(['perjury_seal_break', 'mole_reveal']);
  });

  it('wird ignoriert, wenn der Modus aus ist', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false, false], moleId: 'p2' });
    const result = resolveRound(makeIds(4), setup, DEFAULT_SETTINGS);
    expect(result.outcome).toBe('allShare');
    expect(result.overlayIds).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Modus-Kombinationen                                                 */
/* ------------------------------------------------------------------ */

describe('alle Modus-Kombinationen laufen durch', () => {
  const flags = ['oath', 'mole', 'nightShift', 'highroller'] as const;

  for (let mask = 0; mask < 16; mask++) {
    const modes = Object.fromEntries(flags.map((flag, i) => [flag, (mask & (1 << i)) !== 0])) as Record<
      (typeof flags)[number],
      boolean
    >;
    const label = flags.filter((f) => modes[f]).join('+') || 'klassik';

    for (let k = 0; k <= 5; k++) {
      it(`${label}, n=5, k=${k}`, () => {
        const settings = makeSettings({}, modes);
        const result = resolve(5, k, vaultSpec(settings).startVault + 2, settings, {
          moleId: 'p4',
          oaths: ['p0', 'p4'],
        });

        expect(totalSips(result)).toBeGreaterThanOrEqual(0);
        for (const d of result.drinkers) expect(d.sips).toBeGreaterThanOrEqual(0);
        if (modes.mole) expect(result.thieves).toContain('p4');
        if (modes.mole) expect(result.perjurers).not.toContain('p4');
      });
    }
  }
});

/* ------------------------------------------------------------------ */
/* Verteilung (ADR-4)                                                  */
/* ------------------------------------------------------------------ */

describe('applyDistribution', () => {
  const soloResult = (): RoundResult => resolve(4, 1, 8, DEFAULT_SETTINGS);

  it('traegt die Verteilung als Trinker nach', () => {
    const result = applyDistribution(soloResult(), { p1: 5, p2: 3, p3: 0 });
    expect(sips(result, 'p1')).toBe(5);
    expect(sips(result, 'p2')).toBe(3);
    expect(sips(result, 'p3')).toBe(0);
    expect(totalSips(result)).toBe(8);
    expect(result.drinkers.every((d) => d.reason === 'distributed')).toBe(true);
  });

  it('erlaubt alles auf eine Person — Rache ist Feature', () => {
    const result = applyDistribution(soloResult(), { p1: 8 });
    expect(sips(result, 'p1')).toBe(8);
  });

  it('lehnt eine falsche Summe ab', () => {
    expect(() => applyDistribution(soloResult(), { p1: 7 })).toThrow(/genau 8/);
    expect(() => applyDistribution(soloResult(), { p1: 9 })).toThrow(/genau 8/);
  });

  it('lehnt Zuteilungen an Diebe ab', () => {
    expect(() => applyDistribution(soloResult(), { p0: 8 })).toThrow(/nicht geteilt/);
  });

  it('lehnt negative und gebrochene Zuteilungen ab', () => {
    expect(() => applyDistribution(soloResult(), { p1: -1, p2: 9 })).toThrow(/Ungueltige/);
    expect(() => applyDistribution(soloResult(), { p1: 1.5, p2: 6.5 })).toThrow(/Ungueltige/);
  });

  it('respektiert den Meineid-Abzug', () => {
    const settings = makeSettings({}, { oath: true });
    const result = resolve(4, 1, 8, settings, { oaths: ['p0'] });
    expect(() => applyDistribution(result, { p1: 8 })).toThrow(/genau 6/);
    const done = applyDistribution(result, { p1: 6 });
    expect(totalSips(done)).toBe(8); // 2 Meineid + 6 verteilt
  });

  it('laeuft nur beim Alleingang', () => {
    expect(() => applyDistribution(resolve(4, 2, 8), { p2: 8 })).toThrow(/Alleingang/);
  });
});

describe('Hilfen', () => {
  it('totalSips und sipsFor zaehlen dieselben Schluecke', () => {
    const result = applyDistribution(resolve(4, 1, 8), { p1: 5, p2: 3 });
    expect(sipsFor(result, 'p1')).toBe(5);
    expect(sipsFor(result, 'p0')).toBe(0);
    expect(totalSips(result)).toBe(8);
  });

  it('OUTCOMES listet jeden Outcome genau einmal', () => {
    const produced = new Set<Outcome>();
    produced.add(resolve(4, 0, 4).outcome);
    produced.add(resolve(4, 0, 16).outcome);
    produced.add(resolve(4, 1, 8).outcome);
    produced.add(resolve(4, 2, 8).outcome);
    produced.add(resolve(4, 4, 8).outcome);
    expect(new Set(OUTCOMES)).toEqual(produced);
    expect(OUTCOMES).toHaveLength(new Set(OUTCOMES).size);
  });
});

/* ------------------------------------------------------------------ */
/* Eingabe-Validierung                                                 */
/* ------------------------------------------------------------------ */

describe('Validierung', () => {
  it('lehnt weniger als 3 und mehr als 8 Spieler ab (ADR-5)', () => {
    expect(() => resolve(2, 0, 4)).toThrow(/3-8/);
    expect(() =>
      resolveRound(makeIds(9), makeSetup({ vault: 4, steals: Array(9).fill(false) }), DEFAULT_SETTINGS)
    ).toThrow(/3-8/);
  });

  it('lehnt doppelte Spieler-IDs ab', () => {
    const setup = makeSetup({ vault: 4, steals: [false, false, false] });
    expect(() => resolveRound(['p0', 'p0', 'p1'], setup, DEFAULT_SETTINGS)).toThrow(/Doppelte/);
  });

  it('lehnt einen negativen oder gebrochenen Tresor ab', () => {
    expect(() => resolve(3, 0, -1)).toThrow(/>= 0/);
    expect(() => resolve(3, 0, 2.5)).toThrow(/>= 0/);
  });

  it('lehnt eine fehlende Wahl ab', () => {
    const setup = makeSetup({ vault: 4, steals: [false, false, false] });
    delete setup.choices['p1'];
    expect(() => resolveRound(makeIds(3), setup, DEFAULT_SETTINGS)).toThrow(/fehlt die Wahl/);
  });
});

/* ------------------------------------------------------------------ */
/* Determinismus                                                       */
/* ------------------------------------------------------------------ */

describe('Determinismus', () => {
  it('gleicher Seed → identisches Ergebnis', () => {
    const a = resolve(6, 2, 10, DEFAULT_SETTINGS, { seed: 4711 });
    const b = resolve(6, 2, 10, DEFAULT_SETTINGS, { seed: 4711 });
    expect(a).toEqual(b);
  });

  it('anderer Seed → andere Reveal-Reihenfolge (bei genug Karten)', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      orders.add(resolve(8, 3, 10, DEFAULT_SETTINGS, { seed }).revealOrder.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('nutzt die injizierte Outcome-Auswahl', () => {
    const setup = makeSetup({ vault: 8, steals: [true, false, false, false] });
    const result = resolveRound(makeIds(4), setup, DEFAULT_SETTINGS, {
      pickOutcomeSequence: (outcome) => `seq_${outcome}`,
    });
    expect(result.outcomeSequenceId).toBe('seq_soloSteal');
  });
});

/* ------------------------------------------------------------------ */
/* Property-Test: 10 000 Zufallsrunden (Audit A0)                      */
/* ------------------------------------------------------------------ */

describe('Property-Test ueber 10 000 Runden', () => {
  it('verletzt keine Invariante', () => {
    const rng = createSeededRng(20260904);
    const hardnesses: Hardness[] = [...HARDNESS_IDS];
    const seen = new Set<string>();

    for (let run = 0; run < 10_000; run++) {
      const n = rng.intBetween(3, 8);
      const ids = makeIds(n);
      const hardness = rng.pick(hardnesses);
      const settings: Settings = makeSettings(
        { hardness },
        {
          oath: rng.chance(0.4),
          mole: rng.chance(0.3),
          nightShift: rng.chance(0.2),
          highroller: rng.chance(0.2),
        }
      );
      const spec = vaultSpec(settings);
      /*
       * Erreichbare Tresorstaende: Der Tresor startet bei V_0 und faellt nie darunter —
       * jede Runde setzt entweder zurueck oder waechst. Ein Stand unter V_0 waere kein
       * Fund, sondern ein unmoeglicher Zustand.
       */
      const vault = rng.intBetween(spec.startVault, spec.jackpotAt + spec.growth);
      const steals = ids.map(() => rng.chance(0.35));
      const moleId = settings.modes.mole ? rng.pick(ids) : undefined;
      const oaths = settings.modes.oath ? ids.filter(() => rng.chance(0.5)) : [];

      const setup = makeSetup({
        vault,
        steals,
        seed: rng.int(0xffffffff),
        oaths,
        ...(moleId !== undefined ? { moleId } : {}),
      });
      const result = resolveRound(ids, setup, settings);
      seen.add(result.outcome);

      // Nie negative Schluecke, immer ganze Zahlen.
      for (const d of result.drinkers) {
        expect(Number.isInteger(d.sips)).toBe(true);
        expect(d.sips).toBeGreaterThanOrEqual(0);
      }

      // Jede Karte wird genau einmal aufgedeckt.
      expect(result.revealOrder).toHaveLength(n);
      expect(new Set(result.revealOrder).size).toBe(n);

      // Teiler zuerst, Diebe zuletzt (ADR-3).
      expect(result.revealOrder.slice(0, result.sharers.length).sort()).toEqual([...result.sharers].sort());
      expect(result.revealOrder.slice(result.sharers.length).sort()).toEqual([...result.thieves].sort());

      // Maulwurf ist immer Dieb und nie Meineidiger.
      if (moleId !== undefined) {
        expect(result.thieves).toContain(moleId);
        expect(result.thieves.at(-1)).toBe(moleId);
        expect(result.perjurers).not.toContain(moleId);
      }

      // nextVault liegt im erlaubten Bereich.
      expect(result.nextVault).toBeGreaterThanOrEqual(spec.startVault);
      if (spec.capped) expect(result.nextVault).toBeLessThanOrEqual(spec.jackpotAt);

      // Beim Alleingang wird genau der Tresor verteilt (abzueglich Meineid).
      if (result.outcome === 'soloSteal') {
        const perjury = result.perjurers.includes(result.distributorId!) ? PERJURY_SOLO_SIPS : 0;
        expect(result.distributableSips).toBe(Math.max(0, vault - perjury));

        const budget = result.distributableSips!;
        const distribution: Record<string, number> = {};
        let left = budget;
        for (const id of result.sharers) {
          const give = left;
          distribution[id] = give;
          left -= give;
        }
        if (result.sharers.length > 0) {
          const done = applyDistribution(result, distribution);
          expect(totalSips(done)).toBe(budget + perjury);
        }
      }
    }

    // Alle fuenf Outcomes kommen in 10 000 Runden vor.
    expect(seen.size).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/* Vorschau-Tabelle (Negotiation-Screen, Audit A1)                     */
/* ------------------------------------------------------------------ */

describe('previewPayouts', () => {
  it('stimmt mit dem echten Ergebnis fuer k = 0/1/2/n ueberein', () => {
    const settings = DEFAULT_SETTINGS;
    const rows = previewPayouts(5, 10, settings);

    const byThieves = new Map(rows.map((r) => [r.thieves, r]));
    expect(byThieves.get(0)!.sharerSips).toBe(sips(resolve(5, 0, 10, settings), 'p0'));
    expect(byThieves.get(0)!.nextVault).toBe(resolve(5, 0, 10, settings).nextVault);
    expect(byThieves.get(1)!.sharerSips).toBeNull();
    expect(byThieves.get(2)!.thiefSips).toBe(sips(resolve(5, 2, 10, settings), 'p0'));
    expect(byThieves.get(5)!.thiefSips).toBe(sips(resolve(5, 5, 10, settings), 'p0'));
  });

  it('zeigt den Jackpot an, wenn der Tresor voll ist', () => {
    const rows = previewPayouts(4, 16, DEFAULT_SETTINGS);
    expect(rows[0]!.outcome).toBe('jackpot');
    expect(rows[0]!.sharerSips).toBe(4);
  });
});
