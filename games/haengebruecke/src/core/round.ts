/**
 * Die Runde (Architektur §3–§5).
 *
 * `Round` ist unveraenderlich: Jede Wahl gibt eine neue Runde zurueck. Das ist nicht
 * Dogma, sondern Privatsphaere — so kann kein Screen versehentlich eine Referenz auf das
 * Objekt behalten, in dem spaeter fremde Wahlen stehen.
 *
 * `resolveRound()` laeuft **genau einmal** pro Runde, beim Uebergang SEALED → STEP. Ab da
 * inszeniert die Show nur noch ein feststehendes Ergebnis (CLAUDE.md).
 */

import { MISC_SEQUENCES, OVERLAY_SEQUENCES } from '@/config/sequences';
import type { ModeFlags, Weight } from '@/config/rules';
import { isDeathZone, pickRottenPlank, repair, shrink } from './bridge';
import { resolvePayout } from './payout';
import { createSeed, SECURE_RNG, type RandomSource } from './rng';
import type { SequencePicker } from './choreographer';
import { createSequencePicker } from './choreographer';
import type {
  Bridge,
  Choice,
  PlankId,
  PlayerId,
  Round,
  RoundResult,
  SequenceIds,
} from './types';

/* ------------------------------------------------------------------ */
/* Aufbau                                                              */
/* ------------------------------------------------------------------ */

export interface RoundSetup {
  index: number;
  playerIds: readonly PlayerId[];
  modes: ModeFlags;
  bridge: Bridge;
}

/**
 * Neue Runde. Der morsche Balken faellt hier — beim Eintritt in NEGOTIATION — und bleibt
 * privat, bis das Result ihn zeigt (Architektur §3). Sicherer Zufall, nie `Math.random`.
 */
export function createRound(setup: RoundSetup, rng: RandomSource = SECURE_RNG): Round {
  const bridge = setup.modes.rotten ? pickRottenPlank(setup.bridge, rng) : setup.bridge;
  return {
    index: setup.index,
    seed: createSeed(),
    playerIds: [...setup.playerIds],
    modes: { ...setup.modes },
    bridge,
    choices: {},
  };
}

/* ------------------------------------------------------------------ */
/* Absprache und Wahl                                                  */
/* ------------------------------------------------------------------ */

/** Fahne setzen (Modus, oeffentlich, waehrend der Absprache). */
export function setFlag(round: Round, playerId: PlayerId, plank: PlankId): Round {
  if (!round.modes.flags) return round;
  return { ...round, flags: { ...round.flags, [playerId]: plank } };
}

/** Fahne wieder einholen — solange die Absprache laeuft, darf man es sich anders ueberlegen. */
export function clearFlag(round: Round, playerId: PlayerId): Round {
  if (!round.flags || round.flags[playerId] === undefined) return round;
  const flags = { ...round.flags };
  delete flags[playerId];
  return { ...round, flags };
}

/** Rucksack-Gewicht (Modus "Schwergewicht"). Privat wie die Wahl. */
export function setWeight(round: Round, playerId: PlayerId, weight: Weight): Round {
  if (!round.modes.weights) return round;
  return { ...round, weights: { ...round.weights, [playerId]: weight } };
}

/**
 * Die geheime Wahl. Kein Zurueck: Wer schon versiegelt hat, kann nicht nachbessern —
 * sonst waere der Reihenfolge-Vorteil des letzten Spielers unbezahlbar.
 */
export function choose(round: Round, playerId: PlayerId, choice: Choice): Round {
  if (round.choices[playerId] !== undefined) return round;
  if ('plank' in choice && !round.bridge.planks.includes(choice.plank)) {
    throw new RangeError(`Balken ${choice.plank} gibt es auf dieser Bruecke nicht.`);
  }
  return { ...round, choices: { ...round.choices, [playerId]: choice } };
}

export function hasChosen(round: Round, playerId: PlayerId): boolean {
  return round.choices[playerId] !== undefined;
}

export function allChosen(round: Round): boolean {
  return round.playerIds.every((id) => hasChosen(round, id));
}

/**
 * Bedenkzeit abgelaufen: Das Spiel waehlt einen Balken. Sicherer Zufall, weil diese Wahl
 * das Ergebnis genauso entscheidet wie eine getippte.
 */
export function randomPlank(round: Round, rng: RandomSource = SECURE_RNG): Choice {
  return pickRandomPlank(round.bridge.planks, rng);
}

