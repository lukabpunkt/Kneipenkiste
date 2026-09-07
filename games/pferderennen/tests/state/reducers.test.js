/**
 * Tests for the pure reducers (src/state/reducers.js).
 * Audit A6 asks for 100 % branch coverage here, so every rejection path is covered too.
 */
import { describe, it, expect } from 'vitest';
import { createInitialState, rootReducer, SCREENS } from '../../src/state/reducers.js';
import { BETTING, DEFAULT_SETTINGS } from '../../src/config.js';

/** Applies a list of actions in order. */
function run(state, ...actions) {
  return actions.reduce((current, action) => rootReducer(current, action), state);
}

/** A state with the given number of players. */
function withPlayers(count) {
  const names = ['Luka', 'Nina', 'Ben', 'Mira', 'Tom', 'Ida'];
  return run(
    createInitialState(),
    ...Array.from({ length: count }, (_, i) => ({
      type: 'players/add',
      payload: { name: names[i] },
    })),
  );
}

describe('createInitialState', () => {
  it('starts on the start screen with no players and no bets', () => {
    const state = createInitialState();
    expect(state.screen).toBe('start');
    expect(state.players).toEqual([]);
    expect(state.bets).toEqual([]);
    expect(state.bettingTurn).toBe(0);
    expect(state.race.result).toBeNull();
    expect(state.session).toEqual({ racesPlayed: 0, perPlayer: {}, history: [] });
  });

  it('copies the default settings rather than sharing them', () => {
    const state = createInitialState();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.settings).not.toBe(DEFAULT_SETTINGS);
  });
});

describe('unknown actions', () => {
  it('return the very same state reference', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'nothing/here' })).toBe(state);
  });
});

describe('screen/go', () => {
  it('switches to every known screen', () => {
    let state = createInitialState();
    for (const screen of SCREENS) {
      state = rootReducer(state, { type: 'screen/go', payload: screen });
      expect(state.screen).toBe(screen);
    }
  });

  it('ignores unknown screens and a switch to the current screen', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'screen/go', payload: 'nope' })).toBe(state);
    expect(rootReducer(state, { type: 'screen/go', payload: 'start' })).toBe(state);
  });
});

describe('players/add', () => {
  it('adds a player with an id, a trimmed name and an avatar', () => {
    const state = run(createInitialState(), {
      type: 'players/add',
      payload: { name: '  Luka  ' },
    });
    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toMatchObject({ id: 'p1', name: 'Luka' });
    expect(state.players[0].avatar).toBeTruthy();
  });

  it('counts ids up and never reuses one after a removal', () => {
    let state = withPlayers(3);
    state = rootReducer(state, { type: 'players/remove', payload: { id: 'p2' } });
    state = rootReducer(state, { type: 'players/add', payload: { name: 'Neu' } });
    expect(state.players.map((player) => player.id)).toEqual(['p1', 'p3', 'p4']);
  });

  it('ignores player ids that are not of the form p<number> when counting up', () => {
    const odd = { ...createInitialState(), players: [{ id: 'legacy', name: 'Alt', avatar: '🦄' }] };
    const state = rootReducer(odd, { type: 'players/add', payload: { name: 'Neu' } });
    expect(state.players[1].id).toBe('p1');
  });

  it('gives each player a different avatar while the pool lasts', () => {
    const state = withPlayers(6);
    expect(new Set(state.players.map((player) => player.avatar)).size).toBe(6);
  });

  it('accepts an explicitly chosen avatar', () => {
    const state = run(createInitialState(), {
      type: 'players/add',
      payload: { name: 'Luka', avatar: '🐢' },
    });
    expect(state.players[0].avatar).toBe('🐢');
  });

  it('cuts names to the maximum length', () => {
    const state = run(createInitialState(), {
      type: 'players/add',
      payload: { name: 'x'.repeat(40) },
    });
    expect(state.players[0].name).toHaveLength(BETTING.maxNameLength);
  });

  it('rejects empty names, whitespace and missing payloads', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'players/add', payload: { name: '   ' } })).toBe(state);
    expect(rootReducer(state, { type: 'players/add', payload: {} })).toBe(state);
    expect(rootReducer(state, { type: 'players/add' })).toBe(state);
  });

  it('rejects duplicate names regardless of case', () => {
    const state = withPlayers(1);
    expect(rootReducer(state, { type: 'players/add', payload: { name: 'LUKA' } })).toBe(state);
  });

  it('stops at the maximum number of players', () => {
    const state = run(
      createInitialState(),
      ...Array.from({ length: BETTING.maxPlayers }, (_, i) => ({
        type: 'players/add',
        payload: { name: `Spieler ${i}` },
      })),
    );
    expect(state.players).toHaveLength(BETTING.maxPlayers);
    expect(rootReducer(state, { type: 'players/add', payload: { name: 'Zuviel' } })).toBe(state);
  });
});

