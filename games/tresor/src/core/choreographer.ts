/**
 * Choreographer (Architektur §6) — baut aus einem feststehenden `RoundResult` das
 * Drehbuch der Aufdeckung. Er inszeniert, er entscheidet nichts.
 *
 * Zwei Gesetze aus CLAUDE.md stehen hier drin:
 *
 * 1. **Reihenfolge:** Teiler zuerst, Diebe zuletzt, Maulwurf als letzter Dieb (ADR-3).
 *    Dadurch koennte bis zur letzten Karte noch jeder der Verraeter sein.
 * 2. **Letzte Karte:** 160 % Verweildauer, zwei Stalls, Slow-Mo — und kein Tap-to-Skip.
 *
 * Alles ist deterministisch: gleicher Seed → gleiches Skript (Test in A0).
 */

import {
  ALARM_MS,
  INTRO_MS,
  MAX_SHOW_MS,
  MIN_CARD_HOLD_MS,
  NO_REPEAT_WINDOW,
  OUTCOME_BUDGET_MS,
  OUTRO_MS,
  PACE_HOLD_MS,
  SKIP_FROM_CARD_INDEX,
  stallsFor,
  tempoFactor,
} from '@/config/choreo';
import type { RevealPace } from '@/config/rules';
import type { SeededRng } from './rng';
import type { Choice, OverlayId, PlayerId, RoundResult } from './types';

/* ------------------------------------------------------------------ */
/* Reveal-Reihenfolge (ADR-3)                                          */
/* ------------------------------------------------------------------ */

export interface RevealOrder {
  sharers: PlayerId[];
  thieves: PlayerId[];
  /** Teiler (permutiert) gefolgt von Dieben (permutiert, Maulwurf hinten). */
  revealOrder: PlayerId[];
}

/**
 * Permutiert Teiler und Diebe getrennt und haengt sie hintereinander.
 * Der Maulwurf rutscht immer ans Ende der Diebe: Sein Helm ist die Pointe.
 */
export function buildRevealOrder(
  sharers: readonly PlayerId[],
  thieves: readonly PlayerId[],
  moleId: PlayerId | undefined,
  rng: SeededRng
): RevealOrder {
  const orderedSharers = rng.shuffle(sharers);
  const orderedThieves = rng.shuffle(thieves);

  if (moleId !== undefined) {
    const at = orderedThieves.indexOf(moleId);
    if (at >= 0) {
      orderedThieves.splice(at, 1);
      orderedThieves.push(moleId);
    }
  }

  return {
    sharers: orderedSharers,
    thieves: orderedThieves,
    revealOrder: [...orderedSharers, ...orderedThieves],
  };
}

/* ------------------------------------------------------------------ */
/* Outcome-Auswahl (Architektur §6)                                    */
/* ------------------------------------------------------------------ */

export interface OutcomeCandidate {
  id: string;
  /** Gewicht > 0; haeufigere Inszenierungen bekommen mehr. */
  weight: number;
}

/**
 * Gewichtete Auswahl mit No-Repeat-Fenster: Was in den letzten
 * `NO_REPEAT_WINDOW` Runden **dieses Outcome-Typs** lief, faellt raus.
 *
 * Bleibt dadurch nichts uebrig — bei "Alle teilen" gibt es nur zwei Sequenzen —,
 * zaehlt wieder das ganze Feld. Lieber eine Wiederholung als eine leere Buehne.
 */
export function selectOutcomeSequence(
  candidates: readonly OutcomeCandidate[],
  recent: readonly string[],
  rng: SeededRng
): string {
  if (candidates.length === 0) throw new RangeError('selectOutcomeSequence ohne Kandidaten.');

  const blocked = new Set(recent.slice(-NO_REPEAT_WINDOW));
  const pool = candidates.filter((c) => !blocked.has(c.id));
  const usable = pool.length > 0 ? pool : candidates;

  return rng.weighted(usable, (c) => c.weight).id;
}

/* ------------------------------------------------------------------ */
/* Das Drehbuch                                                        */
/* ------------------------------------------------------------------ */

export type Beat =
  | { t: number; type: 'intro' }
  | {
      t: number;
      type: 'card';
      playerId: PlayerId;
      choice: Choice;
      /** Verweildauer inkl. Flip und Reaktion. */
      holdMs: number;
      /** Flip-Fortschritte, bei denen die Karte stockt. */
      stalls: readonly number[];
      isLast: boolean;
      /** Eid-Modus: Auf der Karte klebt ein Wachssiegel. */
      overlay?: 'oathSeal';
    }
  | { t: number; type: 'alarm' }
  | { t: number; type: 'outcome'; sequenceId: string; overlayIds: OverlayId[] }
  | { t: number; type: 'outro' };

