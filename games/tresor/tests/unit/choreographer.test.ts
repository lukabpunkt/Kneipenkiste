/**
 * Choreographer (Architektur §6, Audit A0).
 *
 * Die Reihenfolge ist Gesetz: Teiler zuerst, Diebe zuletzt, Maulwurf als letzter Dieb.
 * Und die letzte Karte ist unantastbar — 160 %, zwei Stalls, kein Skip.
 */

import { describe, expect, it } from 'vitest';
import {
  LAST_CARD_FACTOR,
  MAX_SHOW_MS,
  MIN_CARD_HOLD_MS,
  NO_REPEAT_WINDOW,
  PACE_HOLD_MS,
  STALLS_LAST,
  STALLS_NORMAL,
  tempoFactor,
} from '@/config/choreo';
import { REVEAL_PACES } from '@/config/rules';
import {
  buildRevealOrder,
  buildRevealScript,
  canSkip,
  cardHolds,
  cardIndexOf,
  nextBeatTime,
  selectOutcomeSequence,
  type Beat,
} from '@/core/choreographer';
import { createSeededRng } from '@/core/rng';
import { makeSettings, resolve } from './helpers';

const cards = (beats: readonly Beat[]): Extract<Beat, { type: 'card' }>[] =>
  beats.filter((b): b is Extract<Beat, { type: 'card' }> => b.type === 'card');

/* ------------------------------------------------------------------ */
/* Reihenfolge (ADR-3)                                                 */
/* ------------------------------------------------------------------ */

