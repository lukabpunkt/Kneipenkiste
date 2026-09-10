/**
 * Der Choreographer (Architektur §6).
 *
 * Er entscheidet **nichts** ueber das Spiel — das Ergebnis steht schon fest, wenn er
 * anfaengt. Er legt nur die Zeitachse: wann alle ankommen (gleichzeitig), welcher Balken
 * wie laut knarrt (auch die sicheren), wann sich zwei ansehen (immer vor dem Bruch) und
 * in welcher Reihenfolge es kracht.
 *
 * Reine Funktion, kein GSAP, kein PIXI. Der `StepDirector` (M2) spielt das Skript ab.
 */

import {
  BREAK_STAGGER_MS,
  CREAK_AMPLITUDE,
  EYE_CONTACT,
  FALL_SEQUENCE_MS,
  MAX_STEP_MS,
  MIN_BREAK_STAGGER_MS,
  PACE_TIMINGS,
  ROTTEN_REVEAL_AT,
  SEQUENCE_NO_REPEAT,
} from '@/config/choreo';
import type { Pace } from '@/config/rules';
import { OVERLAY_SEQUENCES, SAFE_SEQUENCES, fallCandidates, type SequenceMeta } from '@/config/sequences';
import { createSeededRng, type SeededRng } from './rng';
import { isRopeChoice } from './choice';
import type { PlankGroup, PlankId, PlayerId, RoundResult } from './types';

/* ------------------------------------------------------------------ */
/* Sequenz-Auswahl mit Gedaechtnis                                     */
/* ------------------------------------------------------------------ */

export interface SequencePicker {
  /** Fall-Sequenz fuer eine Gruppe dieser Groesse. `fall_domino` erst ab drei. */
  pickFall(groupSize: number): string;
  pickSafe(): string;
}

/**
 * Gewichtete Auswahl mit No-Repeat-Fenster.
 *
 * Das Fenster ist bewusst kleiner als die Kandidatenliste (`length - 1`): Bei drei
 * Sicher-Sequenzen wuerde ein starres Fenster von 3 alle drei sperren und die Auswahl
 * haette nichts mehr zu waehlen.
 */
export function createSequencePicker(seed: number): SequencePicker {
  const rng = createSeededRng(seed);
  const recent = new Map<string, string[]>();

  const pick = (bucket: string, candidates: readonly SequenceMeta[]): string => {
    const history = recent.get(bucket) ?? [];
    const window = Math.max(0, Math.min(SEQUENCE_NO_REPEAT, candidates.length - 1));
    const blocked = new Set(history.slice(-window));

    const open = candidates.filter((c) => !blocked.has(c.id));
    const pool = open.length > 0 ? open : candidates;
    const chosen = rng.weighted(pool, (c) => c.weight).id;

    recent.set(bucket, [...history, chosen].slice(-SEQUENCE_NO_REPEAT));
    return chosen;
  };

  return {
    pickFall: (groupSize) => pick(`fall:${groupSize >= 3 ? 'stack' : 'pair'}`, fallCandidates(groupSize)),
    pickSafe: () => pick('safe', SAFE_SEQUENCES),
  };
}

/* ------------------------------------------------------------------ */
/* Das Skript                                                          */
/* ------------------------------------------------------------------ */

export interface RunEntry {
  hikerId: PlayerId;
  plank: PlankId | 'rope';
  /** Fuer **alle** identisch — das ist die Signatur des Spiels (CLAUDE.md). */
  arriveAt: number;
}

export interface CreakEntry {
  plank: PlankId;
  amplitude: number;
  /** Nur beim morschen Balken: Er faengt leise an und faellt dann aus der Tarnung. */
  amplitudeEnd?: number;
  revealAt?: number;
}

export interface EyeContactEntry {
  plank: PlankId;
  hikerIds: PlayerId[];
  at: number;
  durationMs: number;
}

export interface BreakEntry {
  plank: PlankId;
  at: number;
  sequenceId: string;
}

export interface SafeEntry {
  hikerId: PlayerId;
  sequenceId: string;
  at: number;
}

export interface OverlayEntry {
  id: string;
  target: PlayerId;
}

