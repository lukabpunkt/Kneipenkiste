/**
 * Die Wahl eines Spielers — Balken oder Seil.
 *
 * Eigene Datei, weil `types.ts` reine Typen enthaelt: Diese beiden Helfer sind
 * Laufzeit-Code und gehoeren deshalb in die Coverage.
 */

import type { Choice, PlankId } from './types';

export function isRopeChoice(choice: Choice): choice is { rope: true } {
  return 'rope' in choice;
}

/** Die Balkennummer — oder `null`, wenn sich jemand durchgehangelt hat. */
export function plankOf(choice: Choice): PlankId | null {
  return isRopeChoice(choice) ? null : choice.plank;
}
