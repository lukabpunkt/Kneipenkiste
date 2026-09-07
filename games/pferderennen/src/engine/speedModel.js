/**
 * Speed model of a single runner.
 *
 *   v_i(t) = v0 * clamp(1 + P_i(x) + N_i(t) + S_i(t) + F_i(x) + E_i(t), clampMin, clampMax)
 *
 * P  phase profile     slow waves of form along the track (Catmull-Rom over K nodes)
 * N  noise             Ornstein-Uhlenbeck, the flicker that creates micro lead changes
 * S  sprints           one to three visible "here we go" bursts
 * F  finishing kick    an individual bonus from 75 % of the track, keeps the finish open
 * E  event effects     summed by engine/effects.js
 *
 * FAIRNESS: every runner is parameterised identically and draws from its own forked stream, so
 * no runner can be favoured by the order of the draws (docs/03_RACE_ENGINE.md §2 and §5).
 * The model never reads a runner's rank or position relative to the others — there is no
 * rubber-banding here, and the audit greps for exactly that.
 *
 * FINAL PARAMETERS (M2 tuning loop, validated over 1,800,000 races):
 *
 *   phase   16 nodes, sigma 0.002 -> 0.22 along the track, ramp exponent 2.5
 *   noise   theta 1.8, sigma 0.05
 *   sprint  1-3 per runner, strength 0.06-0.15, only from 35 % of the race onwards
 *   finish  sigma 0.02 over the last quarter
 *   clamp   -0.6 .. 2.2
 *
 * The variance ramp on the phase profile is the one that matters. With a constant spread the
 * leader at half distance wins about half of all races and a runner from the back essentially
 * never does — no matter how everything else is turned, because a lead is banked distance that
 * later variance cannot undo. Letting the differences open up along the track fixes that, and
 * it is also what real racing looks like: the field runs together early and separates late.
 *
 * Measured: leader at 50 % wins 31.1 %, leader at 80 % wins 49.0 %, a runner from places 4-6 at
 * half distance wins 27.2 %, 11.9 lead changes per race, 39.7 % photo finishes. The full log is
 * in PROGRESS.md, the reasoning in docs/03_RACE_ENGINE.md §7.1.
 */

import { SPEED_MODEL, TIMESTEP } from '../config.js';

// The audit runs this model a billion times, so every constant is read once at import rather
// than looked up through two object hops on each of those calls.
const PHASE_NODES = SPEED_MODEL.phase.nodes;

/**
 * Spread of each control point. The same for every runner, so the model stays symmetric, but
 * growing along the track so the field separates late rather than early.
 */
const PHASE_SIGMA = new Float64Array(PHASE_NODES);
for (let i = 0; i < PHASE_NODES; i += 1) {
  const position = PHASE_NODES > 1 ? i / (PHASE_NODES - 1) : 1;
  PHASE_SIGMA[i] =
    SPEED_MODEL.phase.sigmaStart +
    (SPEED_MODEL.phase.sigmaEnd - SPEED_MODEL.phase.sigmaStart) *
      Math.pow(position, SPEED_MODEL.phase.ramp);
}
const SPRINT_FADE = SPEED_MODEL.sprint.fade;
const FINISH_FROM = SPEED_MODEL.finish.from;
const FINISH_TO = SPEED_MODEL.finish.to;
const FINISH_SPAN = FINISH_TO - FINISH_FROM;
const CLAMP_MIN = SPEED_MODEL.clampMin;
const CLAMP_MAX = SPEED_MODEL.clampMax;
const PHASE_LAST = PHASE_NODES - 1;
const PHASE_SEGMENTS = PHASE_NODES - 1;

/**
 * The noise is advanced every Nth simulation step rather than every step.
 *
 * With theta = 1.8 the process has a correlation time of about 0.55 s, so resolving it at 20 Hz
 * loses nothing visible — and the update below is the *exact* solution of the OU process over
 * that interval, not an Euler approximation, so the stationary distribution is unchanged. It
 * simply costs a third of the gaussian draws (see the decision log in PROGRESS.md).
 */
export const NOISE_INTERVAL = 3;
const NOISE_DT = TIMESTEP * NOISE_INTERVAL;

// Exact discretisation: N' = N * decay + diffusion * Z, with the same stationary variance
// sigma^2 / (2 * theta) that the continuous process has.
const NOISE_DECAY = Math.exp(-SPEED_MODEL.noise.theta * NOISE_DT);
const NOISE_DIFFUSION =
  SPEED_MODEL.noise.sigma *
  Math.sqrt((1 - NOISE_DECAY * NOISE_DECAY) / (2 * SPEED_MODEL.noise.theta));

/**
 * @typedef {object} RunnerProfile
 * @property {Float64Array} nodes         phase profile control points
 * @property {Float64Array} phase         cubic coefficients per segment, four per segment
 * @property {Float64Array} sprintStart   start time of each sprint, in seconds
 * @property {Float64Array} sprintPower   strength of each sprint
 * @property {Float64Array} sprintLength  duration of each sprint, in seconds
 * @property {number} sprintCount         how many of the sprint slots are in use
 * @property {number} finishKick          individual finishing bonus, positive or negative
 * @property {number} noise               current value of the OU process, mutated each step
 */

/**
 * Draws the profile of one runner.
 *
 * Every runner calls this with its own forked generator and the identical config, which is the
 * whole fairness argument: identical distribution, independent draws.
 *
 * @param {import('./rng.js').Rng} rng the runner's own sub-stream
 * @param {number} duration target race duration in seconds
 * @returns {RunnerProfile}
 */
