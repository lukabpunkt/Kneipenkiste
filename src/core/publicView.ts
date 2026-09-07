/**
 * Informationssicherheit ist Gameplay (CLAUDE.md, Architektur §4).
 *
 * Screens bekommen **ausschliesslich** das hier Gebaute. Die Projektion ist bewusst als
 * Whitelist geschrieben — nichts wird aus `Round` gespreadet, jedes Feld steht einzeln da.
 * Ein `...round` waere die eine Zeile, die fremde Wahlen und den morschen Balken
 * versehentlich auf den Tisch legt.
 *
 * Verborgen bis zum Schritt:
 * - `choices` — die Wahl der anderen. Ohne sie waere die Absprache sinnlos.
 * - `weights` — der Rucksack der anderen (Modus "Schwergewicht").
 * - `bridge.rottenPlank` — der morsche Balken. Er ist Glueck, kein Wissen.
 *
 * Oeffentlich schon vorher: die **Fahnen**. Das ist ihr ganzer Sinn (GDD §3.6).
 */

import { GIVING_SAFE, GIVING_SAFE_DEATH_ZONE, type GameModeId, type Weight } from '@/config/rules';
import { isDeathZone, withoutSecrets } from './bridge';
import { ropeAvailable, type RopeUsage } from './modes';
import type { Bridge, Choice, PlankId, PlayerId, Round, RoundResult } from './types';

export type ViewPhase = 'NEGOTIATION' | 'PASS' | 'CHOOSE' | 'SEALED';

/** Ein Balken, wie ihn der Tisch sieht: Nummer und die Fahnen, die drauf stecken. */
export interface PublicPlank {
  id: PlankId;
  /** Mehrere Fahnen auf einem Balken sind erlaubt — und ein sichtbarer Konflikt. */
  flaggedBy: PlayerId[];
}

export interface PublicRound {
  index: number;
  phase: ViewPhase;
  playerIds: PlayerId[];
  modes: Record<GameModeId, boolean>;
  /** Ohne `rottenPlank`. */
  bridge: Bridge;
  planks: PublicPlank[];
  /** Wer schon versiegelt hat — nicht, **was** er gewaehlt hat. */
  sealedBy: PlayerId[];
  deathZone: boolean;
  /** Die Regelzeile dieser Runde: "Sicher stehen verteilt {n}". */
  givingPerSafePlayer: number;
}

/**
 * Was NEGOTIATION, PASS, CHOOSE und SEALED sehen duerfen.
 *
 * Die Wahl eines Spielers taucht hier ueberhaupt nicht auf — auch nicht die eigene.
 * Dafuer gibt es `chooseView()`, und die bekommt genau ein Handy zu sehen.
 */
export function publicView(round: Round, phase: ViewPhase): PublicRound {
  const playerCount = round.playerIds.length;
  const deathZone = isDeathZone(round.bridge, playerCount);

  const planks: PublicPlank[] = round.bridge.planks.map((id) => ({
    id,
    flaggedBy: round.modes.flags
      ? round.playerIds.filter((playerId) => round.flags?.[playerId] === id)
      : [],
  }));

  return {
    index: round.index,
    phase,
    playerIds: [...round.playerIds],
    modes: { ...round.modes },
    bridge: withoutSecrets(round.bridge),
    planks,
    sealedBy: round.playerIds.filter((id) => round.choices[id] !== undefined),
    deathZone,
    givingPerSafePlayer: deathZone ? GIVING_SAFE_DEATH_ZONE : GIVING_SAFE,
  };
}

/* ------------------------------------------------------------------ */
/* Choose-Screen — das eine Handy in der Hand des einen Spielers        */
/* ------------------------------------------------------------------ */

export interface ChooseView {
  playerId: PlayerId;
  bridge: Bridge;
  planks: PublicPlank[];
  /** Die eigene Fahne — die haben ohnehin alle gesehen. */
  ownFlag?: PlankId;
  /** Der eigene Rucksack (Modus). */
  ownWeight?: Weight;
  /** Die eigene Wahl, sobald versiegelt. */
  ownChoice?: Choice;
  ropeAvailable: boolean;
  deathZone: boolean;
}

