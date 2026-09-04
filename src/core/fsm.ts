/**
 * Game-State-Machine (Architektur §3).
 *
 * Die FSM kennt keine Screens — sie haelt den Spielzustand, prueft die Guards und ruft
 * `enter`/`exit`-Hooks. Der Router (M1) haengt sich als Hook ein.
 *
 * Verbindlich (CLAUDE.md): `resolveRound()` laeuft **genau einmal** pro Runde, beim
 * Uebergang SEALED → REVEAL. REVEAL liest nur; die Show entscheidet nichts.
 */

import { MIN_PLAYERS, type Settings } from '@/config/rules';
import { assignMole, forcedChoice } from './modes';
import { resolveRound, type ResolveOptions } from './payout';
import { createSeed } from './rng';
import type { Choice, Player, PlayerId, RoundResult, RoundSetup } from './types';
import { vaultSpec } from './vault';

export const GAME_STATES = [
  'TITLE',
  'LOBBY',
  'NEGOTIATION',
  'SILENCE',
  'PASS',
  'CHOICE',
  'SEALED',
  'REVEAL',
  'DISTRIBUTE',
  'RESULT',
] as const;
export type GameState = (typeof GAME_STATES)[number];

export type GameEvent =
  /** TITLE → LOBBY */
  | { type: 'start' }
  /** LOBBY → NEGOTIATION (bzw. SILENCE in der Nachtschicht), Guard: mind. 3 Spieler */
  | { type: 'open' }
  /** NEGOTIATION/SILENCE → PASS(0), per Timeout oder "Alle bereit" */
  | { type: 'proceed' }
  /** PASS → CHOICE */
  | { type: 'tap' }
  /** CHOICE → PASS(i+1) oder, beim letzten Spieler, CHOICE → SEALED */
  | { type: 'choose'; choice: Choice }
  /** SEALED → REVEAL — hier faellt die Entscheidung, genau einmal */
  | { type: 'reveal' }
  /** REVEAL → DISTRIBUTE (Alleingang) oder REVEAL → RESULT */
  | { type: 'showFinished' }
  /** DISTRIBUTE → RESULT */
  | { type: 'payout'; result: RoundResult }
  /** RESULT → NEGOTIATION/SILENCE */
  | { type: 'nextRound' }
  /** RESULT → LOBBY */
  | { type: 'changePlayers' }
  /** NEGOTIATION/SILENCE/PASS/CHOICE/SEALED/REVEAL → LOBBY ("Runde abbrechen?") */
  | { type: 'cancel' };

export type GameEventType = GameEvent['type'];

export interface FsmContext {
  players: Player[];
  /** Wer ist gerade dran (PASS/CHOICE)? */
  playerIndex: number;
  settings: Settings;
  /** Tresorinhalt fuer die laufende bzw. naechste Runde. */
  vault: number;
  /** Ab NEGOTIATION gesetzt: was diese Runde ausmacht. */
  setup: RoundSetup | null;
  /** Ab REVEAL gesetzt: das feststehende Ergebnis. */
  result: RoundResult | null;
  /** Abgeschlossene Runden dieser Session. */
  roundNumber: number;
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
  vault?: number;
  /** Injizierbar fuer Tests; produktiv `createSeed` aus `rng.ts`. */
  makeSeed?: () => number;
  /** Injizierbar fuer Tests; produktiv `resolveRound`. */
  resolve?: typeof resolveRound;
  /** Ab M3: gewichtete Auswahl aus der Outcome-Registry. */
  resolveOptions?: ResolveOptions;
  onTransition?: (transition: Transition) => void;
}

export interface Fsm {
  readonly state: GameState;
  readonly context: Readonly<FsmContext>;
  /** Wieviele Runden bisher aufgeloest wurden — Testhilfe fuer "genau einmal". */
  readonly resolveCount: number;
  can(event: GameEventType): boolean;
  /** Fuehrt den Uebergang aus. `false`, wenn das Event hier nicht erlaubt ist. */
  send(event: GameEvent): boolean;
  setPlayers(players: Player[]): void;
  setSettings(settings: Settings): void;
  /** Tresorstand aus der Session uebernehmen (Lobby → NEGOTIATION). */
  setVault(vault: number): void;
  /** Eid-Modus: Schwur setzen oder zuruecknehmen (nur waehrend der Verhandlung). */
  toggleOath(playerId: PlayerId): boolean;
  on(state: GameState, hooks: StateHooks): () => void;
  subscribe(listener: (transition: Transition) => void): () => void;
}

/** Welche Events sind in welchem State ueberhaupt zulaessig? */
const ALLOWED: Record<GameState, readonly GameEventType[]> = {
  TITLE: ['start'],
  LOBBY: ['open'],
  NEGOTIATION: ['proceed', 'cancel'],
  SILENCE: ['proceed', 'cancel'],
  PASS: ['tap', 'cancel'],
  CHOICE: ['choose', 'cancel'],
  SEALED: ['reveal', 'cancel'],
  REVEAL: ['showFinished', 'cancel'],
  // Kein `cancel`: Die Runde ist gelaufen, die Schluecke sind faellig.
  DISTRIBUTE: ['payout'],
  RESULT: ['nextRound', 'changePlayers'],
};