export function createProfile(rng, duration) {
  const { sprint, finish } = SPEED_MODEL;

  const nodes = new Float64Array(PHASE_NODES);
  for (let i = 0; i < PHASE_NODES; i += 1) {
    nodes[i] = rng.gaussian(0, PHASE_SIGMA[i]);
  }

  const sprintCount = rng.int(sprint.countMin, sprint.countMax);
  const sprintStart = new Float64Array(sprint.countMax);
  const sprintPower = new Float64Array(sprint.countMax);
  const sprintLength = new Float64Array(sprint.countMax);
  for (let i = 0; i < sprintCount; i += 1) {
    sprintStart[i] = rng.float(sprint.windowStart * duration, sprint.windowEnd * duration);
    sprintPower[i] = rng.float(sprint.strengthMin, sprint.strengthMax);
    sprintLength[i] = rng.float(sprint.durationMin, sprint.durationMax);
  }

  return {
    nodes,
    phase: phaseCoefficients(nodes),
    sprintStart,
    sprintPower,
    sprintLength,
    sprintCount,
    finishKick: rng.gaussian(0, finish.sigma),
    noise: 0,
  };
}

/**
 * Turns the control points into the cubic coefficients of each Catmull-Rom segment.
 *
 * Done once per race instead of on every one of the billion evaluations: reading the profile
 * then costs three multiply-adds rather than rebuilding the polynomial each time.
 *
 * @param {Float64Array} nodes
 * @returns {Float64Array} four coefficients (a, b, c, d) per segment
 */
export function phaseCoefficients(nodes) {
  const last = nodes.length - 1;
  const coefficients = new Float64Array(PHASE_SEGMENTS * 4);

  for (let i = 0; i < PHASE_SEGMENTS; i += 1) {
    const p0 = nodes[i > 0 ? i - 1 : 0];
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p3 = nodes[i + 2 <= last ? i + 2 : last];
    const offset = i * 4;
    coefficients[offset] = p1;
    coefficients[offset + 1] = 0.5 * (-p0 + p2);
    coefficients[offset + 2] = 0.5 * (2 * p0 - 5 * p1 + 4 * p2 - p3);
    coefficients[offset + 3] = 0.5 * (-p0 + 3 * p1 - 3 * p2 + p3);
  }
  return coefficients;
}

/**
 * Reads the phase profile at a point on the track.
 *
 * The control points sit at x = 0, 1/(K-1), … 1. Because they are drawn independently, the start
 * and the end of a race do not correlate — which is what makes a real comeback possible.
 *
 * @param {Float64Array} coefficients from phaseCoefficients()
 * @param {number} x progress along the track, 0 to 1
 * @returns {number}
 */
export function phaseValue(coefficients, x) {
  const scaled = (x < 0 ? 0 : x > 1 ? 1 : x) * PHASE_LAST;
  let i = scaled | 0;
  if (i > PHASE_SEGMENTS - 1) i = PHASE_SEGMENTS - 1;
  const t = scaled - i;
  const o = i * 4;
  return (
    coefficients[o] +
    t * (coefficients[o + 1] + t * (coefficients[o + 2] + t * coefficients[o + 3]))
  );
}

/**
 * Sum of the runner's sprints at a moment in time.
 * @param {RunnerProfile} profile
 * @param {number} t seconds since the start
 * @returns {number}
 */
export function sprintValue(profile, t) {
  const starts = profile.sprintStart;
  const lengths = profile.sprintLength;
  const powers = profile.sprintPower;
  let total = 0;

  for (let i = 0; i < profile.sprintCount; i += 1) {
    const local = t - starts[i];
    if (local < 0) continue;
    const length = lengths[i];
    if (local >= length + SPRINT_FADE) continue;

    // The envelope is inlined here rather than calling effects.js: this is the hot path, and a
    // sprint only ever needs the symmetric fade-in/fade-out case.
    let shape;
    if (local < SPRINT_FADE) {
      const r = local / SPRINT_FADE;
      shape = r * r * (3 - 2 * r);
    } else if (local <= length) {
      shape = 1;
    } else {
      const r = (local - length) / SPRINT_FADE;
      shape = 1 - r * r * (3 - 2 * r);
    }
    total += powers[i] * shape;
  }
  return total;
}

/**
 * The finishing kick, faded in over the last quarter of the track.
 * @param {number} kick
 * @param {number} x progress along the track, 0 to 1
 * @returns {number}
 */
export function finishValue(kick, x) {
  if (x <= FINISH_FROM) return 0;
  if (x >= FINISH_TO) return kick;
  const t = (x - FINISH_FROM) / FINISH_SPAN;
  return kick * t * t * (3 - 2 * t);
}

/**
 * Advances the Ornstein-Uhlenbeck noise by one noise interval and returns the new value.
 * @param {RunnerProfile} profile mutated in place — no allocation in the hot path
 * @param {import('./rng.js').Rng} rng
 * @returns {number}
 */
export function stepNoise(profile, rng) {
  profile.noise = profile.noise * NOISE_DECAY + NOISE_DIFFUSION * rng.gaussian();
  return profile.noise;
}

/**
 * The complete relative speed modifier of one runner, without the event effects.
 * @param {RunnerProfile} profile
 * @param {number} t seconds since the start
 * @param {number} x progress along the track, 0 to 1
 * @returns {number}
 */
export function baseModifier(profile, t, x) {
  return (
    phaseValue(profile.phase, x) +
    profile.noise +
    sprintValue(profile, t) +
    finishValue(profile.finishKick, x)
  );
}

/**
 * Clamps the total multiplier. The lower bound is below zero on purpose: the "orientierungslos"
 * event is supposed to send a horse backwards (see the decision log in PROGRESS.md).
 * @param {number} value
 * @returns {number}
 */
export function clampSpeed(value) {
  if (value < CLAMP_MIN) return CLAMP_MIN;
  if (value > CLAMP_MAX) return CLAMP_MAX;
  return value;
}
