/**
 * Das Drehbuch der Show (Roadmap M3, Audit A3).
 *
 * Die beiden Zusicherungen aus der Definition of Done stehen hier:
 *
 * 1. **1 000 simulierte Runden**: Die Karten im Skript sind exakt die getroffenen Wahlen,
 *    in exakt der Reihenfolge aus `revealOrder`. Wenn das je bricht, zeigt die Show etwas
 *    anderes, als gespielt wurde — der schlimmste denkbare Fehler in diesem Spiel.
 * 2. **Timing entspricht den Presets (± 1 s)**: Die geplante Gesamtdauer folgt der
 *    Tempo-Kurve aus `choreo.ts` und nicht irgendeiner Zahl im Director.
 *
 * Der Director selbst braucht PIXI und GSAP und laeuft deshalb im E2E-Test; was sich ohne
 * Renderer pruefen laesst, wird hier geprueft.
 */

import { describe, expect, it } from 'vitest';
import {
  ALARM_MS,
  INTRO_MS,
  MAX_SHOW_MS,
  OUTCOME_BUDGET_MS,
  OUTRO_MS,
  PACE_HOLD_MS,
  STALLS_LAST,
  STALLS_NORMAL,
  tempoFactor,
} from '@/config/choreo';
import { HARDNESS_IDS, REVEAL_PACES, type Hardness, type RevealPace } from '@/config/rules';
import { buildRevealScript, type Beat } from '@/core/choreographer';
import { resolveRound } from '@/core/payout';
import { createSeededRng } from '@/core/rng';
import { vaultSpec } from '@/core/vault';
import { makeIds, makeSettings, makeSetup } from './helpers';

const cards = (beats: readonly Beat[]): Extract<Beat, { type: 'card' }>[] =>
  beats.filter((beat): beat is Extract<Beat, { type: 'card' }> => beat.type === 'card');

/* ------------------------------------------------------------------ */
/* Die Kernzusicherung: 1 000 Runden                                   */
/* ------------------------------------------------------------------ */