describe('players/remove', () => {
  it('removes the player together with their bet', () => {
    let state = withPlayers(2);
    state = rootReducer(state, {
      type: 'bets/place',
      payload: { playerId: 'p1', horseId: 'morgana', sips: 3 },
    });
    state = rootReducer(state, { type: 'players/remove', payload: { id: 'p1' } });
    expect(state.players.map((player) => player.id)).toEqual(['p2']);
    expect(state.bets).toEqual([]);
  });

  it('ignores unknown ids', () => {
    const state = withPlayers(2);
    expect(rootReducer(state, { type: 'players/remove', payload: { id: 'p9' } })).toBe(state);
  });
});

describe('players/rename', () => {
  it('renames a player', () => {
    const state = run(withPlayers(2), {
      type: 'players/rename',
      payload: { id: 'p1', name: 'Lukas' },
    });
    expect(state.players[0].name).toBe('Lukas');
  });

  it('ignores unknown ids, empty names, duplicates and unchanged names', () => {
    const state = withPlayers(2);
    const cases = [
      { id: 'p9', name: 'Egal' },
      { id: 'p1', name: '  ' },
      { id: 'p1', name: 'Nina' },
      { id: 'p1', name: 'Luka' },
    ];
    for (const payload of cases) {
      expect(rootReducer(state, { type: 'players/rename', payload })).toBe(state);
    }
    expect(rootReducer(state, { type: 'players/rename' })).toBe(state);
  });
});

describe('players/setAvatar', () => {
  it('changes the avatar of exactly one player and leaves the others alone', () => {
    const before = withPlayers(3);
    const state = run(before, { type: 'players/setAvatar', payload: { id: 'p2', avatar: '🦔' } });
    expect(state.players[1].avatar).toBe('🦔');
    expect(state.players[0]).toBe(before.players[0]);
    expect(state.players[2]).toBe(before.players[2]);
  });

  it('ignores unknown ids, a missing avatar and the unchanged avatar', () => {
    const state = withPlayers(1);
    const current = state.players[0].avatar;
    expect(
      rootReducer(state, { type: 'players/setAvatar', payload: { id: 'p9', avatar: '🐝' } }),
    ).toBe(state);
    expect(rootReducer(state, { type: 'players/setAvatar', payload: { id: 'p1' } })).toBe(state);
    expect(
      rootReducer(state, { type: 'players/setAvatar', payload: { id: 'p1', avatar: current } }),
    ).toBe(state);
    expect(rootReducer(state, { type: 'players/setAvatar' })).toBe(state);
  });
});

