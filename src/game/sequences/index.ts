/**
 * Alle Sequenzen an einem Ort anmelden.
 *
 * Ein einziger Aufruf (`registerAllSequences()`) statt Import-Nebenwirkungen in jeder
 * Datei: Nebenwirkungen beim Import ueberleben kein Tree-Shaking zuverlaessig und machen
 * die Reihenfolge in Tests unvorhersehbar. Hier ist sichtbar, was es gibt — und die
 * Tests koennen die Registry gezielt leeren und neu fuellen.
 */

import { dudSequence } from './dud/Pfff';
import { EMPTY_SEQUENCES } from './empty';
import { fanfareSequence } from './treasure/Fanfare';
import { greedSequence } from './treasure/Greed';
import { tooHeavySequence } from './treasure/TooHeavy';
import { allSequences, registerSequence, resetRegistry, type DigSequence } from './Sequence';

/** Alles, was es gibt. Die acht Hit-Sequenzen kommen in M4 dazu. */
const ALL: readonly DigSequence[] = [
  ...EMPTY_SEQUENCES,
  dudSequence,
  fanfareSequence,
  tooHeavySequence,
  greedSequence,
];

let registered = false;

/** Idempotent: Der Dig-Screen und die Dev-Vorschau rufen beide auf. */
export function registerAllSequences(): void {
  if (registered) return;
  for (const sequence of ALL) registerSequence(sequence);
  registered = true;
}

/** Nur fuer Tests: Registry leeren und wieder frisch fuellen duerfen. */
export function resetAllSequences(): void {
  resetRegistry();
  registered = false;
}

export { allSequences };
export * from './Sequence';
