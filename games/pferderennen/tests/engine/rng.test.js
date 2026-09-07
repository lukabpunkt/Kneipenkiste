/**
 * Tests for the seedable random number generator (src/engine/rng.js).
 * The cases come from docs/03_RACE_ENGINE.md §3. Everything the fairness of the game rests on
 * is checked statistically here, not just structurally.
 */
import { describe, it, expect } from 'vitest';
import { createRng, randomSeed } from '../../src/engine/rng.js';

/** Draws n values with a fresh generator. */
function draw(n, fn, seed = 12345) {
  const rng = createRng(seed);
  const values = new Array(n);
  for (let i = 0; i < n; i += 1) values[i] = fn(rng);
  return values;
}

/**
 * Chi-square statistic of observed counts against a uniform expectation.
 * @param {number[]} counts
 * @returns {number}
 */
function chiSquare(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const expected = total / counts.length;
  return counts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
}

describe('createRng', () => {
  it('produces the exact same sequence for the same seed', () => {
    const a = draw(200, (rng) => rng.next(), 7);
    const b = draw(200, (rng) => rng.next(), 7);
    expect(a).toEqual(b);
  });

  it('produces a different sequence for a different seed', () => {
    const a = draw(200, (rng) => rng.next(), 7);
    const b = draw(200, (rng) => rng.next(), 8);
    expect(a).not.toEqual(b);
  });

  it('keeps every value of next() inside [0, 1)', () => {
    for (const value of draw(20000, (rng) => rng.next())) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('distributes next() uniformly over [0, 1) (chi-square over 100 buckets)', () => {
    const buckets = new Array(100).fill(0);
    for (const value of draw(200000, (rng) => rng.next())) {
      buckets[Math.floor(value * 100)] += 1;
    }
    // 99 degrees of freedom: the 99.9th percentile is about 148.2.
    expect(chiSquare(buckets)).toBeLessThan(148.2);
  });

  it('has a mean of about 0.5', () => {
    const values = draw(100000, (rng) => rng.next());
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });
});

describe('int', () => {
  it('keeps both bounds inclusive', () => {
    const values = draw(5000, (rng) => rng.int(3, 7));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(7);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it('handles a range of exactly one value', () => {
    expect(draw(50, (rng) => rng.int(4, 4)).every((value) => value === 4)).toBe(true);
  });

  it('is uniform over six values — this is the fairness of the horses', () => {
    const counts = new Array(6).fill(0);
    for (const value of draw(120000, (rng) => rng.int(0, 5))) counts[value] += 1;
    // 5 degrees of freedom: the 99.9th percentile is about 20.5.
    expect(chiSquare(counts)).toBeLessThan(20.5);
  });

  it('handles negative bounds', () => {
    const values = draw(2000, (rng) => rng.int(-3, -1));
    expect(Math.min(...values)).toBe(-3);
    expect(Math.max(...values)).toBe(-1);
  });
});

describe('float', () => {
  it('stays inside [min, max)', () => {
    for (const value of draw(5000, (rng) => rng.float(1.2, 2.5))) {
      expect(value).toBeGreaterThanOrEqual(1.2);
      expect(value).toBeLessThan(2.5);
    }
  });
});

describe('pick', () => {
  it('picks uniformly from an array', () => {
    const items = ['a', 'b', 'c', 'd'];
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    for (const value of draw(80000, (rng) => rng.pick(items))) counts[value] += 1;
    // 3 degrees of freedom: the 99.9th percentile is about 16.3.
    expect(chiSquare(Object.values(counts))).toBeLessThan(16.3);
  });

  it('always returns the only element of a single-element array', () => {
    expect(draw(20, (rng) => rng.pick(['solo'])).every((value) => value === 'solo')).toBe(true);
  });
});

describe('weighted', () => {
  it('weights proportionally to the given weights', () => {
    const items = [
      { value: 'common', weight: 100 },
      { value: 'rare', weight: 40 },
      { value: 'ufo', weight: 2 },
    ];
    const counts = { common: 0, rare: 0, ufo: 0 };
    const total = 200000;
    for (const value of draw(total, (rng) => rng.weighted(items))) counts[value] += 1;

    expect(counts.common / total).toBeCloseTo(100 / 142, 2);
    expect(counts.rare / total).toBeCloseTo(40 / 142, 2);
    expect(counts.ufo / total).toBeCloseTo(2 / 142, 2);
  });

  it('never returns an entry with weight zero', () => {
    const items = [
      { value: 'yes', weight: 1 },
      { value: 'never', weight: 0 },
    ];
    expect(draw(3000, (rng) => rng.weighted(items)).includes('never')).toBe(false);
  });

  it('returns the single entry when there is only one', () => {
    expect(createRng(1).weighted([{ value: 'only', weight: 5 }])).toBe('only');
  });
});

describe('gaussian', () => {
  it('produces mean 0 and standard deviation 1 by default', () => {
    const values = draw(200000, (rng) => rng.gaussian());
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
    expect(mean).toBeCloseTo(0, 2);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 2);
  });

  it('honours mean and standard deviation', () => {
    const values = draw(100000, (rng) => rng.gaussian(5, 2));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
    expect(mean).toBeCloseTo(5, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(2, 1);
  });

  it('is symmetric around the mean', () => {
    const values = draw(100000, (rng) => rng.gaussian());
    const positive = values.filter((value) => value > 0).length;
    expect(positive / values.length).toBeCloseTo(0.5, 2);
  });
});

describe('fork', () => {
  it('returns an independent stream', () => {
    const parent = createRng(99);
    const first = parent.fork();
    const second = parent.fork();
    const a = Array.from({ length: 50 }, () => first.next());
    const b = Array.from({ length: 50 }, () => second.next());
    expect(a).not.toEqual(b);
  });

  it('forks reproducibly from the same seed', () => {
    const forkOf = (seed) => {
      const parent = createRng(seed);
      const child = parent.fork();
      return Array.from({ length: 30 }, () => child.next());
    };
    expect(forkOf(4711)).toEqual(forkOf(4711));
  });

  it('advances the parent, so two forks in a row differ', () => {
    const parent = createRng(5);
    const before = parent.state();
    parent.fork();
    expect(parent.state()).not.toEqual(before);
  });

  it('produces sub-streams that are uncorrelated with the parent', () => {
    const parent = createRng(2024);
    const child = parent.fork();
    const parentValues = Array.from({ length: 500 }, () => parent.next());
    const childValues = Array.from({ length: 500 }, () => child.next());

    const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
    const meanA = mean(parentValues);
    const meanB = mean(childValues);
    let covariance = 0;
    let varianceA = 0;
    let varianceB = 0;
    for (let i = 0; i < parentValues.length; i += 1) {
      const da = parentValues[i] - meanA;
      const db = childValues[i] - meanB;
      covariance += da * db;
      varianceA += da * da;
      varianceB += db * db;
    }
    const correlation = covariance / Math.sqrt(varianceA * varianceB);
    expect(Math.abs(correlation)).toBeLessThan(0.1);
  });
});

describe('state', () => {
  it('exposes four state words and changes as values are drawn', () => {
    const rng = createRng(1);
    const before = rng.state();
    expect(before).toHaveLength(4);
    rng.next();
    expect(rng.state()).not.toEqual(before);
  });
});

describe('randomSeed', () => {
  it('returns a uint32', () => {
    for (let i = 0; i < 20; i += 1) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });

  it('does not keep returning the same value', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(seeds.size).toBeGreaterThan(40);
  });
});