export interface StepScript {
  totalMs: number;
  intro: { deathZone: boolean; endsAt: number };
  /** Wann alle gleichzeitig auftreten, und wie lange das Bild danach steht. */
  step: { at: number; hitStopMs: number };
  run: RunEntry[];
  creak: CreakEntry[];
  eyeContact: EyeContactEntry[];
  breaks: BreakEntry[];
  safe: SafeEntry[];
  overlays: OverlayEntry[];
  aftermath: { kind: 'allSafeRot' | 'repair' | 'none'; at: number };
  removedPlank?: PlankId;
  /** Ab hier darf getippt werden — nie vor dem letzten Bruch (GDD §4.2). */
  skippableFrom: number;
  /** Slow-Mo laeuft vom ersten Blickkontakt bis zum ersten Bruch. */
  slowMo?: { from: number; to: number; factor: number };
}

/* ------------------------------------------------------------------ */
/* Zeitachse                                                           */
/* ------------------------------------------------------------------ */

export interface Phases {
  intro: number;
  run: number;
  hitStop: number;
  creak: number;
  aftermath: number;
  stagger: number;
}

export function totalOf(p: Phases, breakCount: number): number {
  const creakEnd = p.intro + p.run + p.hitStop + p.creak;
  if (breakCount === 0) return creakEnd + p.aftermath;
  const lastBreak = creakEnd + p.stagger * (breakCount - 1);
  return lastBreak + FALL_SEQUENCE_MS + p.aftermath;
}

/**
 * Der 20-Sekunden-Deckel (Architektur §6).
 *
 * Zuerst ruecken die Brueche zusammen — vier Stuerze hintereinander sind ohnehin ein
 * Massensturz und duerfen sich ueberschneiden. Reicht das nicht, werden Intro, Anlauf,
 * Knarren und Nachspiel gleichmaessig gerafft. Der Blickkontakt bleibt unangetastet: Er
 * ist die Signatur, nicht der Puffer.
 *
 * Exportiert, weil sich die zweite Stufe mit acht Hikers nicht ausloesen laesst (mehr als
 * vier Brueche gibt es nicht) — sie ist die Absicherung fuer den Tag, an dem jemand die
 * Tempo-Tokens hochdreht. Genau dagegen testet `choreographer.test.ts` sie direkt.
 */
export function fitToCap(base: Phases, breakCount: number): Phases {
  if (totalOf(base, breakCount) <= MAX_STEP_MS) return base;

  const phases = { ...base };

  if (breakCount > 1) {
    const overshoot = totalOf(phases, breakCount) - MAX_STEP_MS;
    phases.stagger = Math.max(MIN_BREAK_STAGGER_MS, phases.stagger - overshoot / (breakCount - 1));
    if (totalOf(phases, breakCount) <= MAX_STEP_MS) return phases;
  }

  const fixed = phases.hitStop + phases.stagger * Math.max(0, breakCount - 1) + (breakCount > 0 ? FALL_SEQUENCE_MS : 0);
  const scalable = phases.intro + phases.run + phases.creak + phases.aftermath;
  const factor = Math.max(0.4, (MAX_STEP_MS - fixed) / scalable);

  phases.intro *= factor;
  phases.run *= factor;
  phases.creak *= factor;
  phases.aftermath *= factor;
  return phases;
}

/* ------------------------------------------------------------------ */
/* buildStepScript                                                     */
/* ------------------------------------------------------------------ */

/**
 * Baut aus einem feststehenden Ergebnis die Zeitachse der Show.
 *
 * Deterministisch: Gleiches `RoundResult` und gleicher Seed ergeben Frame fuer Frame
 * dasselbe Skript. Nur die Bruch-Reihenfolge wuerfelt — mit dem Runden-Seed, damit das
 * Dev-Panel sie reproduzieren kann.
 */
