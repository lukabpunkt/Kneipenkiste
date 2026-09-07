/**
 * Der Regelkern (Architektur §5). **Reine Funktionen** — hier faellt jede Entscheidung,
 * die Directors inszenieren sie nur (CLAUDE.md).
 *
 * Alles, was das Spiel entscheidet — Hinweise, Diplomat, Item-Set — laeuft ueber
 * `crypto.getRandomValues`. Der seedbare PRNG ist nur fuer die Inszenierung da.
 */

import { ITEM_SETS, MAX_BRIBE, MIN_BRIBE } from '@/config/rules';
import { generateDogHint, generateHints } from './hints';
import { isValidAmount, maxOpenings, type ModeFlags } from './modes';
import { bannerFor, bonusesFor, collectDrinkers, gatePayout, inspectPayout, tallyTokens } from './payout';
import { SECURE_RNG, createSeed, type RandomSource } from './rng';
import type {
  Bribe,
  BribeAmount,
  GateResult,
  InspectKind,
  InspectResult,
  Player,
  PlayerId,
  Round,
  RoundResult,
} from './types';

/* ------------------------------------------------------------------ */
/* Sequenz-Auswahl                                                     */
/* ------------------------------------------------------------------ */

/**
 * Welche Inszenierung gespielt wird, entscheidet ab M3 die Registry in
 * `game/sequences/`. Der Kern kennt nur die Schnittstelle und faellt sonst auf die
 * Platzhalter der Roadmap (M3: `basic_caught` / `basic_clean`) zurueck.
 */
export type SequencePicker = (kind: InspectKind | 'gateOk' | 'gateSmuggler') => string;

const PLACEHOLDER_SEQUENCES: Record<InspectKind | 'gateOk' | 'gateSmuggler', string> = {
  caught: 'basic_caught',
  clean: 'basic_clean',
  diplomat: 'diplomat_pass',
  gateOk: 'basic_gate_ok',
  gateSmuggler: 'basic_gate_smuggler',
};

const defaultPicker: SequencePicker = (kind) => PLACEHOLDER_SEQUENCES[kind];

/* ------------------------------------------------------------------ */
/* Runde anlegen                                                       */
/* ------------------------------------------------------------------ */

export interface CreateRoundInput {
  /** 0-basiert: Runde 1 hat den Index 0. */
  index: number;
  /** Spieler in Sitzreihenfolge — bestimmt die Beamten-Rotation. */
  players: readonly Player[];
  modes: ModeFlags;
}

/**
 * Beamten-Rotation (GDD §3.1): Runde r (1-basiert) kontrolliert Spieler (r-1) mod n,
 * hier also `players[index % n]`. Sie ist bewusst deterministisch — jeder kommt dran,
 * und die Lobby kann sie vorab anzeigen.
 */
export function officerIndexFor(roundIndex: number, playerCount: number): number {
  if (playerCount <= 0) throw new RangeError('Keine Spieler.');
  return ((roundIndex % playerCount) + playerCount) % playerCount;
}

export function createRound(input: CreateRoundInput, rng: RandomSource = SECURE_RNG): Round {
  const players = input.players;
  if (players.length === 0) throw new RangeError('Keine Spieler.');

  const officer = players[officerIndexFor(input.index, players.length)]!;
  const travelerIds = players.filter((p) => p.id !== officer.id).map((p) => p.id);

  /* ADR-5: ein Item-Set pro Runde, sonst sind die Roentgen-Silhouetten nicht lesbar. */
  const itemSet = rng.pick(ITEM_SETS);

  const round: Round = {
    index: input.index,
    officerId: officer.id,
    travelerIds,
    itemSet,
    seed: createSeed(),
    modes: { ...input.modes },
    packs: {},
    hints: [],
    bribes: [],
    openings: [],
    maxOpenings: maxOpenings(players.length, input.modes),
  };

  /* Die Immunitaet faellt vor dem Packen — der Diplomat sieht sie auf seinem Pack-Screen. */
  if (input.modes.diplomat && travelerIds.length > 0) {
    round.diplomatId = rng.pick(travelerIds);
  }

  return round;
}

/* ------------------------------------------------------------------ */
/* Packen                                                              */
/* ------------------------------------------------------------------ */

