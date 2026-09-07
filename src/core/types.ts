/**
 * Datenmodell (Architektur §4).
 *
 * Reine Typen, kein Laufzeit-Code. Was hier `privat` heisst, verlaesst den Store nicht,
 * bevor der Schritt gelaufen ist — die Projektion dafuer steht in `publicView.ts`.
 */

import type { GameModeId, Weight } from '@/config/rules';
import type { ColorId, SymbolId } from '@/config/theme';

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  colorId: ColorId;
  symbol: SymbolId;
}

/* ------------------------------------------------------------------ */
/* Die Bruecke (GDD §3.2)                                              */
/* ------------------------------------------------------------------ */

/** Balken sind von links nach rechts durchnummeriert; Nummern bleiben beim Schrumpfen. */
export type PlankId = number;

export interface Bridge {
  /** Wie viele Balken es noch gibt — nicht die hoechste Nummer. */
  count: number;
  /** Die verbliebenen Balken, aufsteigend. */
  planks: PlankId[];
  /** Abgefaulte Balken; ihre Luecke bleibt zwischen den Seilen sichtbar. */
  removed: PlankId[];
  /** **Privat** bis zum Result: der morsche Balken (Modus). */
  rottenPlank?: PlankId;
}

/* ------------------------------------------------------------------ */
/* Die Wahl (GDD §3.4)                                                 */
/* ------------------------------------------------------------------ */

/** Entweder ein Balken — oder das Seil (Modus, einmal pro Session). Helfer: `choice.ts`. */
export type Choice = { plank: PlankId } | { rope: true };

export interface Round {
  index: number;
  seed: number;
  playerIds: PlayerId[];
  modes: Record<GameModeId, boolean>;
  bridge: Bridge;
  /** **Privat** bis zum Schritt. */
  choices: Record<PlayerId, Choice>;
  /** Schwergewicht-Modus. Privat wie die Wahl. */
  weights?: Record<PlayerId, Weight>;
  /** Fahne-Modus: oeffentlich, schon waehrend der Absprache. */
  flags?: Record<PlayerId, PlankId>;
}

/* ------------------------------------------------------------------ */
/* Das Ergebnis (Architektur §4)                                       */
/* ------------------------------------------------------------------ */

export interface PlankGroup {
  plank: PlankId;
  players: PlayerId[];
  collision: boolean;
  rotten: boolean;
}

export type DrinkReason = 'collision' | 'rotten' | 'ropeFee' | 'deserterDouble';

export interface Drinker {
  playerId: PlayerId;
  sips: number;
  reason: DrinkReason;
}

export interface Distribution {
  from: PlayerId;
  to: PlayerId;
  sips: number;
}

export interface PlankTheft {
  thief: PlayerId;
  victim: PlayerId;
}

export type Outcome = 'allSafe' | 'collision' | 'massCollision' | 'deathZone';

/** Was der Result-Screen als Schaerpe zeigt (GDD §3.7). */
export type Banner = 'allSafe' | 'crash' | 'massCollision' | 'deathZone' | 'desertion' | 'badLuck';

/** Welche Sequenz-IDs die Show spielt — der Choreographer waehlt, der Director spielt. */
export interface SequenceIds {
  /** Pro Kollisionsbalken eine Fall-Sequenz. */
  fall: Record<PlankId, string>;
  /** Pro sicherem Hiker eine Sicher-Sequenz. */
  safe: Record<PlayerId, string>;
  /** `all_safe_rot`, `deathzone_sign`, `repair_carpenter`. */
  misc: string[];
  /** `rotten_crack`, `deserter_stamp`. */
  overlays: string[];
}

export interface RoundResult extends Round {
  groups: PlankGroup[];
  ropeUsers: PlayerId[];
  deathZone: boolean;
  outcome: Outcome;
  banner: Banner;
  drinkers: Drinker[];
  /** Verteil-Guthaben pro Spieler; nur Eintraege > 0. */
  giving: Record<PlayerId, number>;
  deserters: PlayerId[];
  plankThieves: PlankTheft[];
  /** Wird im DISTRIBUTE-Screen gefuellt. */
  distribution: Distribution[];
  nextBridge: Bridge;
  /** Welcher Balken abgefault ist (nur bei `allSafe`). */
  removedPlank?: PlankId;
  sequenceIds: SequenceIds;
}

/* ------------------------------------------------------------------ */
/* Session-Statistik (GDD §3.7)                                        */
/* ------------------------------------------------------------------ */

export interface PlayerStats {
  /** Runden, in denen der Spieler allein auf seinem Balken stand. */
  safeRounds: number;
  /** Runden, in denen er gestuerzt ist. */
  falls: number;
  sipsDrunk: number;
  sipsGiven: number;
  /** Wie oft er seine Fahne verraten hat. */
  desertions: number;
  /** Wie oft er einen fremden Fahnen-Balken gekapert hat. */
  thefts: number;
  ropesUsed: number;
  /** Mit wem er zusammen gefallen ist, gezaehlt — die Geschichte des Abends. */
  fellWith: Record<PlayerId, number>;
}
