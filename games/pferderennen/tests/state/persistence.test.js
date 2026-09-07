/**
 * Tests for the persistence layer (src/state/persistence.js) against a mocked localStorage.
 * The important cases are the hostile ones: no storage at all, storage that throws, damaged
 * JSON and a state saved by a future version.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadState,
  saveState,
  clearState,
  persist,
  isPersistenceAvailable,
} from '../../src/state/persistence.js';
import { createInitialState, rootReducer } from '../../src/state/reducers.js';
import { createStore } from '../../src/state/store.js';
import { STORAGE_KEY, STORAGE_VERSION } from '../../src/config.js';

/** A minimal in-memory localStorage. `failOn` makes a given method throw. */
function mockStorage(failOn = null) {
  const map = new Map();
  return {
    getItem: (key) => (failOn === 'getItem' ? throwing() : (map.get(key) ?? null)),
    setItem: (key, value) => (failOn === 'setItem' ? throwing() : void map.set(key, String(value))),
    removeItem: (key) => (failOn === 'removeItem' ? throwing() : void map.delete(key)),
    _map: map,
  };
}

function throwing() {
  throw new Error('storage unavailable');
}

/** Writes a raw value straight into the mocked storage, bypassing saveState. */
function seed(raw) {
  globalThis.localStorage._map.set(
    STORAGE_KEY,
    typeof raw === 'string' ? raw : JSON.stringify(raw),
  );
}

beforeEach(() => {
  globalThis.localStorage = mockStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
  vi.useRealTimers();
});

describe('without usable storage', () => {
  it('reports persistence as unavailable and never throws', () => {
    delete globalThis.localStorage;
    expect(isPersistenceAvailable()).toBe(false);
    expect(loadState()).toBeNull();
    expect(saveState(createInitialState())).toBe(false);
    expect(() => clearState()).not.toThrow();
  });

  it('treats storage that throws on write as unavailable (Safari private mode)', () => {
    globalThis.localStorage = mockStorage('setItem');
    expect(isPersistenceAvailable()).toBe(false);
    expect(saveState(createInitialState())).toBe(false);
    expect(loadState()).toBeNull();
  });

  it('survives storage that throws while reading', () => {
    globalThis.localStorage = mockStorage('getItem');
    expect(loadState()).toBeNull();
  });

  it('survives storage that throws while clearing', () => {
    globalThis.localStorage = mockStorage('removeItem');
    expect(() => clearState()).not.toThrow();
  });

  it('reports a failed write when the quota runs out mid-save', () => {
    // The probe succeeds, only the real payload is rejected — that is what a full quota does.
    const base = mockStorage();
    globalThis.localStorage = {
      ...base,
      setItem: (key, value) => {
        if (key === STORAGE_KEY) throw new Error('quota exceeded');
        return base.setItem(key, value);
      },
    };
    expect(saveState(createInitialState())).toBe(false);
  });
});

describe('save and load', () => {
  it('reports persistence as available', () => {
    expect(isPersistenceAvailable()).toBe(true);
  });

  it('returns null when nothing was ever saved', () => {
    expect(loadState()).toBeNull();
  });

  it('restores players, bets and settings', () => {
    let state = rootReducer(createInitialState(), {
      type: 'players/add',
      payload: { name: 'Luka' },
    });
    state = rootReducer(state, {
      type: 'bets/place',
      payload: { playerId: 'p1', horseId: 'hopfen', sips: 5 },
    });
    state = rootReducer(state, { type: 'settings/update', payload: { chaos: 'wild' } });
    expect(saveState(state)).toBe(true);

    const loaded = loadState();
    expect(loaded.state.players).toEqual(state.players);
    expect(loaded.state.bets).toEqual(state.bets);
    expect(loaded.state.settings.chaos).toBe('wild');
    expect(loaded.raceWasAborted).toBe(false);
  });

  it('clears the saved state', () => {
    saveState(createInitialState());
    clearState();
    expect(loadState()).toBeNull();
  });
});

