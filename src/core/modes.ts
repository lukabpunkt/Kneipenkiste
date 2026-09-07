/**
 * Die fuenf Modi (GDD §3.6) — reine Regel-Helfer ohne Zustand.
 *
 * Jeder Modus haengt sich an genau einer Stelle in die Auszahlung: Fahne an Guthaben und
 * Trinkmenge, Morsch an eine Ein-Personen-Gruppe, Schwergewicht als Faktor, Seil als
 * Sonderwahl, Nebel gar nicht (er aendert nur den FSM-Pfad).
 */

import {
  DEFAULT_MODES,
  DEFAULT_WEIGHT,
  ROPE_USES_PER_SESSION,
  type ModeFlags,
  type Weight,
} from '@/config/rules';
import { isRopeChoice } from './choice';
import type { Choice, PlankGroup, PlankId, PlayerId, Round } from './types';

export type { ModeFlags };

export function noModes(): ModeFlags {
  return { ...DEFAULT_MODES };
}

/* ------------------------------------------------------------------ */
/* Schwergewicht                                                       */
/* ------------------------------------------------------------------ */

/** Ohne den Modus zaehlt jeder Hiker als 1 — dann faellt der Faktor rechnerisch weg. */
export function weightOf(round: Pick<Round, 'modes' | 'weights'>, playerId: PlayerId): Weight {
  if (!round.modes.weights) return DEFAULT_WEIGHT;
  return round.weights?.[playerId] ?? DEFAULT_WEIGHT;
}

/* ------------------------------------------------------------------ */
/* Fahne                                                               */
/* ------------------------------------------------------------------ */

/** Auf welchen Balken hat dieser Spieler oeffentlich seine Fahne gesetzt? */
export function flagOf(round: Pick<Round, 'modes' | 'flags'>, playerId: PlayerId): PlankId | undefined {
  if (!round.modes.flags) return undefined;
  return round.flags?.[playerId];
}

/**
 * Fahnenflucht: Fahne gesetzt, dann woanders hin.
 *
 * Das Seil zaehlt mit (ADR-7): Wer "Ich nehme die 3" sagt und sich dann unter der Bruecke
 * durchhangelt, hat sein Versprechen genauso gebrochen — nur dass ihn die Konsequenz
 * (kein Guthaben) ohnehin schon trifft.
 */
export function isDeserter(round: Pick<Round, 'modes' | 'flags'>, playerId: PlayerId, choice: Choice): boolean {
  const flag = flagOf(round, playerId);
  if (flag === undefined) return false;
  if (isRopeChoice(choice)) return true;
  return choice.plank !== flag;
}

export interface Theft {
  thief: PlayerId;
  victim: PlayerId;
}

/**
 * Balkendieb: Wer einen Balken betritt, auf dem ein anderer mit **seiner** Fahne steht,
 * und ihn damit zu Fall bringt, verteilt extra — obwohl er selbst mitfaellt.
 *
 * Stehen mehrere Besitzer auf dem Balken (zwei Fahnen auf derselben Nummer sind erlaubt
 * und ein sichtbarer Konflikt, Art Direction §4.3), gilt der erste als Opfer: Der Dieb
 * bekommt seinen Bonus einmal, nicht pro Besitzer.
 */
export function findPlankThieves(round: Pick<Round, 'modes' | 'flags'>, groups: readonly PlankGroup[]): Theft[] {
  if (!round.modes.flags) return [];

  const thefts: Theft[] = [];
  for (const group of groups) {
    if (!group.collision) continue;
    const owners = group.players.filter((id) => flagOf(round, id) === group.plank);
    const victim = owners[0];
    if (victim === undefined) continue;

    for (const id of group.players) {
      if (flagOf(round, id) === group.plank) continue;
      thefts.push({ thief: id, victim });
    }
  }
  return thefts;
}

/* ------------------------------------------------------------------ */
/* Morscher Balken                                                     */
/* ------------------------------------------------------------------ */

/**
 * Bricht dieser Balken unter einer **einzelnen** Person?
 * Stehen zwei drauf, ist es ohnehin eine Kollision — dann ist der morsche Balken egal.
 */
export function isRottenBreak(round: Pick<Round, 'modes' | 'bridge'>, group: PlankGroup): boolean {
  if (!round.modes.rotten) return false;
  if (round.bridge.rottenPlank === undefined) return false;
  return group.plank === round.bridge.rottenPlank && group.players.length === 1;
}

/* ------------------------------------------------------------------ */
/* Seil                                                                */
/* ------------------------------------------------------------------ */

/** Wie oft dieser Spieler das Seil in dieser Session schon genommen hat. */
export type RopeUsage = Record<PlayerId, number>;

export function ropeAvailable(modes: ModeFlags, usage: RopeUsage, playerId: PlayerId): boolean {
  if (!modes.rope) return false;
  return (usage[playerId] ?? 0) < ROPE_USES_PER_SESSION;
}

/** Nach der Runde: verbrauchte Seile nachtragen. */
export function consumeRopes(usage: RopeUsage, choices: Record<PlayerId, Choice>): RopeUsage {
  const next: RopeUsage = { ...usage };
  for (const [playerId, choice] of Object.entries(choices)) {
    if (isRopeChoice(choice)) next[playerId] = (next[playerId] ?? 0) + 1;
  }
  return next;
}
