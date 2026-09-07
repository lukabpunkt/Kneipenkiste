/**
 * Tests for the leaderboard ranking rule (src/render/hud.js).
 *
 * Audit A3 asks that the order shown at the end agrees with the engine's finish order. It did
 * not, at first: every runner ends on the line at exactly the track length, so sorting by
 * position produced an arbitrary board that contradicted the result screen.
 */
import { describe, it, expect } from 'vitest';
import { rankRunners } from '../../src/render/hud.js';
import { TRACK_LENGTH } from '../../src/config.js';

/** Runners as the renderer sees them. */
const runners = [
  { index: 0, x: 400 },
  { index: 1, x: 600 },
  { index: 2, x: 500 },
  { index: 3, x: 300 },
  { index: 4, x: 550 },
  { index: 5, x: 450 },
];

describe('rankRunners', () => {
  it('sorts by position while the race is running', () => {
    expect(rankRunners(runners).map((r) => r.index)).toEqual([1, 4, 2, 5, 0, 3]);
  });

  it('follows the engine order once the race is over', () => {
    const finished = runners.map((runner) => ({ ...runner, x: TRACK_LENGTH }));
    const order = [3, 1, 5, 0, 4, 2];
    expect(rankRunners(finished, order).map((r) => r.index)).toEqual(order);
  });

  it('does not depend on the array order of the runners', () => {
    const shuffled = [runners[4], runners[0], runners[3], runners[5], runners[1], runners[2]];
    const order = [2, 0, 4, 1, 3, 5];
    expect(rankRunners(shuffled, order).map((r) => r.index)).toEqual(order);
  });

  it('returns every runner exactly once', () => {
    const ranked = rankRunners(runners, [5, 4, 3, 2, 1, 0]);
    expect(new Set(ranked.map((r) => r.index)).size).toBe(6);
  });
});