describe('bets/place', () => {
  it('stores a bet with the default type win', () => {
    const state = run(withPlayers(2), {
      type: 'bets/place',
      payload: { playerId: 'p1', horseId: 'hopfen', sips: 4 },
    });
    expect(state.bets).toEqual([{ playerId: 'p1', horseId: 'hopfen', sips: 4, type: 'win' }]);
  });

  it('replaces an existing bet of the same player instead of adding a second one', () => {
    const state = run(
      withPlayers(2),
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'hopfen', sips: 4 } },
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'wodka', sips: 2 } },
    );
    expect(state.bets).toHaveLength(1);
    expect(state.bets[0]).toMatchObject({ horseId: 'wodka', sips: 2 });
  });

  it('leaves the bets of the other players untouched when one is replaced', () => {
    const state = run(
      withPlayers(3),
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'hopfen', sips: 4 } },
      { type: 'bets/place', payload: { playerId: 'p2', horseId: 'wodka', sips: 2 } },
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'morgana', sips: 7 } },
    );
    expect(state.bets).toHaveLength(2);
    expect(state.bets[0]).toMatchObject({ playerId: 'p1', horseId: 'morgana', sips: 7 });
    expect(state.bets[1]).toMatchObject({ playerId: 'p2', horseId: 'wodka', sips: 2 });
  });

  // How the ⊖ ⊕ in the summary line work: the whole bet is sent back with one field moved, so the
  // horse and the bet type travel along untouched and no separate action is needed.
  it('moves only the stake when the bet is resent with everything else unchanged', () => {
    const placed = run(
      withPlayers(2),
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'hopfen', sips: 4, type: 'last' } },
      { type: 'bets/place', payload: { playerId: 'p2', horseId: 'wodka', sips: 2 } },
    );
    const bet = placed.bets[0];
    const state = run(placed, { type: 'bets/place', payload: { ...bet, sips: bet.sips + 1 } });

    expect(state.bets).toHaveLength(2);
    expect(state.bets[0]).toEqual({ playerId: 'p1', horseId: 'hopfen', sips: 5, type: 'last' });
    expect(state.bets[1]).toBe(placed.bets[1]);
  });

  it('clamps the stake to the allowed range and rounds it', () => {
    const check = (sips) =>
      run(withPlayers(1), { type: 'bets/place', payload: { playerId: 'p1', horseId: 'x', sips } })
        .bets[0].sips;
    expect(check(0)).toBe(BETTING.minSips);
    expect(check(-5)).toBe(BETTING.minSips);
    expect(check(99)).toBe(BETTING.maxSips);
    expect(check(3.6)).toBe(4);
  });

  it('ignores a stake that is not a number at all', () => {
    const state = withPlayers(1);
    expect(
      rootReducer(state, { type: 'bets/place', payload: { playerId: 'p1', horseId: 'x' } }),
    ).toBe(state);
    expect(
      rootReducer(state, {
        type: 'bets/place',
        payload: { playerId: 'p1', horseId: 'x', sips: 'drei' },
      }),
    ).toBe(state);
  });

  it('keeps a freely chosen bet type', () => {
    const state = run(withPlayers(1), {
      type: 'bets/place',
      payload: { playerId: 'p1', horseId: 'x', sips: 3, type: 'last' },
    });
    expect(state.bets[0].type).toBe('last');
  });

  it('ignores unknown players and a missing horse', () => {
    const state = withPlayers(1);
    expect(
      rootReducer(state, {
        type: 'bets/place',
        payload: { playerId: 'p9', horseId: 'x', sips: 3 },
      }),
    ).toBe(state);
    expect(rootReducer(state, { type: 'bets/place', payload: { playerId: 'p1', sips: 3 } })).toBe(
      state,
    );
    expect(rootReducer(state, { type: 'bets/place' })).toBe(state);
  });
});

describe('bets/reset and betting/next', () => {
  it('clears bets and the turn', () => {
    let state = run(
      withPlayers(2),
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'x', sips: 3 } },
      { type: 'betting/next' },
    );
    expect(state.bettingTurn).toBe(1);
    state = rootReducer(state, { type: 'bets/reset' });
    expect(state.bets).toEqual([]);
    expect(state.bettingTurn).toBe(0);
  });

  it('does nothing when there is nothing to reset', () => {
    const state = withPlayers(2);
    expect(rootReducer(state, { type: 'bets/reset' })).toBe(state);
  });

  it('never advances the turn past the last player', () => {
    let state = withPlayers(2);
    for (let i = 0; i < 5; i += 1) state = rootReducer(state, { type: 'betting/next' });
    expect(state.bettingTurn).toBe(2);
    expect(rootReducer(state, { type: 'betting/next' })).toBe(state);
  });
});

