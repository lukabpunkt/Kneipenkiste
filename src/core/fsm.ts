/**
 * Game-State-Machine (Architektur §3).
 *
 * Die FSM kennt keine Screens — sie haelt den Spielzustand, prueft die Guards und ruft
 * `enter`/`exit`-Hooks. Der Router (M1) haengt sich als Hook ein.
 *
 * Verbindlich: `resolveRound()` laeuft **genau einmal** pro Runde, beim Uebergang
 * SEALED → STEP. `resolveCount` haelt das fuer den Test fest. Ab da liest die Show nur.
 */

import { MAX_PLAYERS, MIN_PLAYERS, type ModeFlags } from '@/config/rules';
import { createBridge } from './bridge';
import { consumeRopes, ropeAvailable, type RopeUsage } from './modes';
import { createSequencePicker, type SequencePicker } from './choreographer';
import { allChosen, choose, clearFlag, createRound, resolveRound, setFlag, setWeight } from './round';
import { SECURE_RNG, createSeed, type RandomSource } from './rng';
import { isRopeChoice } from './choice';
import type { Bridge, Choice, Distribution, PlankId, Player, PlayerId, Round, RoundResult } from './types';
import type { Weight } from '@/config/rules';

export const GAME_STATES = [
  'TITLE',
  'LOBBY',
  'NEGOTIATION',
  /** Modus "Nebel": zehn Sekunden Wind statt Absprache (GDD §3.6). */
  'SILENCE',
  'PASS',
  'CHOOSE',
  'SEALED',
  'STEP',
  'DISTRIBUTE',
  'RESULT',
] as const;
export type GameState = (typeof GAME_STATES)[number];

export type GameEvent =
  /** TITLE → LOBBY */
  | { type: 'start' }
  /** LOBBY → NEGOTIATION (bzw. SILENCE), Guard: 3–8 Spieler */
  | { type: 'go' }
  /** Absprache vorbei — Countdown abgelaufen oder "Alle bereit" */
  | { type: 'ready' }
  /** PASS → CHOOSE und SEALED → STEP */
  | { type: 'tap' }
  /** CHOOSE → PASS(i+1) oder, beim letzten Spieler, CHOOSE → SEALED */
  | { type: 'seal'; choice: Choice }
  /** STEP → DISTRIBUTE (wenn jemand verteilt) oder direkt RESULT */
  | { type: 'showFinished' }
  /** DISTRIBUTE: ein Verteiler ist durch */
  | { type: 'distributeNext'; distribution: Distribution[] }
  /** RESULT → NEGOTIATION mit geschrumpfter oder reparierter Bruecke */
  | { type: 'nextRound' }
  /** RESULT → LOBBY */
  | { type: 'changePlayers' }
  /** Runde abbrechen → LOBBY */
  | { type: 'cancel' }
  /** Hauptmenue → TITLE */
  | { type: 'quit' };

export type GameEventType = GameEvent['type'];

/** Bei allen Guthaben == 1 reicht das oeffentliche Badge-Grid (ADR-5). */
export type DistributeMode = 'quick' | 'iterate';

export interface FsmContext {
  players: Player[];
  modes: ModeFlags;
  roundIndex: number;
  /** Die Bruecke ueberlebt die Runde: geschrumpft oder repariert. */
  bridge: Bridge;
  ropeUsage: RopeUsage;
  /** Index in `players` waehrend PASS/CHOOSE. */
  playerIndex: number;
  round: Round | null;
  result: RoundResult | null;
  /** Wer diese Runde verteilt, in Lobby-Reihenfolge. */
  givers: PlayerId[];
  distributeIndex: number;
  distributeMode: DistributeMode;
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
  modes?: ModeFlags;
  /** Produktiv `crypto`; in Tests ein seedbarer PRNG fuer reproduzierbare Runden. */
  rng?: RandomSource;
  /** Ein Picker fuer die ganze Session — nur so gilt No-Repeat ueber Runden hinweg. */
  picker?: SequencePicker;
  onTransition?: (transition: Transition) => void;
}

export interface Fsm {
  readonly state: GameState;
  readonly context: Readonly<FsmContext>;
  /** Wie oft abgerechnet wurde — Testhilfe fuer "genau einmal pro Runde". */
  readonly resolveCount: number;
  /** Wer gerade waehlt (PASS/CHOOSE), sonst `null`. */
  currentPlayer(): PlayerId | null;
  /** Wer gerade verteilt (DISTRIBUTE), sonst `null`. */
  currentGiver(): PlayerId | null;
  /** Darf dieser Spieler jetzt noch das Seil nehmen? */
  canTakeRope(playerId: PlayerId): boolean;
  can(event: GameEventType): boolean;
  send(event: GameEvent): boolean;
  setPlayers(players: Player[]): void;
  setModes(modes: ModeFlags): void;
  /** Fahne setzen — nur waehrend der Absprache, und fuer alle sichtbar. */
  raiseFlag(playerId: PlayerId, plank: PlankId): boolean;
  lowerFlag(playerId: PlayerId): boolean;
  /** Rucksack-Gewicht — nur auf dem eigenen Choose-Screen. */
  chooseWeight(playerId: PlayerId, weight: Weight): boolean;
  on(state: GameState, hooks: StateHooks): () => void;
  subscribe(listener: (transition: Transition) => void): () => void;
}

