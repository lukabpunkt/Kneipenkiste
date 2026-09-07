/**
 * Simulation fuer Dev-Panel, Property-Tests und den Balancing-Pass in M6
 * (Architektur §8, Roadmap M6.2).
 *
 * Sie beantwortet die eine Balancing-Frage: Wie oft kracht es bei zufaelliger Wahl, je
 * Spielerzahl und Balkenzahl? Bei rein zufaelliger Wahl ist das die Untergrenze — echte
 * Gruppen sprechen sich ab und liegen darunter, bis jemand luegt.
 */

import { createBridge, isDeathZone } from './bridge';
import { resolvePayout } from './payout';
import { createSeededRng, type SeededRng } from './rng';
import { noModes, type ModeFlags } from './modes';
import type { Bridge, Choice, PlayerId, Round } from './types';

export interface SimulationOptions {
  playerCount: number;
  /** Standard: die frische Bruecke `n + 2`. */
  plankCount?: number;
  rounds: number;
  seed: number;
  modes?: ModeFlags;
}

export interface SimulationReport {
  playerCount: number;
  plankCount: number;
  rounds: number;
  deathZone: boolean;
  /** Anteil der Runden mit mindestens einer Kollision. */
  collisionRate: number;
  massCollisionRate: number;
  allSafeRate: number;
  /** Durchschnittlich getrunkene Schlucke pro Runde ueber alle Spieler. */
  sipsPerRound: number;
}

function bridgeWith(playerCount: number, plankCount: number | undefined): Bridge {
  const bridge = createBridge(playerCount);
  if (plankCount === undefined || plankCount >= bridge.count) return bridge;

  /* Von hinten kuerzen: Fuer die Statistik zaehlt die Anzahl, nicht welche Nummern fehlen. */
  const planks = bridge.planks.slice(0, plankCount);
  return {
    count: plankCount,
    planks,
    removed: bridge.planks.slice(plankCount),
  };
}

function randomRound(
  index: number,
  playerIds: PlayerId[],
  bridge: Bridge,
  modes: ModeFlags,
  rng: SeededRng
): Round {
  const choices: Record<PlayerId, Choice> = {};
  for (const id of playerIds) choices[id] = { plank: rng.pick(bridge.planks) };
  return { index, seed: rng.int(0xffffffff), playerIds, modes, bridge, choices };
}

/**
 * `rounds` Runden mit rein zufaelliger Wahl. Deterministisch ueber den Seed — dasselbe
 * Panel zeigt morgen dieselben Zahlen.
 */
export function simulate(options: SimulationOptions): SimulationReport {
  const rng = createSeededRng(options.seed);
  const modes = options.modes ?? noModes();
  const playerIds = Array.from({ length: options.playerCount }, (_, i) => `p${i + 1}`);
  const bridge = bridgeWith(options.playerCount, options.plankCount);

  let collisions = 0;
  let massCollisions = 0;
  let allSafe = 0;
  let sips = 0;

  for (let i = 0; i < options.rounds; i += 1) {
    const payout = resolvePayout(randomRound(i, playerIds, bridge, modes, rng));
    if (payout.groups.some((g) => g.collision)) collisions += 1;
    if (payout.outcome === 'massCollision') massCollisions += 1;
    if (payout.outcome === 'allSafe') allSafe += 1;
    for (const drinker of payout.drinkers) sips += drinker.sips;
  }

  return {
    playerCount: options.playerCount,
    plankCount: bridge.count,
    rounds: options.rounds,
    deathZone: isDeathZone(bridge, options.playerCount),
    collisionRate: collisions / options.rounds,
    massCollisionRate: massCollisions / options.rounds,
    allSafeRate: allSafe / options.rounds,
    sipsPerRound: sips / options.rounds,
  };
}

/** Die Matrix fuer den Balancing-Pass: jede Spielerzahl von `B_min` bis `B_0`. */
export function simulateMatrix(rounds: number, seed: number): SimulationReport[] {
  const reports: SimulationReport[] = [];
  for (let playerCount = 3; playerCount <= 8; playerCount += 1) {
    for (let plankCount = playerCount - 1; plankCount <= playerCount + 2; plankCount += 1) {
      reports.push({ ...simulate({ playerCount, plankCount, rounds, seed: seed + playerCount * 31 + plankCount }) });
    }
  }
  return reports;
}
