/**
 * Das Feld — **reine Funktionen** (CLAUDE.md, Architektur §5).
 *
 * Kein Zustand, keine Seiteneffekte, kein `Math.random`: Jede Operation nimmt ein Board
 * und gibt ein neues zurueck. `dig()` entscheidet pro Tap genau einmal; der `DigDirector`
 * inszeniert danach nur noch das `DigResult`.
 *
 * ## Die Regel, um die sich alles dreht (ADR-2)
 *
 * Eine aufgegrabene **eigene** Mine ist von einem leeren Feld nicht zu unterscheiden —
 * in Daten, Bild und Ton. Dieses Modul haelt die Datenseite:
 *
 * - `dig()` liefert fuer beide Faelle `kind: 'empty'`, dieselbe `hint`, `blamed: []`
 *   und einen `critter`, der aus Seed und Zelle kommt statt aus dem Inhalt der Zelle.
 * - `publicView()` zaehlt `minesRemaining` ueber die **gezeigten** Explosionen, nicht
 *   ueber die tatsaechlich verbrauchten Minen — sonst wuerde die Zahl bei jedem
 *   Trittstein sichtbar sinken und die Regel durch die Hintertuer verraten.
 * - `ownMineConsumed` existiert nur fuer den "Feigling" des Sprengmeister-Bonus und
 *   verlaesst `payout.ts` nie.
 */

import {
  CHAIN_NEIGHBOURS,
  boardSizeFor,
  cellCount,
  chestCount,
  hintForDistance,
  loadoutFor,
  type BoardSize,
  type Hint,
  type Modes,
} from '@/config/rules';
import { CRITTER_IDS, type CritterId } from '@/config/theme';
import { createSeededRng, secureRandom, type SecureRandom } from './rng';
import type {
  Board,
  Cell,
  ChainReveal,
  DigKind,
  DigResult,
  MineStack,
  OpenedCell,
  PlaceView,
  PlayerId,
  PublicView,
  ReplayCell,
  ReplayView,
} from './types';

/* ------------------------------------------------------------------ */
/* Geometrie                                                           */
/* ------------------------------------------------------------------ */

export function cellToXY(cell: Cell, size: BoardSize): { x: number; y: number } {
  return { x: cell % size, y: Math.floor(cell / size) };
}

export function xyToCell(x: number, y: number, size: BoardSize): Cell {
  return y * size + x;
}

export function isOnBoard(cell: Cell, size: BoardSize): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < cellCount(size);
}

/** Chebyshev-Abstand (Koenigszuege) — die Grundlage der Temperatur-Hinweise (ADR-3). */
export function chebyshev(a: Cell, b: Cell, size: BoardSize): number {
  const pa = cellToXY(a, size);
  const pb = cellToXY(b, size);
  return Math.max(Math.abs(pa.x - pb.x), Math.abs(pa.y - pb.y));
}

