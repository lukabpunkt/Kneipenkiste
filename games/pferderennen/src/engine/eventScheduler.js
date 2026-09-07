/**
 * Plans before the race which event hits which runner when, and fires it at runtime.
 *
 * Enforces the fairness rules from docs/03_RACE_ENGINE.md §6:
 *   - the affected runner is drawn uniformly, never by rank or position
 *   - nothing happens before 8 % or after 95 % of the race
 *   - at most two events per runner, so no horse looks bullied
 *   - at least two seconds between events, so the audience sees each one
 *
 * Slipstream is the one exception: it is not planned ahead but rolled at runtime when a runner
 * happens to sit right behind another. That condition is positional but symmetric — anyone can
 * end up in anyone's slipstream.
 */

import { EVENT_RULES } from '../config.js';
import { EVENTS_BY_ID, SCHEDULABLE, SLIPSTREAM } from '../data/events.js';

/** Seconds a runner cannot catch another slipstream, so it does not fire every step. */
const SLIPSTREAM_COOLDOWN = 4;

/**
 * @typedef {object} PlannedEvent
 * @property {string} id
 * @property {number} runner index 0..5, or -1 for a show event that belongs to nobody
 * @property {number} time  seconds since the start
 * @property {number} lead  seconds the prop needs before `time`
 * @property {boolean} fired
 */

/**
 * Plans every event of one race.
 * @param {import('./rng.js').Rng} rng the event sub-stream
 * @param {number} duration target race duration in seconds
 * @param {string} chaos 'calm' | 'normal' | 'wild'
 * @param {number} runnerCount
 * @returns {PlannedEvent[]} sorted by time
 */
export function planEvents(rng, duration, chaos, runnerCount) {
  const bounds = EVENT_RULES.countByChaos[chaos] ?? EVENT_RULES.countByChaos.normal;
  const wanted = rng.int(bounds[0], bounds[1]);

  const earliest = EVENT_RULES.windowStart * duration;
  const latest = EVENT_RULES.windowEnd * duration;
  const perRunner = new Int32Array(runnerCount);
  const times = [];
  const planned = [];

  for (let e = 0; e < wanted; e += 1) {
    // 1. A moment that keeps its distance from the events already placed.
    let time = -1;
    for (let attempt = 0; attempt < EVENT_RULES.maxPlacementTries; attempt += 1) {
      const candidate = rng.float(earliest, latest);
      let clear = true;
      for (let i = 0; i < times.length; i += 1) {
        if (Math.abs(times[i] - candidate) < EVENT_RULES.minGapSeconds) {
          clear = false;
          break;
        }
      }
      if (clear) {
        time = candidate;
        break;
      }
    }
    if (time < 0) continue;

    // 2. Which event, weighted by how often it should show up.
    const id = rng.weighted(SCHEDULABLE);
    const definition = EVENTS_BY_ID[id];

    // 3. Who it hits — uniformly, redrawing past anyone who already had two.
    let runner = -1;
    if (definition.kind !== 'show') {
      for (let attempt = 0; attempt < EVENT_RULES.maxRunnerTries; attempt += 1) {
        const candidate = rng.int(0, runnerCount - 1);
        if (perRunner[candidate] < EVENT_RULES.maxPerRunner) {
          runner = candidate;
          break;
        }
      }
      if (runner < 0) continue;
      perRunner[runner] += 1;
    }

    times.push(time);
    planned.push({ id, runner, time, lead: definition.lead, fired: false });
  }

  planned.sort((a, b) => a.time - b.time);
  return planned;
}

/**
 * Creates the scheduler for one race.
 * @param {object} options
 * @param {import('./rng.js').Rng} options.rng
 * @param {number} options.duration
 * @param {string} options.chaos
 * @param {number} options.runnerCount
 * @returns {object}
 */
export function createScheduler({ rng, duration, chaos, runnerCount }) {
  const planned = planEvents(rng, duration, chaos, runnerCount);
  let next = 0;

  /** Seconds until each runner may catch a slipstream again. */
  const slipCooldown = new Float64Array(runnerCount);

  return {
    planned,

    /**
     * Fires every event whose moment has come.
     * @param {number} now
     * @param {(id: string, runner: number, time: number) => void} onFire
     */
    update(now, onFire) {
      while (next < planned.length && planned[next].time <= now) {
        const event = planned[next];
        event.fired = true;
        onFire(event.id, event.runner, event.time);
        next += 1;
      }
    },

    /**
     * Events whose prop should already be on its way, so rendering can start it early.
     * @param {number} now
     * @returns {PlannedEvent[]}
     */
    upcoming(now) {
      const result = [];
      for (let i = next; i < planned.length; i += 1) {
        if (planned[i].time - planned[i].lead <= now) result.push(planned[i]);
        else break;
      }
      return result;
    },

    /**
     * Rolls for a slipstream. A runner qualifies while it sits just behind another one; the
     * condition is positional but perfectly symmetric between all runners.
     *
     * @param {Float64Array} positions
     * @param {Uint8Array} finished 1 for runners already over the line
     * @param {number} dt
     * @param {(runner: number) => void} onTrigger
     */
    rollSlipstream(positions, finished, dt, onTrigger) {
      const { minDistance, maxDistance, chancePerSecond } = EVENT_RULES.slipstream;
      const chance = chancePerSecond * dt;

      for (let i = 0; i < runnerCount; i += 1) {
        if (slipCooldown[i] > 0) {
          slipCooldown[i] -= dt;
          continue;
        }
        if (finished[i]) continue;

        let drafting = false;
        for (let j = 0; j < runnerCount; j += 1) {
          if (i === j) continue;
          const gap = positions[j] - positions[i];
          if (gap >= minDistance && gap <= maxDistance) {
            drafting = true;
            break;
          }
        }
        if (!drafting) continue;

        if (rng.next() < chance) {
          slipCooldown[i] = SLIPSTREAM_COOLDOWN;
          onTrigger(i);
        }
      }
    },

    /** The slipstream definition, so race.js does not need to import the data table. */
    slipstreamDefinition: SLIPSTREAM,
  };
}
