/**
 * Ergebnis-Inszenierungen: Interface, Registry und Auswahl (Architektur §7).
 *
 * Eine `OutcomeSequence` bekommt die fertige Buehne und baut daraus eine GSAP-Timeline.
 * Sie entscheidet nichts — das Ergebnis steht fest, bevor sie anfaengt (CLAUDE.md).
 *
 * Drei Regeln gelten fuer **jede** Sequenz (Audit A4):
 *
 * 1. Sie dauert zwischen 2 und 8 Sekunden.
 * 2. Sie endet mit dem Trinker-Zaehler-Moment — sonst weiss niemand, wer trinkt.
 * 3. Nach `room.reset()` steht die Buehne wieder wie vorher.
 *
 * Die elf Inszenierungen aus GDD §4.4 kommen in M4. Hier stehen das Geruest und
 * `basic_outcome`, das nur den Zaehler zeigt.
 */

/*
 * Kein `gsap`-Import: Der Namespace `gsap.core` ist aus den GSAP-Typdeklarationen
 * ambient verfuegbar. Diese Datei beschreibt nur Interfaces und braucht den Wert nicht.
 */
import { NO_REPEAT_WINDOW } from '@/config/choreo';
import { selectOutcomeSequence, type OutcomeCandidate } from '@/core/choreographer';
import type { SeededRng } from '@/core/rng';
import type { Outcome, OverlayId, RoundResult } from '@/core/types';
import type { AudioCue } from '@/audio/AudioManager';
import type { Camera } from '../Camera';
import type { Crook } from '../Crook';
import type { DecisionCard } from '../DecisionCard';
import type { FxKit } from '../fx/FxKit';
import type { SipCounterPool } from '../fx/SipCounter';
import type { VaultRoom } from '../VaultRoom';

/** Was eine Sequenz zum Inszenieren bekommt. */
export interface OutcomeContext {
  result: RoundResult;
  room: VaultRoom;
  camera: Camera;
  /** Die Diebe in Reveal-Reihenfolge; der Maulwurf steht hinten. */
  thieves: Crook[];
  sharers: Crook[];
  /** Karte je Spieler — Overlays brauchen sie. */
  cards: Map<string, DecisionCard>;
  counters: SipCounterPool;
  /** Muenzregen, Konfetti, Sternchen, Rauch — die geteilten Bausteine (Roadmap M4.4). */
  fx: FxKit;
  rng: SeededRng;
  /**
   * Spielt einen Cue. `detune` in Halbtoenen — derselbe Klang sechsmal hintereinander
   * klingt nach Maschinengewehr, minimal verstimmt nach sechs verschiedenen Haenden.
   */
  play(cue: AudioCue, when?: number, detune?: number): void;
  /** Wo ein Spieler steht — fuer Zaehler und Requisiten. */
  positionOf(playerId: string): { x: number; y: number };
  /** Ungefaehre Kopfhoehe eines Spielers (Weltkoordinaten). */
  headOf(playerId: string): { x: number; y: number };
  /** Kassels Saetze fuer diesen Outcome (i18n-Array, zufaellig gewaehlt). */
  say(key: string, holdMs?: number): void;
}

export interface OutcomeSequence {
  id: string;
  outcome: Outcome;
  /** Gewicht > 0 fuer die zufaellige Auswahl. */
  weight: number;
  build(ctx: OutcomeContext): gsap.core.Timeline;
}

/** Ein Overlay legt sich ueber eine einzelne Karte (Meineid, Maulwurf). */
export interface OverlaySequence {
  id: OverlayId;
  buildOnCard(ctx: OutcomeContext, card: DecisionCard, crook: Crook): gsap.core.Timeline;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const sequences = new Map<string, OutcomeSequence>();
const overlays = new Map<OverlayId, OverlaySequence>();

export function registerOutcome(sequence: OutcomeSequence): void {
  if (sequences.has(sequence.id)) {
    throw new Error(`Outcome-Sequenz "${sequence.id}" ist doppelt registriert.`);
  }
  if (!(sequence.weight > 0)) {
    throw new RangeError(`Outcome-Sequenz "${sequence.id}" braucht ein Gewicht > 0.`);
  }
  sequences.set(sequence.id, sequence);
}

export function registerOverlay(overlay: OverlaySequence): void {
  overlays.set(overlay.id, overlay);
}

export function outcomeById(id: string): OutcomeSequence | undefined {
  return sequences.get(id);
}

export function overlayById(id: OverlayId): OverlaySequence | undefined {
  return overlays.get(id);
}

/** Alle Sequenzen eines Outcome-Typs — Dev-Preview und Tests fragen danach. */
export function sequencesFor(outcome: Outcome): OutcomeSequence[] {
  return [...sequences.values()].filter((sequence) => sequence.outcome === outcome);
}

export function allSequences(): OutcomeSequence[] {
  return [...sequences.values()];
}

/** Nur fuer Tests. */
export function clearRegistry(): void {
  sequences.clear();
  overlays.clear();
}

/* ------------------------------------------------------------------ */
/* Auswahl mit No-Repeat-Fenster                                       */
/* ------------------------------------------------------------------ */

/**
 * Was zuletzt lief, **je Outcome-Typ**. Ohne die Trennung wuerde eine Serie von
 * Alleingaengen die Auswahl fuer "Alle teilen" mitsperren, obwohl dort nichts lief.
 */
const recentByOutcome = new Map<Outcome, string[]>();

/**
 * Waehlt eine Sequenz fuer diesen Outcome — gewichtet, mit No-Repeat-Fenster 3.
 *
 * Gibt `undefined` zurueck, wenn fuer den Typ noch nichts registriert ist. Der Aufrufer
 * faellt dann auf `basic_outcome` zurueck: Lieber eine schlichte Ansage als eine leere
 * Buehne.
 */
export function pickOutcomeSequence(outcome: Outcome, rng: SeededRng): string | undefined {
  const candidates: OutcomeCandidate[] = sequencesFor(outcome).map((sequence) => ({
    id: sequence.id,
    weight: sequence.weight,
  }));
  if (candidates.length === 0) return undefined;

  const recent = recentByOutcome.get(outcome) ?? [];
  const picked = selectOutcomeSequence(candidates, recent, rng);

  recent.push(picked);
  if (recent.length > NO_REPEAT_WINDOW) recent.shift();
  recentByOutcome.set(outcome, recent);
  return picked;
}

/** Nur fuer Tests: vergisst, was zuletzt lief. */
export function clearRecent(): void {
  recentByOutcome.clear();
}
