import { describe, expect, it } from 'vitest';
import { buildStepScript, createSequencePicker, fitToCap, totalOf } from '@/core/choreographer';
import { resolveRound } from '@/core/round';
import { createSeededRng } from '@/core/rng';
import { CREAK_AMPLITUDE, EYE_CONTACT, MAX_STEP_MS, MIN_BREAK_STAGGER_MS, SEQUENCE_NO_REPEAT } from '@/config/choreo';
import { FALL_SEQUENCES, SAFE_SEQUENCES, fallCandidates } from '@/config/sequences';
import { PACE_PRESETS, type Pace } from '@/config/rules';
import { roundOf, type RoundOptions } from './helpers';

const rng = (seed: number) => createSeededRng(seed);

function scriptFor(options: RoundOptions, pace: Pace = 'normal') {
  const round = roundOf(options);
  const result = resolveRound(round, { rng: rng(round.seed), picker: createSequencePicker(round.seed) });
  return { result, script: buildStepScript(result, pace) };
}

/* ------------------------------------------------------------------ */
/* Die Signatur: alle kommen gleichzeitig an                           */
/* ------------------------------------------------------------------ */

describe('Gleichzeitigkeit (CLAUDE.md, nicht verhandelbar)', () => {
  it('alle Hikers kommen im selben Frame an — jede Spielerzahl, jedes Tempo', () => {
    for (let n = 3; n <= 8; n += 1) {
      const picks = Array.from({ length: n }, (_, i) => (i % 3) + 1);
      for (const pace of PACE_PRESETS) {
        const { script } = scriptFor({ picks, plankCount: n + 2 }, pace);

        expect(script.run).toHaveLength(n);
        const arrivals = new Set(script.run.map((r) => r.arriveAt));
        expect(arrivals.size).toBe(1);
        expect(script.step.at).toBe(script.run[0]!.arriveAt);
      }
    }
  });

  it('auch Seil-Nutzer laufen mit — nur eben nicht auf einen Balken', () => {
    const { script } = scriptFor({ picks: ['rope', 1, 2], modes: { rope: true } });
    expect(script.run.find((r) => r.hikerId === 'p1')!.plank).toBe('rope');
    expect(new Set(script.run.map((r) => r.arriveAt)).size).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Das Fake-Knarren                                                    */
/* ------------------------------------------------------------------ */

describe('Knarren (ADR-3)', () => {
  it('jeder besetzte Balken knarrt — die sicheren mit 70 %', () => {
    const { result, script } = scriptFor({ picks: [1, 1, 3, 4], plankCount: 6 });

    const occupied = result.groups.map((g) => g.plank).sort((a, b) => a - b);
    expect(script.creak.map((c) => c.plank).sort((a, b) => a - b)).toEqual(occupied);

    expect(script.creak.find((c) => c.plank === 1)!.amplitude).toBe(CREAK_AMPLITUDE.collision);
    expect(script.creak.find((c) => c.plank === 3)!.amplitude).toBe(CREAK_AMPLITUDE.safe);
    expect(script.creak.find((c) => c.plank === 4)!.amplitude).toBe(CREAK_AMPLITUDE.safe);
  });

  it('leere Balken knarren nicht', () => {
    const { script } = scriptFor({ picks: [1, 2, 3], plankCount: 7 });
    expect(script.creak.map((c) => c.plank)).toEqual([1, 2, 3]);
  });

  it('der morsche Balken faengt leise an und faellt dann aus der Tarnung', () => {
    const { script } = scriptFor({
      picks: [2, 1, 3],
      plankCount: 5,
      modes: { rotten: true },
      rottenPlank: 2,
    });

    const rotten = script.creak.find((c) => c.plank === 2)!;
    expect(rotten.amplitude).toBe(CREAK_AMPLITUDE.rottenStart);
    expect(rotten.amplitudeEnd).toBe(CREAK_AMPLITUDE.rottenEnd);
    expect(rotten.revealAt).toBeGreaterThan(script.step.at);
    expect(rotten.revealAt).toBeLessThan(script.breaks[0]!.at);
  });
});

/* ------------------------------------------------------------------ */
/* Der Blickkontakt — die Signatur                                     */
/* ------------------------------------------------------------------ */

describe('Blickkontakt (ADR-3, nicht verhandelbar)', () => {
  it('jede Kollisionsgruppe bekommt einen, und immer VOR ihrem Bruch', () => {
    const cases: RoundOptions[] = [
      { picks: [1, 1, 3], plankCount: 5 },
      { picks: [1, 1, 3, 3], plankCount: 6 },
      { picks: [1, 1, 1, 4], plankCount: 6 },
      { picks: [1, 1, 2, 2, 3, 3, 4, 4], plankCount: 10 },
      { picks: [1, 1, 2], plankCount: 2 },
    ];

    for (const options of cases) {
      for (const pace of PACE_PRESETS) {
        const { result, script } = scriptFor(options, pace);
        const collisions = result.groups.filter((g) => g.collision).map((g) => g.plank);

        expect(script.eyeContact.map((e) => e.plank).sort((a, b) => a - b)).toEqual(
          [...collisions].sort((a, b) => a - b)
        );

        for (const look of script.eyeContact) {
          const snap = script.breaks.find((b) => b.plank === look.plank)!;
          expect(look.at).toBeLessThan(snap.at);
          /* Nicht vor dem gemeinsamen Schritt — vorher schaut niemand irgendwohin. */
          expect(look.at).toBeGreaterThanOrEqual(script.step.at);
          expect(look.durationMs).toBe(EYE_CONTACT.durationMs);
        }
      }
    }
  });

  it('gilt nur fuer Kollisionen — der morsche Balken bricht ohne Zeugen', () => {
    const { script } = scriptFor({
      picks: [2, 1, 3],
      plankCount: 5,
      modes: { rotten: true },
      rottenPlank: 2,
    });
    expect(script.breaks).toHaveLength(1);
    expect(script.eyeContact).toEqual([]);
  });

  it('nennt beide Beteiligten', () => {
    const { script } = scriptFor({ picks: [4, 1, 4, 4], plankCount: 6 });
    expect(script.eyeContact[0]!.hikerIds).toEqual(['p1', 'p3', 'p4']);
  });

  it('Slow-Mo laeuft vom ersten Blick bis zum ersten Bruch', () => {
    const { script } = scriptFor({ picks: [1, 1, 3], plankCount: 5 });
    expect(script.slowMo).toEqual({
      from: script.eyeContact[0]!.at,
      to: script.breaks[0]!.at,
      factor: EYE_CONTACT.slowMo,
    });
  });

  it('ohne Bruch gibt es keine Slow-Mo', () => {
    const { script } = scriptFor({ picks: [1, 2, 3], plankCount: 5 });
    expect(script.slowMo).toBeUndefined();
    expect(script.breaks).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Bruch-Reihenfolge und Deckel                                        */
/* ------------------------------------------------------------------ */

describe('Bruch', () => {
  it('bricht nacheinander, nicht im Chor', () => {
    const { script } = scriptFor({ picks: [1, 1, 2, 2, 3, 3], plankCount: 8 });
    const times = script.breaks.map((b) => b.at);
    expect(times).toHaveLength(3);
    expect(new Set(times).size).toBe(3);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('ist bei gleichem Seed reproduzierbar und bei anderem Seed anders', () => {
    const picks = [1, 1, 2, 2, 3, 3, 4, 4];
    const a = scriptFor({ picks, plankCount: 10, seed: 777 }).script.breaks.map((b) => b.plank);
    const b = scriptFor({ picks, plankCount: 10, seed: 777 }).script.breaks.map((b) => b.plank);
    expect(a).toEqual(b);

    const other = scriptFor({ picks, plankCount: 10, seed: 999 }).script.breaks.map((b) => b.plank);
    expect(new Set([...a, ...other]).size).toBe(4);
  });

  it('Tap-to-Skip erst nach dem letzten Bruch (GDD §4.2)', () => {
    const { script } = scriptFor({ picks: [1, 1, 2, 2], plankCount: 6 });
    expect(script.skippableFrom).toBe(script.breaks[script.breaks.length - 1]!.at);
    for (const entry of script.breaks) expect(entry.at).toBeLessThanOrEqual(script.skippableFrom);
  });

  it('raffft erst die Bruch-Abstaende und dann alles andere (fitToCap)', () => {
    /* Absichtlich absurde Tempo-Tokens — so weit kommt kein Preset, aber der Deckel muss halten. */
    const absurd = { intro: 6000, run: 6000, hitStop: 120, creak: 6000, aftermath: 6000, stagger: 400 };

    for (let breaks = 0; breaks <= 12; breaks += 1) {
      const fitted = fitToCap(absurd, breaks);
      expect(totalOf(fitted, breaks)).toBeLessThanOrEqual(MAX_STEP_MS + 1);
      expect(fitted.stagger).toBeGreaterThanOrEqual(MIN_BREAK_STAGGER_MS);
      /* Der Hit-Stop wird nie gerafft — er ist die Signatur. */
      expect(fitted.hitStop).toBe(absurd.hitStop);
    }
  });

  it('laesst ein Skript in Ruhe, das ohnehin unter dem Deckel bleibt', () => {
    const relaxed = { intro: 1500, run: 2000, hitStop: 120, creak: 2000, aftermath: 2800, stagger: 400 };
    expect(fitToCap(relaxed, 2)).toBe(relaxed);
  });

  it('bleibt in jedem Fall unter dem 20-Sekunden-Deckel', () => {
    const worstCases: RoundOptions[] = [
      { picks: [1, 1, 2, 2, 3, 3, 4, 4], plankCount: 10 },
      { picks: [1, 1, 1, 2, 2, 2, 3, 3], plankCount: 10 },
      { picks: [1, 1, 2, 2, 3, 3, 4, 4], plankCount: 7 },
      { picks: [1, 2, 3, 4, 5, 6, 7, 8], plankCount: 10 },
    ];

    for (const options of worstCases) {
      for (const pace of PACE_PRESETS) {
        const { script } = scriptFor(options, pace);
        expect(script.totalMs).toBeLessThanOrEqual(MAX_STEP_MS);
        /* Auch geraffte Skripte behalten den Blickkontakt vor dem Bruch. */
        for (const look of script.eyeContact) {
          expect(look.at).toBeLessThan(script.breaks.find((b) => b.plank === look.plank)!.at);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Nachspiel                                                           */
/* ------------------------------------------------------------------ */

describe('Nachspiel', () => {
  it('bei Frieden faellt ein Balken ab, sonst kommt Balthasar', () => {
    const peaceful = scriptFor({ picks: [1, 2, 3], plankCount: 5 }).script;
    expect(peaceful.aftermath.kind).toBe('allSafeRot');
    expect(peaceful.removedPlank).toBeDefined();

    const crash = scriptFor({ picks: [1, 1, 3], plankCount: 5 }).script;
    expect(crash.aftermath.kind).toBe('repair');
    expect(crash.removedPlank).toBeUndefined();
  });

  it('kuendigt die Todeszone im Intro an', () => {
    expect(scriptFor({ picks: [1, 1, 2], plankCount: 2 }).script.intro.deathZone).toBe(true);
    expect(scriptFor({ picks: [1, 2, 3], plankCount: 5 }).script.intro.deathZone).toBe(false);
  });

  it('die Erleichterten atmen erst aus, wenn es das erste Mal kracht', () => {
    const { script } = scriptFor({ picks: [1, 1, 3, 4], plankCount: 6 });
    expect(script.safe).toHaveLength(2);
    for (const entry of script.safe) expect(entry.at).toBe(script.breaks[0]!.at);
  });

  it('legt Overlays auf ihre Ziele', () => {
    const { script } = scriptFor({
      picks: [5, 2, 2],
      plankCount: 6,
      modes: { flags: true },
      flags: { p1: 3 },
    });
    expect(script.overlays).toEqual([{ id: 'deserter_stamp', target: 'p1' }]);
  });
});

/* ------------------------------------------------------------------ */
/* Sequenz-Auswahl                                                     */
/* ------------------------------------------------------------------ */

describe('createSequencePicker', () => {
  it('waehlt fall_domino nur fuer Gruppen ab drei', () => {
    expect(fallCandidates(2).map((s) => s.id)).not.toContain('fall_domino');
    expect(fallCandidates(3).map((s) => s.id)).toContain('fall_domino');

    const picker = createSequencePicker(4711);
    for (let i = 0; i < 500; i += 1) {
      expect(picker.pickFall(2)).not.toBe('fall_domino');
    }
  });

  it('waehlt nur Sequenzen aus dem Katalog', () => {
    const picker = createSequencePicker(99);
    const fallIds = new Set(FALL_SEQUENCES.map((s) => s.id));
    const safeIds = new Set(SAFE_SEQUENCES.map((s) => s.id));

    for (let i = 0; i < 500; i += 1) {
      expect(fallIds.has(picker.pickFall(i % 2 === 0 ? 2 : 3))).toBe(true);
      expect(safeIds.has(picker.pickSafe())).toBe(true);
    }
  });

  it('wiederholt sich nicht sofort — auch nicht bei nur drei Kandidaten', () => {
    const picker = createSequencePicker(1234);
    const window = Math.min(SEQUENCE_NO_REPEAT, SAFE_SEQUENCES.length - 1);

    const seen: string[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const id = picker.pickSafe();
      expect(seen.slice(-window)).not.toContain(id);
      seen.push(id);
    }
    /* Und es werden trotzdem alle benutzt. */
    expect(new Set(seen).size).toBe(SAFE_SEQUENCES.length);
  });

  it('ist deterministisch', () => {
    const a = createSequencePicker(2024);
    const b = createSequencePicker(2024);
    for (let i = 0; i < 100; i += 1) {
      expect(a.pickFall(2)).toBe(b.pickFall(2));
      expect(a.pickSafe()).toBe(b.pickSafe());
    }
  });
});
