/**
 * Game-State-Machine (Architektur §3).
 *
 * Die FSM kennt keine Screens — sie haelt den Spielzustand, prueft die Guards und ruft
 * `enter`/`exit`-Hooks. Der Router (M1) haengt sich als Hook ein.
 *
 * Verbindlich: `generateHints()` laeuft **genau einmal** beim Uebergang PACKED → HALL,
 * `gateOrder()` **genau einmal** beim Uebergang INSPECT → GATE. Die Screens lesen nur.
 */

import { MAX_PLAYERS, MIN_PLAYERS } from '@/config/rules';
import { maxAmount, type ModeFlags } from './modes';
import {
  canInspect,
  createRound,
  finishRound,
  inspect,
  openingsLeft,
  pack,
  runGate,
  startHall,
  type SequencePicker,
} from './round';
import { SECURE_RNG, type RandomSource } from './rng';
import type {
  BribeAmount,
  Distribution,
  GateResult,
  InspectResult,
  Player,
  PlayerId,
  Round,
  RoundResult,
} from './types';
import { offerBribe, resolveBribe } from './round';

export const GAME_STATES = [
  'TITLE',
  'LOBBY',
  'OFFICER_INTRO',
  'PASS',
  'PACK',
  'PACKED',
  'HALL',
  'INSPECT',
  'GATE',
  'DISTRIBUTE',
  'RESULT',
] as const;
export type GameState = (typeof GAME_STATES)[number];

export type GameEvent =
  /** TITLE → LOBBY */
  | { type: 'start' }
  /** LOBBY → OFFICER_INTRO, Guard: 4–8 Spieler */
  | { type: 'open' }
  /** OFFICER_INTRO → PASS(0), PASS → PACK(i), PACKED → HALL */
  | { type: 'tap' }
  /** PACK → PASS(i+1) oder, beim letzten Reisenden, PACK → PACKED */
  | { type: 'closeSuitcase'; amount: number }
  /** HALL → INSPECT (Button des Beamten oder Ablauf des Countdowns) */
  | { type: 'endInterrogation' }
  /** INSPECT → INSPECT: der Beamte tippt einen Koffer an */
  | { type: 'inspectSuitcase'; suitcaseOf: PlayerId }
  /** INSPECT: die Sequenz ist durch — weiter oeffnen oder zur Schranke */
  | { type: 'resultShown' }
  /** INSPECT → GATE ("Alle durchwinken") */
  | { type: 'waveAll' }
  /** GATE → DISTRIBUTE (wenn es Tokens gibt) oder direkt RESULT */
  | { type: 'allPassed' }
  /** DISTRIBUTE: ein Token-Besitzer hat verteilt */
  | { type: 'distributeNext'; distribution: Distribution[] }
  /** RESULT → OFFICER_INTRO (Beamter rotiert) */
  | { type: 'nextRound' }
  /** RESULT → LOBBY */
  | { type: 'changePlayers' }
  /** Runde abbrechen → LOBBY */
  | { type: 'cancel' }
  /** Hauptmenue → TITLE */
  | { type: 'quit' };

export type GameEventType = GameEvent['type'];

export interface FsmContext {
  players: Player[];
  modes: ModeFlags;
  /** 0-basiert; bestimmt, wer Beamter ist. */
  roundIndex: number;
  /** Index in `round.travelerIds` waehrend PASS/PACK. */
  travelerIndex: number;
  round: Round | null;
  /** Das Ergebnis des zuletzt getippten Koffers, solange die Sequenz laeuft. */
  pendingResult: InspectResult | null;
  /** Steht ab INSPECT → GATE fest. */
  gate: GateResult[];
  result: RoundResult | null;
  /** Wer diese Runde Tokens verteilt — Beamter zuerst, dann Gate-Reihenfolge. */
  tokenOwners: PlayerId[];
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
  modes?: ModeFlags;
  /** Produktiv `crypto`; in Tests ein seedbarer PRNG fuer reproduzierbare Runden. */
  rng?: RandomSource;
  /** Ab M3 die Sequenz-Registry; bis dahin die Platzhalter aus `round.ts`. */
  pickSequence?: SequencePicker;
  onTransition?: (transition: Transition) => void;
}

export interface Fsm {
  readonly state: GameState;
  readonly context: Readonly<FsmContext>;
  /** Wie oft die Hinweise gezogen wurden — Testhilfe fuer "genau einmal". */
  readonly hintDrawCount: number;
  /** Wie oft die Schranken-Reihenfolge berechnet wurde. */
  readonly gateDrawCount: number;
  /** Wer gerade packt (PASS/PACK), sonst `null`. */
  currentTraveler(): PlayerId | null;
  can(event: GameEventType): boolean;
  send(event: GameEvent): boolean;
  setPlayers(players: Player[]): void;
  setModes(modes: ModeFlags): void;
  /** Bestechungs-Angebot in HALL (Modus). Gibt `false` zurueck, wenn es hier nicht geht. */
  bribe(from: PlayerId, amount: BribeAmount): boolean;
  /** Der Beamte entscheidet ueber ein Angebot. */
  answerBribe(from: PlayerId, accepted: boolean): boolean;
  on(state: GameState, hooks: StateHooks): () => void;
  subscribe(listener: (transition: Transition) => void): () => void;
}

