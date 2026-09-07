/**
 * Game-State-Machine (Architektur §3).
 *
 * Die FSM kennt keine Screens — sie haelt den Spielzustand, prueft die Guards und ruft
 * `enter`/`exit`-Hooks. Der Router (M1) haengt sich als Hook ein.
 *
 * Zwei verbindliche Zusagen (CLAUDE.md):
 *
 * 1. `dig()` laeuft **genau einmal pro Tap**, hier im `tileTap`-Effekt. Der `DigDirector`
 *    bekommt danach nur noch das fertige `DigResult` zu sehen und inszeniert es.
 * 2. Das **private Board liegt nur hier**. Screens erhalten es nie direkt, sondern ueber
 *    `view()` / `placeViewFor()` — die beiden einzigen Ausgaenge.
 */

import { MIN_PLAYERS, type Settings } from '@/config/rules';
import {
  createBoard,
  dig as digCell,
  replayView,
  fillRandomMines,
  minesComplete,
  placeMine as placeMineOn,
  placeTreasure,
  placeView,
  publicView,
  removeMine as removeMineFrom,
  hasPlacement,
} from './board';
import { distributeOrder, applyDistribution, finishRound } from './payout';
import { createSeed, secureRandom, type SecureRandom } from './rng';
import { playerAtTurn, randomClosedCell } from './turn';
import type {
  Board,
  Cell,
  DigResult,
  Distribution,
  PlaceView,
  Player,
  PlayerId,
  PublicView,
  ReplayView,
  RoundResult,
} from './types';
import type { MineKind } from './board';

export const GAME_STATES = [
  'TITLE',
  'LOBBY',
  'PASS',
  'PLACE',
  'BURIED',
  'DIG',
  'DISTRIBUTE',
  'RESULT',
] as const;
export type GameState = (typeof GAME_STATES)[number];

export type GameEvent =
  /** TITLE → LOBBY */
  | { type: 'start' }
  /** LOBBY → PASS(0) — "Feld verminen". Guard: mindestens 3 Spieler. */
  | { type: 'mine' }
  /** PASS → PLACE */
  | { type: 'tap' }
  /** PLACE → PASS(i+1) oder, beim letzten Spieler, PLACE → BURIED */
  | { type: 'bury' }
  /** BURIED → DIG — hier legt das Spiel die Kiste (ADR-4) */
  | { type: 'begin' }
  /** DIG → DIG: ein Tap auf eine geschlossene Platte. Hier entsteht das Ergebnis. */
  | { type: 'tileTap'; cell: Cell }
  /** DIG → DIG / DISTRIBUTE / RESULT: Der DigDirector ist mit der Inszenierung durch. */
  | { type: 'digShown' }
  /** DISTRIBUTE → DISTRIBUTE (naechster Besitzer) oder → RESULT */
  | { type: 'payout'; assignments: Record<PlayerId, number> }
  /** RESULT → PASS(0), Startspieler rotiert */
  | { type: 'nextRound' }
  /** RESULT → LOBBY */
  | { type: 'changePlayers' }
  /** PASS/PLACE/BURIED/DIG → LOBBY ("Runde abbrechen?") */
  | { type: 'cancel' };

export type GameEventType = GameEvent['type'];

export interface FsmContext {
  players: Player[];
  settings: Settings;
  /** Wer legt gerade Minen (PASS/PLACE)? Index in `players`. */
  playerIndex: number;
  /** Der wievielte Zug der Grabphase laeuft (0-basiert)? Treibt die Zugreihenfolge. */
  turnNumber: number;
  /** 1-basiert; treibt die Startspieler-Rotation. */
  roundIndex: number;
  /** Seed der laufenden Runde — bestimmt nur Inszenierung und Fundstuecke. */
  seed: number;
  /** **Privat.** Verlaesst die FSM nur ueber `view()` / `placeViewFor()`. */
  board: Board;
  /** Die Grabungen dieser Runde, in Reihenfolge. */
  digs: DigResult[];
  /** Das zuletzt erzeugte Ergebnis — der DigDirector spielt genau dieses ab. */
  lastDig: DigResult | null;
  /** Ab Rundenende gesetzt. */
  result: RoundResult | null;
  /** DISTRIBUTE: der wievielte Token-Besitzer ist dran. */
  distributeIndex: number;
}

