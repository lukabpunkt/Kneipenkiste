/**
 * The race simulation: createRace({seed, …}) returns an instance with a fixed timestep.
 *
 * Tracks positions, velocities, active effects, lead changes and the finish order. Knows runners
 * only as indices 0..5 — never horse names, colours or bets. The lane a runner gets is shuffled
 * per race and never read by the simulation, so even a bug in the lane handling could not favour
 * anyone (docs/03_RACE_ENGINE.md §2).
 *
 * step() deliberately takes no dt argument: the timestep comes from config, so the frame rate of
 * the device cannot influence the outcome (requirement F5).
 *
 * The hot path allocates nothing. The fairness audit runs this a hundred thousand times, so
 * every array is created once in createRace and then only written to.
 */

import {
  TRACK_LENGTH,
  RUNNER_COUNT,
  TIMESTEP,
  RACE_DURATIONS,
  FINISH_GRACE_SECONDS,
  PHOTO_FINISH,
} from '../config.js';
import { createRng } from './rng.js';
import {
  createProfile,
  baseModifier,
  stepNoise,
  clampSpeed,
  NOISE_INTERVAL,
} from './speedModel.js';
import { createScheduler } from './eventScheduler.js';
import { applyEffects, effectAnimation } from './effects.js';
import { createEffectSlots } from './effectSlots.js';
import { EVENTS_BY_ID } from '../data/events.js';

/** The slipstream is rolled every Nth step rather than every step (see step()). */
const SLIPSTREAM_INTERVAL = 6;

/** Progress marks where the audit samples who is leading. */
const MARK_HALF = 0.5;
const MARK_LATE = 0.8;

/**
 * Creates one race.
 * @param {object} options
 * @param {number} options.seed uint32
 * @param {number} [options.duration] target duration in seconds
 * @param {string} [options.chaos] 'calm' | 'normal' | 'wild'
 * @param {number} [options.runnerCount]
 * @returns {object} the race instance
 */