describe('buildRevealOrder', () => {
  it('setzt Teiler nach vorn und Diebe nach hinten', () => {
    const order = buildRevealOrder(['a', 'b', 'c'], ['x', 'y'], undefined, createSeededRng(1));
    expect(order.revealOrder.slice(0, 3).sort()).toEqual(['a', 'b', 'c']);
    expect(order.revealOrder.slice(3).sort()).toEqual(['x', 'y']);
  });

  it('macht den Maulwurf zum letzten Dieb', () => {
    for (let seed = 0; seed < 50; seed++) {
      const order = buildRevealOrder(['a'], ['x', 'y', 'z'], 'x', createSeededRng(seed));
      expect(order.thieves.at(-1)).toBe('x');
      expect(order.revealOrder.at(-1)).toBe('x');
    }
  });

  it('ignoriert einen Maulwurf, der gar nicht gestohlen hat', () => {
    const order = buildRevealOrder(['a', 'm'], ['x'], 'm', createSeededRng(3));
    expect(order.thieves).toEqual(['x']);
    expect(order.revealOrder).toHaveLength(3);
  });

  it('ist deterministisch', () => {
    const a = buildRevealOrder(['a', 'b', 'c'], ['x', 'y'], undefined, createSeededRng(99));
    const b = buildRevealOrder(['a', 'b', 'c'], ['x', 'y'], undefined, createSeededRng(99));
    expect(a).toEqual(b);
  });

  it('permutiert ueber verschiedene Seeds tatsaechlich', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      seen.add(
        buildRevealOrder(['a', 'b', 'c', 'd'], [], undefined, createSeededRng(seed)).revealOrder.join('')
      );
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* Tempo-Kurve und Stalls (Art Direction §7)                           */
/* ------------------------------------------------------------------ */

describe('Tempo-Kurve', () => {
  it('sinkt von 100 % auf 70 % bis zur vorletzten Karte', () => {
    expect(tempoFactor(0, 6)).toBeCloseTo(1.0);
    expect(tempoFactor(4, 6)).toBeCloseTo(0.7);
  });

  it('gibt der letzten Karte 160 %', () => {
    expect(tempoFactor(5, 6)).toBe(LAST_CARD_FACTOR);
    expect(tempoFactor(2, 3)).toBe(LAST_CARD_FACTOR);
  });

  it('faellt monoton', () => {
    for (let i = 1; i < 7; i++) {
      expect(tempoFactor(i, 8)).toBeLessThanOrEqual(tempoFactor(i - 1, 8));
    }
  });

  it('kommt mit sehr kurzen Shows klar', () => {
    expect(tempoFactor(0, 2)).toBe(1);
    expect(tempoFactor(1, 2)).toBe(LAST_CARD_FACTOR);
  });
});

describe('cardHolds', () => {
  it('haelt den 40-s-Deckel fuer jede Spielerzahl und jedes Preset', () => {
    for (const pace of REVEAL_PACES) {
      for (let n = 3; n <= 8; n++) {
        for (const alarm of [false, true]) {
          const holds = cardHolds(n, pace, alarm);
          const total = holds.reduce((s, ms) => s + ms, 0);
          expect(total).toBeLessThanOrEqual(MAX_SHOW_MS);
          expect(Math.min(...holds)).toBeGreaterThanOrEqual(MIN_CARD_HOLD_MS);
        }
      }
    }
  });

  it('raffft die fruehen Karten, nie die letzte', () => {
    const base = PACE_HOLD_MS.long;
    const holds = cardHolds(8, 'long', true);
    expect(holds.at(-1)).toBe(Math.round(base * LAST_CARD_FACTOR));
  });

  it('braucht die Raffung im echten Spiel nie — sie ist ein Sicherheitsnetz', () => {
    for (const pace of REVEAL_PACES) {
      for (let n = 3; n <= 8; n++) {
        const holds = cardHolds(n, pace, true);
        const ungerafft = Array.from({ length: n }, (_, i) =>
          Math.round(PACE_HOLD_MS[pace] * tempoFactor(i, n))
        );
        expect(holds).toEqual(ungerafft);
      }
    }
  });

  it('rafft die fruehen Karten, sobald die Show den Deckel sprengen wuerde', () => {
    // Kuenstlich viele Karten: die echte Obergrenze von 8 Spielern erreicht den
    // Deckel nicht, aber die Regel aus GDD §4.3 muss trotzdem funktionieren.
    const holds = cardHolds(20, 'long', true);
    const total = holds.reduce((s, ms) => s + ms, 0);
    expect(total).toBeLessThanOrEqual(MAX_SHOW_MS);
    expect(holds.at(-1)).toBe(Math.round(PACE_HOLD_MS.long * LAST_CARD_FACTOR));
    expect(holds[0]).toBeLessThan(PACE_HOLD_MS.long);
    expect(Math.min(...holds)).toBeGreaterThanOrEqual(MIN_CARD_HOLD_MS);
  });

  it('haelt die Untergrenze ein, statt Karten unlesbar zu machen', () => {
    const holds = cardHolds(60, 'long', true);
    expect(Math.min(...holds)).toBe(MIN_CARD_HOLD_MS);
  });

  it('laesst eine einzelne Karte in Ruhe', () => {
    expect(cardHolds(1, 'long', true)).toHaveLength(1);
  });

  it('nutzt die Presets als Basis', () => {
    for (const pace of REVEAL_PACES) {
      expect(cardHolds(1, pace, false)[0]).toBe(Math.round(PACE_HOLD_MS[pace] * LAST_CARD_FACTOR));
    }
  });
});

/* ------------------------------------------------------------------ */
/* Das Drehbuch                                                        */
/* ------------------------------------------------------------------ */

describe('buildRevealScript', () => {
  const settings = makeSettings();

  it('folgt der Reveal-Reihenfolge des Ergebnisses', () => {
    const result = resolve(6, 2, 10, settings, { seed: 7 });
    const script = buildRevealScript(result, { pace: 'normal' });
    expect(cards(script.beats).map((c) => c.playerId)).toEqual(result.revealOrder);
  });

  it('faengt mit Intro an und hoert mit Outro auf', () => {
    const script = buildRevealScript(resolve(4, 1, 8, settings), { pace: 'normal' });
    expect(script.beats[0]!.type).toBe('intro');
    expect(script.beats.at(-1)!.type).toBe('outro');
  });

  it('gibt jeder Karte einen Stall, der letzten zwei', () => {
    const script = buildRevealScript(resolve(5, 2, 10, settings), { pace: 'normal' });
    const list = cards(script.beats);
    for (const card of list.slice(0, -1)) expect(card.stalls).toEqual(STALLS_NORMAL);
    expect(list.at(-1)!.stalls).toEqual(STALLS_LAST);
    expect(list.at(-1)!.isLast).toBe(true);
    expect(list.filter((c) => c.isLast)).toHaveLength(1);
  });

  it('loest den Alarm nach der ersten STEHLEN-Karte aus', () => {
    const script = buildRevealScript(resolve(5, 2, 10, settings), { pace: 'normal' });
    const alarmAt = script.beats.findIndex((b) => b.type === 'alarm');
    expect(alarmAt).toBeGreaterThan(0);
    const before = cards(script.beats.slice(0, alarmAt));
    expect(before.at(-1)!.choice).toBe('steal');
    expect(before.filter((c) => c.choice === 'steal')).toHaveLength(1);
    expect(script.beats.filter((b) => b.type === 'alarm')).toHaveLength(1);
  });

  it('laesst den Alarm weg, wenn niemand gestohlen hat', () => {
    const script = buildRevealScript(resolve(5, 0, 10, settings), { pace: 'normal' });
    expect(script.beats.some((b) => b.type === 'alarm')).toBe(false);
  });

  it('klebt Siegel nur im Eid-Modus auf die Karten der Schwoerenden', () => {
    const oath = makeSettings({}, { oath: true });
    const result = resolve(4, 1, 8, oath, { oaths: ['p0', 'p2'] });

    const withOaths = cards(buildRevealScript(result, { pace: 'normal', oathsEnabled: true }).beats);
    expect(
      withOaths
        .filter((c) => c.overlay === 'oathSeal')
        .map((c) => c.playerId)
        .sort()
    ).toEqual(['p0', 'p2']);

    const without = cards(buildRevealScript(result, { pace: 'normal' }).beats);
    expect(without.some((c) => c.overlay)).toBe(false);
  });

  it('reicht Outcome-ID und Overlays weiter', () => {
    const both = makeSettings({}, { oath: true, mole: true });
    const result = resolve(5, 2, 10, both, { moleId: 'p1', oaths: ['p0'] });
    const script = buildRevealScript(result, { pace: 'normal' });
    const outcome = script.beats.find((b) => b.type === 'outcome');
    expect(outcome).toMatchObject({
      sequenceId: result.outcomeSequenceId,
      overlayIds: ['perjury_seal_break', 'mole_reveal'],
    });
  });

  it('haelt den 40-s-Deckel auch bei 8 Spielern und "Lang"', () => {
    for (const pace of REVEAL_PACES) {
      for (let n = 3; n <= 8; n++) {
        for (let k = 0; k <= n; k++) {
          const script = buildRevealScript(resolve(n, k, 10, settings), { pace });
          expect(script.totalMs).toBeLessThanOrEqual(MAX_SHOW_MS);
        }
      }
    }
  });

  it('setzt die Beats lueckenlos hintereinander', () => {
    const script = buildRevealScript(resolve(6, 3, 12, settings), { pace: 'normal' });
    for (let i = 1; i < script.beats.length; i++) {
      expect(script.beats[i]!.t).toBeGreaterThanOrEqual(script.beats[i - 1]!.t);
    }
    expect(script.totalMs).toBeGreaterThan(script.beats.at(-1)!.t);
  });

  it('ist deterministisch', () => {
    const result = resolve(6, 2, 10, settings, { seed: 4242 });
    expect(buildRevealScript(result, { pace: 'normal' })).toEqual(
      buildRevealScript(result, { pace: 'normal' })
    );
  });

  it('wehrt sich gegen ein leeres oder unvollstaendiges Ergebnis', () => {
    const result = resolve(4, 1, 8, settings);
    expect(() => buildRevealScript({ ...result, revealOrder: [] }, { pace: 'normal' })).toThrow(
      /ohne Karten/
    );
    expect(() =>
      buildRevealScript({ ...result, revealOrder: [...result.revealOrder, 'ghost'] }, { pace: 'normal' })
    ).toThrow(/keine Wahl/);
  });
});

/* ------------------------------------------------------------------ */
/* Tap-to-Skip (GDD §4.3)                                              */
/* ------------------------------------------------------------------ */

describe('canSkip', () => {
  const script = buildRevealScript(resolve(6, 2, 10, makeSettings(), { seed: 5 }), {
    pace: 'normal',
  });

  it('nie beim Intro, Alarm, Outcome oder Outro', () => {
    script.beats.forEach((beat, i) => {
      if (beat.type !== 'card') expect(canSkip(script, i)).toBe(false);
    });
  });

  it('nie bei der ersten und nie bei der letzten Karte', () => {
    const indices = script.beats.map((b, i) => (b.type === 'card' ? i : -1)).filter((i) => i >= 0);
    expect(canSkip(script, indices[0]!)).toBe(false);
    expect(canSkip(script, indices.at(-1)!)).toBe(false);
  });

  it('ab der zweiten Karte', () => {
    const indices = script.beats.map((b, i) => (b.type === 'card' ? i : -1)).filter((i) => i >= 0);
    for (const i of indices.slice(1, -1)) expect(canSkip(script, i)).toBe(true);
  });

  it('kennt keinen Beat ausserhalb des Skripts', () => {
    expect(canSkip(script, 999)).toBe(false);
    expect(cardIndexOf(script, 999)).toBe(-1);
    expect(cardIndexOf(script, 0)).toBe(-1);
  });

  it('nextBeatTime zeigt auf den Folge-Beat, am Ende auf das Ende', () => {
    expect(nextBeatTime(script, 0)).toBe(script.beats[1]!.t);
    expect(nextBeatTime(script, script.beats.length - 1)).toBe(script.totalMs);
  });
});

/* ------------------------------------------------------------------ */
/* Outcome-Auswahl                                                     */
/* ------------------------------------------------------------------ */

describe('selectOutcomeSequence', () => {
  const candidates = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
    { id: 'd', weight: 1 },
  ];

  it('meidet das No-Repeat-Fenster', () => {
    for (let seed = 0; seed < 100; seed++) {
      const picked = selectOutcomeSequence(candidates, ['a', 'b', 'c'], createSeededRng(seed));
      expect(picked).toBe('d');
    }
  });

  it('schaut nur die letzten drei Eintraege an', () => {
    expect(NO_REPEAT_WINDOW).toBe(3);
    const picked = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      picked.add(selectOutcomeSequence(candidates, ['d', 'a', 'b', 'c'], createSeededRng(seed)));
    }
    expect(picked).toEqual(new Set(['d']));
  });

  it('faellt auf das ganze Feld zurueck, wenn sonst nichts bliebe', () => {
    const two = [
      { id: 'x', weight: 1 },
      { id: 'y', weight: 1 },
    ];
    const picked = selectOutcomeSequence(two, ['x', 'y', 'x'], createSeededRng(1));
    expect(['x', 'y']).toContain(picked);
  });

  it('respektiert die Gewichte', () => {
    const weighted = [
      { id: 'often', weight: 9 },
      { id: 'rare', weight: 1 },
    ];
    let often = 0;
    for (let seed = 0; seed < 1000; seed++) {
      if (selectOutcomeSequence(weighted, [], createSeededRng(seed)) === 'often') often += 1;
    }
    expect(often / 1000).toBeGreaterThan(0.8);
  });

  it('wiederholt sich ueber 1 000 Runden nie innerhalb des Fensters', () => {
    const rng = createSeededRng(2026);
    const recent: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const picked = selectOutcomeSequence(candidates, recent, rng);
      expect(recent.slice(-NO_REPEAT_WINDOW)).not.toContain(picked);
      recent.push(picked);
    }
  });

  it('braucht Kandidaten', () => {
    expect(() => selectOutcomeSequence([], [], createSeededRng(1))).toThrow(/ohne Kandidaten/);
  });
});
