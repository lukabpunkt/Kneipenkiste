/**
 * Datenmodell (Architektur §4).
 *
 * **Informationssicherheit ist Gameplay** (CLAUDE.md): Alles, was hier als *privat*
 * markiert ist, verlaesst den Store nur ueber `publicView()` — und dort erst ab RESULT.
 */

import type { GameModeId, HintType, ItemSet, Locale } from '@/config/rules';
import type { ColorId, SymbolId } from '@/config/theme';

export type { GameModeId, HintType, ItemSet, Locale };
export type { ColorId, SymbolId };

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  colorId: ColorId;
  symbol: SymbolId;
}

/* ------------------------------------------------------------------ */
/* Runde                                                               */
/* ------------------------------------------------------------------ */

/** Was ein Reisender gepackt hat. 0 = sauber. **Privat bis zum Reveal.** */
export interface Pack {
  playerId: PlayerId;
  amount: number;
}

/**
 * Ein Hinweis in der Zollhalle.
 * `type` und `suitcaseOf` sind ab HALL oeffentlich, `truthful` **erst ab RESULT** —
 * genau daran haengt Design-Pfeiler 2 ("falsche Sicherheit").
 */
export interface Hint {
  type: HintType;
  suitcaseOf: PlayerId;
  truthful: boolean;
}

export type BribeAmount = 1 | 2 | 3;

export interface Bribe {
  from: PlayerId;
  amount: BribeAmount;
  /** `null` = Angebot steht, der Beamte hat noch nicht entschieden. */
  accepted: boolean | null;
}

export type InspectKind = 'caught' | 'clean' | 'diplomat';
export type DrinkReason = 'caught' | 'harassment' | 'diplomat';

export interface Drinker {
  playerId: PlayerId;
  sips: number;
  reason: DrinkReason;
}

export interface TokenGrant {
  playerId: PlayerId;
  tokens: number;
}

export interface InspectResult {
  suitcaseOf: PlayerId;
  kind: InspectKind;
  /** Menge im Koffer; 0 bei `clean`. Wird mit dem Ergebnis oeffentlich. */
  amount: number;
  drinkers: Drinker[];
  tokensTo?: TokenGrant;
  sequenceId: string;
  overlayId?: string;
}

export type GateKind = 'ok' | 'smuggler';

export interface GateResult {
  suitcaseOf: PlayerId;
  kind: GateKind;
  amount: number;
  tokensTo?: TokenGrant;
  sequenceId: string;
}

export interface Opening {
  suitcaseOf: PlayerId;
  result: InspectResult;
}

export interface Round {
  index: number;
  officerId: PlayerId;
  travelerIds: PlayerId[];
  itemSet: ItemSet;
  seed: number;
  /** Welche Modi in dieser Runde aktiv sind (Snapshot der Settings). */
  modes: Record<GameModeId, boolean>;

  /** **Privat.** */
  packs: Record<PlayerId, Pack>;
  /** **Privat** bis zum Reveal des Diplomaten-Koffers bzw. bis RESULT. */
  diplomatId?: PlayerId;
  /** Typ + Koffer ab HALL oeffentlich, `truthful` **privat bis RESULT**. */
  hints: Hint[];
  /** Spuerhund-Modus: verlaesslicher, oeffentlicher Hinweis. */
  dogHintOf?: PlayerId;
  /** Bellt Waldi? Nur im Spuerhund-Modus gesetzt, oeffentlich. */
  dogBarks?: boolean;

  bribes: Bribe[];
  openings: Opening[];
  /** k, Modi bereits eingerechnet. */
  maxOpenings: number;
  gateOrder?: PlayerId[];
}

export type ResultBanner =
  | 'officerOfTheMonth'
  | 'gotThrough'
  | 'smugglerParadise'
  | 'harassment'
  | 'honestRound';

export type BonusReason = 'allCaught' | 'goodInstinct';

export interface Bonus {
  playerId: PlayerId;
  tokens: number;
  reason: BonusReason;
}

export interface Distribution {
  from: PlayerId;
  to: PlayerId;
  sips: number;
}

export interface RoundResult extends Round {
  gate: GateResult[];
  bonuses: Bonus[];
  /** Wer wie viele Verteil-Tokens hat. */
  tokens: Record<PlayerId, number>;
  distribution: Distribution[];
  banner: ResultBanner;
  /** Alle Trinker der Runde (Kontrolle + Diplomat), in Reihenfolge des Auftretens. */
  drinkers: Drinker[];
}

/* ------------------------------------------------------------------ */
/* Session (Architektur §4)                                            */
/* ------------------------------------------------------------------ */

export interface PlayerStats {
  /** Summe durchgekommener Schmuggelware. */
  smuggledThrough: number;
  /** Summe erwischter Schmuggelware. */
  caughtAmount: number;
  /** Wie oft erwischt. */
  caughtCount: number;
  /** Wie oft als Beamter kontrolliert. */
  roundsAsOfficer: number;
  /** Geoeffnete Koffer als Beamter. */
  openings: number;
  /** Davon Treffer. */
  hits: number;
  /** Unschuldige geoeffnet. */
  harassed: number;
  /** Hoechste Einzelmenge, die durchkam ("Dreistester Schmuggler"). */
  boldestRun: number;
  sipsDrunk: number;
}