describe('1 000 simulierte Runden (Audit A3)', () => {
  it('zeigt genau die Karten, die gespielt wurden — in der richtigen Reihenfolge', () => {
    const rng = createSeededRng(30303);
    const hardnesses: Hardness[] = [...HARDNESS_IDS];
    const paces: RevealPace[] = [...REVEAL_PACES];
    const seenOutcomes = new Set<string>();

    for (let run = 0; run < 1000; run++) {
      const n = rng.intBetween(3, 8);
      const ids = makeIds(n);
      const settings = makeSettings(
        { hardness: rng.pick(hardnesses) },
        {
          oath: rng.chance(0.4),
          mole: rng.chance(0.3),
          highroller: rng.chance(0.2),
        }
      );
      const spec = vaultSpec(settings);
      const moleId = settings.modes.mole ? rng.pick(ids) : undefined;

      const setup = makeSetup({
        vault: rng.intBetween(spec.startVault, spec.jackpotAt),
        steals: ids.map(() => rng.chance(0.35)),
        seed: rng.int(0xffffffff),
        oaths: settings.modes.oath ? ids.filter(() => rng.chance(0.5)) : [],
        ...(moleId !== undefined ? { moleId } : {}),
      });

      const result = resolveRound(ids, setup, settings);
      const pace = rng.pick(paces);
      const script = buildRevealScript(result, { pace, oathsEnabled: settings.modes.oath });
      const list = cards(script.beats);
      seenOutcomes.add(result.outcome);

      // 1. Jede Karte genau einmal, in der Reihenfolge des Ergebnisses.
      expect(list.map((card) => card.playerId)).toEqual(result.revealOrder);

      // 2. Auf jeder Karte steht, was der Spieler gewaehlt hat.
      for (const card of list) {
        expect(card.choice).toBe(result.choices[card.playerId]);
      }

      // 3. Teiler zuerst, Diebe zuletzt (ADR-3) — und der Maulwurf ganz am Ende.
      const choices = list.map((card) => card.choice);
      const firstSteal = choices.indexOf('steal');
      if (firstSteal >= 0) {
        expect(choices.slice(firstSteal).every((choice) => choice === 'steal')).toBe(true);
      }
      if (moleId !== undefined) expect(list.at(-1)!.playerId).toBe(moleId);

      // 4. Genau eine letzte Karte, und sie stockt zweimal.
      const lastCards = list.filter((card) => card.isLast);
      expect(lastCards).toHaveLength(1);
      expect(lastCards[0]).toBe(list.at(-1));
      expect(lastCards[0]!.stalls).toEqual(STALLS_LAST);
      for (const card of list.slice(0, -1)) expect(card.stalls).toEqual(STALLS_NORMAL);

      // 5. Der Alarm kommt nach der ersten offenen STEHLEN-Karte — oder gar nicht.
      const alarms = script.beats.filter((beat) => beat.type === 'alarm');
      expect(alarms).toHaveLength(result.thieves.length > 0 ? 1 : 0);

      // 6. Der Deckel haelt.
      expect(script.totalMs).toBeLessThanOrEqual(MAX_SHOW_MS);
    }

    // Ueber 1 000 Runden kommen alle fuenf Faelle vor — sonst prueft der Test zu wenig.
    expect(seenOutcomes.size).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/* Timing gegen die Presets                                            */
/* ------------------------------------------------------------------ */

describe('Show-Timing (DoD M3)', () => {
  /** Was die Presets in `choreo.ts` fuer diese Runde vorgeben. */
  function expectedMs(count: number, pace: RevealPace, hasAlarm: boolean): number {
    let holds = 0;
    for (let i = 0; i < count; i++) holds += Math.round(PACE_HOLD_MS[pace] * tempoFactor(i, count));
    return INTRO_MS + holds + (hasAlarm ? ALARM_MS : 0) + OUTCOME_BUDGET_MS + OUTRO_MS;
  }

  for (const pace of REVEAL_PACES) {
    for (let n = 3; n <= 8; n++) {
      it(`${pace}, ${n} Spieler: Skript folgt dem Preset (± 1 s)`, () => {
        const settings = makeSettings({ revealPace: pace });
        const setup = makeSetup({
          vault: 8,
          steals: Array.from({ length: n }, (_, i) => i === 0),
        });
        const script = buildRevealScript(resolveRound(makeIds(n), setup, settings), { pace });
        expect(Math.abs(script.totalMs - expectedMs(n, pace, true))).toBeLessThanOrEqual(1000);
      });
    }
  }

  it('bleibt auch bei acht Spielern und "Lang" unter 40 s', () => {
    const settings = makeSettings({ revealPace: 'long' });
    const setup = makeSetup({ vault: 8, steals: Array.from({ length: 8 }, () => false) });
    const script = buildRevealScript(resolveRound(makeIds(8), setup, settings), { pace: 'long' });
    expect(script.totalMs).toBeLessThanOrEqual(MAX_SHOW_MS);
    // Und nicht so kurz, dass die Show verpufft.
    expect(script.totalMs).toBeGreaterThan(25_000);
  });

  it('macht kurze Runden spuerbar kuerzer als lange', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false, true] });
    const result = resolveRound(makeIds(4), setup, makeSettings());
    const short = buildRevealScript(result, { pace: 'short' }).totalMs;
    const long = buildRevealScript(result, { pace: 'long' }).totalMs;
    expect(long - short).toBeGreaterThan(8000);
  });
});

/* ------------------------------------------------------------------ */
/* Eid-Siegel im Skript                                                */
/* ------------------------------------------------------------------ */

describe('Eid-Siegel auf den Karten', () => {
  it('markiert genau die Karten der Schwoerenden — und nur im Eid-Modus', () => {
    const settings = makeSettings({}, { oath: true });
    const setup = makeSetup({
      vault: 8,
      steals: [true, false, false, false],
      oaths: ['p0', 'p2'],
    });
    const result = resolveRound(makeIds(4), setup, settings);

    const withOaths = cards(buildRevealScript(result, { pace: 'normal', oathsEnabled: true }).beats);
    expect(
      withOaths
        .filter((card) => card.overlay === 'oathSeal')
        .map((card) => card.playerId)
        .sort()
    ).toEqual(['p0', 'p2']);

    const without = cards(buildRevealScript(result, { pace: 'normal' }).beats);
    expect(without.some((card) => card.overlay)).toBe(false);
  });
});
