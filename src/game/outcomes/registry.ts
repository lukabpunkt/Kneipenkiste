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
import { bankPhoto } from './share/BankPhoto';
import { groupHug } from './share/GroupHug';
import { slowClap } from './share/SlowClap';
import { toast } from './share/Toast';
import { getaway } from './soloSteal/Getaway';
import { helicopter } from './soloSteal/Helicopter';
import { trapdoor } from './soloSteal/Trapdoor';
import { magician } from './soloSteal/Magician';
import { moonwalk } from './soloSteal/Moonwalk';
import { anvil } from './multiSteal/Anvil';
import { banana } from './multiSteal/Banana';
import { handcuffs } from './multiSteal/Handcuffs';
import { standoff } from './multiSteal/Standoff';
import { tugOfWar } from './multiSteal/TugOfWar';
import { allStealAlarm } from './allSteal/Alarm';
import { brawl } from './allSteal/Brawl';
import { dominoes } from './allSteal/Dominoes';
import { pieFight } from './allSteal/PieFight';
import { jackpotBurst } from './jackpot/Burst';
import { jackpotDive } from './jackpot/Dive';
import { moleReveal } from './overlays/MoleReveal';
import { perjurySealBreak } from './overlays/PerjurySealBreak';
import { outcomeById, registerOutcome, registerOverlay } from './OutcomeSequence';

/**
 * Alle Inszenierungen, in der Reihenfolge der Roadmap M4.2 — die elf aus GDD §4.4, dahinter
 * die vier aus dem Backlog nach 1.0.
 *
 * Die Nachzuegler stehen bewusst hinten und nicht bei ihren Geschwistern: So sieht man
 * beim Lesen, was zur ersten Fassung gehoerte und was danach kam. Fuer die Auswahl macht
 * die Reihenfolge keinen Unterschied — die zieht gewichtet (alle Gewichte 1, bis der
 * Playtest sagt, welche traegt).
 */
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
  // Backlog nach 1.0:
  slowClap,
  helicopter,
  banana,
  pieFight,
  bankPhoto,
  trapdoor,
  handcuffs,
  dominoes,
  jackpotDive,
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