/**
 * Dieselbe Wahl, nur ohne Runde — der Choose-Screen kennt nur seine `ChooseView` und
 * darf die Runde nicht anfassen (Architektur §4). Die eine Stelle, an der das Spiel
 * fuer jemanden waehlt, bleibt trotzdem diese hier.
 */
export function pickRandomPlank(planks: readonly PlankId[], rng: RandomSource = SECURE_RNG): Choice {
  return { plank: rng.pick(planks) };
}

/* ------------------------------------------------------------------ */
/* Die Abrechnung — genau einmal pro Runde                             */
/* ------------------------------------------------------------------ */

export interface ResolveOptions {
  /** Fuer den abfaulenden Balken. Produktiv `crypto`, in Tests seedbar. */
  rng?: RandomSource;
  /**
   * Sequenz-Auswahl mit Gedaechtnis. Die Session reicht **einen** Picker durch alle
   * Runden, damit "No-Repeat 3" ueber die Runden hinweg gilt und nicht nur innerhalb.
   */
  picker?: SequencePicker;
}

/**
 * Die eine Stelle, an der das Ergebnis entsteht.
 *
 * Danach ist alles entschieden: wer trinkt, wer verteilt, wie die Bruecke aussieht und
 * welche Sequenzen laufen. Der StepDirector liest ab hier nur noch.
 */
export function resolveRound(round: Round, options: ResolveOptions = {}): RoundResult {
  const rng = options.rng ?? SECURE_RNG;
  const picker = options.picker ?? createSequencePicker(round.seed);
  const playerCount = round.playerIds.length;

  const payout = resolvePayout(round);

  /*
   * Der abfaulende Balken faellt hier und nicht erst beim Result (ADR-8): Das Nachspiel
   * `all_safe_rot` zeigt ihn schon waehrend der Show abbrechen, also muss er zum
   * Zeitpunkt des Skripts feststehen.
   */
  const shrunk = payout.outcome === 'allSafe' ? shrink(round.bridge, playerCount, rng) : null;
  const nextBridge = shrunk ? shrunk.bridge : repair(playerCount);

  const result: RoundResult = {
    ...round,
    groups: payout.groups,
    ropeUsers: payout.ropeUsers,
    deathZone: payout.deathZone,
    outcome: payout.outcome,
    banner: payout.banner,
    drinkers: payout.drinkers,
    giving: payout.giving,
    deserters: payout.deserters,
    plankThieves: payout.plankThieves,
    distribution: [],
    nextBridge: stripSecrets(nextBridge),
    sequenceIds: pickSequences(payout, picker),
  };

  if (shrunk?.removedPlank !== undefined) result.removedPlank = shrunk.removedPlank;
  return result;
}

/**
 * Die naechste Bruecke bekommt einen frischen morschen Balken (in `createRound`), also
 * darf der alte hier nicht mitwandern — sonst waere er zwei Runden lang derselbe.
 */
function stripSecrets(bridge: Bridge): Bridge {
  return { count: bridge.count, planks: [...bridge.planks], removed: [...bridge.removed] };
}

function pickSequences(payout: ReturnType<typeof resolvePayout>, picker: SequencePicker): SequenceIds {
  const fall: Record<PlankId, string> = {};
  const safe: Record<PlayerId, string> = {};

  for (const group of payout.groups) {
    if (group.collision) {
      fall[group.plank] = picker.pickFall(group.players.length);
      continue;
    }
    /* Wer durch den morschen Balken bricht, bekommt das Overlay statt einer Sicher-Sequenz. */
    if (group.rotten) continue;
    const soloist = group.players[0]!;
    safe[soloist] = picker.pickSafe();
  }

  /* Reihenfolge = Abspielreihenfolge: Schild zuerst, Nachspiel zuletzt. */
  const misc: string[] = [];
  if (payout.deathZone) misc.push(MISC_SEQUENCES.deathzoneSign);
  misc.push(payout.outcome === 'allSafe' ? MISC_SEQUENCES.allSafeRot : MISC_SEQUENCES.repairCarpenter);

  const overlays: string[] = [];
  if (payout.groups.some((g) => g.rotten)) overlays.push(OVERLAY_SEQUENCES.rottenCrack);
  if (payout.deserters.length > 0) overlays.push(OVERLAY_SEQUENCES.deserterStamp);

  return { fall, safe, misc, overlays };
}

/** Bequemlichkeit fuer Tests und Dev-Panel. */
export function isRoundInDeathZone(round: Round): boolean {
  return isDeathZone(round.bridge, round.playerIds.length);
}
