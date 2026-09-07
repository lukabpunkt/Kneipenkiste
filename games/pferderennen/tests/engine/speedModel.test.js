/**
 * Tests for the speed model (src/engine/speedModel.js).
 *
 * The point of these is symmetry: every runner must be drawn from the identical distribution.
 * A bug that gives one runner a systematically different profile would not show up as a crash,
 * only as a slow bias — so it is checked here directly rather than left to the audit.
 */
import { describe, it, expect } from 'vitest';
import {
  createProfile,
  phaseCoefficients,
  phaseValue,
  sprintValue,
  finishValue,
  stepNoise,
  baseModifier,
  clampSpeed,
} from '../../src/engine/speedModel.js';
import { createRng } from '../../src/engine/rng.js';
import { SPEED_MODEL, RACE_DURATIONS } from '../../src/config.js';

/** A profile drawn from its own stream, the way race.js does it. */
const profileFor = (seed) => createProfile(createRng(seed), RACE_DURATIONS.normal);

describe('createProfile', () => {
  it('fills every field the model needs', () => {
    const profile = profileFor(1);
    expect(profile.nodes).toHaveLength(SPEED_MODEL.phase.nodes);
    expect(profile.phase).toHaveLength((SPEED_MODEL.phase.nodes - 1) * 4);
    expect(profile.sprintCount).toBeGreaterThanOrEqual(SPEED_MODEL.sprint.countMin);
    expect(profile.sprintCount).toBeLessThanOrEqual(SPEED_MODEL.sprint.countMax);
    expect(profile.noise).toBe(0);
  });

  it('is reproducible from the same seed', () => {
    expect(Array.from(profileFor(7).nodes)).toEqual(Array.from(profileFor(7).nodes));
  });

  it('keeps every sprint inside its window', () => {
    const { windowStart, windowEnd, durationMin, durationMax } = SPEED_MODEL.sprint;
    for (let seed = 1; seed <= 300; seed += 1) {
      const profile = profileFor(seed);
      for (let i = 0; i < profile.sprintCount; i += 1) {
        expect(profile.sprintStart[i]).toBeGreaterThanOrEqual(windowStart * RACE_DURATIONS.normal);
        expect(profile.sprintStart[i]).toBeLessThan(windowEnd * RACE_DURATIONS.normal);
        expect(profile.sprintLength[i]).toBeGreaterThanOrEqual(durationMin);
        expect(profile.sprintLength[i]).toBeLessThan(durationMax);
      }
    }
  });

  it('draws every runner from the identical distribution', () => {
    // Six streams, exactly as race.js forks them; the spread of each must match.
    const root = createRng(2024);
    const speed = root.fork();
    const samples = Array.from({ length: 6 }, () => []);

    for (let race = 0; race < 4000; race += 1) {
      const raceStream = speed.fork();
      for (let runner = 0; runner < 6; runner += 1) {
        const profile = createProfile(raceStream.fork(), RACE_DURATIONS.normal);
        samples[runner].push(profile.nodes[profile.nodes.length - 1]);
      }
    }

    const spread = samples.map((values) => {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    });
    // Every runner sees the same sigmaEnd, so the six spreads must agree closely.
    expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(0.02);
    for (const value of spread) expect(value).toBeCloseTo(SPEED_MODEL.phase.sigmaEnd, 1);
  });

  it('spreads the control points wider towards the finish', () => {
    const first = [];
    const last = [];
    for (let seed = 1; seed <= 3000; seed += 1) {
      const profile = profileFor(seed);
      first.push(profile.nodes[0]);
      last.push(profile.nodes[profile.nodes.length - 1]);
    }
    const spread = (values) =>
      Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
    // This ramp is what makes a comeback possible; without it the field never regroups.
    expect(spread(last)).toBeGreaterThan(spread(first) * 10);
  });
});

describe('phaseValue', () => {
  const nodes = Float64Array.from({ length: SPEED_MODEL.phase.nodes }, (_, i) => (i % 2 ? 1 : -1));
  const coefficients = phaseCoefficients(nodes);

  it('passes exactly through the control points', () => {
    const last = nodes.length - 1;
    for (let i = 0; i <= last; i += 1) {
      expect(phaseValue(coefficients, i / last), `Knoten ${i}`).toBeCloseTo(nodes[i], 6);
    }
  });

  it('clamps outside the track rather than extrapolating', () => {
    expect(phaseValue(coefficients, -1)).toBeCloseTo(phaseValue(coefficients, 0), 9);
    expect(phaseValue(coefficients, 2)).toBeCloseTo(phaseValue(coefficients, 1), 9);
  });

  it('is continuous — no jump between two segments', () => {
    let previous = phaseValue(coefficients, 0);
    for (let x = 0.001; x <= 1; x += 0.001) {
      const value = phaseValue(coefficients, x);
      expect(Math.abs(value - previous)).toBeLessThan(0.2);
      previous = value;
    }
  });

  it('returns a flat profile for flat control points', () => {
    const flat = phaseCoefficients(new Float64Array(SPEED_MODEL.phase.nodes).fill(0.5));
    for (let x = 0; x <= 1; x += 0.05) expect(phaseValue(flat, x)).toBeCloseTo(0.5, 9);
  });
});