export interface RevealScript {
  totalMs: number;
  beats: Beat[];
}

export interface BuildScriptOptions {
  pace: RevealPace;
  /** Ohne Eid-Modus tragen die Karten keine Siegel. */
  oathsEnabled?: boolean;
}

/**
 * Baut das komplette Drehbuch. Die Reihenfolge kommt aus `result.revealOrder` —
 * sie steht bereits fest, weil sie Teil des Ergebnisses ist.
 */
export function buildRevealScript(result: RoundResult, options: BuildScriptOptions): RevealScript {
  const order = result.revealOrder;
  const count = order.length;
  if (count === 0) throw new RangeError('buildRevealScript ohne Karten.');

  const hasAlarm = result.thieves.length > 0;
  const holds = cardHolds(count, options.pace, hasAlarm);

  const beats: Beat[] = [{ t: 0, type: 'intro' }];
  let t = INTRO_MS;
  let alarmPlaced = false;

  for (let i = 0; i < count; i++) {
    const playerId = order[i]!;
    const choice = result.choices[playerId];
    if (choice === undefined) {
      throw new Error(`revealOrder enthaelt ${playerId}, aber es gibt keine Wahl dazu.`);
    }
    const isLast = i === count - 1;
    const wearsSeal = (options.oathsEnabled ?? false) && result.oaths.includes(playerId);

    beats.push({
      t,
      type: 'card',
      playerId,
      choice,
      holdMs: holds[i]!,
      stalls: stallsFor(isLast),
      isLast,
      ...(wearsSeal ? { overlay: 'oathSeal' as const } : {}),
    });
    t += holds[i]!;

    // Der Alarm geht los, sobald die erste STEHLEN-Karte offen liegt (GDD §4.3).
    if (!alarmPlaced && choice === 'steal') {
      beats.push({ t, type: 'alarm' });
      t += ALARM_MS;
      alarmPlaced = true;
    }
  }

  beats.push({
    t,
    type: 'outcome',
    sequenceId: result.outcomeSequenceId,
    overlayIds: [...result.overlayIds],
  });
  t += OUTCOME_BUDGET_MS;

  beats.push({ t, type: 'outro' });
  t += OUTRO_MS;

  return { totalMs: t, beats };
}

/**
 * Verweildauer je Karte: Tempo-Kurve, letzte Karte 160 %, danach Raffung der
 * **fruehen** Karten, falls die Show sonst ueber 40 s liefe (GDD §4.3).
 * Die letzte Karte wird nie gerafft — sie ist der Grund fuer die ganze Show.
 */
export function cardHolds(count: number, pace: RevealPace, hasAlarm: boolean): number[] {
  const base = PACE_HOLD_MS[pace];
  const holds = Array.from({ length: count }, (_, i) => Math.round(base * tempoFactor(i, count)));

  const fixed = INTRO_MS + (hasAlarm ? ALARM_MS : 0) + OUTCOME_BUDGET_MS + OUTRO_MS;
  const budget = MAX_SHOW_MS - fixed;
  const total = holds.reduce((sum, ms) => sum + ms, 0);
  if (total <= budget || count < 2) return holds;

  const last = holds[count - 1]!;
  const earlySum = total - last;
  const earlyBudget = Math.max(0, budget - last);
  if (earlySum <= 0) return holds;

  const scale = earlyBudget / earlySum;
  for (let i = 0; i < count - 1; i++) {
    holds[i] = Math.max(MIN_CARD_HOLD_MS, Math.round(holds[i]! * scale));
  }
  return holds;
}

/* ------------------------------------------------------------------ */
/* Tap-to-Skip (GDD §4.3)                                              */
/* ------------------------------------------------------------------ */

/**
 * Darf der aktuelle Beat weggetippt werden?
 * Nein bei der ersten Karte, nein bei der letzten, nein waehrend der Auszahlung.
 */
export function canSkip(script: RevealScript, beatIndex: number): boolean {
  const beat = script.beats[beatIndex];
  if (!beat || beat.type !== 'card') return false;
  if (beat.isLast) return false;
  return cardIndexOf(script, beatIndex) >= SKIP_FROM_CARD_INDEX;
}

/** Der wievielte Karten-Beat ist das? `-1`, wenn es keiner ist. */
export function cardIndexOf(script: RevealScript, beatIndex: number): number {
  let cards = -1;
  for (let i = 0; i <= beatIndex && i < script.beats.length; i++) {
    if (script.beats[i]!.type === 'card') cards += 1;
  }
  return script.beats[beatIndex]?.type === 'card' ? cards : -1;
}

/** Startzeit des naechsten Beats — Ziel eines Tap-to-Skip. */
export function nextBeatTime(script: RevealScript, beatIndex: number): number {
  return script.beats[beatIndex + 1]?.t ?? script.totalMs;
}
