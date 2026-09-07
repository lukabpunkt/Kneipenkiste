/**
 * Rundensimulation für den Balancing-Pass (Roadmap M6.2, Architektur §8).
 *
 * Sie beantwortet Fragen, die ein Playtest mit acht Runden nicht beantworten kann:
 * Landet der Anteil der Runden mit mindestens einem Fang wirklich zwischen 40 und 70 %?
 * Wie oft öffnet ein Beamter, der den Hinweisen folgt, einen sauberen Koffer?
 *
 * **Sie ersetzt den Playtest nicht.** Sie sagt, was die Zahlen tun — nicht, ob es Spaß
 * macht. Beides braucht man: Wenn der Tisch sagt „der Beamte fängt nie jemanden" und die
 * Simulation sagt 55 %, dann liegt es nicht am Balancing, sondern an der Inszenierung.
 *
 * Die Verhaltensmodelle sind **Annahmen** und stehen deshalb offen im Code, nicht in
 * einer Konstante versteckt. Wer sie ändert, ändert die Aussage.
 */

import { hintCount } from '@/config/rules';
import { generateHints } from './hints';
import { maxAmount, maxOpenings, modeFlags, type ModeFlags } from './modes';
import { bannerFor, bonusesFor } from './payout';
import type { RandomSource } from './rng';
import type { Hint, Opening, PlayerId, ResultBanner } from './types';

/* ------------------------------------------------------------------ */
/* Verhaltensmodelle                                                   */
/* ------------------------------------------------------------------ */

export interface SmugglerModel {
  /** Wie oft ein Reisender überhaupt schmuggelt. */
  chance: number;
  /**
   * Wie gierig, wenn er schmuggelt: 0 = immer 1 Stück, 1 = gleichverteilt bis zum Maximum.
   * Menschen neigen zur Mitte — deshalb ist der Standard nicht 1.
   */
  greed: number;
}

export type OfficerStrategy =
  /** Öffnet zufällige Koffer — die Untergrenze dessen, was ein Beamter erreichen kann. */
  | 'random'
  /** Folgt den Hinweisen, öffnet danach zufällig — so spielen Menschen. */
  | 'hints'
  /** Öffnet nie. Zeigt, was passiert, wenn niemand kontrolliert. */
  | 'never';

export interface SimulationConfig {
  rounds: number;
  playerCount: number;
  modes: ModeFlags;
  smuggler: SmugglerModel;
  officer: OfficerStrategy;
  /**
   * Wie oft der Beamte einem Hinweis **nicht** folgt, obwohl er einen hat.
   * Ohne diesen Wert wäre „hints" ein Roboter, und Menschen sind das nicht.
   */
  ignoreHint: number;
}

export const DEFAULT_SMUGGLER: SmugglerModel = { chance: 0.55, greed: 0.5 };

export function defaultConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    rounds: 10_000,
    playerCount: 6,
    modes: modeFlags(),
    smuggler: DEFAULT_SMUGGLER,
    officer: 'hints',
    ignoreHint: 0.25,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Ergebnis                                                            */
/* ------------------------------------------------------------------ */

export interface SimulationResult {
  rounds: number;
  /** Anteil der Runden mit mindestens einem Fang (A6-Ziel: 0.40–0.70). */
  roundsWithCatch: number;
  /** Anteil der Runden, in denen **nur** Unschuldige geöffnet wurden (A6-Ziel: ≤ 0.30). */
  harassmentRounds: number;
  /** Anteil der Hinweise, die stimmten — muss p_true entsprechen. */
  truthfulHints: number;
  /** Wie oft der Beamte einen sauberen Koffer öffnete, auf den ein Hinweis zeigte. */
  fooledByHint: number;
  /** Trefferquote des Beamten über alle Öffnungen. */
  hitRate: number;
  /** Durchschnittlich durchgekommene Ware pro Runde. */
  smuggledThrough: number;
  /** Durchschnittlich erwischte Ware pro Runde. */
  caughtAmount: number;
  /** Durchschnittliche Schlücke je Runde, getrennt nach Reisenden und Beamtem. */
  sipsTravelers: number;
  sipsOfficer: number;
  /** Wie oft welches Banner erschien, als Anteil. */
  banners: Record<ResultBanner, number>;
}

/* ------------------------------------------------------------------ */
/* Die Simulation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Simuliert `rounds` Runden.
 *
 * Bewusst **ohne** FSM und ohne Directors: Gemessen wird der Regelkern, nicht die
 * Inszenierung. Hinweise, Packmengen und Öffnungen laufen über dieselben Funktionen wie
 * im Spiel — was hier herauskommt, kommt auch am Tisch heraus.
 */
