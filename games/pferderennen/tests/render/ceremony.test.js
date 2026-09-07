/**
 * Tests for the prize giving's choreography (src/render/ceremony.js).
 *
 * The drawing needs a canvas and is judged by eye. The timing does not: third place walks in
 * first, then second, then the winner, and nobody climbs onto a plinth before their horse has
 * come to a stop. Those are the promises `docs/04_DESIGN_SYSTEM.md` §4.5 makes, and they are
 * checkable without a pixel.
 */
import { describe, it, expect } from 'vitest';
import { climbProgress, walkProgress } from '../../src/render/ceremony.js';
import { CEREMONY } from '../../src/config.js';

/** When a place's entrance begins, in seconds. */
const startsAt = (place) => (2 - place) * CEREMONY.stagger;

describe('who arrives when', () => {
  it('brings them in third, second, winner', () => {
    expect(startsAt(2)).toBeLessThan(startsAt(1));
    expect(startsAt(1)).toBeLessThan(startsAt(0));
  });

  it('staggers them by the 250 ms the design document asks for', () => {
    expect(startsAt(1) - startsAt(2)).toBeCloseTo(0.25, 5);
    expect(startsAt(0) - startsAt(1)).toBeCloseTo(0.25, 5);
  });

  it('has nobody moving before their turn', () => {
    for (const place of [0, 1, 2]) {
      expect(walkProgress(startsAt(place) - 0.01, place)).toBe(0);
      expect(climbProgress(startsAt(place) - 0.01, place)).toBe(0);
    }
  });

  it('never runs a progress past its ends', () => {
    for (const place of [0, 1, 2]) {
      expect(walkProgress(-99, place)).toBe(0);
      expect(walkProgress(99, place)).toBe(1);
      expect(climbProgress(-99, place)).toBe(0);
      expect(climbProgress(99, place)).toBe(1);
    }
  });
});

describe('getting off the horse', () => {
  it('waits until the horse has stopped', () => {
    for (const place of [0, 1, 2]) {
      const arrived = startsAt(place) + CEREMONY.walkSeconds;
      // Floating point: 0.5 + 0.9 does not land exactly on the end of the walk.
      expect(walkProgress(arrived, place)).toBeCloseTo(1, 6);
      // Not a step earlier: a jockey stepping off a moving horse looks like a fall.
      expect(climbProgress(arrived - 0.01, place)).toBe(0);
      expect(climbProgress(arrived + 0.01, place)).toBeGreaterThan(0);
    }
  });
});

describe('the whole thing is over quickly', () => {
  it('has everyone in place before the scene calls itself settled', () => {
    for (const place of [0, 1, 2]) {
      expect(climbProgress(CEREMONY.settledAt, place)).toBe(1);
    }
  });

  it('fires the confetti only once everybody is up there', () => {
    for (const place of [0, 1, 2]) {
      expect(climbProgress(CEREMONY.confettiAt, place)).toBe(1);
    }
  });

  it('does not keep people waiting for the settlement underneath', () => {
    // Four seconds is already a long time to look at a podium before finding out who drinks.
    expect(CEREMONY.settledAt).toBeLessThanOrEqual(4);
  });
});