describe('bets/repeat', () => {
  /** Two players who have bet and then raced, so there is something to run back. */
  function afterARace() {
    return run(
      withPlayers(2),
      { type: 'bets/place', payload: { playerId: 'p1', horseId: 'hopfen', sips: 4 } },
      { type: 'bets/place', payload: { playerId: 'p2', horseId: 'wodka', sips: 2, type: 'last' } },
      { type: 'betting/next' },
      { type: 'betting/next' },
      { type: 'race/setResult', payload: { seed: 1, order: ['hopfen', 'wodka'] } },
      { type: 'bets/reset' },
    );
  }

  it('remembers the bets a race was run with', () => {
    const state = afterARace();
    expect(state.bets).toEqual([]);
    expect(state.lastBets).toHaveLength(2);
    expect(state.lastBets[0]).toMatchObject({ playerId: 'p1', horseId: 'hopfen', sips: 4 });
  });

  it('puts them back, stakes and bet types included', () => {
    const state = rootReducer(afterARace(), { type: 'bets/repeat' });
    expect(state.bets).toHaveLength(2);
    expect(state.bets[0]).toMatchObject({ playerId: 'p1', horseId: 'hopfen', sips: 4 });
    expect(state.bets[1]).toMatchObject({
      playerId: 'p2',
      horseId: 'wodka',
      sips: 2,
      type: 'last',
    });
  });

  it('jumps the turn to the end, so the summary shows rather than the round starting again', () => {
    const state = rootReducer(afterARace(), { type: 'bets/repeat' });
    expect(state.bettingTurn).toBe(state.players.length);
  });

  it('drops the bets of players who have left', () => {
    const gone = run(afterARace(), { type: 'players/remove', payload: { id: 'p2' } });
    const state = rootReducer(gone, { type: 'bets/repeat' });
    expect(state.bets).toHaveLength(1);
    expect(state.bets[0].playerId).toBe('p1');
    expect(state.bettingTurn).toBe(1);
  });

  it('leaves a player who joined afterwards without a bet', () => {
    const bigger = run(afterARace(), { type: 'players/add', payload: { name: 'Ben' } });
    const state = rootReducer(bigger, { type: 'bets/repeat' });
    // Two of three: the race cannot start until the newcomer has placed one.
    expect(state.bets).toHaveLength(2);
    expect(state.players).toHaveLength(3);
  });

  it('does nothing when no race has been run yet', () => {
    const state = withPlayers(2);
    expect(rootReducer(state, { type: 'bets/repeat' })).toBe(state);
  });

  it('does nothing when everybody who bet has left', () => {
    const empty = run(
      afterARace(),
      { type: 'players/remove', payload: { id: 'p1' } },
      { type: 'players/remove', payload: { id: 'p2' } },
    );
    expect(rootReducer(empty, { type: 'bets/repeat' })).toBe(empty);
  });

  it('survives being reset in between — that is the whole point', () => {
    const state = run(afterARace(), { type: 'bets/reset' }, { type: 'bets/repeat' });
    expect(state.bets).toHaveLength(2);
  });
});

describe('settings/update', () => {
  it('changes known settings', () => {
    const state = run(createInitialState(), {
      type: 'settings/update',
      payload: { chaos: 'wild', sound: false },
    });
    expect(state.settings.chaos).toBe('wild');
    expect(state.settings.sound).toBe(false);
  });

  it('ignores unknown keys and unchanged values', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'settings/update', payload: { hack: true } })).toBe(state);
    expect(
      rootReducer(state, { type: 'settings/update', payload: { chaos: state.settings.chaos } }),
    ).toBe(state);
    expect(rootReducer(state, { type: 'settings/update' })).toBe(state);
  });
});

describe('race/setResult and race/clear', () => {
  it('stores order, seed and events', () => {
    const state = run(createInitialState(), {
      type: 'race/setResult',
      payload: { seed: 42, order: ['a', 'b'], events: [{ id: 'banana' }] },
    });
    expect(state.race).toEqual({
      seed: 42,
      phase: 'finished',
      result: { order: ['a', 'b'], events: [{ id: 'banana' }], rules: [] },
      recorded: false,
    });
  });

  it('defaults seed and events when they are missing', () => {
    const state = run(createInitialState(), {
      type: 'race/setResult',
      payload: { order: ['a'] },
    });
    expect(state.race.seed).toBeNull();
    expect(state.race.result.events).toEqual([]);
  });

  it('ignores a missing or empty order', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'race/setResult', payload: { order: [] } })).toBe(state);
    expect(rootReducer(state, { type: 'race/setResult', payload: {} })).toBe(state);
    expect(rootReducer(state, { type: 'race/setResult' })).toBe(state);
  });

  it('marks a race as recorded only once', () => {
    const withResult = rootReducer(createInitialState(), {
      type: 'race/setResult',
      payload: { seed: 1, order: ['a'] },
    });
    expect(withResult.race.recorded).toBe(false);
    const marked = rootReducer(withResult, { type: 'race/markRecorded' });
    expect(marked.race.recorded).toBe(true);
    expect(rootReducer(marked, { type: 'race/markRecorded' })).toBe(marked);
  });

  it('resets the recorded flag when a new result arrives', () => {
    let state = rootReducer(createInitialState(), {
      type: 'race/setResult',
      payload: { seed: 1, order: ['a'] },
    });
    state = rootReducer(state, { type: 'race/markRecorded' });
    state = rootReducer(state, { type: 'race/setResult', payload: { seed: 2, order: ['b'] } });
    expect(state.race.recorded).toBe(false);
  });

  it('clears the race, and does nothing when it is already clear', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'race/clear' })).toBe(state);
    const withResult = rootReducer(state, {
      type: 'race/setResult',
      payload: { seed: 1, order: ['a'] },
    });
    expect(rootReducer(withResult, { type: 'race/clear' }).race.result).toBeNull();
  });
});

