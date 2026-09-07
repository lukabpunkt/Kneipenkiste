/**
 * Tests for the router guards (src/ui/router.js).
 *
 * The guards are what makes a hand-typed hash harmless: #/race without bets must not drop the
 * player into a dead screen (audit A1, "Reload auf jedem Screen").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveScreen } from '../../src/ui/router.js';
import { createInitialState, rootReducer } from '../../src/state/reducers.js';

/** Builds a state with players, optionally with everyone's bets placed and a race result. */
function stateWith({ players = 0, bets = false, result = false } = {}) {
  let state = createInitialState();
  for (let i = 0; i < players; i += 1) {
    state = rootReducer(state, { type: 'players/add', payload: { name: `Spieler ${i}` } });
  }
  if (bets) {
    for (const player of state.players) {
      state = rootReducer(state, {
        type: 'bets/place',
        payload: { playerId: player.id, horseId: 'hopfen', sips: 3 },
      });
    }
  }
  if (result) {
    state = rootReducer(state, { type: 'race/setResult', payload: { seed: 1, order: ['hopfen'] } });
  }
  return state;
}

describe('resolveScreen', () => {
  it('always allows the start and player screens', () => {
    const empty = stateWith();
    expect(resolveScreen('start', empty)).toBe('start');
    expect(resolveScreen('players', empty)).toBe('players');
  });

  it('falls back to start for an unknown screen', () => {
    expect(resolveScreen('nonsense', stateWith({ players: 3 }))).toBe('start');
  });

  it('sends you to the player screen while there are too few players', () => {
    const lonely = stateWith({ players: 1 });
    expect(resolveScreen('betting', lonely)).toBe('players');
    expect(resolveScreen('race', lonely)).toBe('players');
    expect(resolveScreen('results', lonely)).toBe('players');
  });

  it('allows betting once enough players are in', () => {
    expect(resolveScreen('betting', stateWith({ players: 2 }))).toBe('betting');
  });

  it('refuses the race until everyone has placed a bet', () => {
    expect(resolveScreen('race', stateWith({ players: 3 }))).toBe('betting');
    expect(resolveScreen('race', stateWith({ players: 3, bets: true }))).toBe('race');
  });

  it('refuses the results until a race has actually finished', () => {
    expect(resolveScreen('results', stateWith({ players: 3, bets: true }))).toBe('betting');
    expect(resolveScreen('results', stateWith({ players: 3, bets: true, result: true }))).toBe(
      'results',
    );
  });
});

describe('lazy screens', () => {
  it('exposes the race screen as a loader, not as a module', async () => {
    // The race screen pulls in the whole renderer — horses, both tracks, props, particles —
    // which nobody needs before they have placed a bet. main.js therefore hands the router a
    // function instead of a module, and this is what keeps the first paint at 127 KB
    // instead of 307 KB. A regression here would be invisible except on the scale.
    const source = readFileSync('src/main.js', 'utf8');
    expect(source).toMatch(/race:\s*\(\)\s*=>\s*import\(/);
    // And the other screens stay eager, so the first screen needs no round trip at all.
    for (const name of ['start', 'players', 'betting', 'results']) {
      expect(source, name).toMatch(new RegExp(`import \\* as ${name} from`));
    }
  });

  it('warms the race screen up in the background rather than on demand', () => {
    const source = readFileSync('src/main.js', 'utf8');
    expect(source).toMatch(/router\.preload\('race'\)/);
  });
});