/**
 * Der Balken-Screen. Er zeigt die Bruecke, die eigenen Sachen — und sonst nichts.
 *
 * Insbesondere zeigt er nicht, wer schon versiegelt hat und was: Wer das Handy als
 * Letzter bekommt, haette sonst ein Spiel zu spielen, das die anderen nicht hatten.
 */
export function chooseView(
  round: Round,
  playerId: PlayerId,
  ropeUsage: RopeUsage = {}
): ChooseView {
  if (!round.playerIds.includes(playerId)) {
    throw new Error(`${playerId} spielt diese Runde nicht mit.`);
  }

  const view: ChooseView = {
    playerId,
    bridge: withoutSecrets(round.bridge),
    planks: publicView(round, 'CHOOSE').planks,
    ropeAvailable: ropeAvailable(round.modes, ropeUsage, playerId),
    deathZone: isDeathZone(round.bridge, round.playerIds.length),
  };

  const ownFlag = round.modes.flags ? round.flags?.[playerId] : undefined;
  if (ownFlag !== undefined) view.ownFlag = ownFlag;

  const ownWeight = round.modes.weights ? round.weights?.[playerId] : undefined;
  if (ownWeight !== undefined) view.ownWeight = ownWeight;

  const ownChoice = round.choices[playerId];
  if (ownChoice !== undefined) view.ownChoice = ownChoice;

  return view;
}

/* ------------------------------------------------------------------ */
/* Result — ab hier ist alles oeffentlich                              */
/* ------------------------------------------------------------------ */

export interface ResultPlank {
  id: PlankId;
  players: PlayerId[];
  collision: boolean;
  rotten: boolean;
  /** Wer hier seine Fahne stecken hatte — neben dem, was er wirklich getan hat. */
  flaggedBy: PlayerId[];
}

export interface ResultView {
  banner: RoundResult['banner'];
  outcome: RoundResult['outcome'];
  deathZone: boolean;
  planks: ResultPlank[];
  /** Leere Balken gehoeren dazu: "Auf die 4 ist niemand getreten." */
  emptyPlanks: PlankId[];
  ropeUsers: PlayerId[];
  drinkers: RoundResult['drinkers'];
  giving: Record<PlayerId, number>;
  deserters: PlayerId[];
  plankThieves: RoundResult['plankThieves'];
  distribution: RoundResult['distribution'];
  /** Jetzt darf der Tisch wissen, welcher Balken morsch war. */
  rottenPlank?: PlankId;
  removedPlank?: PlankId;
  nextPlankCount: number;
  repaired: boolean;
}

/** Der Reveal. Die einzige Projektion, die Wahlen und den morschen Balken zeigt. */
export function resultView(result: RoundResult): ResultView {
  const occupied = new Map(result.groups.map((g) => [g.plank, g]));

  const planks: ResultPlank[] = result.bridge.planks.map((id) => {
    const group = occupied.get(id);
    return {
      id,
      players: group ? [...group.players] : [],
      collision: group?.collision ?? false,
      rotten: group?.rotten ?? false,
      flaggedBy: result.modes.flags
        ? result.playerIds.filter((playerId) => result.flags?.[playerId] === id)
        : [],
    };
  });

  const view: ResultView = {
    banner: result.banner,
    outcome: result.outcome,
    deathZone: result.deathZone,
    planks,
    emptyPlanks: planks.filter((p) => p.players.length === 0).map((p) => p.id),
    ropeUsers: [...result.ropeUsers],
    drinkers: result.drinkers.map((d) => ({ ...d })),
    giving: { ...result.giving },
    deserters: [...result.deserters],
    plankThieves: result.plankThieves.map((t) => ({ ...t })),
    distribution: result.distribution.map((d) => ({ ...d })),
    nextPlankCount: result.nextBridge.count,
    repaired: result.outcome !== 'allSafe',
  };

  if (result.modes.rotten && result.bridge.rottenPlank !== undefined) {
    view.rottenPlank = result.bridge.rottenPlank;
  }
  if (result.removedPlank !== undefined) view.removedPlank = result.removedPlank;

  return view;
}