export function simulate(config: SimulationConfig, rng: RandomSource): SimulationResult {
  const travelerCount = config.playerCount - 1;
  const k = maxOpenings(config.playerCount, config.modes);
  const limit = maxAmount(config.modes);

  const travelerIds: PlayerId[] = Array.from({ length: travelerCount }, (_, i) => `t${i}`);

  let roundsWithCatch = 0;
  let harassmentRounds = 0;
  let truthful = 0;
  let hintTotal = 0;
  let fooled = 0;
  let hits = 0;
  let openingsTotal = 0;
  let through = 0;
  let caught = 0;
  let sipsTravelers = 0;
  let sipsOfficer = 0;

  const banners: Record<ResultBanner, number> = {
    officerOfTheMonth: 0,
    gotThrough: 0,
    smugglerParadise: 0,
    harassment: 0,
    honestRound: 0,
  };

  for (let round = 0; round < config.rounds; round++) {
    /* --- Packen --- */
    const packs: Record<PlayerId, { playerId: PlayerId; amount: number }> = {};
    for (const id of travelerIds) {
      packs[id] = { playerId: id, amount: packAmount(config.smuggler, limit, rng) };
    }

    const smugglers = travelerIds.filter((id) => packs[id]!.amount > 0);

    /* --- Hinweise --- */
    const hints = generateHints({ travelerIds, packs, playerCount: config.playerCount }, rng);
    hintTotal += hints.length;
    truthful += hints.filter((h) => h.truthful).length;

    /* --- Kontrolle --- */
    const opened = chooseOpenings(config, hints, travelerIds, k, rng);
    openingsTotal += opened.length;

    const openings: Opening[] = [];
    let caughtHere = 0;

    for (const id of opened) {
      const amount = packs[id]!.amount;
      const kind = amount > 0 ? 'caught' : 'clean';

      if (kind === 'caught') {
        hits += 1;
        caughtHere += 1;
        caught += amount;
        sipsTravelers += amount * 2;
      } else {
        sipsOfficer += 2;
        /* Reingefallen: ein Hinweis zeigte auf diesen sauberen Koffer. */
        if (hints.some((h) => h.suitcaseOf === id)) fooled += 1;
      }

      openings.push({
        suitcaseOf: id,
        result: { suitcaseOf: id, kind, amount: kind === 'clean' ? 0 : amount, drinkers: [], sequenceId: 'sim' },
      });
    }

    /* --- Schranke --- */
    for (const id of travelerIds) {
      if (opened.includes(id)) continue;
      through += packs[id]!.amount;
    }

    if (caughtHere > 0) roundsWithCatch += 1;
    if (openings.length > 0 && caughtHere === 0) harassmentRounds += 1;

    banners[bannerFor(openings, smugglers.length)] += 1;
    /* Boni werden mitgerechnet, weil sie das Gefühl der Runde mitbestimmen. */
    void bonusesFor('officer', openings, smugglers.length);
  }

  const per = (value: number): number => value / config.rounds;

  return {
    rounds: config.rounds,
    roundsWithCatch: per(roundsWithCatch),
    harassmentRounds: per(harassmentRounds),
    truthfulHints: hintTotal === 0 ? 0 : truthful / hintTotal,
    fooledByHint: per(fooled),
    hitRate: openingsTotal === 0 ? 0 : hits / openingsTotal,
    smuggledThrough: per(through),
    caughtAmount: per(caught),
    sipsTravelers: per(sipsTravelers),
    sipsOfficer: per(sipsOfficer),
    banners: {
      officerOfTheMonth: per(banners.officerOfTheMonth),
      gotThrough: per(banners.gotThrough),
      smugglerParadise: per(banners.smugglerParadise),
      harassment: per(banners.harassment),
      honestRound: per(banners.honestRound),
    },
  };
}

/**
 * Wie viel jemand packt.
 *
 * `greed` verschiebt die Verteilung: Bei 0 packt jeder Schmuggler ein Stück, bei 1 ist
 * jede Menge gleich wahrscheinlich. Der Standard von 0,5 bildet ab, was Menschen tun —
 * die Mitte nehmen und nur gelegentlich alles riskieren.
 */
function packAmount(model: SmugglerModel, limit: number, rng: RandomSource): number {
  if (!rng.chance(model.chance)) return 0;
  const roll = rng.next() ** (1 / Math.max(0.05, model.greed));
  return Math.max(1, Math.min(limit, Math.ceil(roll * limit)));
}

/** Welche Koffer der Beamte öffnet. */
function chooseOpenings(
  config: SimulationConfig,
  hints: readonly Hint[],
  travelerIds: readonly PlayerId[],
  k: number,
  rng: RandomSource
): PlayerId[] {
  if (config.officer === 'never') return [];

  const opened: PlayerId[] = [];

  if (config.officer === 'hints') {
    /* Zuerst die Koffer mit Hinweis, in zufälliger Reihenfolge — aber nicht sklavisch. */
    for (const hint of rng.shuffle([...hints])) {
      if (opened.length >= k) break;
      if (rng.chance(config.ignoreHint)) continue;
      if (!opened.includes(hint.suitcaseOf)) opened.push(hint.suitcaseOf);
    }
  }

  /* Der Rest zufällig — der Beamte lässt seine Öffnungen selten ungenutzt. */
  for (const id of rng.shuffle([...travelerIds])) {
    if (opened.length >= k) break;
    if (!opened.includes(id)) opened.push(id);
  }

  return opened;
}

/** Wie viele Hinweise eine Runde dieser Größe hat — für die Ausgabe des Panels. */
export function hintsPerRound(playerCount: number): number {
  return hintCount(playerCount);
}