export interface Transition {
  from: GameState;
  to: GameState;
  event: GameEvent;
  context: Readonly<FsmContext>;
}

export interface StateHooks {
  enter?: (context: Readonly<FsmContext>, from: GameState) => void;
  exit?: (context: Readonly<FsmContext>, to: GameState) => void;
}

export interface FsmOptions {
  players?: Player[];
  settings: Settings;
  /** Injizierbar fuer Tests; produktiv `createSeed` aus `rng.ts`. */
  makeSeed?: () => number;
  /** Injizierbar fuer Tests; produktiv `secureRandom` — die Quelle der Kistenposition. */
  secure?: SecureRandom;
  onTransition?: (transition: Transition) => void;
}

export interface Fsm {
  readonly state: GameState;
  readonly context: Readonly<FsmContext>;
  /** Wieviele Grabungen aufgeloest wurden — Testhilfe fuer "genau einmal pro Tap". */
  readonly digCount: number;

  can(event: GameEventType): boolean;
  /** Fuehrt den Uebergang aus. `false`, wenn das Event hier nicht erlaubt ist. */
  send(event: GameEvent): boolean;

  setPlayers(players: Player[]): void;
  setSettings(settings: Settings): void;

  /** PLACE: eigene Mine setzen bzw. wieder wegnehmen (Toggle, GDD §3.3). */
  togglePlacement(cell: Cell, kind: MineKind): boolean;
  /** PLACE: Bedenkzeit abgelaufen — der Rest wird zufaellig vergraben. */
  fillPlacements(): void;
  /** Darf der aktuelle Spieler "Vergraben" druecken? */
  canBury(): boolean;
  /** DIG: Zug-Timer abgelaufen — es wird eine zufaellige geschlossene Platte gegraben. */
  digRandom(): boolean;

  /** Wer ist gerade dran (PASS/PLACE bzw. DIG). */
  currentPlayer(): Player | undefined;
  /** Wer verteilt gerade (DISTRIBUTE)? */
  distributingPlayer(): Player | undefined;

  /** **Der einzige Board-Ausgang fuer Dig- und Result-Screen.** */
  view(): PublicView;
  /** Der Blick des Place-Screens auf die eigenen Sprengkoerper. */
  placeViewFor(playerId: PlayerId): PlaceView;
  /**
   * Das Feld-Replay (GDD §4.4). Der dritte und letzte Board-Ausgang — und der einzige,
   * der alles zeigt. Erlaubt ist er, weil die Runde an dieser Stelle vorbei ist: Es
   * gibt nichts mehr zu verraten, nur noch etwas zu erklaeren.
   */
  replay(): ReplayView;

  on(state: GameState, hooks: StateHooks): () => void;
  subscribe(listener: (transition: Transition) => void): () => void;
}

/** Welche Events sind in welchem State ueberhaupt zulaessig? */
const ALLOWED: Record<GameState, readonly GameEventType[]> = {
  TITLE: ['start'],
  LOBBY: ['mine'],
  PASS: ['tap', 'cancel'],
  PLACE: ['bury', 'cancel'],
  BURIED: ['begin', 'cancel'],
  DIG: ['tileTap', 'digShown', 'cancel'],
  // Kein `cancel`: Die Runde ist gelaufen, die Schluecke sind faellig.
  DISTRIBUTE: ['payout'],
  RESULT: ['nextRound', 'changePlayers'],
};

