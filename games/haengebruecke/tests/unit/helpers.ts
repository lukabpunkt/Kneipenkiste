/**
 * Testhilfen. Sie bauen Runden von Hand, damit ein Test lesbar bleibt: "drei Spieler,
 * zwei davon auf Balken 3" statt zehn Zeilen Objektliteral.
 */

import { noModes, type ModeFlags } from '@/core/modes';
import { createBridge } from '@/core/bridge';
import type { Bridge, Choice, PlayerId, Round } from '@/core/types';
import type { Weight } from '@/config/rules';

export function playerIds(count: number): PlayerId[] {
  return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

/** Bruecke mit genau `count` Balken (1…count) — auch unterhalb von `n + 2`. */
export function bridgeOf(count: number): Bridge {
  return { count, planks: Array.from({ length: count }, (_, i) => i + 1), removed: [] };
}

export interface RoundOptions {
  /** Wahl pro Spieler: Balkennummer oder `'rope'`. Index == Spieler-Index. */
  picks: (number | 'rope')[];
  plankCount?: number;
  modes?: Partial<ModeFlags>;
  rottenPlank?: number;
  flags?: Record<PlayerId, number>;
  weights?: Record<PlayerId, Weight>;
  seed?: number;
  index?: number;
}

/**
 * Eine fertig gewaehlte Runde. `picks` liest sich wie das Ergebnis:
 * `[3, 3, 5]` heisst "p1 und p2 auf Balken 3, p3 auf Balken 5".
 */
export function roundOf(options: RoundOptions): Round {
  const ids = playerIds(options.picks.length);
  const bridge = options.plankCount === undefined
    ? createBridge(ids.length)
    : bridgeOf(options.plankCount);

  if (options.rottenPlank !== undefined) bridge.rottenPlank = options.rottenPlank;

  const choices: Record<PlayerId, Choice> = {};
  options.picks.forEach((pick, i) => {
    choices[ids[i]!] = pick === 'rope' ? { rope: true } : { plank: pick };
  });

  const round: Round = {
    index: options.index ?? 0,
    seed: options.seed ?? 12345,
    playerIds: ids,
    modes: { ...noModes(), ...options.modes },
    bridge,
    choices,
  };

  if (options.flags) round.flags = options.flags;
  if (options.weights) round.weights = options.weights;
  return round;
}

/** Wie viele Schlucke trinkt dieser Spieler in dieser Abrechnung? */
export function sipsOf(drinkers: readonly { playerId: PlayerId; sips: number }[], id: PlayerId): number {
  return drinkers.filter((d) => d.playerId === id).reduce((sum, d) => sum + d.sips, 0);
}

/**
 * Alle Verteilungen von `n` Spielern auf `b` Balken — als Liste von Balkennummern.
 * Das sind `b^n` Faelle; fuer n = 3…5 ist das die erschoepfende Matrix aus der DoD.
 */
export function allAssignments(playerCount: number, plankCount: number): number[][] {
  if (playerCount === 0) return [[]];
  const rest = allAssignments(playerCount - 1, plankCount);
  const out: number[][] = [];
  for (let plank = 1; plank <= plankCount; plank += 1) {
    for (const tail of rest) out.push([plank, ...tail]);
  }
  return out;
}