/** Traegt ein Pack ein. Menge und Reisender werden geprueft; 0 = sauber. */
export function pack(round: Round, playerId: PlayerId, amount: number): Round {
  if (!round.travelerIds.includes(playerId)) {
    throw new Error(`${playerId} reist in dieser Runde nicht (Beamter oder unbekannt).`);
  }
  if (!isValidAmount(amount, round.modes)) {
    throw new RangeError(`Ungueltige Menge: ${amount}`);
  }
  return { ...round, packs: { ...round.packs, [playerId]: { playerId, amount } } };
}

export function allPacked(round: Round): boolean {
  return round.travelerIds.every((id) => round.packs[id] !== undefined);
}

/** Reisende mit Ware — nur intern und ab RESULT oeffentlich. */
export function smugglerIds(round: Round): PlayerId[] {
  return round.travelerIds.filter((id) => (round.packs[id]?.amount ?? 0) > 0);
}

export function amountOf(round: Round, playerId: PlayerId): number {
  return round.packs[playerId]?.amount ?? 0;
}

/* ------------------------------------------------------------------ */
/* Hinweise (genau einmal bei PACKED → HALL)                           */
/* ------------------------------------------------------------------ */

export function startHall(round: Round, rng: RandomSource = SECURE_RNG): Round {
  if (!allPacked(round)) throw new Error('Es haben noch nicht alle Reisenden gepackt.');
  if (round.hints.length > 0) throw new Error('Die Hinweise dieser Runde stehen bereits.');

  const input = {
    travelerIds: round.travelerIds,
    packs: round.packs,
    playerCount: round.travelerIds.length + 1,
  };

  const next: Round = { ...round, hints: generateHints(input, rng) };

  if (round.modes.sniffer) {
    const dog = generateDogHint(input, rng);
    if (dog) {
      next.dogHintOf = dog.suitcaseOf;
      next.dogBarks = dog.barks;
    }
  }

  return next;
}

/* ------------------------------------------------------------------ */
/* Bestechung (Modus, GDD §3.7)                                        */
/* ------------------------------------------------------------------ */

/** Ein angenommenes Angebot sperrt den Koffer — er ist in INSPECT nicht mehr tippbar. */
export function isLocked(round: Round, playerId: PlayerId): boolean {
  return round.bribes.some((b) => b.from === playerId && b.accepted === true);
}

export function isOpened(round: Round, playerId: PlayerId): boolean {
  return round.openings.some((o) => o.suitcaseOf === playerId);
}

export function openingsLeft(round: Round): number {
  return Math.max(0, round.maxOpenings - round.openings.length);
}

/** Kann der Beamte diesen Koffer jetzt oeffnen? Die UI fragt genau das. */
export function canInspect(round: Round, playerId: PlayerId): boolean {
  return (
    round.travelerIds.includes(playerId) &&
    !isOpened(round, playerId) &&
    !isLocked(round, playerId) &&
    openingsLeft(round) > 0
  );
}

export function offerBribe(round: Round, from: PlayerId, amount: BribeAmount): Round {
  if (!round.modes.bribery) throw new Error('Bestechung ist in dieser Runde nicht aktiv.');
  if (!round.travelerIds.includes(from)) throw new Error(`${from} reist in dieser Runde nicht.`);
  if (amount < MIN_BRIBE || amount > MAX_BRIBE) throw new RangeError(`Ungueltiges Angebot: ${amount}`);

  const existing = round.bribes.find((b) => b.from === from);
  if (existing && existing.accepted !== null) {
    throw new Error('Ueber dieses Angebot wurde bereits entschieden.');
  }

  const offer: Bribe = { from, amount, accepted: null };
  const bribes = existing
    ? round.bribes.map((b) => (b.from === from ? offer : b))
    : [...round.bribes, offer];

  return { ...round, bribes };
}

export function resolveBribe(round: Round, from: PlayerId, accepted: boolean): Round {
  const offer = round.bribes.find((b) => b.from === from);
  if (!offer) throw new Error(`Kein Angebot von ${from}.`);
  if (offer.accepted !== null) throw new Error('Ueber dieses Angebot wurde bereits entschieden.');

  return {
    ...round,
    bribes: round.bribes.map((b) => (b.from === from ? { ...b, accepted } : b)),
  };
}

/* ------------------------------------------------------------------ */
/* Kontrolle                                                           */
/* ------------------------------------------------------------------ */

export interface InspectOutcome {
  round: Round;
  result: InspectResult;
}

/**
 * Der Beamte oeffnet einen Koffer. Eine reine Funktion pro Tap — der `InspectDirector`
 * inszeniert das Ergebnis, entscheidet aber nichts.
 */
