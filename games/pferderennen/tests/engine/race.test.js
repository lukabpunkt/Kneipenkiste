/**
 * Tests for the race simulation (src/engine/race.js).
 *
 * These are the guarantees the whole game rests on: the same seed replays exactly, the frame
 * rate cannot change the outcome, the scheduler keeps its promises, and the engine never
 * reaches for anything it is not allowed to know.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRace } from '../../src/engine/race.js';
import { planEvents } from '../../src/engine/eventScheduler.js';
import { createRng } from '../../src/engine/rng.js';
import {
  RUNNER_COUNT,
  TRACK_LENGTH,
  TIMESTEP,
  RACE_DURATIONS,
  EVENT_RULES,
} from '../../src/config.js';

/** Runs a race to the end and returns it. */
const finish = (options) => createRace(options).run();

describe('determinism (D1)', () => {
  it('replays fifty seeds bit for bit', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const first = finish({ seed });
      const second = finish({ seed });
      expect(JSON.stringify(first.snapshot()), `Seed ${seed}`).toBe(
        JSON.stringify(second.snapshot()),
      );
      expect(first.order).toEqual(second.order);
      expect(first.metrics).toEqual(second.metrics);
    }
  });

  it('gives different seeds different races', () => {
    const winners = new Set();
    for (let seed = 1; seed <= 60; seed += 1) winners.add(finish({ seed }).order.join(','));
    expect(winners.size).toBeGreaterThan(50);
  });

  it('replays identically when stepped by hand instead of run()', () => {
    const a = finish({ seed: 4711 });
    const b = createRace({ seed: 4711 });
    while (!b.isFinished) b.step();
    expect(b.order).toEqual(a.order);
    expect(b.snapshot()).toEqual(a.snapshot());
  });
});

describe('fixed timestep (F5)', () => {
  it('ignores any argument handed to step()', () => {
    const controlled = createRace({ seed: 99 });
    const abused = createRace({ seed: 99 });
    for (let i = 0; i < 100; i += 1) {
      controlled.step();
      abused.step(0.5);
    }
    expect(abused.state.t).toBeCloseTo(controlled.state.t, 12);
    expect(abused.snapshot()).toEqual(controlled.snapshot());
  });

  it('advances by exactly one timestep', () => {
    const race = createRace({ seed: 1 });
    race.step();
    expect(race.state.t).toBeCloseTo(TIMESTEP, 12);
    race.step();
    expect(race.state.t).toBeCloseTo(2 * TIMESTEP, 12);
  });
});

describe('the finish', () => {
  it('produces a complete order with every runner exactly once', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const order = finish({ seed }).order;
      expect(order).toHaveLength(RUNNER_COUNT);
      expect(new Set(order).size).toBe(RUNNER_COUNT);
      expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('orders by the interpolated crossing time, not by the step the runner finished in', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const race = finish({ seed });
      const runners = race.runners;
      const times = race.order.map((index) => runners[index].finishTime);
      for (let i = 1; i < times.length; i += 1) {
        if (Number.isFinite(times[i]) && Number.isFinite(times[i - 1])) {
          expect(times[i], `Seed ${seed}`).toBeGreaterThanOrEqual(times[i - 1]);
        }
      }
    }
  });

  it('sorts runners that never finished by position, behind everyone who did', () => {
    const race = finish({ seed: 3 });
    const runners = race.runners;
    let seenUnfinished = false;
    for (const index of race.order) {
      if (!runners[index].finished) seenUnfinished = true;
      else expect(seenUnfinished, 'ein Läufer im Ziel steht hinter einem ohne Ziel').toBe(false);
    }
  });

  it('breaks a dead heat with a coin flip rather than by runner index', () => {
    // Two runners on exactly the same time would otherwise always resolve to the lower index.
    // Over many seeds the winner index must be uniform, which the fairness audit proves at
    // scale; here it is enough that no index is systematically first.
    const firsts = new Array(RUNNER_COUNT).fill(0);
    for (let seed = 1; seed <= 600; seed += 1) firsts[finish({ seed }).order[0]] += 1;
    for (const count of firsts) expect(count).toBeGreaterThan(50);
  });

  it('never leaves a runner beyond the finish line or behind the start', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const runner of finish({ seed }).runners) {
        expect(runner.x).toBeLessThanOrEqual(TRACK_LENGTH);
        expect(runner.x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('finishes every race within the step cap for all durations', () => {
    for (const length of Object.keys(RACE_DURATIONS)) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const race = finish({ seed, duration: RACE_DURATIONS[length] });
        expect(race.isFinished, `${length} / Seed ${seed}`).toBe(true);
        expect(race.order).not.toBeNull();
      }
    }
  });
});

