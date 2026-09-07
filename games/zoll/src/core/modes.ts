/**
 * Modi (GDD §3.7). Sie veraendern die Informationsstruktur, nicht nur Zahlen —
 * deshalb liegt hier nur die Regel-Arithmetik, nie Inszenierung.
 */

import {
  HIGH_SEASON_OPENING_BONUS,
  MAX_AMOUNT,
  MAX_AMOUNT_HIGH_SEASON,
  MIN_AMOUNT,
  SNIFFER_OPENING_MALUS,
  baseOpenings,
  type GameModeId,
} from '@/config/rules';

export type ModeFlags = Record<GameModeId, boolean>;

/**
 * Wie viele Koffer der Beamte oeffnen darf.
 *
 * Spuerhund: Information gegen Handlungsspielraum — ein verlaesslicher Hinweis kostet
 * eine Oeffnung, aber nie die letzte. Hochsaison: eine mehr.
 */
export function maxOpenings(playerCount: number, modes: ModeFlags): number {
  let k = baseOpenings(playerCount);
  if (modes.sniffer) k = Math.max(1, k - SNIFFER_OPENING_MALUS);
  if (modes.highSeason) k += HIGH_SEASON_OPENING_BONUS;
  /* Mehr Oeffnungen als Reisende waeren sinnlos — n - 1 ist die harte Grenze. */
  return Math.min(k, Math.max(1, playerCount - 1));
}

/** Obergrenze der Schmuggelmenge im Pack-Screen. */
export function maxAmount(modes: ModeFlags): number {
  return modes.highSeason ? MAX_AMOUNT_HIGH_SEASON : MAX_AMOUNT;
}

/** Gueltige Packmenge? */
export function isValidAmount(amount: number, modes: ModeFlags): boolean {
  return Number.isInteger(amount) && amount >= MIN_AMOUNT && amount <= maxAmount(modes);
}

export const ALL_MODES_OFF: ModeFlags = {
  bribery: false,
  sniffer: false,
  diplomat: false,
  highSeason: false,
};

export function modeFlags(partial: Partial<ModeFlags> = {}): ModeFlags {
  return { ...ALL_MODES_OFF, ...partial };
}