export function buildStepScript(result: RoundResult, pace: Pace): StepScript {
  const rng = createSeededRng(result.seed);
  const timings = PACE_TIMINGS[pace];

  const breakingGroups = orderBreaks(result.groups, rng);

  const phases = fitToCap(
    {
      intro: timings.intro + (result.deathZone ? timings.deathZoneIntroExtra : 0),
      run: timings.run,
      hitStop: timings.hitStop,
      creak: timings.creak,
      aftermath: timings.aftermath,
      stagger: BREAK_STAGGER_MS,
    },
    breakingGroups.length
  );

  const introEnd = Math.round(phases.intro);
  const arriveAt = Math.round(introEnd + phases.run);
  const stepEnd = Math.round(arriveAt + phases.hitStop);
  const creakEnd = Math.round(stepEnd + phases.creak);

  /* Alle laufen gleichzeitig los und kommen im selben Frame an — unterschiedlich weit, */
  /* also unterschiedlich schnell. Der StepDirector rechnet die Geschwindigkeit aus.    */
  const run: RunEntry[] = result.playerIds.map((hikerId) => {
    const choice = result.choices[hikerId];
    const plank: PlankId | 'rope' = choice && !isRopeChoice(choice) ? choice.plank : 'rope';
    return { hikerId, plank, arriveAt };
  });

  const creak: CreakEntry[] = result.groups.map((group) => {
    if (group.rotten) {
      return {
        plank: group.plank,
        amplitude: CREAK_AMPLITUDE.rottenStart,
        amplitudeEnd: CREAK_AMPLITUDE.rottenEnd,
        revealAt: Math.round(stepEnd + phases.creak * ROTTEN_REVEAL_AT),
      };
    }
    return {
      plank: group.plank,
      /* Der Fake: Auch der sichere Balken knarrt — nur leiser (ADR-3). */
      amplitude: group.collision ? CREAK_AMPLITUDE.collision : CREAK_AMPLITUDE.safe,
    };
  });

  const breaks: BreakEntry[] = breakingGroups.map((group, i) => ({
    plank: group.plank,
    at: Math.round(creakEnd + phases.stagger * i),
    sequenceId: group.collision
      ? (result.sequenceIds.fall[group.plank] ?? '')
      : OVERLAY_SEQUENCES.rottenCrack,
  }));

  /*
   * Blickkontakt: immer vor dem Bruch, immer nur bei Kollisionen. Er startet `leadMs`
   * vorher — passt das nicht mehr in die Knarr-Phase, rutscht er nach vorn an den
   * Hit-Stop, bleibt aber strikt vor dem Bruch. Weglassen ist keine Option (ADR-3).
   */
  const eyeContact: EyeContactEntry[] = breaks
    .filter((entry) => result.groups.some((g) => g.plank === entry.plank && g.collision))
    .map((entry) => {
      const group = result.groups.find((g) => g.plank === entry.plank)!;
      const at = Math.min(Math.max(stepEnd, entry.at - EYE_CONTACT.leadMs), entry.at - 1);
      return { plank: entry.plank, hikerIds: [...group.players], at, durationMs: EYE_CONTACT.durationMs };
    });

  const firstBreakAt = breaks[0]?.at ?? creakEnd;
  const lastBreakAt = breaks.length > 0 ? breaks[breaks.length - 1]!.at : creakEnd;

  /* Die Erleichterten atmen aus, sobald es das erste Mal kracht — nicht vorher. */
  const safe: SafeEntry[] = Object.entries(result.sequenceIds.safe).map(([hikerId, sequenceId]) => ({
    hikerId,
    sequenceId,
    at: firstBreakAt,
  }));

  const overlays = buildOverlays(result);

  const aftermathAt = breaks.length > 0 ? lastBreakAt + FALL_SEQUENCE_MS : creakEnd;
  const aftermathKind = result.outcome === 'allSafe' ? 'allSafeRot' : 'repair';

  const script: StepScript = {
    totalMs: Math.round(aftermathAt + phases.aftermath),
    intro: { deathZone: result.deathZone, endsAt: introEnd },
    step: { at: arriveAt, hitStopMs: Math.round(phases.hitStop) },
    run,
    creak,
    eyeContact,
    breaks,
    safe,
    overlays,
    aftermath: { kind: aftermathKind, at: aftermathAt },
    skippableFrom: lastBreakAt,
  };

  if (result.removedPlank !== undefined) script.removedPlank = result.removedPlank;

  const firstLook = eyeContact[0];
  if (firstLook) {
    script.slowMo = { from: firstLook.at, to: firstBreakAt, factor: EYE_CONTACT.slowMo };
  }

  return script;
}

/**
 * Welche Balken brechen — und in welcher Reihenfolge?
 *
 * Kollisionen und der morsche Balken. Die Reihenfolge wuerfelt der Runden-Seed, damit
 * nicht immer der linkeste Balken zuerst kracht und das Publikum die Pointe kennt.
 */
function orderBreaks(groups: readonly PlankGroup[], rng: SeededRng): PlankGroup[] {
  return rng.shuffle(groups.filter((g) => g.collision || g.rotten));
}

function buildOverlays(result: RoundResult): OverlayEntry[] {
  const overlays: OverlayEntry[] = [];

  for (const group of result.groups) {
    if (group.rotten) overlays.push({ id: OVERLAY_SEQUENCES.rottenCrack, target: group.players[0]! });
  }
  for (const playerId of result.deserters) {
    overlays.push({ id: OVERLAY_SEQUENCES.deserterStamp, target: playerId });
  }
  return overlays;
}
