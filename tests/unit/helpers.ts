/**
 * Testhilfen: deterministische Boards ohne Zufall.
 *
 * Die Board-Logik ist rein — das macht sie testbar, ohne irgendetwas zu mocken. Die
 * einzige Zufallsquelle (`SecureRandom`) wird injiziert; hier stehen die Fakes dafuer.
 */

import { DEFAULT_MODES, DEFAULT_SETTINGS, type Modes, type Settings } from '@/config/rules';
import { createBoard, placeMine, placeTreasure } from '@/core/board';
import type { SecureRandom } from '@/core/rng';
import type { Board, Cell, Player, PlayerId } from '@/core/types';
import { COLOR_IDS } from '@/config/theme';

export function modes(patch: Partial<Modes> = {}): Modes {
  return { ...DEFAULT_MODES, ...patch };
}

/** `modes` darf hier teilweise angegeben werden — der Rest kommt aus den Defaults. */
export type SettingsPatch = Omit<Partial<Settings>, 'modes'> & { modes?: Partial<Modes> };

export function settings(patch: SettingsPatch = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...patch, modes: { ...DEFAULT_MODES, ...(patch.modes ?? {}) } };
}

/** Spieler mit stabilen IDs — Tests sollen lesbar sein, nicht zufaellig. */
export function players(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Spieler ${i + 1}`,
    colorId: COLOR_IDS[i % COLOR_IDS.length]!,
    outfit: { helmet: true as const, vest: false },
  }));
}

/** Liefert die vorgegebenen Zahlen der Reihe nach; danach wieder von vorn. */
export function fixedRandom(...values: number[]): SecureRandom {
  let i = 0;
  return {
    int(maxExclusive: number): number {
      const value = values[i % values.length] ?? 0;
      i += 1;
      return value % maxExclusive;
    },
  };
}

/** Legt die Kiste garantiert auf `cell` — der Fake liefert genau diesen Index. */
export function treasureAt(board: Board, cell: Cell, m: Modes = modes()): Board {
  return placeTreasure(board, m, fixedRandom(cell));
}

export interface BuildSpec {
  playerCount: number;
  /** Zelle → Leger scharfer Minen. */
  mines?: Record<Cell, PlayerId[]>;
  /** Zelle → Leger von Blindgaengern (Doppelagent). */
  duds?: Record<Cell, PlayerId[]>;
  /** Wo die Kiste(n) liegen. Ohne Angabe wird keine gelegt. */
  treasure?: Cell[];
  modes?: Modes;
}

/**
 * Baut ein Board mit exakt der gewuenschten Belegung — ueber die echten oeffentlichen
 * Funktionen, damit die Tests dieselben Invarianten durchlaufen wie das Spiel.
 * Nur die Kiste wird direkt gesetzt: Ihre Position kommt produktiv aus `crypto`.
 */
export function buildBoard(spec: BuildSpec): Board {
  const m = spec.modes ?? modes();
  let board = createBoard(spec.playerCount);

  for (const [cell, owners] of Object.entries(spec.mines ?? {})) {
    for (const owner of owners) board = placeMine(board, Number(cell), owner, 'mine', m);
  }
  for (const [cell, owners] of Object.entries(spec.duds ?? {})) {
    for (const owner of owners) board = placeMine(board, Number(cell), owner, 'dud', m);
  }

  return spec.treasure ? { ...board, treasure: [...spec.treasure] } : board;
}