export function inspect(
  round: Round,
  suitcaseOf: PlayerId,
  pickSequence: SequencePicker = defaultPicker
): InspectOutcome {
  if (!round.travelerIds.includes(suitcaseOf)) {
    throw new Error(`${suitcaseOf} hat in dieser Runde keinen Koffer.`);
  }
  if (isOpened(round, suitcaseOf)) throw new Error('Dieser Koffer ist bereits geoeffnet.');
  if (isLocked(round, suitcaseOf)) throw new Error('Dieser Koffer ist bezahlt und gesperrt.');
  if (openingsLeft(round) === 0) throw new Error('Keine Oeffnung mehr uebrig.');

  const amount = amountOf(round, suitcaseOf);
  /*
   * Der Diplomat wird nie erwischt — auch nicht mit vollem Koffer. Der Alarm setzt an
   * und bricht ab, der Beamte trinkt 3 und salutiert unfreiwillig (GDD §3.7).
   */
  const kind: InspectKind =
    round.diplomatId === suitcaseOf ? 'diplomat' : amount > 0 ? 'caught' : 'clean';

  const payout = inspectPayout(kind, suitcaseOf, round.officerId, amount);

  const result: InspectResult = {
    suitcaseOf,
    kind,
    amount: kind === 'clean' ? 0 : amount,
    drinkers: payout.drinkers,
    ...(payout.tokensTo ? { tokensTo: payout.tokensTo } : {}),
    sequenceId: pickSequence(kind),
  };

  return {
    round: { ...round, openings: [...round.openings, { suitcaseOf, result }] },
    result,
  };
}

/* ------------------------------------------------------------------ */
/* Schranke                                                            */
/* ------------------------------------------------------------------ */

/**
 * Reihenfolge des Schranken-Reveals (ADR-4): saubere Koffer zuerst, Schmuggler zuletzt.
 * Innerhalb der beiden Gruppen wird gemischt, damit die Reihenfolge nicht die Sitzordnung
 * verraet. Laeuft **einmal** beim Uebergang INSPECT → GATE.
 *
 * Ein nicht geoeffneter Diplomat passiert wie jeder andere (ADR-7).
 */
export function gateOrder(round: Round, rng: RandomSource = SECURE_RNG): PlayerId[] {
  const remaining = round.travelerIds.filter((id) => !isOpened(round, id));
  const cleans = remaining.filter((id) => amountOf(round, id) === 0);
  const smugglers = remaining.filter((id) => amountOf(round, id) > 0);
  return [...rng.shuffle(cleans), ...rng.shuffle(smugglers)];
}

/** Das Ergebnis eines Schranken-Durchgangs — erst hier wird die Menge oeffentlich. */
export function gateResultFor(
  round: Round,
  suitcaseOf: PlayerId,
  pickSequence: SequencePicker = defaultPicker
): GateResult {
  const amount = amountOf(round, suitcaseOf);
  const kind = amount > 0 ? 'smuggler' : 'ok';
  const tokensTo = gatePayout(kind, suitcaseOf, amount);

  return {
    suitcaseOf,
    kind,
    amount,
    ...(tokensTo ? { tokensTo } : {}),
    sequenceId: pickSequence(kind === 'smuggler' ? 'gateSmuggler' : 'gateOk'),
  };
}

export function runGate(
  round: Round,
  pickSequence: SequencePicker = defaultPicker,
  rng: RandomSource = SECURE_RNG
): { round: Round; gate: GateResult[] } {
  const order = round.gateOrder ?? gateOrder(round, rng);
  const gate = order.map((id) => gateResultFor(round, id, pickSequence));
  return { round: { ...round, gateOrder: order }, gate };
}

/* ------------------------------------------------------------------ */
/* Rundenabschluss                                                     */
/* ------------------------------------------------------------------ */

export function finishRound(round: Round, gate: readonly GateResult[]): RoundResult {
  const smugglers = smugglerIds(round);
  const bonuses = bonusesFor(round.officerId, round.openings, smugglers.length);

  return {
    ...round,
    gate: [...gate],
    bonuses,
    tokens: tallyTokens({
      openings: round.openings,
      gate,
      bonuses,
      bribes: round.bribes,
      officerId: round.officerId,
    }),
    distribution: [],
    banner: bannerFor(round.openings, smugglers.length),
    drinkers: collectDrinkers(round.openings),
  };
}
