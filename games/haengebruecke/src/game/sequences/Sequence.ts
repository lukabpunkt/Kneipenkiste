/**
 * Sequenzen: Interface, Registry, Auswahl (Architektur §7).
 *
 * Eine Sequenz ist eine Funktion von Kontext zu GSAP-Timeline. Sie entscheidet nichts —
 * wer fällt, steht seit `resolveRound()` fest, und **welche** Sequenz läuft, hat der
 * Choreographer schon in M0 gewählt (`RoundResult.sequenceIds`). Hier wird nur gespielt.
 *
 * Die Registry ist gegen `config/sequences.ts` gebunden: Jede Katalog-ID braucht eine
 * Implementierung, und jede Implementierung braucht einen Katalog-Eintrag. Ein Test
 * prüft beides — sonst wählt der Choreographer irgendwann eine Sequenz, die es nicht
 * gibt, und die Show bleibt stehen.
 */

import type { PlankId, PlayerId, ResultView } from './context';
import type { SequenceKind } from '@/config/sequences';
import { ALL_SEQUENCE_IDS } from '@/config/sequences';

export type { SequenceContext, SequenceTiming } from './context';
import type { SequenceContext } from './context';

export interface Sequence {
  id: string;
  kind: SequenceKind;
  /**
   * Baut die Timeline.
   *
   * Sie darf **nicht** von selbst laufen: Der StepDirector hängt sie in seine eigene
   * Timeline ein, damit Slow-Mo und Hit-Stop auch für sie gelten.
   *
   * `gsap.core.Timeline` ohne Import: GSAP deklariert `gsap` als globalen Namensraum,
   * und ein Wert-Import nur für einen Typ waere hier unbenutzt.
   */
  build(ctx: SequenceContext): gsap.core.Timeline;
}

/** Wen eine Sequenz betrifft — nicht jede braucht alles. */
export interface SequenceTarget {
  plank?: PlankId;
  players?: PlayerId[];
  reveal?: ResultView;
}

const registry = new Map<string, Sequence>();

export function registerSequence(sequence: Sequence): void {
  if (registry.has(sequence.id)) {
    throw new Error(`Sequenz "${sequence.id}" ist doppelt registriert.`);
  }
  registry.set(sequence.id, sequence);
}

export function getSequence(id: string): Sequence | undefined {
  return registry.get(id);
}

export function registeredIds(): string[] {
  return [...registry.keys()].sort();
}

export function sequencesOfKind(kind: SequenceKind): Sequence[] {
  return [...registry.values()].filter((sequence) => sequence.kind === kind);
}

/**
 * Was im Katalog steht, aber (noch) niemand spielt.
 *
 * In M3 sind das die sechs Fall-Sequenzen — sie kommen in M4. Bis dahin springt
 * `basic_fall` ein, und diese Liste sagt, wofür.
 */
export function missingImplementations(): string[] {
  return ALL_SEQUENCE_IDS.filter((id) => !registry.has(id));
}

/** Nur für Tests: leert die Registry zwischen zwei Läufen. */
export function clearRegistry(): void {
  registry.clear();
}
