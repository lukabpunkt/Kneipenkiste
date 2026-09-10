/**
 * Was eine Sequenz von der Bühne zu sehen bekommt (Architektur §7).
 *
 * Bewusst eine eigene Datei: `Sequence.ts` beschreibt das Interface, und die konkreten
 * Sequenzen importieren nur den Kontext. So zieht sich niemand die ganze Registry in
 * seine Datei, nur um die Typen zu haben.
 *
 * Was hier **nicht** drin steht: die `Round`. Eine Sequenz sieht ausschliesslich den
 * Reveal — also das, was ohnehin auf dem Tisch liegt (Architektur §4).
 */

import type { SeededRng } from '@/core/rng';
import type { ResultView } from '@/core/publicView';
import type { PlankId, PlayerId } from '@/core/types';
import type { Bridge } from '../Bridge';
import type { Camera } from '../Camera';
import type { Canyon } from '../Canyon';
import type { Carpenter } from '../Carpenter';
import type { FxKit } from '../fx';
import type { Hiker } from '../Hiker';
import type { Vulture } from '../Vulture';

export type { PlankId, PlayerId, ResultView };

export interface SequenceContext {
  /** Der Reveal — alles, was die Sequenz über die Runde wissen darf. */
  reveal: ResultView;
  /** Die Gruppe, um die es geht (Fall- und Sicher-Sequenzen). */
  plank?: PlankId;
  /** Die beteiligten Hikers, in der Reihenfolge, in der sie auf dem Balken stehen. */
  players: PlayerId[];
  hikers: Map<PlayerId, Hiker>;
  bridge: Bridge;
  canyon: Canyon;
  camera: Camera;
  vulture: Vulture;
  carpenter: Carpenter;
  fx: FxKit;
  /** Übersetzte Texte — Sprechblasen und Schilder kommen aus i18n (CLAUDE.md). */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Ein Sound aus dem Sprite; stumm, wenn der Ton aus ist. */
  play: (key: string) => void;
  /** Seeded — dieselbe Runde ergibt dieselbe Show (Architektur §6). */
  rng: SeededRng;
  /**
   * Die Zeitachse, in die sich die Sequenz einpassen muss — relativ zu ihrem eigenen Start.
   *
   * Eine Fall-Sequenz beginnt beim **Blickkontakt**, nicht beim Bruch: Sie trägt beides,
   * damit die Signatur des Spiels (ADR-3) in der Sequenz steckt und nicht daneben. Wo
   * genau der Bruch liegt, sagt der Choreographer — `snapMs` ist der Abstand dorthin.
   */
  timing: SequenceTiming;
}

export interface SequenceTiming {
  /** Wie lange der Blickkontakt dauert, bevor der Balken bricht. */
  eyeContactMs: number;
  /** Ab wann der Balken bricht, gemessen vom Start der Sequenz. */
  snapMs: number;
}