/** Welche Events sind in welchem State ueberhaupt zulaessig? */
const ALLOWED: Record<GameState, readonly GameEventType[]> = {
  TITLE: ['start'],
  LOBBY: ['open', 'quit'],
  OFFICER_INTRO: ['tap', 'cancel', 'quit'],
  PASS: ['tap', 'cancel', 'quit'],
  PACK: ['closeSuitcase', 'cancel', 'quit'],
  PACKED: ['tap', 'cancel', 'quit'],
  HALL: ['endInterrogation', 'cancel', 'quit'],
  INSPECT: ['inspectSuitcase', 'resultShown', 'waveAll', 'cancel', 'quit'],
  GATE: ['allPassed', 'cancel', 'quit'],
  DISTRIBUTE: ['distributeNext', 'quit'],
  RESULT: ['nextRound', 'changePlayers', 'quit'],
};

export function createFsm(options: FsmOptions = {}): Fsm {
  const rng = options.rng ?? SECURE_RNG;
  const pickSequence = options.pickSequence;

  const context: FsmContext = {
    players: options.players ? [...options.players] : [],
    modes: options.modes
      ? { ...options.modes }
      : { bribery: false, sniffer: false, diplomat: false, highSeason: false },
    roundIndex: 0,
    travelerIndex: 0,
    round: null,
    pendingResult: null,
    gate: [],
    result: null,
    tokenOwners: [],
    distributeIndex: 0,
  };

  let state: GameState = 'TITLE';
  let hintDrawCount = 0;
  let gateDrawCount = 0;

  const hooks = new Map<GameState, Set<StateHooks>>();
  const listeners = new Set<(transition: Transition) => void>();
  if (options.onTransition) listeners.add(options.onTransition);

  /*
   * Invarianten-Guard: In jedem State, der ihn aufruft, gibt es eine Runde — sonst waere
   * die FSM kaputt. Der Zweig ist ueber die oeffentliche API nicht erreichbar und deshalb
   * von der Coverage ausgenommen; ihn wegzulassen hiesse, einen Programmierfehler still
   * als `undefined` weiterzureichen.
   */
  const requireRound = (): Round => {
    /* v8 ignore next */
    if (!context.round) throw new Error('Keine laufende Runde.');
    return context.round;
  };

  const resetRound = (): void => {
    context.travelerIndex = 0;
    context.round = null;
    context.pendingResult = null;
    context.gate = [];
    context.result = null;
    context.tokenOwners = [];
    context.distributeIndex = 0;
  };

  const beginRound = (): void => {
    resetRound();
    context.round = createRound(
      { index: context.roundIndex, players: context.players, modes: context.modes },
      rng
    );
  };

  /**
   * Schranke vorbereiten. Laeuft an genau zwei Uebergaengen (letzte Oeffnung gezeigt und
   * "Alle durchwinken") und dort jeweils einmal — `gateDrawCount` haelt das fest.
   */
  const prepareGate = (): void => {
    const round = requireRound();
    const outcome = runGate(round, pickSequence, rng);
    context.round = outcome.round;
    context.gate = outcome.gate;
    gateDrawCount += 1;
  };

  /** Reihenfolge im Distribute-Screen: Beamter zuerst, dann die Schmuggler (GDD §3.6). */
  const ownersInOrder = (result: RoundResult): PlayerId[] => {
    const owners: PlayerId[] = [];
    const push = (id: PlayerId): void => {
      if ((result.tokens[id] ?? 0) > 0 && !owners.includes(id)) owners.push(id);
    };
    push(result.officerId);
    for (const entry of result.gate) push(entry.suitcaseOf);
    for (const id of result.travelerIds) push(id);
    return owners;
  };

  /**
   * Rundenabschluss. Muss **vor** `resolveTarget` laufen: Ob es ueberhaupt einen
   * Distribute-Screen gibt, entscheidet sich erst an den Tokens dieser Abrechnung.
   */
  const settle = (): void => {
    const result = finishRound(requireRound(), context.gate);
    context.result = result;
    context.tokenOwners = ownersInOrder(result);
    context.distributeIndex = 0;
  };

  const runExit = (to: GameState): void => {
    for (const hook of hooks.get(state) ?? []) hook.exit?.(context, to);
  };

  const runEnter = (from: GameState): void => {
    for (const hook of hooks.get(state) ?? []) hook.enter?.(context, from);
  };

  const transition = (to: GameState, event: GameEvent): void => {
    const from = state;
    /* Selbstuebergaenge (INSPECT → INSPECT) tauschen keinen Screen — Hooks bleiben still. */
    if (from !== to) {
      runExit(to);
      state = to;
      runEnter(from);
    }
    const payload: Transition = { from, to, event, context };
    for (const listener of [...listeners]) listener(payload);
  };

  const resolveTarget = (event: GameEvent): GameState | null => {
    switch (event.type) {
      case 'start':
        return 'LOBBY';

      case 'open':
        return context.players.length >= MIN_PLAYERS && context.players.length <= MAX_PLAYERS
          ? 'OFFICER_INTRO'
          : null;

      case 'tap':
        if (state === 'OFFICER_INTRO') return 'PASS';
        if (state === 'PASS') return 'PACK';
        return 'HALL';

      case 'closeSuitcase':
        return context.travelerIndex < requireRound().travelerIds.length - 1 ? 'PASS' : 'PACKED';

      case 'endInterrogation':
        return 'INSPECT';

      case 'inspectSuitcase':
        return 'INSPECT';

      case 'resultShown':
        return openingsLeft(requireRound()) > 0 ? 'INSPECT' : 'GATE';

      case 'waveAll':
        return 'GATE';

      /* Laeuft nach `settle()` — ohne Tokens gibt es nichts zu verteilen. */
      case 'allPassed':
        return context.tokenOwners.length > 0 ? 'DISTRIBUTE' : 'RESULT';

      case 'distributeNext':
        return context.distributeIndex + 1 < context.tokenOwners.length ? 'DISTRIBUTE' : 'RESULT';

      case 'nextRound':
        return 'OFFICER_INTRO';

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
      case 'open':
        context.roundIndex = 0;
        beginRound();
        return;

      case 'tap':
        if (state === 'OFFICER_INTRO') {
          context.travelerIndex = 0;
          return;
        }
        if (state === 'PACKED') {
          /* Hier und nur hier fallen die Hinweise (Architektur §3). */
          context.round = startHall(requireRound(), rng);
          hintDrawCount += 1;
        }
        return;

      case 'closeSuitcase': {
        const round = requireRound();
        const travelerId = round.travelerIds[context.travelerIndex]!;
        context.round = pack(round, travelerId, event.amount);
        if (target === 'PASS') context.travelerIndex += 1;
        return;
      }

      case 'inspectSuitcase': {
        const outcome = inspect(requireRound(), event.suitcaseOf, pickSequence);
        context.round = outcome.round;
        context.pendingResult = outcome.result;
        return;
      }

      case 'resultShown':
        context.pendingResult = null;
        if (target === 'GATE') prepareGate();
        return;

      case 'waveAll':
        prepareGate();
        return;

      case 'distributeNext': {
        if (context.result) {
          context.result = {
            ...context.result,
            distribution: [...context.result.distribution, ...event.distribution],
          };
        }
        context.distributeIndex += 1;
        return;
      }

      case 'nextRound':
        context.roundIndex += 1;
        beginRound();
        return;

      case 'cancel':
      case 'changePlayers':
        resetRound();
        return;

      case 'quit':
        resetRound();
        context.roundIndex = 0;
        return;

      /*
       * Ohne Seiteneffekt. `allPassed` steht hier, weil seine Abrechnung schon vor
       * `resolveTarget` gelaufen ist — siehe `settle()`.
       */
      case 'start':
      case 'endInterrogation':
      case 'allPassed':
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
    get hintDrawCount() {
      return hintDrawCount;
    },
    get gateDrawCount() {
      return gateDrawCount;
    },

    currentTraveler() {
      if (state !== 'PASS' && state !== 'PACK') return null;
      /* v8 ignore next */
      return requireRound().travelerIds[context.travelerIndex] ?? null;
    },

    can(eventType) {
      return ALLOWED[state].includes(eventType);
    },

    send(event) {
      if (!ALLOWED[state].includes(event.type)) return false;

      if (event.type === 'closeSuitcase') {
        const limit = maxAmount(context.modes);
        if (!Number.isInteger(event.amount) || event.amount < 0 || event.amount > limit) {
          throw new RangeError(`Ungueltige Menge: ${event.amount} (erlaubt 0..${limit}).`);
        }
      }

      /*
       * "Alle durchwinken" darf jederzeit, ein Koffer-Tap nur, wenn dieser Koffer wirklich
       * dran ist: nicht geoeffnet, nicht bezahlt, Oeffnung uebrig, keine Sequenz am Laufen.
       * Das Board sperrt zwar der Director — aber ein verirrter Tap darf die Runde nicht
       * mit einer Exception beenden, sondern wird still verworfen.
       */
      if (event.type === 'inspectSuitcase') {
        if (context.pendingResult !== null) return false;
        if (!context.round || !canInspect(context.round, event.suitcaseOf)) return false;
      }

      if (event.type === 'allPassed') settle();

      const target = resolveTarget(event);
      if (target === null) return false;

      applyEffects(event, target);
      transition(target, event);
      return true;
    },

    setPlayers(players) {
      context.players = [...players];
      if (context.travelerIndex >= context.players.length) context.travelerIndex = 0;
    },

    setModes(modes) {
      context.modes = { ...modes };
    },

    bribe(from, amount) {
      if (state !== 'HALL' || !context.round) return false;
      context.round = offerBribe(context.round, from, amount);
      return true;
    },

    answerBribe(from, accepted) {
      if (state !== 'HALL' || !context.round) return false;
      context.round = resolveBribe(context.round, from, accepted);
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
