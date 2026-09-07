/**
 * Pure functions translating event definitions into speed modifiers.
 *
 * Handles attack/release fades, sequences (such as the nap: fall asleep, then bolt awake) and
 * sticky effects that last to the finish line. Every function here is the same for every runner
 * — that symmetry is what keeps the events fair (docs/03_RACE_ENGINE.md §6.2).
 *
 * An active effect is a plain object so the hot path can reuse it without allocating:
 *   {definition, startedAt, done}
 */

/**
 * Smoothstep between 0 and 1. Used for the fades, so no effect snaps the speed.
 * @param {number} t
 * @returns {number}
 */
function smoothstep(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/**
 * Envelope of one effect step: fades in over `attack`, holds, fades out over `release`.
 * @param {number} tLocal seconds since the step started
 * @param {number} duration
 * @param {number} attack
 * @param {number} release
 * @returns {number} a factor between 0 and 1
 */
export function envelope(tLocal, duration, attack, release) {
  if (tLocal < 0) return 0;
  if (!Number.isFinite(duration)) {
    // A sticky effect fades in and then simply stays.
    return attack > 0 ? smoothstep(tLocal / attack) : 1;
  }
  if (tLocal >= duration + release) return 0;

  const rise = attack > 0 ? smoothstep(tLocal / attack) : 1;
  if (tLocal <= duration) return rise;
  return release > 0 ? rise * (1 - smoothstep((tLocal - duration) / release)) : 0;
}

/**
 * Total lifetime of an effect, fades included.
 * @param {object} effect
 * @returns {number} seconds, Infinity for a sticky effect
 */
export function effectDuration(effect) {
  if (!effect) return 0;
  if (effect.kind === 'sequence') {
    let total = 0;
    for (const step of effect.steps) total += step.duration + step.release;
    return total;
  }
  if (!Number.isFinite(effect.duration)) return Number.POSITIVE_INFINITY;
  return effect.duration + effect.release;
}

/**
 * The speed modifier of a single effect at a given moment.
 * @param {object} effect definition from data/events.js
 * @param {number} tLocal seconds since the effect started
 * @returns {number} relative modifier, 0 when the effect is over
 */
export function effectModifier(effect, tLocal) {
  if (!effect || tLocal < 0) return 0;

  switch (effect.kind) {
    case 'constant':
      return effect.mod * envelope(tLocal, effect.duration, effect.attack, effect.release);

    case 'wave': {
      // Pulsing speed — the hiccup. The envelope keeps the start and end smooth.
      const shape = Math.sin(tLocal * effect.frequency);
      return (
        effect.amplitude * shape * envelope(tLocal, effect.duration, effect.attack, effect.release)
      );
    }

    case 'sequence': {
      let offset = 0;
      for (const step of effect.steps) {
        const span = step.duration + step.release;
        if (tLocal < offset + span) {
          return step.mod * envelope(tLocal - offset, step.duration, step.attack, step.release);
        }
        offset += span;
      }
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * The animation state an effect asks for at a given moment, or null.
 * @param {object} effect
 * @param {number} tLocal
 * @returns {string|null}
 */
export function effectAnimation(effect, tLocal) {
  if (!effect || tLocal < 0) return null;

  if (effect.kind === 'sequence') {
    let offset = 0;
    for (const step of effect.steps) {
      const span = step.duration + step.release;
      if (tLocal < offset + span) return step.anim ?? null;
      offset += span;
    }
    return null;
  }

  const total = effectDuration(effect);
  return tLocal < total ? (effect.anim ?? null) : null;
}

/**
 * Sums every active effect of one runner and marks the finished ones as done.
 *
 * Written as an in-place loop over a preallocated array: the fairness audit calls this a
 * billion times, so it must not allocate (docs/03_RACE_ENGINE.md §7). The moment an effect ends
 * is stored on the slot when it is attached, so this never has to walk a sequence to find out.
 *
 * @param {{definition: object, startedAt: number, endsAt: number, done: boolean}[]} active
 * @param {number} count how many entries of `active` are in use
 * @param {number} now seconds since the start of the race
 * @returns {number} the summed modifier
 */
export function applyEffects(active, count, now) {
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const entry = active[i];
    if (entry.done) continue;

    if (now >= entry.endsAt) {
      entry.done = true;
      continue;
    }
    total += effectModifier(entry.definition.effect, now - entry.startedAt);
  }
  return total;
}
