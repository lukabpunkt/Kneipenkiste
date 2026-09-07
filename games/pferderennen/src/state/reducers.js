/**
 * Pure reducers for players, bets, settings, screen changes and session statistics.
 *
 * Every reducer is a pure function: same input, same output, no side effects and no clock. The
 * timestamp of a race therefore arrives through the action payload rather than from Date.now(),
 * which keeps the whole state layer testable in Node.
 */

import { BETTING, DEFAULT_SETTINGS, STORAGE_VERSION } from '../config.js';
import { nextAvatar } from '../data/avatars.js';

/** Screens the router can show. */
export const SCREENS = ['start', 'players', 'betting', 'race', 'results'];

/**
 * @typedef {{id: string, name: string, avatar: string}} Player
 * @typedef {{playerId: string, horseId: string, sips: number, type: string}} Bet
 */

/** Builds the state of a fresh installation. */
export function createInitialState() {
  return {
    version: STORAGE_VERSION,
    screen: 'start',
    settings: { ...DEFAULT_SETTINGS },
    players: [],
    bets: [],
    /** The bets the last finished race was run with, so a table can simply run it back. */
    lastBets: [],
    bettingTurn: 0,
    race: { seed: null, phase: 'countdown', result: null, recorded: false },
    session: { racesPlayed: 0, perPlayer: {}, history: [] },
  };
}

/** Fresh statistics for one player. */
function emptyStats() {
  return { drank: 0, dealt: 0, wins: 0, loseStreak: 0, maxLoseStreak: 0 };
}

/**
 * Trims a name to the allowed length. Empty names are rejected by the caller.
 * @param {unknown} raw
 * @returns {string}
 */
function cleanName(raw) {
  return String(raw ?? '')
    .trim()
    .slice(0, BETTING.maxNameLength);
}

/**
 * Builds an id that no current player uses. Counting up from the highest existing id keeps ids
 * stable across reloads without needing a clock or a random source.
 * @param {Player[]} players
 * @returns {string}
 */
