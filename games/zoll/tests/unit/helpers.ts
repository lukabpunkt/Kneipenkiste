/**
 * Testhilfen: Spieler bauen, Runden mit festgelegten Packs erzeugen.
 *
 * Produktiv laufen Hinweise, Diplomat und Item-Set ueber `crypto` (CLAUDE.md). Fuer
 * reproduzierbare Tests wird stattdessen ein seedbarer PRNG injiziert — dieselbe
 * Schnittstelle, deterministisches Ergebnis.
 */

import { COLOR_IDS, PLAYER_COLORS } from '@/config/theme';
import { modeFlags, type ModeFlags } from '@/core/modes';
import { createRound, pack, startHall } from '@/core/round';
import { createSeededRng, type RandomSource } from '@/core/rng';
import type { Player, Round } from '@/core/types';

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const color = PLAYER_COLORS[i % PLAYER_COLORS.length]!;
    return {
      id: `p${i}`,
      name: color.nickname,
      colorId: COLOR_IDS[i % COLOR_IDS.length]!,
      symbol: color.symbol,
    };
  });
}

export function rngFor(seed: number): RandomSource {
  return createSeededRng(seed);
}

export interface RoundFixture {
  /** Gesamtzahl der Spieler inklusive Beamtem. */
  players?: number;
  /** Mengen der Reisenden in Reihenfolge von `travelerIds`. */
  amounts: number[];
  modes?: Partial<ModeFlags>;
  index?: number;
  seed?: number;
  /** Hinweise erzeugen (PACKED → HALL). */
  withHints?: boolean;
}

/** Eine Runde mit exakt vorgegebenen Packs — die Basis fast aller Regel-Tests. */
export function makeRound(fixture: RoundFixture): Round {
  const playerCount = fixture.players ?? fixture.amounts.length + 1;
  const rng = rngFor(fixture.seed ?? 1234);

  let round = createRound(
    {
      index: fixture.index ?? 0,
      players: makePlayers(playerCount),
      modes: modeFlags(fixture.modes),
    },
    rng
  );

  round.travelerIds.forEach((id, i) => {
    round = pack(round, id, fixture.amounts[i] ?? 0);
  });

  return fixture.withHints ? startHall(round, rng) : round;
}