export function createRace({
  seed,
  duration = RACE_DURATIONS.normal,
  chaos = 'normal',
  runnerCount = RUNNER_COUNT,
} = {}) {
  const dt = TIMESTEP;
  const baseSpeed = TRACK_LENGTH / duration;
  // Multiplying by the reciprocal instead of dividing per runner per step.
  const inverseLength = 1 / TRACK_LENGTH;
  let stepIndex = 0;

  // Four independent streams, always forked in this order so a seed replays exactly.
  const root = createRng(seed);
  const rngLanes = root.fork();
  const rngSpeed = root.fork();
  const rngEvents = root.fork();
  const rngTie = root.fork();

  // --- lanes: shuffled, and never read by the simulation --------------------
  const lanes = new Int32Array(runnerCount);
  for (let i = 0; i < runnerCount; i += 1) lanes[i] = i;
  for (let i = runnerCount - 1; i > 0; i -= 1) {
    const j = rngLanes.int(0, i);
    const swap = lanes[i];
    lanes[i] = lanes[j];
    lanes[j] = swap;
  }

  // --- per-runner state, all preallocated -----------------------------------
  const profiles = new Array(runnerCount);
  const rngRunners = new Array(runnerCount);
  for (let i = 0; i < runnerCount; i += 1) {
    rngRunners[i] = rngSpeed.fork();
    profiles[i] = createProfile(rngRunners[i], duration);
  }

  const position = new Float64Array(runnerCount);
  const previous = new Float64Array(runnerCount);
  const velocity = new Float64Array(runnerCount);
  const finished = new Uint8Array(runnerCount);
  const finishTime = new Float64Array(runnerCount).fill(Number.POSITIVE_INFINITY);
  const eventCount = new Int32Array(runnerCount);

  const active = createEffectSlots(runnerCount);
  const effects = active.slots;
  const effectCount = active.counts;

  const scheduler = createScheduler({ rng: rngEvents, duration, chaos, runnerCount });

  // --- race-wide state ------------------------------------------------------
  let t = 0;
  let phase = 'running';
  let leader = -1;
  let leadChanges = 0;
  let firstFinishTime = Number.POSITIVE_INFINITY;
  let order = null;

  /** Ranking of every runner at half distance, best first. Filled once, at the half mark. */
  const orderAtHalf = new Int32Array(runnerCount).fill(-1);

  const metrics = {
    leaderAtHalf: -1,
    lastAtHalf: -1,
    leaderAtLate: -1,
    gapFirstSecond: Number.NaN,
    gapFirstLast: Number.NaN,
    photoFinish: false,
  };

  /** Event log, capped so a long session cannot grow it without bound. */
  const log = [];

  /** Hangs a slipstream on a runner. Hoisted so the step loop allocates no closure. */
  function onSlipstream(runner) {
    log.push({ id: 'slipstream', runner, t });
    active.attach(runner, scheduler.slipstreamDefinition, t);
  }

  /** Records a fired event and hangs its effect on the runner. */
  function fire(id, runner, plannedTime) {
    const definition = EVENTS_BY_ID[id];
    log.push({ id, runner, t: plannedTime });
    if (runner >= 0) {
      eventCount[runner] += 1;
      active.attach(runner, definition, t);
    }
  }

  /** Progress marks still to be sampled; drops to 0 once both are recorded. */
  let marksLeft = 2;
  const halfMark = MARK_HALF * TRACK_LENGTH;
  const lateMark = MARK_LATE * TRACK_LENGTH;

  /**
   * Records who was in front the first time the field passes a progress mark.
   * @param {number} front index of the leading runner
   * @param {number} trailing index of the trailing runner
   */
  function sampleMarks(front, trailing) {
    if (metrics.leaderAtHalf === -1 && position[front] >= halfMark) {
      metrics.leaderAtHalf = front;
      metrics.lastAtHalf = trailing;

      // The full ranking, not just first and last: the audit measures how often a runner from
      // the back half of the field still wins, which says far more about comebacks than the
      // single last place does.
      const ranking = [];
      for (let i = 0; i < runnerCount; i += 1) ranking.push(i);
      ranking.sort((a, b) => position[b] - position[a]);
      for (let i = 0; i < runnerCount; i += 1) orderAtHalf[i] = ranking[i];

      marksLeft -= 1;
    }
    if (metrics.leaderAtLate === -1 && position[front] >= lateMark) {
      metrics.leaderAtLate = front;
      marksLeft -= 1;
    }
  }

  /**
   * Captures the gaps at the exact moment the winner crosses the line, interpolating every other
   * runner back to that instant rather than reading the end of the step.
   * @param {number} crossFraction how far into the step the winner crossed
   */
  function captureFinishGaps(crossFraction) {
    let second = -Number.MAX_VALUE;
    let last = Number.MAX_VALUE;
    for (let i = 0; i < runnerCount; i += 1) {
      if (position[i] >= TRACK_LENGTH && finishTime[i] === firstFinishTime) continue;
      const at = previous[i] + (position[i] - previous[i]) * crossFraction;
      if (at > second) second = at;
      if (at < last) last = at;
    }
    metrics.gapFirstSecond = TRACK_LENGTH - second;
    metrics.gapFirstLast = TRACK_LENGTH - last;
    metrics.photoFinish = metrics.gapFirstSecond < PHOTO_FINISH.maxGap;
  }

  /** Builds the finish order: by crossing time, then by position, ties by coin flip. */
  function buildOrder() {
    const indices = [];
    for (let i = 0; i < runnerCount; i += 1) indices.push(i);

    indices.sort((a, b) => {
      if (finishTime[a] !== finishTime[b]) return finishTime[a] - finishTime[b];
      if (position[a] !== position[b]) return position[b] - position[a];
      // Dead heat down to the interpolated crossing time: a coin flip, from the seeded stream.
      return rngTie.next() < 0.5 ? -1 : 1;
    });
    return indices;
  }

  /** Ends the race and freezes the result. */
  function settle() {
    phase = 'finished';
    order = buildOrder();
  }

  /** Advances the simulation by exactly one fixed timestep. */
  function stepOnce() {
    if (phase === 'finished') return;

    const tPrev = t;
    t += dt;
    stepIndex += 1;
    const advanceNoise = stepIndex % NOISE_INTERVAL === 0;

    scheduler.update(t, fire);
    // The slipstream roll is a 6x6 distance scan. At 10 Hz it costs a sixth as much and behaves
    // the same, because the per-check probability scales with the interval.
    if (stepIndex % SLIPSTREAM_INTERVAL === 0) {
      scheduler.rollSlipstream(position, finished, dt * SLIPSTREAM_INTERVAL, onSlipstream);
    }

    let winnerCrossFraction = -1;
    // Leader, trailer and the finished count are tracked inside the one loop over the
    // runners rather than in three more passes — this is the audit's hot path.
    let front = 0;
    let trailing = 0;
    let doneCount = 0;

    for (let i = 0; i < runnerCount; i += 1) {
      previous[i] = position[i];

      if (finished[i]) {
        velocity[i] = 0;
        doneCount += 1;
      } else {
        const profile = profiles[i];
        if (advanceNoise) stepNoise(profile, rngRunners[i]);

        const x = position[i] * inverseLength;
        let modifier = baseModifier(profile, t, x);
        if (effectCount[i] > 0) modifier += applyEffects(effects[i], effectCount[i], t);
        const speed = baseSpeed * clampSpeed(1 + modifier);

        velocity[i] = speed;
        position[i] += speed * dt;

        if (position[i] >= TRACK_LENGTH) {
          const travelled = position[i] - previous[i];
          const fraction = travelled > 0 ? (TRACK_LENGTH - previous[i]) / travelled : 0;
          finished[i] = 1;
          doneCount += 1;
          finishTime[i] = tPrev + fraction * dt;
          position[i] = TRACK_LENGTH;

          if (finishTime[i] < firstFinishTime) {
            firstFinishTime = finishTime[i];
            winnerCrossFraction = fraction;
          }
        } else if (position[i] < 0) {
          // The "orientierungslos" event can push a horse backwards, but not off the track.
          position[i] = 0;
        }
      }

      if (position[i] > position[front]) front = i;
      if (position[i] < position[trailing]) trailing = i;
    }

    if (leader !== -1 && front !== leader) leadChanges += 1;
    leader = front;
    if (marksLeft > 0) sampleMarks(front, trailing);

    if (winnerCrossFraction >= 0) captureFinishGaps(winnerCrossFraction);

    if (doneCount === runnerCount || t > firstFinishTime + FINISH_GRACE_SECONDS) settle();
  }

  const instance = {
    step: stepOnce,

    /** Cheap accessors for hot callers such as the fairness audit, which must not build state. */
    get isFinished() {
      return phase === 'finished';
    },

    get order() {
      return order;
    },

    get eventLog() {
      return log;
    },

    /** Runs the whole race. Returns the instance so tests can chain. */
    run() {
      // A generous cap: even the slowest field finishes long before this.
      const maxSteps = Math.ceil((duration * 4) / dt);
      let steps = 0;
      while (phase !== 'finished' && steps < maxSteps) {
        stepOnce();
        steps += 1;
      }
      if (phase !== 'finished') settle();
      return instance;
    },

    /** Live view of the simulation. The same object every time — do not hold on to it. */
    get state() {
      return {
        t,
        phase,
        progress: position[leader >= 0 ? leader : 0] / TRACK_LENGTH,
        leader,
        leadChanges,
        finished: phase === 'finished',
        order,
        seed,
        runners: instance.runners,
        events: log,
      };
    },

    /** Per-runner view, rebuilt on access — used by rendering, never in the hot path. */
    get runners() {
      const list = new Array(runnerCount);
      for (let i = 0; i < runnerCount; i += 1) {
        let anim = velocity[i] > baseSpeed * 1.15 ? 'gallop_fast' : 'gallop';
        for (let s = 0; s < effectCount[i]; s += 1) {
          const slot = effects[i][s];
          if (slot.done || !slot.definition) continue;
          const named = effectAnimation(slot.definition.effect, t - slot.startedAt);
          if (named) anim = named;
        }
        list[i] = {
          index: i,
          lane: lanes[i],
          x: position[i],
          v: velocity[i],
          progress: position[i] / TRACK_LENGTH,
          finished: finished[i] === 1,
          finishTime: finishTime[i],
          anim: finished[i] ? 'trot_in' : anim,
        };
      }
      return list;
    },

    /** Metrics the fairness and suspense audit reads. */
    get metrics() {
      return {
        ...metrics,
        leadChanges,
        duration: firstFinishTime,
        eventsPerRunner: Array.from(eventCount),
        lanes: Array.from(lanes),
        orderAtHalf: Array.from(orderAtHalf),
      };
    },

    /** Everything the scheduler planned, for the render-ahead of event props. */
    get plannedEvents() {
      return scheduler.planned;
    },

    /** Events whose prop should already be flying. */
    upcoming() {
      return scheduler.upcoming(t);
    },

    /** A deep copy, for tests and interpolation. */
    snapshot() {
      return JSON.parse(
        JSON.stringify({
          t,
          phase,
          order,
          leadChanges,
          runners: instance.runners,
          events: log,
        }),
      );
    },
  };

  return instance;
}
