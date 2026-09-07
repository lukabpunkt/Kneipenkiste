/**
 * The active effects of every runner, held in preallocated slots.
 *
 * An event hangs an effect on a runner, and that effect has to be summed on every one of the
 * roughly two thousand steps of a race. The fairness audit runs a million races, so this must
 * not allocate: the slots are created once and then only written to and reused.
 */

import { effectDuration } from './effects.js';

/** Slots per runner: at most two planned events plus room for a couple of slipstreams. */
const SLOTS_PER_RUNNER = 6;

/**
 * Creates the effect storage for one race.
 * @param {number} runnerCount
 * @returns {{slots: object[][], counts: Int32Array, attach: (runner: number, definition: object, now: number) => void}}
 */
export function createEffectSlots(runnerCount) {
  const slots = new Array(runnerCount);
  for (let i = 0; i < runnerCount; i += 1) {
    slots[i] = Array.from({ length: SLOTS_PER_RUNNER }, () => ({
      definition: null,
      startedAt: 0,
      endsAt: 0,
      done: true,
    }));
  }

  /** How many slots of each runner have ever been used. */
  const counts = new Int32Array(runnerCount);

  return {
    slots,
    counts,

    /**
     * Hangs an effect on a runner, reusing a finished slot when there is one.
     * @param {number} runner
     * @param {object} definition event definition from data/events.js
     * @param {number} now seconds since the start of the race
     */
    attach(runner, definition, now) {
      if (!definition.effect) return;
      const own = slots[runner];
      const endsAt = now + effectDuration(definition.effect);

      for (let i = 0; i < counts[runner]; i += 1) {
        if (own[i].done) {
          own[i].definition = definition;
          own[i].startedAt = now;
          own[i].endsAt = endsAt;
          own[i].done = false;
          return;
        }
      }

      if (counts[runner] < SLOTS_PER_RUNNER) {
        const slot = own[counts[runner]];
        slot.definition = definition;
        slot.startedAt = now;
        slot.endsAt = endsAt;
        slot.done = false;
        counts[runner] += 1;
      }
    },
  };
}
