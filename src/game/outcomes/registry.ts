/**
 * Registrierung aller Inszenierungen (Architektur §7, Roadmap M4).
 *
 * Eine eigene Datei, damit der `RevealDirector` nichts von einzelnen Sequenzen weiss und
 * die Liste an genau einer Stelle waechst. Die elf Sequenzen aus GDD §4.4 stehen hier
 * vollstaendig — zwei fuer "Alle teilen", drei fuer den Alleingang, drei fuer mehrere
 * Diebe, zwei fuer die Schlaegerei und eine fuer den Jackpot.
 *
 * `registerAll()` ist absichtlich mehrfach aufrufbar: Der Reveal-Screen ruft es bei jedem
 * Betreten, und die Registry meldet ein doppeltes `register` sonst als Fehler.
 */

import { basicOutcome } from './basic';
import { groupHug } from './share/GroupHug';
import { toast } from './share/Toast';
import { getaway } from './soloSteal/Getaway';
import { magician } from './soloSteal/Magician';
import { moonwalk } from './soloSteal/Moonwalk';
import { anvil } from './multiSteal/Anvil';
import { standoff } from './multiSteal/Standoff';
import { tugOfWar } from './multiSteal/TugOfWar';
import { allStealAlarm } from './allSteal/Alarm';
import { brawl } from './allSteal/Brawl';
import { jackpotBurst } from './jackpot/Burst';
import { moleReveal } from './overlays/MoleReveal';
import { perjurySealBreak } from './overlays/PerjurySealBreak';
import { outcomeById, registerOutcome, registerOverlay } from './OutcomeSequence';

/** Die elf Inszenierungen aus GDD §4.4, in der Reihenfolge der Roadmap M4.2. */
export const ALL_OUTCOMES = [
  groupHug,
  toast,
  getaway,
  moonwalk,
  magician,
  tugOfWar,
  anvil,
  standoff,
  brawl,
  allStealAlarm,
  jackpotBurst,
] as const;

export const ALL_OVERLAYS = [perjurySealBreak, moleReveal] as const;

let done = false;

export function registerAll(): void {
  if (done) return;
  done = true;

  for (const sequence of ALL_OUTCOMES) registerOutcome(sequence);

  /*
   * `basic_outcome` bleibt als Rueckfall registriert, wird aber nicht mehr gewaehlt:
   * Fuer jeden der fuenf Outcome-Typen gibt es jetzt mindestens eine echte Sequenz.
   * Es greift nur noch, wenn eine ID im Skript steht, die niemand kennt — etwa nach
   * einem Reload mit einer alten gespeicherten Runde.
   */
  if (!outcomeById(basicOutcome.id)) registerOutcome(basicOutcome);

  for (const overlay of ALL_OVERLAYS) registerOverlay(overlay);
}

/** Nur fuer Tests. */
export function resetRegistration(): void {
  done = false;
}
