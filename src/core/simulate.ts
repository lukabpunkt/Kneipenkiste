/**
 * Simulation fuer Dev-Panel, Property-Tests und den Balancing-Pass in M6
 * (Architektur §8, Roadmap M6.2).
 *
 * **Zwei Strategien, und die zweite ist die interessante.**
 *
 * `random` wuerfelt jede Wahl frei. Das ist der schlechteste Fall: Bei acht Leuten auf
 * zehn Balken kracht es dann in 98 % der Runden — eine Gruppe, die sich gar nicht
 * abspricht, wird zerlegt. Als Balancing-Aussage taugt die Zahl deshalb wenig; sie sagt
 * mehr ueber das Schubfachprinzip als ueber das Spiel.
 *
 * `negotiated` modelliert, was am Tisch passiert: Die Absprache verteilt jedem einen
 * eigenen Balken (solange es reicht), und dann bricht jeder mit Wahrscheinlichkeit
 * `defectRate` sein Wort und geht woanders hin. Erst diese Kurve laesst sich gegen den
 * A6-Korridor von 40–70 % Kollisionsrunden legen — denn genau das ist das Spiel:
 * Absprache plus Wortbruch (Design-Pfeiler 2).
 */

import { createBridge, isDeathZone } from './bridge';
import { resolvePayout } from './payout';
import { resolveRound } from './round';
import { createSeededRng, type SeededRng } from './rng';
import { noModes, type ModeFlags } from './modes';
import type { Bridge, Choice, PlayerId, Round } from './types';

/**
 * `random` — jeder wuerfelt frei.
 * `negotiated` — jeder haelt sich an die Absprache, ausser er bricht sein Wort.
 */
export type SimulationStrategy = 'random' | 'negotiated';

export interface SimulationOptions {
  playerCount: number;
  /** Standard: die frische Bruecke `n + 2`. */
  plankCount?: number;
  rounds: number;
  seed: number;
  modes?: ModeFlags;
  /** Standard: `random`. */
  strategy?: SimulationStrategy;
  /**
   * Wie oft jemand sein Wort bricht (0…1). Nur fuer `negotiated`; Standard 0,2.
   *
   * 0 heisst "alle halten sich daran" und ergibt ausserhalb der Todeszone null
   * Kollisionen — das ist kein Balancing-Fehler, sondern der Beweis, dass die Absprache
   * funktioniert, wenn sie funktioniert.
   */
  defectRate?: number;
}

