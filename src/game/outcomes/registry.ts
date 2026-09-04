/**
 * Registrierung aller Inszenierungen (Architektur §7).
 *
 * Eine eigene Datei, damit der `RevealDirector` nichts von einzelnen Sequenzen weiss und
 * die Liste an genau einer Stelle waechst. In M4 kommen hier elf Zeilen dazu.
 *
 * `registerAll()` ist absichtlich mehrfach aufrufbar: Der Reveal-Screen ruft es bei jedem
 * Betreten, und die Registry meldet ein doppeltes `register` sonst als Fehler.
 */

import { basicOutcome } from './basic';
import { moleReveal } from './overlays/MoleReveal';
import { perjurySealBreak } from './overlays/PerjurySealBreak';
import { outcomeById, registerOutcome, registerOverlay } from './OutcomeSequence';

let done = false;

export function registerAll(): void {
  if (done) return;
  done = true;

  /*
   * `basic_outcome` ist in M3 die einzige Inszenierung und deckt jeden Outcome-Typ ab —
   * der Director faellt ohnehin darauf zurueck, wenn die Registry fuer einen Typ nichts
   * hergibt. In M4 kommen die elf echten Sequenzen dazu; diese hier bleibt als
   * Rueckfall stehen und wird dann nicht mehr gewaehlt.
   */
  if (!outcomeById(basicOutcome.id)) registerOutcome(basicOutcome);

  registerOverlay(perjurySealBreak);
  registerOverlay(moleReveal);
}

/** Nur fuer Tests. */
export function resetRegistration(): void {
  done = false;
}
