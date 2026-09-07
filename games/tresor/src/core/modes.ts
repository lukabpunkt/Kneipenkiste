/**
 * Modi-Regeln (GDD §3.7): Maulwurf-Zuweisung, Eid-Bookkeeping, Nachtschicht-Flags.
 *
 * CLAUDE.md: **Die Maulwurf-Zuweisung laeuft ausschliesslich ueber `crypto`.**
 * Sie entscheidet, wer stehlen *muss* — das ist keine Show, das ist Fairness.
 */

import { NIGHT_SHIFT_SILENCE_SEC, type Modes, type NegotiationSec, type Settings } from '@/config/rules';
import { secureRandomInt } from './rng';
import type { Choice, PlayerId, RoundSetup } from './types';

/**
 * Zieht den Maulwurf der Runde — oder `undefined`, wenn der Modus aus ist.
 * Sicherer Zufall, kein Seed: Wer den Maulwurf vorhersagen kann, bricht das Spiel.
 */
export function assignMole(playerIds: readonly PlayerId[], modes: Pick<Modes, 'mole'>): PlayerId | undefined {
  if (!modes.mole) return undefined;
  if (playerIds.length === 0) return undefined;
  return playerIds[secureRandomInt(playerIds.length)];
}

/** Ist dieser Spieler der Maulwurf dieser Runde? */
export function isMole(playerId: PlayerId, setup: Pick<RoundSetup, 'moleId'>): boolean {
  return setup.moleId !== undefined && setup.moleId === playerId;
}

/**
 * Erzwungene Wahl: Der Maulwurf sieht auf dem Choice-Screen nur STEHLEN
 * ("Du bist der Maulwurf. Tu unschuldig.", GDD §3.7).
 */
export function forcedChoice(playerId: PlayerId, setup: Pick<RoundSetup, 'moleId'>): Choice | undefined {
  return isMole(playerId, setup) ? 'steal' : undefined;
}

/** Hat dieser Spieler oeffentlich geschworen? */
export function hasSworn(playerId: PlayerId, setup: Pick<RoundSetup, 'oaths'>): boolean {
  return setup.oaths.includes(playerId);
}

/**
 * Meineidige: geschworen **und** gestohlen.
 *
 * Der Maulwurf ist nie dabei — er darf schwoeren und muss trotzdem stehlen, deshalb
 * entfaellt die Strafe fuer ihn (GDD §3.7, Kombination Eid + Maulwurf). Ohne Eid-Modus
 * gibt es keinen Meineid, auch wenn `oaths` aus einer frueheren Runde noch gefuellt waere.
 */
export function perjurerIds(
  setup: Pick<RoundSetup, 'oaths' | 'choices' | 'moleId'>,
  modes: Pick<Modes, 'oath'>
): PlayerId[] {
  if (!modes.oath) return [];
  return setup.oaths.filter((id) => setup.choices[id] === 'steal' && !isMole(id, setup));
}

export interface OpeningPhase {
  /** Nachtschicht ersetzt die Verhandlung durch Stille (GDD §3.7). */
  kind: 'negotiation' | 'silence';
  seconds: number;
}

/** Was vor der geheimen Wahl passiert — Verhandlung oder tickende Stille. */
export function openingPhase(settings: Pick<Settings, 'modes' | 'negotiationSec'>): OpeningPhase {
  if (settings.modes.nightShift) {
    return { kind: 'silence', seconds: NIGHT_SHIFT_SILENCE_SEC };
  }
  return { kind: 'negotiation', seconds: settings.negotiationSec satisfies NegotiationSec };
}

/** Darf in dieser Runde ueberhaupt geschworen werden? */
export function oathsEnabled(modes: Pick<Modes, 'oath'>): boolean {
  return modes.oath;
}