export interface SimulationReport {
  playerCount: number;
  plankCount: number;
  rounds: number;
  deathZone: boolean;
  strategy: SimulationStrategy;
  /** Nur bei `negotiated` aussagekraeftig. */
  defectRate: number;
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
 * Die Absprache und ihr Bruch.
 *
 * Die Verteilung ist eine gemischte Zuordnung: Spieler i nimmt den i-ten Balken der
 * gemischten Liste. Reicht die Bruecke nicht (Todeszone), wird von vorn weitergezaehlt —
 * dann teilen sich zwei einen Balken, und genau das ist der Punkt (ADR-2).
 *
 * Wer sein Wort bricht, geht auf einen **anderen** Balken. Auf demselben zu bleiben waere
 * kein Wortbruch, und ihn zufaellig neu zu ziehen wuerde den Bruch verwaessern.
 */
function negotiatedRound(
  index: number,
  playerIds: PlayerId[],
  bridge: Bridge,
  modes: ModeFlags,
  rng: SeededRng,
  defectRate: number
): Round {
  const agreed = rng.shuffle(bridge.planks);
  const choices: Record<PlayerId, Choice> = {};

  playerIds.forEach((id, i) => {
    const promised = agreed[i % agreed.length]!;
    if (!rng.chance(defectRate) || bridge.planks.length < 2) {
      choices[id] = { plank: promised };
      return;
    }
    const others = bridge.planks.filter((plank) => plank !== promised);
    choices[id] = { plank: rng.pick(others) };
  });

  return { index, seed: rng.int(0xffffffff), playerIds, modes, bridge, choices };
}

/**
 * `rounds` Runden nach der gewaehlten Strategie. Deterministisch ueber den Seed — dasselbe
 * Panel zeigt morgen dieselben Zahlen.
 */
export function simulate(options: SimulationOptions): SimulationReport {
  const rng = createSeededRng(options.seed);
  const modes = options.modes ?? noModes();
  const playerIds = Array.from({ length: options.playerCount }, (_, i) => `p${i + 1}`);
  const bridge = bridgeWith(options.playerCount, options.plankCount);
  const strategy = options.strategy ?? 'random';
  const defectRate = options.defectRate ?? 0.2;

  let collisions = 0;
  let massCollisions = 0;
  let allSafe = 0;
  let sips = 0;

  for (let i = 0; i < options.rounds; i += 1) {
    const round =
      strategy === 'negotiated'
        ? negotiatedRound(i, playerIds, bridge, modes, rng, defectRate)
        : randomRound(i, playerIds, bridge, modes, rng);
    const payout = resolvePayout(round);
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
    strategy,
    defectRate,
    collisionRate: collisions / options.rounds,
    massCollisionRate: massCollisions / options.rounds,
    allSafeRate: allSafe / options.rounds,
    sipsPerRound: sips / options.rounds,
  };
}

/** Die Matrix fuer den Balancing-Pass: jede Spielerzahl von `B_min` bis `B_0`. */
export function simulateMatrix(
  rounds: number,
  seed: number,
  options: { strategy?: SimulationStrategy; defectRate?: number } = {}
): SimulationReport[] {
  const reports: SimulationReport[] = [];
  for (let playerCount = 3; playerCount <= 8; playerCount += 1) {
    for (let plankCount = playerCount - 1; plankCount <= playerCount + 2; plankCount += 1) {
      reports.push({
        ...simulate({
          playerCount,
          plankCount,
          rounds,
          seed: seed + playerCount * 31 + plankCount,
          ...options,
        }),
      });
    }
  }
  return reports;
}

export interface SessionReport {
  playerCount: number;
  rounds: number;
  defectRate: number;
  /** Anteil aller Runden mit Kollision — die Zahl, die A6 gegen 40–70 % legt. */
  collisionRate: number;
  /** Anteil der Runden, die in der Todeszone stattfanden. */
  deathZoneRate: number;
  /** Durchschnittliche Balkenzahl ueber die Sitzung. */
  averagePlankCount: number;
  /** Wie viele Runden es im Schnitt von der frischen Bruecke bis zur Todeszone dauert. */
  roundsToDeathZone: number | null;
  sipsPerRound: number;
}

/**
 * Eine **Sitzung** statt einzelner Runden — und das ist die Zahl, um die es in A6 geht.
 *
 * Die Matrix oben zeigt Momentaufnahmen bei fester Balkenzahl. Am Tisch ist die
 * Balkenzahl aber keine Einstellung, sondern ein Ergebnis: Jede friedliche Runde nimmt
 * einen Balken weg, jeder Krach baut die Bruecke wieder auf (GDD §3.7). Eine Gruppe, die
 * sich gut abspricht, schrumpft sich also selbst in die Enge, bis es kracht — und danach
 * fangt es von vorn an.
 *
 * Deshalb laeuft hier die echte Kette ueber `resolveRound()`: Ergebnis, Schrumpfen,
 * Reparatur, naechste Runde. Der Zufall kommt aus dem Seed, nicht aus `crypto` — sonst
 * waere die Zahl morgen eine andere.
 */
export function simulateSession(options: {
  playerCount: number;
  rounds: number;
  seed: number;
  defectRate?: number;
  modes?: ModeFlags;
}): SessionReport {
  const rng = createSeededRng(options.seed);
  const modes = options.modes ?? noModes();
  const defectRate = options.defectRate ?? 0.2;
  const playerIds = Array.from({ length: options.playerCount }, (_, i) => `p${i + 1}`);

  let bridge = createBridge(options.playerCount);
  let collisions = 0;
  let deathZoneRounds = 0;
  let plankSum = 0;
  let sips = 0;
  let firstDeathZone: number | null = null;

  for (let i = 0; i < options.rounds; i += 1) {
    plankSum += bridge.count;
    if (isDeathZone(bridge, options.playerCount)) {
      deathZoneRounds += 1;
      firstDeathZone ??= i + 1;
    }

    const round = negotiatedRound(i, playerIds, bridge, modes, rng, defectRate);
    const result = resolveRound(round, { rng });

    if (result.groups.some((g) => g.collision)) collisions += 1;
    for (const drinker of result.drinkers) sips += drinker.sips;

    bridge = result.nextBridge;
  }

  return {
    playerCount: options.playerCount,
    rounds: options.rounds,
    defectRate,
    collisionRate: collisions / options.rounds,
    deathZoneRate: deathZoneRounds / options.rounds,
    averagePlankCount: plankSum / options.rounds,
    roundsToDeathZone: firstDeathZone,
    sipsPerRound: sips / options.rounds,
  };
}

/**
 * Die Kurve, die der Balancing-Pass braucht: Kollisionsrate ueber der Wortbruch-Quote,
 * bei frischer Bruecke (`B = n + 2`).
 */
export function simulateDefectCurve(
  playerCount: number,
  rounds: number,
  seed: number,
  rates: readonly number[]
): SimulationReport[] {
  return rates.map((defectRate, i) =>
    simulate({
      playerCount,
      rounds,
      seed: seed + playerCount * 101 + i,
      strategy: 'negotiated',
      defectRate,
    })
  );
}
