/**
 * Datenmodell (Architektur §4).
 *
 * ADR-6: Die Typen liegen in einer eigenen Datei statt in `payout.ts`. Sonst haetten
 * `payout.ts` (braucht die Eid-Regel aus `modes.ts`) und `modes.ts` (braucht `Choice`)
 * einen Zyklus. Alles andere bleibt wie in Architektur §2 beschrieben.
 */

import type { Settings } from '@/config/rules';
import type { ColorId, HatId } from '@/config/theme';

export type PlayerId = string;

/** Die einzige Entscheidung des Spiels (GDD §3.4). */
export type Choice = 'share' | 'steal';

export interface Player {
  id: PlayerId;
  /** max. 12 Zeichen (GDD §3.1). */
  name: string;
  colorId: ColorId;
  outfit: {
    /** Jeder Crook traegt die Domino-Maske in Spielerfarbe (Art Direction §5). */
    mask: true;
    stripes: boolean;
    hatId?: HatId;
  };
}

/** Was zu Rundenbeginn feststeht bzw. waehrend der Runde gesammelt wird. */
export interface RoundSetup {
  /** 1-basiert. */
  index: number;
  /** Tresorinhalt V zu Rundenbeginn. */
  vault: number;
  /** Seed fuer Reveal-Reihenfolge und Outcome-Auswahl. */
  seed: number;
  /** Maulwurf-Modus: wer stehlen muss (mit `crypto` gezogen, GDD §3.7). */
  moleId?: PlayerId;
  /** Eid-Modus: wer oeffentlich geschworen hat. */
  oaths: PlayerId[];
  choices: Record<PlayerId, Choice>;
}

export type Outcome = 'allShare' | 'jackpot' | 'soloSteal' | 'multiSteal' | 'allSteal';

export const OUTCOMES: readonly Outcome[] = ['allShare', 'jackpot', 'soloSteal', 'multiSteal', 'allSteal'];

/**
 * Warum jemand trinkt — steuert Icon und Zeile auf dem Result-Screen (GDD §3.8).
 * `distributed` wird erst im DISTRIBUTE-Screen gefuellt (Architektur §3).
 */
export type DrinkReason = 'fee' | 'jackpot' | 'distributed' | 'split' | 'perjury';

export interface Drinker {
  playerId: PlayerId;
  sips: number;
  reason: DrinkReason;
}

export type OverlayId = 'perjury_seal_break' | 'mole_reveal';

export interface RoundResult extends RoundSetup {
  outcome: Outcome;
  /** Reihenfolge = Reveal-Reihenfolge der Diebe; der Maulwurf steht immer hinten. */
  thieves: PlayerId[];
  /** Reihenfolge = Reveal-Reihenfolge der Teiler. */
  sharers: PlayerId[];
  /** Geschworen und trotzdem gestohlen. Der Maulwurf ist nie dabei (GDD §3.7). */
  perjurers: PlayerId[];
  drinkers: Drinker[];
  /** Bei `soloSteal`: der Dieb, der verteilen darf. */
  distributorId?: PlayerId;
  /** Bei `soloSteal`: wieviele Schluecke er zu verteilen hat (V, bei Meineid V−2). */
  distributableSips?: number;
  /** Kronzeugen-Modus: Wer ausgepackt hat (Backlog nach 1.0). */
  witnessId?: PlayerId;
  /** Kronzeugen-Modus: Wen er verpfiffen hat. */
  accusedId?: PlayerId;
  /** Vollstaendige Karten-Reihenfolge: Teiler zuerst, Diebe zuletzt (ADR-3). */
  revealOrder: PlayerId[];
  outcomeSequenceId: string;
  overlayIds: OverlayId[];
  nextVault: number;
}

export interface Session {
  players: Player[];
  settings: Settings;
  rounds: RoundResult[];
  /** Aktueller Tresorinhalt fuer die naechste Runde. */
  vault: number;
}
