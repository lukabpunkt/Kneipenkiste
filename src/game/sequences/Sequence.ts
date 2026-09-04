/**
 * Inszenierungen: Interfaces und Registry (Architektur §6).
 *
 * Eine `DigSequence` baut eine GSAP-Timeline fuer **ein** Ergebnis. Sie entscheidet
 * nichts — was passiert ist, steht im `DigResult`; hier steht nur, wie es aussieht.
 *
 * ## Warum eine Registry und nicht ein `switch`
 *
 * Bis Release sollen mindestens acht Hit-Sequenzen existieren (GDD §9.5). Damit die
 * Runde nicht vorhersehbar wird, waehlt die Registry **gewichtet** und wiederholt sich
 * nicht (`NO_REPEAT_WINDOW`). Zwei Filter halten Sequenzen zurueck, die nicht passen:
 *
 * - `minStack`: `hit_chain_dance` braucht zwei gestapelte Minen.
 * - `excludeInModes`: `hit_dud_then_boom` faellt im Doppelagent-Modus aus — eine Mine,
 *   die erst "klick" macht und dann doch knallt, waere von einem echten Blindgaenger
 *   nicht zu unterscheiden und wuerde die Modusregel kaputt machen.
 */

import gsap from 'gsap';
import { NO_REPEAT_WINDOW } from '@/config/choreo';
import type { Hint, ModeId, Modes } from '@/config/rules';
import type { ColorId, FaceId } from '@/config/theme';
import type { SeededRng } from '@/core/rng';
import type { DigResult } from '@/core/types';
import type { AudioCue } from '@/audio/AudioManager';

/** Was eine Sequenz inszeniert. */
export type SequenceKind = 'empty' | 'hit' | 'dud' | 'treasure' | 'greed';

/**
 * Was GSAP an einem Anzeigeobjekt bewegt — mehr braucht eine Sequenz nicht.
 *
 * Bewusst kein `Container` aus PixiJS: Eine Sequenz soll sich ohne WebGL, ohne Atlas und
 * ohne Renderer testen lassen. Ein PIXI-`Container` erfuellt diese Form von selbst, ein
 * Objekt aus vier Zahlen aber auch — und `sequences.test.ts` misst damit jede
 * Sequenz in Millisekunden statt in Screenshots.
 */
export interface Animatable {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  scale: { x: number; y: number };
}

/**
 * Was eine Sequenz an der Platte anfassen darf — deutlich weniger, als `Tile` kann.
 *
 * Es fehlen genau die Methoden, die den Zustand setzen (`crater()`, `openEmpty()`, …).
 * Eine Sequenz **inszeniert**, sie deckt nichts auf: Was unter der Platte lag, hat
 * `core/board.ts` entschieden und `revealCell` bereits hingestellt.
 */
export interface SequenceTile {
  /** Kantenlaenge in Welteinheiten — alle Wege werden daran gemessen, nicht in Pixeln. */
  readonly size: number;
  readonly view: Animatable;
  /** Inhalt des Lochs: Tier, Rauchwoelkchen, Kiste. */
  readonly contentView: Animatable;
  /** Die Legerfarben-Ringe. */
  readonly marksView: Animatable;
  /** Der Platz des Temperatur-Icons. */
  readonly hintView: Animatable;
  /** Den Deckel fuer die Kippbewegung noch einmal zeigen. */
  liftLid(): Animatable;
  /** Kippbewegung fertig: Deckel weg. */
  dropLid(): void;
}

/** Was eine Sequenz am Digger anfassen darf. */
export interface SequenceDigger {
  readonly view: Animatable;
  setFace(face: FaceId): void;
  reactToHint(hint: Hint): void;
  soot(): void;
}

/** Was eine Sequenz mit der Kamera darf: wackeln. Zoomen gehoert dem Director. */
export interface SequenceCamera {
  shake(amplitude?: number, durationMs?: number): void;
}