describe('session/record', () => {
  const settlement = {
    winners: [{ playerId: 'p1', sipsToDeal: 3 }],
    losers: [{ playerId: 'p2', sipsToDrink: 2 }],
    eventRules: [],
  };

  it('counts wins, sips dealt and sips drunk', () => {
    const state = run(withPlayers(2), {
      type: 'session/record',
      payload: { settlement, winnerHorseId: 'hopfen', seed: 7, timestamp: 1000 },
    });
    expect(state.session.racesPlayed).toBe(1);
    expect(state.session.perPlayer.p1).toMatchObject({ dealt: 3, wins: 1, loseStreak: 0 });
    expect(state.session.perPlayer.p2).toMatchObject({ drank: 2, loseStreak: 1, maxLoseStreak: 1 });
    expect(state.session.history).toEqual([{ seed: 7, winnerId: 'hopfen', timestamp: 1000 }]);
  });

  it('tracks the longest losing streak and resets it on a win', () => {
    const lose = {
      type: 'session/record',
      payload: { settlement, winnerHorseId: 'h', seed: 1, timestamp: 1 },
    };
    const win = {
      type: 'session/record',
      payload: {
        settlement: { winners: [{ playerId: 'p2', sipsToDeal: 1 }], losers: [], eventRules: [] },
        winnerHorseId: 'h',
        seed: 2,
        timestamp: 2,
      },
    };
    const state = run(withPlayers(2), lose, lose, lose, win);
    expect(state.session.perPlayer.p2).toMatchObject({ loseStreak: 0, maxLoseStreak: 3, wins: 1 });
  });

  it('folds event drinking rules into the statistics', () => {
    const state = run(withPlayers(2), {
      type: 'session/record',
      payload: {
        settlement: {
          winners: [],
          losers: [],
          eventRules: [
            { playerIds: ['p1', 'p2'], sips: 1, direction: 'drink' },
            { playerIds: ['p1'], sips: 2, direction: 'deal' },
          ],
        },
        winnerHorseId: 'h',
        seed: 1,
        timestamp: 1,
      },
    });
    expect(state.session.perPlayer.p1).toMatchObject({ drank: 1, dealt: 2 });
    expect(state.session.perPlayer.p2).toMatchObject({ drank: 1 });
  });

  it('keeps at most 50 history entries', () => {
    let state = withPlayers(2);
    for (let i = 0; i < 60; i += 1) {
      state = rootReducer(state, {
        type: 'session/record',
        payload: { settlement, winnerHorseId: `h${i}`, seed: i, timestamp: i },
      });
    }
    expect(state.session.history).toHaveLength(50);
    expect(state.session.history[0].seed).toBe(10);
    expect(state.session.racesPlayed).toBe(60);
  });

  it('ignores a payload without a settlement', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'session/record', payload: {} })).toBe(state);
    expect(rootReducer(state, { type: 'session/record' })).toBe(state);
  });

  it('copes with a settlement that has no event rules at all', () => {
    const state = run(withPlayers(1), {
      type: 'session/record',
      payload: {
        settlement: { winners: [], losers: [{ playerId: 'p1', sipsToDrink: 1 }] },
        winnerHorseId: 'h',
        seed: 1,
        timestamp: 1,
      },
    });
    expect(state.session.perPlayer.p1.drank).toBe(1);
  });
});

describe('session/reset', () => {
  it('clears the statistics but keeps the players', () => {
    let state = run(withPlayers(2), {
      type: 'session/record',
      payload: {
        settlement: { winners: [], losers: [{ playerId: 'p1', sipsToDrink: 1 }], eventRules: [] },
        winnerHorseId: 'h',
        seed: 1,
        timestamp: 1,
      },
    });
    state = rootReducer(state, { type: 'session/reset' });
    expect(state.session).toEqual({ racesPlayed: 0, perPlayer: {}, history: [] });
    expect(state.players).toHaveLength(2);
  });

  it('does nothing on a fresh session', () => {
    const state = createInitialState();
    expect(rootReducer(state, { type: 'session/reset' })).toBe(state);
  });
});