const ALLOWED: Record<GameState, readonly GameEventType[]> = {
  TITLE: ['start'],
  LOBBY: ['go', 'quit'],
  NEGOTIATION: ['ready', 'cancel', 'quit'],
  SILENCE: ['ready', 'cancel', 'quit'],
  PASS: ['tap', 'cancel', 'quit'],
  CHOOSE: ['seal', 'cancel', 'quit'],
  SEALED: ['tap', 'cancel', 'quit'],
  STEP: ['showFinished', 'cancel', 'quit'],
  DISTRIBUTE: ['distributeNext', 'quit'],
  RESULT: ['nextRound', 'changePlayers', 'quit'],
};

export function createFsm(options: FsmOptions = {}): Fsm {
  const rng = options.rng ?? SECURE_RNG;
  const picker = options.picker ?? createSequencePicker(createSeed());

  const context: FsmContext = {
    players: options.players ? [...options.players] : [],
    modes: options.modes ? { ...options.modes } : { flags: false, rotten: false, weights: false, fog: false, rope: false },
    roundIndex: 0,
    bridge: createBridge(Math.max(MIN_PLAYERS, options.players?.length ?? MIN_PLAYERS)),
    ropeUsage: {},
    playerIndex: 0,
    round: null,
    result: null,
    givers: [],
    distributeIndex: 0,
    distributeMode: 'quick',
  };

  let state: GameState = 'TITLE';
  let resolveCount = 0;

  const hooks = new Map<GameState, Set<StateHooks>>();
  const listeners = new Set<(transition: Transition) => void>();
  if (options.onTransition) listeners.add(options.onTransition);

  /*
   * Invarianten-Guard: In jedem State, der ihn aufruft, laeuft eine Runde — sonst waere
   * die FSM kaputt. Ueber die oeffentliche API ist der Zweig nicht erreichbar und deshalb
   * von der Coverage ausgenommen; ihn wegzulassen hiesse, einen Programmierfehler still
   * als `undefined` weiterzureichen.
   */
  const requireRound = (): Round => {
    /* v8 ignore next */
    if (!context.round) throw new Error('Keine laufende Runde.');
    return context.round;
  };

  /** Ab STEP steht das Ergebnis. Wer hier `null` bekaeme, haette die FSM kaputt gemacht. */
  const requireResult = (): RoundResult => {
    /* v8 ignore next */
    if (!context.result) throw new Error('Keine abgerechnete Runde.');
    return context.result;
  };

  const resetRound = (): void => {
    context.playerIndex = 0;
    context.round = null;
    context.result = null;
    context.givers = [];
    context.distributeIndex = 0;
    context.distributeMode = 'quick';
  };

  const beginRound = (): void => {
    resetRound();
    context.round = createRound(
      {
        index: context.roundIndex,
        playerIds: context.players.map((p) => p.id),
        modes: context.modes,
        bridge: context.bridge,
      },
      rng
    );
  };

  /** Ohne Absprache gibt es keinen Absprache-Screen (GDD §3.6, Modus "Nebel"). */
  const negotiationState = (): GameState => (context.modes.fog ? 'SILENCE' : 'NEGOTIATION');

  /**
   * Die eine Abrechnung der Runde. Laeuft an genau einem Uebergang (SEALED → STEP) und
   * dort genau einmal — `resolveCount` haelt das fest.
   */
  const settle = (): void => {
    const result = resolveRound(requireRound(), { rng, picker });
    resolveCount += 1;
    context.result = result;
    context.givers = context.players.map((p) => p.id).filter((id) => (result.giving[id] ?? 0) > 0);
    context.distributeIndex = 0;
    context.distributeMode = context.givers.every((id) => result.giving[id] === 1) ? 'quick' : 'iterate';
  };

  const runExit = (to: GameState): void => {
    for (const hook of hooks.get(state) ?? []) hook.exit?.(context, to);
  };

  const runEnter = (from: GameState): void => {
    for (const hook of hooks.get(state) ?? []) hook.enter?.(context, from);
  };

  const transition = (to: GameState, event: GameEvent): void => {
    const from = state;
    runExit(to);
    state = to;
    runEnter(from);
    for (const listener of [...listeners]) listener({ from, to, event, context });
  };

  const resolveTarget = (event: GameEvent): GameState | null => {
    switch (event.type) {
      case 'start':
        return 'LOBBY';

      case 'go':
        return context.players.length >= MIN_PLAYERS && context.players.length <= MAX_PLAYERS
          ? negotiationState()
          : null;

      case 'ready':
        return 'PASS';

      case 'tap':
        return state === 'PASS' ? 'CHOOSE' : 'STEP';

      case 'seal':
        return context.playerIndex < context.players.length - 1 ? 'PASS' : 'SEALED';

      /* Laeuft nach `settle()` — ohne Guthaben gibt es nichts zu verteilen. */
      case 'showFinished':
        return context.givers.length > 0 ? 'DISTRIBUTE' : 'RESULT';

      case 'distributeNext':
        return context.distributeIndex + 1 < context.givers.length ? 'DISTRIBUTE' : 'RESULT';

      case 'nextRound':
        return negotiationState();

      case 'changePlayers':
      case 'cancel':
        return 'LOBBY';

      case 'quit':
        return 'TITLE';
    }
  };

  /** Seiteneffekte auf den Kontext — laufen vor dem eigentlichen Wechsel. */
  const applyEffects = (event: GameEvent, target: GameState): void => {
    switch (event.type) {
      case 'go':
        context.roundIndex = 0;
        context.bridge = createBridge(context.players.length);
        context.ropeUsage = {};
        beginRound();
        return;

      case 'ready':
        context.playerIndex = 0;
        return;

      case 'seal': {
        const round = requireRound();
        const playerId = context.players[context.playerIndex]!.id;
        context.round = choose(round, playerId, event.choice);
        if (target === 'PASS') context.playerIndex += 1;
        return;
      }

      case 'distributeNext': {
        const result = requireResult();
        context.result = {
          ...result,
          distribution: [...result.distribution, ...event.distribution],
        };
        context.distributeIndex += 1;
        return;
      }

      case 'nextRound': {
        const result = requireResult();
        context.roundIndex += 1;
        context.bridge = result.nextBridge;
        context.ropeUsage = consumeRopes(context.ropeUsage, result.choices);
        beginRound();
        return;
      }

      case 'cancel':
      case 'changePlayers':
        resetRound();
        return;

      case 'quit':
        resetRound();
        context.roundIndex = 0;
        return;

      /*
       * `tap` steht hier, weil seine Abrechnung schon vor `resolveTarget` gelaufen ist
       * (siehe `send`). `start` und `showFinished` haben keinen Seiteneffekt.
       */
      case 'start':
      case 'tap':
      case 'showFinished':
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
    get resolveCount() {
      return resolveCount;
    },

    currentPlayer() {
      if (state !== 'PASS' && state !== 'CHOOSE') return null;
      return context.players[context.playerIndex]!.id;
    },

    currentGiver() {
      if (state !== 'DISTRIBUTE') return null;
      return context.givers[context.distributeIndex]!;
    },

    canTakeRope(playerId) {
      return ropeAvailable(context.modes, context.ropeUsage, playerId);
    },

    can(eventType) {
      return ALLOWED[state].includes(eventType);
    },

    send(event) {
      if (!ALLOWED[state].includes(event.type)) return false;

      /*
       * Ein verirrter Tap darf die Runde nicht mit einer Exception beenden: Ein Balken,
       * den es nicht mehr gibt, oder ein zweites Seil werden still verworfen.
       */
      if (event.type === 'seal') {
        const round = requireRound();
        const playerId = context.players[context.playerIndex]!.id;
        if (isRopeChoice(event.choice)) {
          if (!ropeAvailable(context.modes, context.ropeUsage, playerId)) return false;
        } else if (!round.bridge.planks.includes(event.choice.plank)) {
          return false;
        }
      }

      /* Die eine Abrechnung, genau hier (Architektur §3). */
      if (event.type === 'tap' && state === 'SEALED') settle();

      const target = resolveTarget(event);
      if (target === null) return false;

      applyEffects(event, target);
      transition(target, event);
      return true;
    },

    setPlayers(players) {
      context.players = [...players];
      context.bridge = createBridge(Math.max(MIN_PLAYERS, players.length));
      if (context.playerIndex >= context.players.length) context.playerIndex = 0;
    },

    setModes(modes) {
      context.modes = { ...modes };
    },

    raiseFlag(playerId, plank) {
      if (state !== 'NEGOTIATION' || !context.round) return false;
      context.round = setFlag(context.round, playerId, plank);
      return true;
    },

    lowerFlag(playerId) {
      if (state !== 'NEGOTIATION' || !context.round) return false;
      context.round = clearFlag(context.round, playerId);
      return true;
    },

    chooseWeight(playerId, weight) {
      if (state !== 'CHOOSE' || !context.round) return false;
      context.round = setWeight(context.round, playerId, weight);
      return true;
    },

    on(target, stateHooks) {
      let set = hooks.get(target);
      if (!set) {
        set = new Set();
        hooks.set(target, set);
      }
      set.add(stateHooks);
      return () => set.delete(stateHooks);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return fsm;
}

/** Sind alle durch? Der Sealed-Screen fragt genau das. */
export function everyoneSealed(context: Readonly<FsmContext>): boolean {
  return context.round !== null && allChosen(context.round);
}