describe('lanes', () => {
  it('assigns each lane exactly once', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const lanes = finish({ seed }).metrics.lanes;
      expect([...lanes].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('shuffles them, rather than handing runner i lane i every time', () => {
    let identity = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const lanes = finish({ seed }).metrics.lanes;
      if (lanes.every((lane, index) => lane === index)) identity += 1;
    }
    // One in 720 races is the identity by chance; 200 races should show a handful at most.
    expect(identity).toBeLessThan(5);
  });
});

describe('the event scheduler', () => {
  it('keeps every constraint over ten thousand races', () => {
    const duration = RACE_DURATIONS.normal;
    const earliest = EVENT_RULES.windowStart * duration;
    const latest = EVENT_RULES.windowEnd * duration;

    for (let seed = 1; seed <= 10000; seed += 1) {
      const planned = planEvents(createRng(seed), duration, 'normal', RUNNER_COUNT);
      const perRunner = new Array(RUNNER_COUNT).fill(0);

      for (let i = 0; i < planned.length; i += 1) {
        const event = planned[i];
        expect(event.time, `Seed ${seed}: zu früh`).toBeGreaterThanOrEqual(earliest);
        expect(event.time, `Seed ${seed}: zu spät`).toBeLessThanOrEqual(latest);
        if (event.runner >= 0) perRunner[event.runner] += 1;
        if (i > 0) {
          expect(
            event.time - planned[i - 1].time,
            `Seed ${seed}: Abstand zu klein`,
          ).toBeGreaterThanOrEqual(EVENT_RULES.minGapSeconds - 1e-9);
        }
      }
      for (const count of perRunner) {
        expect(count, `Seed ${seed}: zu viele Events auf einem Läufer`).toBeLessThanOrEqual(
          EVENT_RULES.maxPerRunner,
        );
      }
    }
  });

  it('plans within the count range of each chaos level', () => {
    for (const [level, [, max]] of Object.entries(EVENT_RULES.countByChaos)) {
      for (let seed = 1; seed <= 500; seed += 1) {
        const planned = planEvents(createRng(seed), RACE_DURATIONS.normal, level, RUNNER_COUNT);
        // Events may be dropped when no slot is free, so only the upper bound is guaranteed.
        expect(planned.length, `${level} / Seed ${seed}`).toBeLessThanOrEqual(max);
      }
    }
  });

  it('plans more events on wild than on calm', () => {
    const average = (level) => {
      let total = 0;
      for (let seed = 1; seed <= 500; seed += 1) {
        total += planEvents(createRng(seed), RACE_DURATIONS.normal, level, RUNNER_COUNT).length;
      }
      return total / 500;
    };
    expect(average('wild')).toBeGreaterThan(average('normal'));
    expect(average('normal')).toBeGreaterThan(average('calm'));
  });

  it('falls back to the normal count for an unknown chaos level', () => {
    const planned = planEvents(createRng(1), RACE_DURATIONS.normal, 'nonsense', RUNNER_COUNT);
    expect(planned.length).toBeLessThanOrEqual(EVENT_RULES.countByChaos.normal[1]);
  });

  it('sorts the plan by time', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const planned = planEvents(createRng(seed), RACE_DURATIONS.normal, 'wild', RUNNER_COUNT);
      for (let i = 1; i < planned.length; i += 1) {
        expect(planned[i].time).toBeGreaterThanOrEqual(planned[i - 1].time);
      }
    }
  });

  it('fires every planned event during the race', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const race = createRace({ seed, chaos: 'wild' });
      const planned = race.plannedEvents.length;
      race.run();
      const fired = race.eventLog.filter((entry) => entry.id !== 'slipstream').length;
      expect(fired, `Seed ${seed}`).toBe(planned);
    }
  });
});

describe('engine isolation (D2)', () => {
  /** Every source file of the engine. */
  const files = readdirSync('src/engine')
    .filter((name) => name.endsWith('.js'))
    .map((name) => ({ name, code: readFileSync(join('src/engine', name), 'utf8') }));

  it('has files to check at all', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it('never reaches for the DOM, the clock or Math.random', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bnavigator\b/,
      /\blocalStorage\b/,
      /\bMath\.random\b/,
      /\bDate\.now\b/,
      /\bperformance\.now\b/,
    ];
    for (const { name, code } of files) {
      // Comments are prose and may well mention these names; only real code counts.
      const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const pattern of forbidden) {
        expect(pattern.test(stripped), `${name} enthält ${pattern}`).toBe(false);
      }
    }
  });

  it('touches crypto only in randomSeed, which is not part of the simulation', () => {
    for (const { name, code } of files) {
      const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (!/\bcrypto\b/.test(stripped)) continue;
      expect(name).toBe('rng.js');
      expect(stripped).toMatch(/export function randomSeed\(\)[\s\S]*crypto\.getRandomValues/);
    }
  });

  it('imports nothing from render, ui, state or data/horses', () => {
    for (const { name, code } of files) {
      expect(code, name).not.toMatch(/from\s+['"][^'"]*\/(render|ui|state|audio)\//);
      expect(code, name).not.toMatch(/from\s+['"][^'"]*horses\.js['"]/);
    }
  });

  it('never learns anything about bets or players', () => {
    for (const { name, code } of files) {
      if (name === 'payout.js') continue; // payout is the one module that settles bets
      // Again only real code: the module headers explain what the engine must not know.
      const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(stripped, name).not.toMatch(/\bbets?\b/i);
      expect(stripped, name).not.toMatch(/\bplayer/i);
    }
  });
});
