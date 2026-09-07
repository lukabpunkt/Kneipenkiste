/**
 * Datenmodell (Architektur §4).
 *
 * Die Typen liegen in einer eigenen Datei, damit `board.ts`, `payout.ts` und `modes.ts`
 * sich nicht gegenseitig importieren muessen (dieselbe Loesung wie im Tresor, ADR-6 dort).
 *
 * **Die wichtigste Zeile dieses Projekts** steht bei `OpenedCell`: Was hier drinsteht,
 * darf jeder am Tisch sehen. Was nicht drinsteht, weiss nur der Store.
 */

import type { BoardSize, Hint, Modes, Settings } from '@/config/rules';
import type { ColorId, CritterId } from '@/config/theme';

export type PlayerId = string;

/** Index einer Zelle: 0 .. size*size-1, zeilenweise von oben links. */
export type Cell = number;

export interface Player {
  id: PlayerId;
  /** max. 12 Zeichen (GDD §3.1). */
  name: string;
  colorId: ColorId;
  outfit: {
    /** Jeder Digger traegt den Bauhelm in Spielerfarbe (Art Direction §5). */
    helmet: true;
    vest: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Das Feld                                                            */
/* ------------------------------------------------------------------ */

/**
 * Was unter einer Platte liegt. Mehrere Spieler duerfen dieselbe Zelle waehlen —
 * sie wissen es beim Legen nicht (GDD §3.2 "Minen stapeln").
 */
export interface MineStack {
  cell: Cell;
  /** Leger scharfer Minen. Je Spieler hoechstens einmal pro Zelle. */
  owners: PlayerId[];
  /** Leger von Blindgaengern (nur im Doppelagent-Modus). */
  duds: PlayerId[];
}

/**
 * Eine aufgegrabene Zelle — **das ist der oeffentliche Teil des Feldes.**
 *
 * CLAUDE.md / ADR-2: Eine aufgegrabene **eigene** Mine erzeugt exakt dasselbe Objekt wie
 * ein leeres Feld (`kind: 'empty'`, `blamed: []`). Wer hier ein Feld ergaenzt, das die
 * beiden Faelle unterscheidbar macht, nimmt dem Spiel seinen Kern —
 * `tests/unit/publicView.test.ts` schlaegt dann fehl.
 */
export interface OpenedCell {
  cell: Cell;
  /** Wer diese Platte aufgegraben hat. */
  by: PlayerId;
  kind: DigKind;
  hint: Hint;
  /** Legerfarben, die ueber dem Krater gezeigt werden — nie eigene Minen des Graebers. */
  blamed: PlayerId[];
  /** Das Fundstueck im Loch. Kommt aus dem Seed, nicht aus dem Inhalt der Zelle. */
  critter?: CritterId;
  /** Die Zelle wurde nicht selbst gegraben, sondern von einer Kettenreaktion aufgerissen. */
  byChain?: true;
}

export type DigKind = 'empty' | 'crater' | 'treasure' | 'greed' | 'dud';

export interface Board {
  size: BoardSize;
  /**
   * **Privat.** Verlaesst den Store nur ueber `publicView` (nichts davon) bzw.
   * `replayView` (am Rundenende, wenn alles vorbei ist). Der Place-Screen bekommt
   * die eigenen Minen des aktuellen Spielers ueber `placeView`.
   */
  mines: Record<Cell, MineStack>;
  /** **Privat.** 1 Kiste, im Modus "Zwei Kisten" 2. Niemand am Tisch kennt die Position. */
  treasure: Cell[];
  /** Oeffentlich: was schon aufgegraben ist. */
  opened: Record<Cell, OpenedCell>;
  /** Wieviele Kisten schon gefunden wurden — Rundenende-Bedingung. */
  treasureFound: Cell[];
}

/* ------------------------------------------------------------------ */
/* Was die UI sehen darf                                               */
/* ------------------------------------------------------------------ */

/**
 * Der Blick, den Dig- und Result-Screen bekommen (Architektur §4).
 * Enthaelt bewusst **keine** ungeoeffnete Mine und **keine** Kistenposition.
 */
export interface PublicView {
  size: BoardSize;
  opened: Record<Cell, OpenedCell>;
  /** Wieviele scharfe Minen insgesamt noch im Boden liegen — eine Zahl, keine Orte. */
  minesRemaining: number;
  /** Wieviele Kisten noch zu finden sind. */
  chestsRemaining: number;
}

/** Der Blick des Place-Screens: leeres Feld plus die eigenen Sprengkoerper. */
export interface PlaceView {
  size: BoardSize;
  /** Zellen, auf denen der Betrachter eine scharfe Mine liegen hat. */
  ownMines: Cell[];
  /** Zellen, auf denen der Betrachter einen Blindgaenger liegen hat (Doppelagent). */
  ownDuds: Cell[];
}

/** Eine Zelle im Feld-Replay am Rundenende — jetzt darf alles sichtbar werden. */
export interface ReplayCell {
  cell: Cell;
  /** Der oeffentliche Zustand, falls die Zelle aufgegraben wurde. */
  opened?: OpenedCell;
  /** Leger scharfer Minen, die hier lagen. */
  mineOwners: PlayerId[];
  /** Leger von Blindgaengern, die hier lagen. */
  dudOwners: PlayerId[];
  /** Lag hier eine Kiste? */
  treasure: boolean;
  /**
   * Mine lag hier und ist nie hochgegangen — bekommt das "Phew"-Schild (GDD §4.4).
   * Das ist der Aha-Moment: "DA lag deine Mine? Direkt neben meinem Zug!"
   */
  neverTriggered: boolean;
}

export interface ReplayView {
  size: BoardSize;
  cells: ReplayCell[];
}

/* ------------------------------------------------------------------ */
/* Ergebnis einer Grabung                                              */
/* ------------------------------------------------------------------ */

/** Was die Kettenreaktion nebenbei aufgerissen hat (GDD §3.6). */
export interface ChainReveal {
  cell: Cell;
  owners: PlayerId[];
  hint: Hint;
}

/**
 * Das Ergebnis eines Taps. `core/board.ts#dig` erzeugt es **genau einmal**;
 * der `DigDirector` inszeniert es nur noch (CLAUDE.md).
 */
export interface DigResult {
  cell: Cell;
  by: PlayerId;
  kind: DigKind;
  hint: Hint;
  /** Leger fremder scharfer Minen. Je Spieler hoechstens einmal. */
  foreignMines: PlayerId[];
  /** Leger fremder Blindgaenger (Doppelagent). */
  dudOwners: PlayerId[];
  /**
   * **Intern.** Der Graeber ist auf seinen eigenen Trittstein getreten.
   * Wird nie angezeigt, nie vertont, nie in `publicView` gespiegelt (ADR-2) — das
   * Feld existiert nur, damit `payout.ts` den "Feigling" des Sprengmeister-Bonus zaehlen kann.
   */
  ownMineConsumed: boolean;
  /** Ebenso intern: eigener Blindgaenger, ebenfalls stumm. */
  ownDudConsumed: boolean;
  treasureFound: boolean;
  chainReveals: ChainReveal[];
  roundOver: boolean;
  /** Welche Inszenierung gespielt wurde — ab M2 gefuellt. */
  sequenceId: string;
}

/* ------------------------------------------------------------------ */
/* Runde & Session                                                     */
/* ------------------------------------------------------------------ */

export type DrinkReason = 'mine' | 'coward';

export interface Drinker {
  playerId: PlayerId;
  sips: number;
  reason: DrinkReason;
}

/** Eine Zeile im Kill-Feed: "Rudi → Anna". */
export interface Kill {
  layer: PlayerId;
  victim: PlayerId;
  cell: Cell;
}

export interface RoundResult {
  /** 1-basiert. */
  index: number;
  size: BoardSize;
  seed: number;
  modes: Modes;
  digs: DigResult[];
  drinkers: Drinker[];
  kills: Kill[];
  /** Verteil-Tokens pro Spieler, bevor verteilt wurde. */
  tokens: Record<PlayerId, number>;
  /** Wer wem am Ende wieviel zugeteilt hat (DISTRIBUTE-Screen). */
  distribution: Distribution[];
  /** Wer die Kiste(n) gefunden hat — Reihenfolge der Funde. */
  finderIds: PlayerId[];
  replay: ReplayCell[];
}

export interface Distribution {
  from: PlayerId;
  to: PlayerId;
  sips: number;
}

export interface Session {
  players: Player[];
  settings: Settings;
  rounds: RoundResult[];
  /** Wieviele Runden schon gespielt wurden — treibt die Startspieler-Rotation. */
  roundIndex: number;
}