/**
 * Was eine Sequenz zum Bauen bekommt.
 *
 * Bewusst **kein** Zugriff auf FSM oder Board-Daten: Eine Sequenz sieht das Ergebnis und
 * die Buehne, sonst nichts. Damit kann sie den Spielzustand gar nicht verschieben.
 */
export interface SequenceContext {
  result: DigResult;
  tile: SequenceTile;
  /** Der Digger, der gerade graebt. */
  digger: SequenceDigger;
  /** Alle anderen — sie sitzen auf der Bank und schauen zu. */
  others: readonly SequenceDigger[];
  camera: SequenceCamera;
  /** Farben der Leger, in derselben Reihenfolge wie `result.foreignMines`. */
  blamedColors: readonly ColorId[];
  /** Reproduzierbar: dieselbe Runde sieht bei gleichem Seed gleich aus. */
  rng: SeededRng;
  /** Spielt einen Cue relativ zum Sequenzstart (Sekunden). */
  audio: (cue: AudioCue, when?: number, detune?: number) => void;
  lowEffects: boolean;
}

export interface DigSequence {
  id: string;
  kind: SequenceKind;
  /** Relatives Gewicht in der Auswahl. Hoeher = oefter. */
  weight: number;
  /** Erst ab so vielen gestapelten fremden Minen waehlbar. */
  minStack?: number;
  /** In diesen Modi nicht waehlbar. */
  excludeInModes?: readonly ModeId[];
  /**
   * Baut die Timeline. Sie startet bei 0 und darf `ANIM.sequenceMaxMs` nicht
   * ueberschreiten (Treasure: `ANIM.treasureMaxMs`) — `sequences.test.ts` misst nach.
   */
  build(context: SequenceContext): gsap.core.Timeline;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const registry = new Map<SequenceKind, DigSequence[]>();
/** Was zuletzt gespielt wurde, je Art — die No-Repeat-Fenster. */
const recent = new Map<SequenceKind, string[]>();

export function registerSequence(sequence: DigSequence): void {
  const list = registry.get(sequence.kind) ?? [];
  if (list.some((entry) => entry.id === sequence.id)) {
    throw new Error(`Sequenz "${sequence.id}" ist doppelt registriert.`);
  }
  list.push(sequence);
  registry.set(sequence.kind, list);
}

export function sequencesOf(kind: SequenceKind): readonly DigSequence[] {
  return registry.get(kind) ?? [];
}

export function allSequences(): readonly DigSequence[] {
  return [...registry.values()].flat();
}

export function findSequence(id: string): DigSequence | undefined {
  return allSequences().find((sequence) => sequence.id === id);
}

/** Nur fuer Tests: leert die Registry und die No-Repeat-Fenster. */
export function resetRegistry(): void {
  registry.clear();
  recent.clear();
}

/** Nur die No-Repeat-Fenster — zum Rundenstart. */
export function resetHistory(): void {
  recent.clear();
}

/* ------------------------------------------------------------------ */
/* Auswahl                                                             */
/* ------------------------------------------------------------------ */

export interface PickOptions {
  kind: SequenceKind;
  modes: Modes;
  /** Wieviele fremde Minen unter der Platte lagen. */
  stack: number;
  rng: SeededRng;
}

/**
 * Waehlt eine Sequenz: gefiltert, gewichtet, ohne Wiederholung.
 *
 * Die No-Repeat-Liste haelt die letzten `NO_REPEAT_WINDOW` Ausgaben je Art zurueck.
 * Bleibt danach nichts uebrig — etwa weil es nur zwei passende Sequenzen gibt —, wird
 * das Fenster fuer diese Wahl ignoriert: Lieber eine Wiederholung als gar keine
 * Inszenierung.
 */
export function pickSequence(options: PickOptions): DigSequence | undefined {
  const { kind, modes, stack, rng } = options;

  const eligible = sequencesOf(kind).filter((sequence) => {
    if ((sequence.minStack ?? 0) > stack) return false;
    return !sequence.excludeInModes?.some((mode) => modes[mode]);
  });
  if (eligible.length === 0) return undefined;

  const history = recent.get(kind) ?? [];
  const fresh = eligible.filter((sequence) => !history.includes(sequence.id));
  const pool = fresh.length > 0 ? fresh : eligible;

  const chosen = pool.length === 1 ? pool[0]! : rng.weighted(pool, (sequence) => sequence.weight);

  const nextHistory = [chosen.id, ...history].slice(0, NO_REPEAT_WINDOW);
  recent.set(kind, nextHistory);
  return chosen;
}

/** Die Art, die zu einem Ergebnis gehoert. */
export function kindFor(result: DigResult): SequenceKind {
  switch (result.kind) {
    case 'crater':
      return 'hit';
    case 'greed':
      return 'greed';
    case 'treasure':
      return 'treasure';
    case 'dud':
      return 'dud';
    /*
     * `empty` deckt auch den stummen eigenen Trittstein ab. Es gibt hier bewusst keinen
     * eigenen Zweig — sonst haette der Trittstein eigene Sequenzen, eigene Sounds und
     * waere damit erkennbar (ADR-2).
     */
    case 'empty':
      return 'empty';
  }
}

/** Eine leere Timeline — Rueckfallebene, wenn keine Sequenz passt. */
export function emptyTimeline(): gsap.core.Timeline {
  return gsap.timeline();
}

/* ------------------------------------------------------------------ */
/* Der Deckel                                                          */
/* ------------------------------------------------------------------ */

/**
 * Holt den Deckel als Tween-Ziel **und** macht ihn zum Sequenzstart wieder sichtbar.
 *
 * Zwei Zeitpunkte, und genau darin lag der Fehler: Eine Sequenz wird gebaut, bevor die
 * Anticipation laeuft — zu diesem Zeitpunkt liegt die Platte noch zu. Abgespielt wird sie
 * erst nach dem Aufdecken, und `revealCell` hat den Deckel da bereits weggeblendet. Wer
 * nur beim Bauen `liftLid()` ruft, animiert im Abspielen ein unsichtbares Sprite: Die
 * Platte verschwindet einfach, statt wegzukippen.
 *
 * Deshalb beides — die Referenz zur Bauzeit, die Sichtbarkeit als Callback bei 0. Er
 * steht vor allen Tweens derselben Position und laeuft deshalb zuerst.
 */
export function liftLid(timeline: gsap.core.Timeline, tile: SequenceTile): Animatable {
  const lid = tile.liftLid();
  timeline.add(() => tile.liftLid(), 0);
  return lid;
}

/* ------------------------------------------------------------------ */
/* Ton                                                                 */
/* ------------------------------------------------------------------ */

/** Ein Cue mit seinem Versatz zum Sequenzstart (Sekunden). */
export interface CueAt {
  cue: AudioCue;
  at: number;
  detune?: number;
}

/**
 * Plant **alle** Cues einer Sequenz in einem einzigen Callback zum Sequenzstart.
 *
 * Nicht jeder Ton in seinem eigenen Frame-Callback: Ein Callback in der Timeline feuert
 * fruehestens im naechsten Frame und bei 30 fps damit bis zu 33 ms zu spaet — bei fuenf
 * Cues fuenfmal unabhaengig voneinander. Hier faellt dieser Fehler genau einmal an, und
 * alles Weitere liegt auf der Sample-genauen Uhr des AudioContext (ADR-13). Audit A3
 * verlangt ± 50 ms.
 */
export function scheduleCues(
  timeline: gsap.core.Timeline,
  audio: SequenceContext['audio'],
  cues: readonly CueAt[]
): void {
  if (cues.length === 0) return;
  timeline.add(() => {
    for (const entry of cues) audio(entry.cue, entry.at, entry.detune ?? 0);
  }, 0);
}