/** Die bis zu 8 Koenigsnachbarn — Grundlage der Kettenreaktion (GDD §3.6). */
export function neighbours(cell: Cell, size: BoardSize): Cell[] {
  const { x, y } = cellToXY(cell, size);
  const out: Cell[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      out.push(xyToCell(nx, ny, size));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Board anlegen                                                       */
/* ------------------------------------------------------------------ */

export function createBoard(playerCount: number): Board {
  return {
    size: boardSizeFor(playerCount),
    mines: {},
    treasure: [],
    opened: {},
    treasureFound: [],
  };
}

/** Flache Kopie mit eigenen Sub-Objekten — Ausgangspunkt jeder Mutation. */
function cloneBoard(board: Board): Board {
  const mines: Record<Cell, MineStack> = {};
  for (const [key, stack] of Object.entries(board.mines)) {
    mines[Number(key)] = { cell: stack.cell, owners: [...stack.owners], duds: [...stack.duds] };
  }
  return {
    size: board.size,
    mines,
    treasure: [...board.treasure],
    opened: { ...board.opened },
    treasureFound: [...board.treasureFound],
  };
}

function stackAt(board: Board, cell: Cell): MineStack {
  return board.mines[cell] ?? { cell, owners: [], duds: [] };
}

/* ------------------------------------------------------------------ */
/* Minenphase (GDD §3.3)                                               */
/* ------------------------------------------------------------------ */

export type MineKind = 'mine' | 'dud';

/** Was ein Spieler bereits vergraben hat — Grundlage fuer Limit und Place-Screen. */
export function placementsOf(board: Board, playerId: PlayerId): { mines: Cell[]; duds: Cell[] } {
  const mines: Cell[] = [];
  const duds: Cell[] = [];
  for (const stack of Object.values(board.mines)) {
    if (stack.owners.includes(playerId)) mines.push(stack.cell);
    if (stack.duds.includes(playerId)) duds.push(stack.cell);
  }
  mines.sort((a, b) => a - b);
  duds.sort((a, b) => a - b);
  return { mines, duds };
}

/** Hat der Spieler auf dieser Zelle schon etwas liegen (Mine oder Blindgaenger)? */
export function hasPlacement(board: Board, cell: Cell, playerId: PlayerId): MineKind | null {
  const stack = stackAt(board, cell);
  if (stack.owners.includes(playerId)) return 'mine';
  if (stack.duds.includes(playerId)) return 'dud';
  return null;
}

/**
 * Vergraebt einen Sprengkoerper. Wirft, wenn das Kontingent erschoepft ist oder der
 * Spieler dieselbe Zelle ein zweites Mal waehlt (Architektur §5) — der Place-Screen
 * verhindert beides, aber die Logik verlaesst sich nicht darauf.
 *
 * Mehrere **verschiedene** Spieler duerfen dieselbe Zelle waehlen: Sie wissen beim Legen
 * nicht, ob dort schon etwas liegt (GDD §3.2 "Minen stapeln").
 */
export function placeMine(
  board: Board,
  cell: Cell,
  playerId: PlayerId,
  kind: MineKind,
  modes: Modes
): Board {
  if (!isOnBoard(cell, board.size)) {
    throw new RangeError(`Zelle ${cell} liegt nicht auf einem ${board.size} × ${board.size}-Feld.`);
  }
  if (hasPlacement(board, cell, playerId) !== null) {
    throw new Error(`Spieler ${playerId} hat auf Zelle ${cell} schon etwas liegen.`);
  }

  const limit = loadoutFor(modes);
  const placed = placementsOf(board, playerId);
  const used = kind === 'mine' ? placed.mines.length : placed.duds.length;
  const max = kind === 'mine' ? limit.mine : limit.dud;
  if (used >= max) {
    throw new Error(`Spieler ${playerId} hat sein Kontingent (${max} × ${kind}) schon vergraben.`);
  }

  const next = cloneBoard(board);
  const stack = next.mines[cell] ?? { cell, owners: [], duds: [] };
  if (kind === 'mine') stack.owners.push(playerId);
  else stack.duds.push(playerId);
  next.mines[cell] = stack;
  return next;
}

/** Nimmt die eigene Platzierung wieder weg (zweiter Tap auf dieselbe Platte, GDD §3.3). */
export function removeMine(board: Board, cell: Cell, playerId: PlayerId): Board {
  const existing = board.mines[cell];
  if (!existing) return board;

  const next = cloneBoard(board);
  const stack = next.mines[cell]!;
  stack.owners = stack.owners.filter((id) => id !== playerId);
  stack.duds = stack.duds.filter((id) => id !== playerId);
  if (stack.owners.length === 0 && stack.duds.length === 0) delete next.mines[cell];
  return next;
}

/**
 * Fuellt das Kontingent eines Spielers mit zufaelligen freien Zellen auf — der
 * Bedenkzeit-Fallback des Place-Screens (GDD §3.3). Laeuft ueber sicheren Zufall, damit
 * auch eine erzwungene Platzierung nicht aus einem Seed rekonstruierbar ist.
 */
export function fillRandomMines(
  board: Board,
  playerId: PlayerId,
  modes: Modes,
  rnd: SecureRandom = secureRandom
): Board {
  const limit = loadoutFor(modes);
  let next = board;

  for (const kind of ['mine', 'dud'] as const) {
    const max = kind === 'mine' ? limit.mine : limit.dud;
    while (true) {
      const placed = placementsOf(next, playerId);
      const used = kind === 'mine' ? placed.mines.length : placed.duds.length;
      if (used >= max) break;

      const free: Cell[] = [];
      for (let cell = 0; cell < cellCount(next.size); cell++) {
        if (hasPlacement(next, cell, playerId) === null) free.push(cell);
      }
      if (free.length === 0) break;
      next = placeMine(next, free[rnd.int(free.length)]!, playerId, kind, modes);
    }
  }

  return next;
}

/** Hat jeder Spieler sein Kontingent vergraben? */
export function minesComplete(board: Board, playerIds: readonly PlayerId[], modes: Modes): boolean {
  const limit = loadoutFor(modes);
  return playerIds.every((id) => {
    const placed = placementsOf(board, id);
    return placed.mines.length === limit.mine && placed.duds.length === limit.dud;
  });
}

/**
 * Legt die Kiste(n). **Nur hier** faellt sicherer Zufall auf eine Position
 * (CLAUDE.md), und zwar uniform ueber ALLE Zellen — auch ueber verminte (ADR-4).
 * Genau das macht die letzte Grabung nie sicher.
 */
export function placeTreasure(board: Board, modes: Modes, rnd: SecureRandom = secureRandom): Board {
  const cells = cellCount(board.size);
  const wanted = chestCount(modes);
  const chosen: Cell[] = [];

  while (chosen.length < wanted) {
    const cell = rnd.int(cells);
    // Zwei Kisten liegen nie auf derselben Zelle (Architektur §5).
    if (!chosen.includes(cell)) chosen.push(cell);
  }

  const next = cloneBoard(board);
  next.treasure = chosen;
  return next;
}

/* ------------------------------------------------------------------ */
/* Hinweise (GDD §3.4, ADR-3)                                          */
/* ------------------------------------------------------------------ */

/**
 * Temperatur einer Zelle: Chebyshev-Abstand zur naechstgelegenen Kiste.
 *
 * Gerechnet wird gegen **alle** Kisten, auch bereits gefundene. Sonst wuerden im Modus
 * "Zwei Kisten" die Hinweise nach dem ersten Fund plötzlich etwas anderes bedeuten als
 * die schon offen liegenden — und ein Hinweis, der sich nachtraeglich umdeutet, ist
 * schlimmer als gar keiner (Design-Prioritaet 4, Lesbarkeit).
 */
export function hintFor(board: Board, cell: Cell, modes: Modes): Hint {
  if (modes.nightDigger) return 'none';
  if (board.treasure.length === 0) return 'none';
  let best = Infinity;
  for (const chest of board.treasure) {
    const d = chebyshev(cell, chest, board.size);
    if (d < best) best = d;
  }
  return hintForDistance(best);
}

/**
 * Das Fundstueck im Loch. Haengt **ausschliesslich** an Seed und Zelle — nie am Inhalt
 * der Zelle. Waere es an den Inhalt gekoppelt, waere die eigene Mine an ihrem Wurm zu
 * erkennen (ADR-2).
 */
export function critterFor(seed: number, cell: Cell): CritterId {
  // Eigener Generator pro Zelle: unabhaengig davon, wieviele Zellen vorher gegraben wurden.
  return createSeededRng((seed ^ (cell * 0x9e3779b1)) >>> 0).pick(CRITTER_IDS);
}

/* ------------------------------------------------------------------ */
/* Graben (GDD §3.4, Architektur §5)                                   */
/* ------------------------------------------------------------------ */

export function isOpen(board: Board, cell: Cell): boolean {
  return board.opened[cell] !== undefined;
}

export function closedCells(board: Board): Cell[] {
  const out: Cell[] = [];
  for (let cell = 0; cell < cellCount(board.size); cell++) {
    if (!isOpen(board, cell)) out.push(cell);
  }
  return out;
}

export interface DigOptions {
  modes: Modes;
  /** Seed der Runde — bestimmt nur die Fundstuecke, nie den Inhalt einer Zelle. */
  seed: number;
}

/**
 * Ein Tap = eine Platte. Die einzige Stelle, an der ein Ergebnis entsteht (CLAUDE.md).
 *
 * Reihenfolge der Faelle (Architektur §5):
 * `greed` (Kiste + fremde Mine) → `treasure` → `crater` → `dud` → `empty`.
 * Die eigene Mine faellt in `empty` — bewusst, ohne eigenen Zweig, ohne eigenes Feld.
 */
export function dig(
  board: Board,
  cell: Cell,
  by: PlayerId,
  options: DigOptions
): { board: Board; result: DigResult } {
  if (!isOnBoard(cell, board.size)) {
    throw new RangeError(`Zelle ${cell} liegt nicht auf einem ${board.size} × ${board.size}-Feld.`);
  }
  if (isOpen(board, cell)) {
    throw new Error(`Zelle ${cell} ist schon aufgegraben.`);
  }

  const { modes, seed } = options;
  const stack = stackAt(board, cell);

  const foreignMines = stack.owners.filter((id) => id !== by);
  const dudOwners = stack.duds.filter((id) => id !== by);
  const ownMineConsumed = stack.owners.includes(by);
  const ownDudConsumed = stack.duds.includes(by);
  const hasTreasure = board.treasure.includes(cell);

  const kind: DigKind = hasTreasure
    ? foreignMines.length > 0
      ? 'greed'
      : 'treasure'
    : foreignMines.length > 0
      ? 'crater'
      : dudOwners.length > 0
        ? 'dud'
        : 'empty';

  const next = cloneBoard(board);

  /*
   * Die Kisten-Zelle traegt kein Temperatur-Icon: Sie ist das Ziel, kein Hinweis darauf.
   * Alles andere — Krater, Blindgaenger, leeres Feld und der stumme Trittstein —
   * bekommt exakt denselben Hinweis.
   */
  const hint: Hint = kind === 'treasure' || kind === 'greed' ? 'none' : hintFor(board, cell, modes);

  const opened: OpenedCell = {
    cell,
    by,
    kind,
    hint,
    blamed:
      kind === 'crater' || kind === 'greed' ? [...foreignMines] : kind === 'dud' ? [...dudOwners] : [],
    // Nur das leere Feld hat ein Fundstueck — und der Trittstein ist ein leeres Feld.
    ...(kind === 'empty' ? { critter: critterFor(seed, cell) } : {}),
  };
  next.opened[cell] = opened;

  if (hasTreasure) next.treasureFound.push(cell);

  const chainReveals =
    modes.chainReaction && (kind === 'crater' || kind === 'greed')
      ? applyChainReaction(next, cell, by, modes)
      : [];

  const result: DigResult = {
    cell,
    by,
    kind,
    hint,
    foreignMines,
    dudOwners,
    ownMineConsumed,
    ownDudConsumed,
    treasureFound: hasTreasure,
    chainReveals,
    roundOver: next.treasureFound.length >= next.treasure.length,
    sequenceId: '',
  };

  return { board: next, result };
}

/**
 * Kettenreaktion (GDD §3.6): Die scharfen Minen auf den 8 Nachbarfeldern gehen mit hoch.
 * Krater und Hinweise werden sichtbar, die Leger werden gezeigt, **niemand trinkt**.
 *
 * Drei bewusste Grenzen (ADR-7):
 * - **Keine Kaskade.** Nur die direkten Nachbarn des Tap-Feldes fliegen mit; sonst raeumt
 *   ein Tap im dichten Feld das halbe Brett und die Runde ist vorbei, bevor jemand
 *   nachvollziehen kann, was passiert ist.
 * - **Kisten sind sicher.** Eine Nachbarzelle mit Kiste bleibt zu. Sonst koennte die
 *   Runde enden, ohne dass jemand die Kiste *gefunden* haette — es gaebe keinen Finder,
 *   keine Tokens und keinen Moment.
 * - **Auch eigene Minen des Graebers werden gezeigt.** Das ist der einzige Ort, an dem
 *   ADR-2 nicht greift, und es ist Absicht: Der Modus soll Leger verraten. Der Trittstein
 *   ist in diesem Moment ohnehin schon verbraucht — es faellt keine Information ueber ein
 *   Feld, auf das noch jemand treten koennte.
 */
function applyChainReaction(board: Board, origin: Cell, by: PlayerId, modes: Modes): ChainReveal[] {
  const reveals: ChainReveal[] = [];

  for (const cell of neighbours(origin, board.size)) {
    if (isOpen(board, cell)) continue;
    if (board.treasure.includes(cell)) continue;

    const stack = board.mines[cell];
    if (!stack || stack.owners.length === 0) continue;

    const hint = hintFor(board, cell, modes);
    board.opened[cell] = {
      cell,
      by,
      kind: 'crater',
      hint,
      blamed: [...stack.owners],
      byChain: true,
    };
    reveals.push({ cell, owners: [...stack.owners], hint });
  }

  if (reveals.length > CHAIN_NEIGHBOURS) {
    throw new Error('Kettenreaktion hat mehr als die 8 Nachbarn erwischt — Geometrie kaputt.');
  }
  return reveals;
}

/* ------------------------------------------------------------------ */
/* Sichten (Architektur §4/§7) — was wer sehen darf                    */
/* ------------------------------------------------------------------ */

/**
 * Der Blick fuer Dig- und Result-Screen: nur Aufgegrabenes plus zwei Zahlen.
 * Keine ungeoeffnete Mine, keine Kistenposition.
 *
 * `minesRemaining` zaehlt ueber die **gezeigten** Explosionen, nicht ueber die
 * tatsaechlich verbrauchten Minen (ADR-8). Sonst wuerde die Zahl bei jedem stumm
 * aufgegrabenen Trittstein um eins fallen — und jeder am Tisch koennte an dieser einen
 * Ziffer ablesen, was das Spiel gerade verschweigt.
 */
export function publicView(board: Board): PublicView {
  let totalMines = 0;
  for (const stack of Object.values(board.mines)) totalMines += stack.owners.length;

  let revealed = 0;
  for (const opened of Object.values(board.opened)) {
    if (opened.kind === 'crater' || opened.kind === 'greed') revealed += opened.blamed.length;
  }

  return {
    size: board.size,
    opened: { ...board.opened },
    minesRemaining: totalMines - revealed,
    chestsRemaining: board.treasure.length - board.treasureFound.length,
  };
}

/** Der Blick des Place-Screens: leeres Feld plus die eigenen Sprengkoerper (GDD §3.3). */
export function placeView(board: Board, viewerId: PlayerId): PlaceView {
  const placed = placementsOf(board, viewerId);
  return { size: board.size, ownMines: placed.mines, ownDuds: placed.duds };
}

/**
 * Das Feld-Replay am Rundenende (GDD §4.4): Jetzt darf alles sichtbar werden — auch die
 * Minen, die nie hochgegangen sind. Das ist der zweite grosse Moment einer Runde.
 */
export function replayView(board: Board): ReplayView {
  const cells: ReplayCell[] = [];

  for (let cell = 0; cell < cellCount(board.size); cell++) {
    const stack = board.mines[cell];
    const opened = board.opened[cell];
    const mineOwners = stack ? [...stack.owners] : [];
    const dudOwners = stack ? [...stack.duds] : [];

    cells.push({
      cell,
      ...(opened ? { opened } : {}),
      mineOwners,
      dudOwners,
      treasure: board.treasure.includes(cell),
      // "Phew": Hier lag etwas scharfes, und niemand ist draufgetreten.
      neverTriggered: mineOwners.length > 0 && opened === undefined,
    });
  }

  return { size: board.size, cells };
}

/* ------------------------------------------------------------------ */
/* Debug — ausschliesslich fuer das Dev-Panel (`?dev=1`)               */
/* ------------------------------------------------------------------ */

/**
 * "Reveal mines" im Dev-Panel (Architektur §8). Bewusst als eigene, sprechend benannte
 * Funktion: Wer sie in einem Screen aufruft, faellt beim Lesen sofort auf.
 */
export function debugRevealAll(board: Board): ReplayView {
  return replayView(board);
}