export function createFsm(options: FsmOptions): Fsm {
  const makeSeed = options.makeSeed ?? createSeed;
  const resolve = options.resolve ?? resolveRound;

  const context: FsmContext = {
    players: options.players ? [...options.players] : [],
    playerIndex: 0,
    settings: options.settings,
    vault: options.vault ?? vaultSpec(options.settings).startVault,
    setup: null,
    result: null,
    roundNumber: 0,
  };

  let state: GameState = 'TITLE';
  let resolveCount = 0;

  const hooks = new Map<GameState, Set<StateHooks>>();
  const listeners = new Set<(transition: Transition) => void>();
  if (options.onTransition) listeners.add(options.onTransition);

  const transition = (to: GameState, event: GameEvent): void => {
    const from = state;
    for (const hook of hooks.get(from) ?? []) hook.exit?.(context, to);
    state = to;
    for (const hook of hooks.get(to) ?? []) hook.enter?.(context, from);
    const payload: Transition = { from, to, event, context };
    for (const listener of [...listeners]) listener(payload);
  };

  /** Wo die Runde anfaengt: Verhandlung — oder Stille in der Nachtschicht (GDD §3.7). */
  const openingState = (): GameState => (context.settings.modes.nightShift ? 'SILENCE' : 'NEGOTIATION');

  /**
   * Neue Runde vorbereiten. Der Maulwurf wird hier mit `crypto` gezogen und in
   * `setup.moleId` abgelegt (Architektur §3) — vor jeder Wahl, damit sein
   * Choice-Screen nur STEHLEN zeigen kann.
   */
  const beginRound = (): void => {
    const playerIds = context.players.map((p) => p.id);
    const moleId = assignMole(playerIds, context.settings.modes);
    context.playerIndex = 0;
    context.result = null;
    context.setup = {
      index: context.roundNumber + 1,
      vault: context.vault,
      seed: makeSeed(),
      oaths: [],
      choices: {},
      ...(moleId !== undefined ? { moleId } : {}),
    };
  };

  const resetRound = (): void => {
    context.playerIndex = 0;
    context.setup = null;
    context.result = null;
  };

  const resolveTarget = (event: GameEvent): GameState | null => {
    switch (event.type) {
      case 'start':
        return 'LOBBY';

      case 'open':
        return context.players.length >= MIN_PLAYERS ? openingState() : null;

      case 'proceed':
        return 'PASS';

      case 'tap':
        return 'CHOICE';

      case 'choose':
        return context.playerIndex < context.players.length - 1 ? 'PASS' : 'SEALED';

      case 'reveal':
        return 'REVEAL';

      case 'showFinished':
        return context.result?.outcome === 'soloSteal' ? 'DISTRIBUTE' : 'RESULT';

      case 'payout':
        return 'RESULT';

      case 'nextRound':
        return openingState();

      case 'changePlayers':
      case 'cancel':
        return 'LOBBY';
    }
  };

  /** Seiteneffekte auf den Kontext — laufen vor dem eigentlichen Wechsel. */
  const applyEffects = (event: GameEvent, target: GameState): void => {
    switch (event.type) {
      case 'open':
      case 'nextRound':
        beginRound();
        return;

      case 'choose': {
        const setup = requireSetup();
        const player = context.players[context.playerIndex]!;
        // Der Maulwurf hat keine Wahl (GDD §3.7) — die FSM setzt sie notfalls gerade.
        setup.choices[player.id] = forcedChoice(player.id, setup) ?? event.choice;
        if (target === 'PASS') context.playerIndex += 1;
        return;
      }

      /*
       * Hier faellt die Entscheidung — genau einmal, ausschliesslich hier (CLAUDE.md).
       * Wer aus SEALED abbricht, hat nie aufgeloest.
       */
      case 'reveal': {
        const setup = requireSetup();
        context.result = resolve(
          context.players.map((p) => p.id),
          setup,
          context.settings,
          options.resolveOptions ?? {}
        );
        resolveCount += 1;
        return;
      }

      case 'payout':
        context.result = event.result;
        return;

      case 'showFinished':
        // Die Runde zaehlt, sobald die Show durch ist — auch wenn noch verteilt wird.
        context.roundNumber += 1;
        context.vault = requireResult().nextVault;
        return;

      case 'cancel':
        resetRound();
        return;

      case 'start':
      case 'proceed':
      case 'tap':
      case 'changePlayers':
        return;
    }
  };

  function requireSetup(): RoundSetup {
    if (!context.setup) throw new Error('Es laeuft keine Runde.');
    return context.setup;
  }

  function requireResult(): RoundResult {
    if (!context.result) throw new Error('Die Runde wurde nie aufgeloest.');
    return context.result;
  }

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
    },

    setSettings(settings) {
      context.settings = settings;
      // Haerte oder Highroller geaendert: Der Tresor startet mit dem neuen V_0.
      if (state === 'TITLE' || state === 'LOBBY') {
        context.vault = vaultSpec(settings).startVault;
      }
    },

    setVault(vault) {
      context.vault = vault;
    },

    toggleOath(playerId) {
      if (state !== 'NEGOTIATION' || !context.settings.modes.oath) return false;
      const setup = requireSetup();
      const at = setup.oaths.indexOf(playerId);
      if (at >= 0) setup.oaths.splice(at, 1);
      else setup.oaths.push(playerId);
      return true;
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