describe('damaged or foreign data', () => {
  it('discards invalid JSON', () => {
    seed('{not json');
    expect(loadState()).toBeNull();
  });

  it('discards a state from another version', () => {
    seed({ ...createInitialState(), version: STORAGE_VERSION + 1 });
    expect(loadState()).toBeNull();
  });

  it('discards values that are not an object', () => {
    seed('42');
    expect(loadState()).toBeNull();
    seed('null');
    expect(loadState()).toBeNull();
  });

  it('fills in missing fields from a fresh state', () => {
    seed({ version: STORAGE_VERSION });
    const loaded = loadState();
    expect(loaded.state.players).toEqual([]);
    expect(loaded.state.bets).toEqual([]);
    expect(loaded.state.screen).toBe('start');
    expect(loaded.state.session).toEqual({ racesPlayed: 0, perPlayer: {}, history: [] });
  });

  it('repairs fields of the wrong type', () => {
    seed({
      version: STORAGE_VERSION,
      players: 'nope',
      bets: 7,
      bettingTurn: 'x',
      session: { racesPlayed: 'many', history: 'nope' },
      screen: 'betting',
    });
    const loaded = loadState();
    expect(loaded.state.players).toEqual([]);
    expect(loaded.state.bets).toEqual([]);
    expect(loaded.state.bettingTurn).toBe(0);
    expect(loaded.state.session.racesPlayed).toBe(0);
    expect(loaded.state.session.history).toEqual([]);
  });

  it('drops bets whose player no longer exists', () => {
    seed({
      version: STORAGE_VERSION,
      players: [{ id: 'p1', name: 'Luka', avatar: '🦄' }],
      bets: [
        { playerId: 'p1', horseId: 'hopfen', sips: 3, type: 'win' },
        { playerId: 'p9', horseId: 'wodka', sips: 3, type: 'win' },
      ],
    });
    expect(loadState().state.bets.map((b) => b.playerId)).toEqual(['p1']);
  });

  it('keeps the last race\'s bets, so "run it back" survives a reload', () => {
    seed({
      version: STORAGE_VERSION,
      players: [{ id: 'p1', name: 'Luka', avatar: '🦄' }],
      lastBets: [{ playerId: 'p1', horseId: 'hopfen', sips: 3, type: 'win' }],
    });
    expect(loadState().state.lastBets).toHaveLength(1);
  });

  it('drops remembered bets of players who have left', () => {
    seed({
      version: STORAGE_VERSION,
      players: [{ id: 'p1', name: 'Luka', avatar: '🦄' }],
      lastBets: [
        { playerId: 'p1', horseId: 'hopfen', sips: 3, type: 'win' },
        { playerId: 'p9', horseId: 'wodka', sips: 3, type: 'win' },
      ],
    });
    expect(loadState().state.lastBets.map((b) => b.playerId)).toEqual(['p1']);
  });

  it('falls back to an empty memory when the saved one is not a list', () => {
    seed({ version: STORAGE_VERSION, players: [], lastBets: 'gestern' });
    expect(loadState().state.lastBets).toEqual([]);
  });

  it('caps the betting turn at the number of players', () => {
    seed({
      version: STORAGE_VERSION,
      players: [{ id: 'p1', name: 'Luka', avatar: '🦄' }],
      bettingTurn: 12,
    });
    expect(loadState().state.bettingTurn).toBe(1);
  });

  it('keeps only the last 50 history entries', () => {
    seed({
      version: STORAGE_VERSION,
      session: {
        racesPlayed: 60,
        perPlayer: {},
        history: Array.from({ length: 60 }, (_, i) => ({ seed: i })),
      },
    });
    const history = loadState().state.session.history;
    expect(history).toHaveLength(50);
    expect(history[0].seed).toBe(10);
  });
});

describe('an abandoned race', () => {
  it('sends the player back to the betting screen and reports the abort', () => {
    seed({ version: STORAGE_VERSION, screen: 'race' });
    const loaded = loadState();
    expect(loaded.state.screen).toBe('betting');
    expect(loaded.raceWasAborted).toBe(true);
  });

  it('keeps the bets so the race can simply be started again', () => {
    seed({
      version: STORAGE_VERSION,
      screen: 'race',
      players: [{ id: 'p1', name: 'Luka', avatar: '🦄' }],
      bets: [{ playerId: 'p1', horseId: 'hopfen', sips: 3, type: 'win' }],
    });
    expect(loadState().state.bets).toHaveLength(1);
  });

  it('keeps every other screen', () => {
    seed({ version: STORAGE_VERSION, screen: 'betting' });
    expect(loadState().state.screen).toBe('betting');
  });
});

describe('persist()', () => {
  it('writes debounced and only once for a burst of changes', () => {
    vi.useFakeTimers();
    const store = createStore(rootReducer, createInitialState());
    const stop = persist(store, 200);

    store.dispatch({ type: 'players/add', payload: { name: 'Luka' } });
    store.dispatch({ type: 'players/add', payload: { name: 'Nina' } });
    expect(loadState()).toBeNull();

    vi.advanceTimersByTime(200);
    expect(loadState().state.players).toHaveLength(2);
    stop();
  });

  it('flushes a pending write when it is stopped', () => {
    vi.useFakeTimers();
    const store = createStore(rootReducer, createInitialState());
    const stop = persist(store, 200);

    store.dispatch({ type: 'players/add', payload: { name: 'Luka' } });
    stop();
    expect(loadState().state.players).toHaveLength(1);
  });

  it('stops writing after it was stopped', () => {
    vi.useFakeTimers();
    const store = createStore(rootReducer, createInitialState());
    const stop = persist(store, 200);

    store.dispatch({ type: 'players/add', payload: { name: 'Luka' } });
    vi.advanceTimersByTime(200);
    stop();

    store.dispatch({ type: 'players/add', payload: { name: 'Nina' } });
    vi.advanceTimersByTime(500);
    expect(loadState().state.players.map((player) => player.name)).toEqual(['Luka']);
  });

  it('writes nothing at all when it is stopped without a pending change', () => {
    vi.useFakeTimers();
    const store = createStore(rootReducer, createInitialState());
    persist(store, 200)();
    vi.advanceTimersByTime(500);
    expect(loadState()).toBeNull();
  });
});