export function createFsm(options: FsmOptions): Fsm {
  const makeSeed = options.makeSeed ?? createSeed;
  const secure = options.secure ?? secureRandom;

  const context: FsmContext = {
    players: options.players ? [...options.players] : [],
    settings: options.settings,
    playerIndex: 0,
    turnNumber: 0,
    roundIndex: 0,
    seed: 0,
    board: createBoard(options.players?.length ?? MIN_PLAYERS),
    digs: [],
    lastDig: null,
    result: null,
    distributeIndex: 0,
  };

  let state: GameState = 'TITLE';
  let digCount = 0;

  const hooks = new Map<GameState, Set<StateHooks>>();
  const listeners = new Set<(transition: Transition) => void>();
  if (options.onTransition) listeners.add(options.onTransition);

  const playerIds = (): PlayerId[] => context.players.map((p) => p.id);

  const transition = (to: GameState, event: GameEvent): void => {
    const from = state;
    for (const hook of hooks.get(from) ?? []) hook.exit?.(context, to);
    state = to;
    for (const hook of hooks.get(to) ?? []) hook.enter?.(context, from);
    const payload: Transition = { from, to, event, context };
    for (const listener of [...listeners]) listener(payload);
  };

  /** Neue Runde: frisches Feld, frischer Seed, Rotation um eins weiter. */
  const beginRound = (): void => {
    context.roundIndex += 1;
    context.seed = makeSeed();
    context.board = createBoard(context.players.length);
    context.playerIndex = 0;
    context.turnNumber = 0;
    context.digs = [];
    context.lastDig = null;
    context.result = null;
    context.distributeIndex = 0;
  };

  const resetRound = (): void => {
    context.playerIndex = 0;
    context.turnNumber = 0;
    context.digs = [];
    context.lastDig = null;
    context.result = null;
    context.distributeIndex = 0;
    context.board = createBoard(context.players.length);
  };

  /** Wer gerade graebt — Zugreihenfolge, nicht Legereihenfolge. */
  const currentDigger = (): PlayerId => playerAtTurn(playerIds(), context.roundIndex, context.turnNumber);

  /*
   * `payout` ist laut ALLOWED nur in DISTRIBUTE erlaubt, und DISTRIBUTE wird
   * ausschliesslich ueber `closeRound()` betreten — das `context.result` setzt.
   * Der Wurf ist also unerreichbar und steht hier als Absicherung fuer den Fall,
   * dass jemand ALLOWED erweitert, ohne diesen Zusammenhang zu kennen.
   */
  const requireResult = (): RoundResult => {
    /* v8 ignore next */
    if (!context.result) throw new Error('Die Runde wurde nie abgeschlossen.');
    return context.result;
  };

  /** Am Rundenende: abrechnen. Wer Tokens hat, verteilt — sonst direkt zum Result. */
  const closeRound = (): GameState => {
    context.result = finishRound({
      index: context.roundIndex,
      seed: context.seed,
      modes: context.settings.modes,
      board: context.board,
      digs: context.digs,
    });
    context.distributeIndex = 0;
    /*
     * Heute hat immer jemand Tokens: Eine Runde endet nur mit einem Kistenfund, und der
     * Finder bekommt mindestens zwei (`rules.treasureTokens`). Der RESULT-Zweig ist die
     * Absicherung fuer den Balancing-Pass in M6.2 — wer die Kisten-Tokens auf 0 setzt,
     * soll einen leeren Distribute-Screen uebersprungen bekommen statt ihn zu sehen.
     */
    /* v8 ignore next */
    return distributeOrder(context.result).length > 0 ? 'DISTRIBUTE' : 'RESULT';
  };

  const resolveTarget = (event: GameEvent): GameState | null => {
    switch (event.type) {
      case 'start':
        return 'LOBBY';

      case 'mine':
        return context.players.length >= MIN_PLAYERS ? 'PASS' : null;

      case 'tap':
        return 'PLACE';

      case 'bury':
        if (
          !minesComplete(context.board, [context.players[context.playerIndex]!.id], context.settings.modes)
        ) {
          return null;
        }
        return context.playerIndex < context.players.length - 1 ? 'PASS' : 'BURIED';

      case 'begin':
        return 'DIG';

      case 'tileTap':
        return 'DIG';

      case 'digShown':
        return context.lastDig?.roundOver === true ? closeRound() : 'DIG';

      case 'payout':
        return context.distributeIndex + 1 < distributeOrder(requireResult()).length
          ? 'DISTRIBUTE'
          : 'RESULT';

      case 'nextRound':
        return 'PASS';

      case 'changePlayers':
      case 'cancel':
        return 'LOBBY';
    }
  };

  /** Seiteneffekte auf den Kontext — laufen vor dem eigentlichen Wechsel. */
  const applyEffects = (event: GameEvent, target: GameState): void => {
    switch (event.type) {
      case 'mine':
      case 'nextRound':
        beginRound();
        return;

      case 'bury':
        if (target === 'PASS') context.playerIndex += 1;
        return;

      /*
       * Die Kiste faellt hier — nach der Minenphase, mit `crypto`, uniform ueber alle
       * Zellen inklusive der verminten (ADR-4). Niemand am Tisch kennt die Position,
       * auch nicht der, der zuletzt gelegt hat.
       */
      case 'begin':
        context.board = placeTreasure(context.board, context.settings.modes, secure);
        return;

      /*
       * **Hier faellt die Entscheidung einer Grabung — genau einmal.** Der Director
       * inszeniert danach nur `context.lastDig`.
       */
      case 'tileTap': {
        const outcome = digCell(context.board, event.cell, currentDigger(), {
          modes: context.settings.modes,
          seed: context.seed,
        });
        context.board = outcome.board;
        context.lastDig = outcome.result;
        context.digs.push(outcome.result);
        digCount += 1;
        return;
      }

      case 'digShown':
        // Nach einer gezeigten Grabung ist der Naechste dran; am Rundenende zaehlt nichts mehr weiter.
        if (target === 'DIG') context.turnNumber += 1;
        return;

      case 'payout': {
        const result = requireResult();
        const from = distributeOrder(result)[context.distributeIndex]!;
        context.result = applyDistribution(result, from, event.assignments);
        context.distributeIndex += 1;
        return;
      }

      case 'cancel':
        resetRound();
        return;

      case 'start':
      case 'tap':
      case 'changePlayers':
        return;
    }
  };

  const fsm: Fsm = {
    get state() {
      return state;
    },
    get context() {
      return context;
    },
    get digCount() {
      return digCount;
    },

    can(eventType) {
      return ALLOWED[state].includes(eventType);
    },

    send(event) {
      if (!ALLOWED[state].includes(event.type)) return false;

      const target = resolveTarget(event);
      if (target === null) return false;

      applyEffects(event, target);
      transition(target, event);
      return true;
    },

    setPlayers(players) {
      context.players = [...players];
      if (context.playerIndex >= context.players.length) context.playerIndex = 0;
      // Die Feldgroesse haengt an der Spielerzahl (GDD §3.2) — solange keine Runde laeuft.
      if (state === 'TITLE' || state === 'LOBBY') context.board = createBoard(context.players.length);
    },

    setSettings(settings) {
      context.settings = settings;
    },

    togglePlacement(cell, kind) {
      if (state !== 'PLACE') return false;
      const playerId = context.players[context.playerIndex]!.id;
      if (hasPlacement(context.board, cell, playerId) !== null) {
        context.board = removeMineFrom(context.board, cell, playerId);
        return true;
      }
      try {
        context.board = placeMineOn(context.board, cell, playerId, kind, context.settings.modes);
        return true;
      } catch {
        // Kontingent voll: Der Screen sagt es dem Spieler, die Logik bleibt unveraendert.
        return false;
      }
    },

    fillPlacements() {
      if (state !== 'PLACE') return;
      const playerId = context.players[context.playerIndex]!.id;
      context.board = fillRandomMines(context.board, playerId, context.settings.modes, secure);
    },

    canBury() {
      if (state !== 'PLACE') return false;
      const playerId = context.players[context.playerIndex]!.id;
      return minesComplete(context.board, [playerId], context.settings.modes);
    },

    digRandom() {
      if (state !== 'DIG') return false;
      const cell = randomClosedCell(context.board, secure);
      // Ein volles Feld kann es nicht geben — die Kiste liegt auf einer Zelle, und die
      // Runde endet, sobald sie aufgegraben wird. Der Aufrufer soll trotzdem nicht raten.
      /* v8 ignore next */
      if (cell === null) return false;
      return fsm.send({ type: 'tileTap', cell });
    },

    currentPlayer() {
      if (state === 'DIG') return context.players.find((p) => p.id === currentDigger());
      return context.players[context.playerIndex];
    },

    distributingPlayer() {
      if (state !== 'DISTRIBUTE' || !context.result) return undefined;
      const id = distributeOrder(context.result)[context.distributeIndex];
      return context.players.find((p) => p.id === id);
    },

    view() {
      return publicView(context.board);
    },

    placeViewFor(playerId) {
      return placeView(context.board, playerId);
    },

    replay() {
      return replayView(context.board);
    },

    on(target, stateHooks) {
      let set = hooks.get(target);
      if (!set) {
        set = new Set();
        hooks.set(target, set);
      }
      set.add(stateHooks);
      return () => {
        hooks.get(target)?.delete(stateHooks);
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return fsm;
}

export type { Distribution };
