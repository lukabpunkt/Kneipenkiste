/**
 * Gemeinsame Testhilfen: Spieler bauen, Settings zusammenstecken, Runden aufloesen.
 * Bewusst klein gehalten — die Tests sollen lesbar bleiben, nicht clever sein.
 */

import { DEFAULT_SETTINGS, type Hardness, type Modes, type Settings } from '@/config/rules';
import { COLOR_IDS } from '@/config/theme';
import { resolveRound } from '@/core/payout';
import type { Choice, Player, PlayerId, RoundResult, RoundSetup } from '@/core/types';

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    colorId: COLOR_IDS[i % COLOR_IDS.length]!,
    outfit: { mask: true as const, stripes: false },
  }));
}

export function makeIds(count: number): PlayerId[] {
  return makePlayers(count).map((p) => p.id);
}

export function makeSettings(overrides: Partial<Settings> = {}, modes: Partial<Modes> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    modes: { ...DEFAULT_SETTINGS.modes, ...modes },
  };
}

export function makeHardness(hardness: Hardness): Settings {
  return makeSettings({ hardness });
}

export interface SetupOverrides {
  vault: number;
  /** `true` an Position i = Spieler i stiehlt. */
  steals: readonly boolean[];
  seed?: number;
  index?: number;
  moleId?: PlayerId;
  oaths?: PlayerId[];
}

export function makeSetup(overrides: SetupOverrides): RoundSetup {
  const ids = makeIds(overrides.steals.length);
  const choices: Record<PlayerId, Choice> = {};
  ids.forEach((id, i) => {
    choices[id] = overrides.steals[i] ? 'steal' : 'share';
  });
  return {
    index: overrides.index ?? 1,
    vault: overrides.vault,
    seed: overrides.seed ?? 12345,
    oaths: overrides.oaths ?? [],
    choices,
    ...(overrides.moleId !== undefined ? { moleId: overrides.moleId } : {}),
  };
}

/** Kuerzester Weg zu einem Ergebnis: n Spieler, k Diebe (die ersten k stehlen). */
export function resolve(
  n: number,
  k: number,
  vault: number,
  settings: Settings = DEFAULT_SETTINGS,
  extra: Partial<SetupOverrides> = {}
): RoundResult {
  const steals = Array.from({ length: n }, (_, i) => i < k);
  return resolveRound(makeIds(n), makeSetup({ vault, steals, ...extra }), settings);
}

/** Was ein Spieler in dieser Runde trinkt. */
export function sips(result: RoundResult, playerId: PlayerId): number {
  return result.drinkers.reduce((sum, d) => (d.playerId === playerId ? sum + d.sips : sum), 0);
}