function nextPlayerId(players) {
  const highest = players.reduce((max, player) => {
    const numeric = Number.parseInt(String(player.id).slice(1), 10);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `p${highest + 1}`;
}

/**
 * Players: add, remove, rename, change avatar.
 * @param {any} state
 * @param {{type: string, payload?: any}} action
 * @returns {any} new state, or the unchanged state when the action does not apply
 */
function playersReducer(state, action) {
  const { players } = state;

  switch (action.type) {
    case 'players/add': {
      const name = cleanName(action.payload?.name);
      const isDuplicate = players.some(
        (player) => player.name.toLowerCase() === name.toLowerCase(),
      );
      if (name === '' || isDuplicate || players.length >= BETTING.maxPlayers) return state;

      const avatar =
        action.payload?.avatar ??
        nextAvatar(
          players.map((player) => player.avatar),
          players.length,
        );
      const player = { id: nextPlayerId(players), name, avatar };
      return { ...state, players: [...players, player] };
    }

    case 'players/remove': {
      const id = action.payload?.id;
      if (!players.some((player) => player.id === id)) return state;
      return {
        ...state,
        players: players.filter((player) => player.id !== id),
        bets: state.bets.filter((bet) => bet.playerId !== id),
      };
    }

    case 'players/rename': {
      const { id, name: rawName } = action.payload ?? {};
      const name = cleanName(rawName);
      const target = players.find((player) => player.id === id);
      if (!target || name === '') return state;
      const isDuplicate = players.some(
        (player) => player.id !== id && player.name.toLowerCase() === name.toLowerCase(),
      );
      if (isDuplicate || target.name === name) return state;
      return {
        ...state,
        players: players.map((player) => (player.id === id ? { ...player, name } : player)),
      };
    }

    case 'players/setAvatar': {
      const { id, avatar } = action.payload ?? {};
      const target = players.find((player) => player.id === id);
      if (!target || !avatar || target.avatar === avatar) return state;
      return {
        ...state,
        players: players.map((player) => (player.id === id ? { ...player, avatar } : player)),
      };
    }

    default:
      return state;
  }
}

/**
 * Bets and the betting turn.
 * @param {any} state
 * @param {{type: string, payload?: any}} action
 * @returns {any}
 */
function betsReducer(state, action) {
  switch (action.type) {
    case 'bets/place': {
      const { playerId, horseId, sips, type } = action.payload ?? {};
      const isKnownPlayer = state.players.some((player) => player.id === playerId);
      if (!isKnownPlayer || !horseId) return state;

      const clamped = Math.min(BETTING.maxSips, Math.max(BETTING.minSips, Math.round(sips)));
      if (!Number.isFinite(clamped)) return state;

      const bet = { playerId, horseId, sips: clamped, type: type ?? 'win' };
      const existing = state.bets.findIndex((entry) => entry.playerId === playerId);
      const bets =
        existing === -1
          ? [...state.bets, bet]
          : state.bets.map((entry, index) => (index === existing ? bet : entry));

      return { ...state, bets };
    }

    case 'bets/reset':
      return state.bets.length === 0 && state.bettingTurn === 0
        ? state
        : { ...state, bets: [], bettingTurn: 0 };

    /**
     * Puts the last race's bets back, so nobody has to say "the same as before" six times.
     *
     * The turn jumps straight to the end: everyone who had a bet has one again, so the screen
     * should show the summary rather than start asking round the table. Anyone who joined since
     * simply has no bet, and the summary is where they place it.
     */
    case 'bets/repeat': {
      const bets = state.lastBets.filter((bet) =>
        state.players.some((player) => player.id === bet.playerId),
      );
      if (bets.length === 0) return state;
      return { ...state, bets, bettingTurn: state.players.length };
    }

    case 'betting/next': {
      const turn = Math.min(state.bettingTurn + 1, state.players.length);
      return turn === state.bettingTurn ? state : { ...state, bettingTurn: turn };
    }

    default:
      return state;
  }
}

/**
 * Folds one settlement into the running session statistics.
 * @param {any} session
 * @param {any} payload {settlement, winnerHorseId, seed, timestamp}
 * @returns {any} new session
 */
function recordSession(session, payload) {
  const { settlement, winnerHorseId, seed, timestamp } = payload;
  const perPlayer = { ...session.perPlayer };

  /** Reads a player's stats, creating them on first sight. */
  const statsFor = (playerId) => ({ ...(perPlayer[playerId] ?? emptyStats()) });

  for (const winner of settlement.winners) {
    const stats = statsFor(winner.playerId);
    stats.dealt += winner.sipsToDeal;
    stats.wins += 1;
    stats.loseStreak = 0;
    perPlayer[winner.playerId] = stats;
  }

  for (const loser of settlement.losers) {
    const stats = statsFor(loser.playerId);
    stats.drank += loser.sipsToDrink;
    stats.loseStreak += 1;
    stats.maxLoseStreak = Math.max(stats.maxLoseStreak, stats.loseStreak);
    perPlayer[loser.playerId] = stats;
  }

  // Event drinking rules count towards the statistics as well (relevant from M5 onwards).
  for (const rule of settlement.eventRules ?? []) {
    for (const playerId of rule.playerIds) {
      const stats = statsFor(playerId);
      if (rule.direction === 'deal') stats.dealt += rule.sips;
      else stats.drank += rule.sips;
      perPlayer[playerId] = stats;
    }
  }

  const history = [...session.history, { seed, winnerId: winnerHorseId, timestamp }].slice(-50);
  return { racesPlayed: session.racesPlayed + 1, perPlayer, history };
}

/**
 * Root reducer. Delegates to the small reducers above and handles the remaining actions.
 * @param {any} state
 * @param {{type: string, payload?: any}} action
 * @returns {any}
 */
export function rootReducer(state, action) {
  switch (action.type) {
    case 'screen/go': {
      const screen = action.payload;
      if (!SCREENS.includes(screen) || screen === state.screen) return state;
      return { ...state, screen };
    }

    case 'settings/update': {
      const patch = action.payload ?? {};
      const allowed = Object.keys(DEFAULT_SETTINGS);
      const settings = { ...state.settings };
      let changed = false;
      for (const [key, value] of Object.entries(patch)) {
        if (!allowed.includes(key) || settings[key] === value) continue;
        settings[key] = value;
        changed = true;
      }
      return changed ? { ...state, settings } : state;
    }

    case 'race/setResult': {
      const { seed, order, events, rules } = action.payload ?? {};
      if (!Array.isArray(order) || order.length === 0) return state;
      return {
        ...state,
        // The bets this race was actually run with. Remembered here rather than on the way back
        // into the betting screen, because this is the moment they mean something: "the same as
        // last time" means the same as the last race, not the last thing anybody typed.
        lastBets: state.bets,
        race: {
          seed: seed ?? null,
          phase: 'finished',
          // `rules` are the drinking rules that fired live during the race — the event rules and
          // the lead-change rule. They are already settled at the table, so the result screen
          // only recaps them.
          result: { order, events: events ?? [], rules: rules ?? [] },
          // A fresh result has not been counted into the session statistics yet.
          recorded: false,
        },
      };
    }

    case 'race/clear':
      return state.race.result === null && state.race.seed === null
        ? state
        : { ...state, race: { seed: null, phase: 'countdown', result: null, recorded: false } };

    // Marks the current race as counted, so returning to the result screen cannot
    // book the same race into the statistics twice.
    case 'race/markRecorded':
      return state.race.recorded ? state : { ...state, race: { ...state.race, recorded: true } };

    case 'session/record': {
      if (!action.payload?.settlement) return state;
      return { ...state, session: recordSession(state.session, action.payload) };
    }

    case 'session/reset':
      return state.session.racesPlayed === 0 && state.session.history.length === 0
        ? state
        : { ...state, session: createInitialState().session };

    default:
      return betsReducer(playersReducer(state, action), action);
  }
}