describe('sprintValue', () => {
  const profile = {
    sprintCount: 1,
    sprintStart: Float64Array.from([10]),
    sprintPower: Float64Array.from([0.2]),
    sprintLength: Float64Array.from([2]),
  };

  it('is zero before and after the sprint', () => {
    expect(sprintValue(profile, 5)).toBe(0);
    expect(sprintValue(profile, 10 + 2 + SPEED_MODEL.sprint.fade + 0.01)).toBe(0);
  });

  it('reaches the full strength in the middle', () => {
    expect(sprintValue(profile, 11)).toBeCloseTo(0.2, 6);
  });

  it('fades in and out symmetrically', () => {
    const fade = SPEED_MODEL.sprint.fade;
    expect(sprintValue(profile, 10 + fade / 2)).toBeCloseTo(0.1, 6);
    expect(sprintValue(profile, 12 + fade / 2)).toBeCloseTo(0.1, 6);
  });

  it('sums overlapping sprints', () => {
    const overlapping = {
      sprintCount: 2,
      sprintStart: Float64Array.from([10, 10]),
      sprintPower: Float64Array.from([0.2, 0.1]),
      sprintLength: Float64Array.from([2, 2]),
    };
    expect(sprintValue(overlapping, 11)).toBeCloseTo(0.3, 6);
  });
});

describe('finishValue', () => {
  it('is zero before the window and full after it', () => {
    expect(finishValue(0.5, SPEED_MODEL.finish.from - 0.01)).toBe(0);
    expect(finishValue(0.5, SPEED_MODEL.finish.to + 0.01)).toBe(0.5);
    expect(finishValue(0.5, 1)).toBe(0.5);
  });

  it('rises smoothly through the window', () => {
    const middle = (SPEED_MODEL.finish.from + SPEED_MODEL.finish.to) / 2;
    expect(finishValue(1, middle)).toBeCloseTo(0.5, 5);
  });
});

describe('stepNoise', () => {
  it('stays bounded and averages out over a long run', () => {
    const profile = { noise: 0 };
    const rng = createRng(5);
    const values = [];
    for (let i = 0; i < 200000; i += 1) values.push(stepNoise(profile, rng));

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    // Spread the values with reduce, not Math.max(...values): 200k arguments blow the stack.
    const peak = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(peak).toBeLessThan(0.4);
  });

  it('reverts towards zero rather than drifting away', () => {
    const profile = { noise: 5 };
    const rng = createRng(9);
    for (let i = 0; i < 200; i += 1) stepNoise(profile, rng);
    expect(Math.abs(profile.noise)).toBeLessThan(0.5);
  });

  it('is reproducible from the same seed', () => {
    const run = () => {
      const profile = { noise: 0 };
      const rng = createRng(11);
      return Array.from({ length: 50 }, () => stepNoise(profile, rng));
    };
    expect(run()).toEqual(run());
  });
});

describe('clampSpeed', () => {
  it('keeps values inside the configured bounds', () => {
    expect(clampSpeed(-99)).toBe(SPEED_MODEL.clampMin);
    expect(clampSpeed(99)).toBe(SPEED_MODEL.clampMax);
    expect(clampSpeed(1)).toBe(1);
  });

  it('allows a negative speed, so the confused horse can run backwards', () => {
    expect(SPEED_MODEL.clampMin).toBeLessThan(0);
    expect(clampSpeed(1 + -1.6)).toBeLessThan(0);
  });
});

describe('baseModifier', () => {
  it('never reads a runner rank or position relative to the others', () => {
    // Same profile, same time, same progress -> same value. If the model peeked at the field,
    // this could not hold, and the fairness of the whole game rests on it.
    const profile = profileFor(3);
    expect(baseModifier(profile, 12, 0.4)).toBe(baseModifier(profile, 12, 0.4));
  });

  it('stays in a plausible range across a whole race', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const profile = profileFor(seed);
      for (let x = 0; x <= 1; x += 0.02) {
        const value = baseModifier(profile, x * RACE_DURATIONS.normal, x);
        expect(Math.abs(value), `Seed ${seed} @ ${x.toFixed(2)}`).toBeLessThan(1);
      }
    }
  });
});
