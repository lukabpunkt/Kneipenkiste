/**
 * Informationssicherheit ist Gameplay (CLAUDE.md, Architektur §4).
 *
 * Screens bekommen **ausschliesslich** das hier Gebaute. Die Projektion ist bewusst als
 * Whitelist geschrieben — nichts wird aus `Round` gespreadet, jedes Feld steht einzeln da.
 * Ein `...round` waere die eine Zeile, die Mengen, `truthful` und die Diplomat-ID
 * versehentlich auf den Tisch legt.
 *
 * Verborgen bis zum Reveal:
 * - `packs[].amount` — die Menge. Sonst waere der Bluff keiner.
 * - `hints[].truthful` — ob ein Hinweis stimmt. Daran haengt "falsche Sicherheit".
 * - `diplomatId` — die Immunitaet.
 */

import type {
  Bribe,
  GameModeId,
  GateResult,
  HintType,
  InspectResult,
  ItemSet,
  PlayerId,
  Round,
  RoundResult,
} from './types';
import { amountOf, isLocked, isOpened, openingsLeft } from './round';

export type ViewPhase = 'HALL' | 'INSPECT' | 'GATE';

/** Ein Hinweis, wie ihn der Tisch sieht: Typ und Koffer — mehr nicht. */
export interface PublicHint {
  type: HintType;
  suitcaseOf: PlayerId;
}

export interface PublicSuitcase {
  playerId: PlayerId;
  opened: boolean;
  /** Bestechung angenommen — nicht mehr tippbar. */
  locked: boolean;
  /** Welche Hinweis-Icons an diesem Koffer haengen. */
  hints: HintType[];
  /** Waldi hat hier geschnueffelt (Spuerhund-Modus). */
  sniffed: boolean;
  /** Kann der Beamte ihn jetzt oeffnen? */
  inspectable: boolean;
}

export interface PublicRound {
  index: number;
  officerId: PlayerId;
  travelerIds: PlayerId[];
  itemSet: ItemSet;
  modes: Record<GameModeId, boolean>;
  phase: ViewPhase;

  hints: PublicHint[];
  /** Der verlaessliche Hinweis des Spuerhunds — er luegt nie, verraet aber keine Menge. */
  dogHint?: { suitcaseOf: PlayerId; barks: boolean };

  bribes: Bribe[];
  suitcases: PublicSuitcase[];

  maxOpenings: number;
  openingsLeft: number;
  /** Bereits gezeigte Ergebnisse — ab dem Reveal ist ihre Menge oeffentlich. */
  openings: InspectResult[];
}

/**
 * Was HALL, INSPECT und GATE sehen duerfen.
 *
 * Die Menge eines Koffers taucht ausschliesslich in `openings` auf, also erst, nachdem
 * das Roentgenbild sie gezeigt hat.
 */
export function publicView(round: Round, phase: ViewPhase): PublicRound {
  const hints: PublicHint[] = round.hints.map((hint) => ({
    type: hint.type,
    suitcaseOf: hint.suitcaseOf,
  }));

  const suitcases: PublicSuitcase[] = round.travelerIds.map((playerId) => ({
    playerId,
    opened: isOpened(round, playerId),
    locked: isLocked(round, playerId),
    hints: hints.filter((h) => h.suitcaseOf === playerId).map((h) => h.type),
    sniffed: round.dogHintOf === playerId,
    inspectable:
      phase === 'INSPECT' &&
      !isOpened(round, playerId) &&
      !isLocked(round, playerId) &&
      openingsLeft(round) > 0,
  }));

  const view: PublicRound = {
    index: round.index,
    officerId: round.officerId,
    travelerIds: [...round.travelerIds],
    itemSet: round.itemSet,
    modes: { ...round.modes },
    phase,
    hints,
    bribes: round.bribes.map((b) => ({ ...b })),
    suitcases,
    maxOpenings: round.maxOpenings,
    openingsLeft: openingsLeft(round),
    openings: round.openings.map((o) => ({ ...o.result })),
  };

  if (round.dogHintOf !== undefined) {
    view.dogHint = { suitcaseOf: round.dogHintOf, barks: round.dogBarks === true };
  }

  return view;
}

/* ------------------------------------------------------------------ */
/* Pack-Screen                                                         */
/* ------------------------------------------------------------------ */

export interface PackView {
  playerId: PlayerId;
  itemSet: ItemSet;
  /** Nur das eigene Pack — was die anderen gepackt haben, sieht hier niemand. */
  amount: number;
  maxAmount: number;
  /** Nur der Diplomat selbst erfaehrt seine Immunitaet, und nur auf diesem Screen. */
  hasImmunity: boolean;
}

export function packView(round: Round, playerId: PlayerId, maxAmount: number): PackView {
  if (!round.travelerIds.includes(playerId)) {
    throw new Error(`${playerId} reist in dieser Runde nicht.`);
  }
  return {
    playerId,
    itemSet: round.itemSet,
    amount: amountOf(round, playerId),
    maxAmount,
    hasImmunity: round.diplomatId === playerId,
  };
}

/* ------------------------------------------------------------------ */
/* Result — ab hier ist alles oeffentlich                              */
/* ------------------------------------------------------------------ */

export interface HintResolution {
  type: HintType;
  suitcaseOf: PlayerId;
  /** Jetzt darf der Tisch es wissen: "Der tropfende Koffer war sauber. Reingefallen." */
  truthful: boolean;
  amount: number;
}

export interface ResultSuitcase {
  playerId: PlayerId;
  amount: number;
  opened: boolean;
  locked: boolean;
  gotThrough: boolean;
  hints: HintType[];
}

export interface ResultView {
  banner: RoundResult['banner'];
  officerId: PlayerId;
  itemSet: ItemSet;
  diplomatId?: PlayerId;
  suitcases: ResultSuitcase[];
  hintResolutions: HintResolution[];
  openings: InspectResult[];
  gate: GateResult[];
  bonuses: RoundResult['bonuses'];
  tokens: Record<PlayerId, number>;
  drinkers: RoundResult['drinkers'];
}

/** Der Reveal. Die einzige Projektion, die `truthful`, Mengen und Diplomat zeigt. */
export function resultView(result: RoundResult): ResultView {
  const view: ResultView = {
    banner: result.banner,
    officerId: result.officerId,
    itemSet: result.itemSet,
    suitcases: result.travelerIds.map((playerId) => ({
      playerId,
      amount: result.packs[playerId]?.amount ?? 0,
      opened: result.openings.some((o) => o.suitcaseOf === playerId),
      locked: result.bribes.some((b) => b.from === playerId && b.accepted === true),
      gotThrough: result.gate.some((g) => g.suitcaseOf === playerId && g.kind === 'smuggler'),
      hints: result.hints.filter((h) => h.suitcaseOf === playerId).map((h) => h.type),
    })),
    hintResolutions: result.hints.map((hint) => ({
      type: hint.type,
      suitcaseOf: hint.suitcaseOf,
      truthful: hint.truthful,
      amount: result.packs[hint.suitcaseOf]?.amount ?? 0,
    })),
    openings: result.openings.map((o) => ({ ...o.result })),
    gate: [...result.gate],
    bonuses: [...result.bonuses],
    tokens: { ...result.tokens },
    drinkers: [...result.drinkers],
  };

  if (result.diplomatId !== undefined) view.diplomatId = result.diplomatId;
  return view;
}
