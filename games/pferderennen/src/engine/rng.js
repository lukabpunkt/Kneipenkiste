/**
 * Seedable pseudo random number generator (sfc32) — the only source of randomness in the game.
 *
 * Provides independent sub-streams via fork() so lane shuffling, the speed model and event
 * scheduling cannot influence each other. Fully deterministic for a given seed: the same seed
 * always replays exactly the same race (docs/03_RACE_ENGINE.md §3, requirement D1).
 *
 * sfc32 was picked over mulberry32 for its 128 bit state and better statistical quality, and
 * because it is a handful of integer operations — the fairness audit runs it a billion times.
 */

/** Steps discarded after seeding so the first values are not correlated with the seed. */
const WARMUP_ROUNDS = 12;

/** 2^32, used to map a uint32 into [0, 1). */
const UINT32_RANGE = 4294967296;

/**
 * splitmix32 — expands a single uint32 seed into the four words sfc32 needs.
 * @param {number} seed
 * @returns {() => number} generator of uint32 values
 */
function splitmix32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let z = state ^ (state >>> 16);
    z = Math.imul(z, 0x21f0aaad);
    z = z ^ (z >>> 15);
    z = Math.imul(z, 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  };
}

/**
 * Builds a generator from four state words.
 * @param {number} w0
 * @param {number} w1
 * @param {number} w2
 * @param {number} w3
 * @returns {Rng}
 */
function fromWords(w0, w1, w2, w3) {
  let a = w0 >>> 0;
  let b = w1 >>> 0;
  let c = w2 >>> 0;
  let d = w3 >>> 0;

  /** One sfc32 round. Returns a uint32. */
  function nextUint32() {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  }

  for (let i = 0; i < WARMUP_ROUNDS; i += 1) nextUint32();

  /** Cached second value of the Box-Muller pair; NaN means "nothing cached". */
  let spare = Number.NaN;

  /** @type {Rng} */
  const rng = {
    next() {
      return nextUint32() / UINT32_RANGE;
    },

    uint32: nextUint32,

    int(minIncl, maxIncl) {
      const span = maxIncl - minIncl + 1;
      // Rejection sampling: plain modulo would quietly favour the lower values.
      const limit = UINT32_RANGE - (UINT32_RANGE % span);
      let value = nextUint32();
      while (value >= limit) value = nextUint32();
      return minIncl + (value % span);
    },

    float(min, max) {
      return min + (nextUint32() / UINT32_RANGE) * (max - min);
    },

    pick(array) {
      return array[rng.int(0, array.length - 1)];
    },

    weighted(items) {
      let total = 0;
      for (let i = 0; i < items.length; i += 1) total += items[i].weight;
      let threshold = (nextUint32() / UINT32_RANGE) * total;
      for (let i = 0; i < items.length; i += 1) {
        threshold -= items[i].weight;
        if (threshold < 0) return items[i].value;
      }
      return items[items.length - 1].value;
    },

    gaussian(mean = 0, sd = 1) {
      if (!Number.isNaN(spare)) {
        const value = spare;
        spare = Number.NaN;
        return mean + sd * value;
      }
      // Marsaglia polar method: no sin/cos, and it produces two values per pass.
      let u;
      let v;
      let s;
      do {
        u = (nextUint32() / UINT32_RANGE) * 2 - 1;
        v = (nextUint32() / UINT32_RANGE) * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const factor = Math.sqrt((-2 * Math.log(s)) / s);
      spare = v * factor;
      return mean + sd * u * factor;
    },

    fork() {
      return fromWords(nextUint32(), nextUint32(), nextUint32(), nextUint32());
    },

    state() {
      return [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    },
  };

  return rng;
}

/**
 * @typedef {object} Rng
 * @property {() => number} next        a float in [0, 1)
 * @property {() => number} uint32      a raw uint32
 * @property {(min: number, max: number) => number} int   an integer, both bounds inclusive
 * @property {(min: number, max: number) => number} float a float in [min, max)
 * @property {(array: any[]) => any} pick                 a uniformly chosen element
 * @property {(items: {value: any, weight: number}[]) => any} weighted
 * @property {(mean?: number, sd?: number) => number} gaussian
 * @property {() => Rng} fork           an independent sub-stream
 * @property {() => number[]} state     the four state words, for debugging and replays
 */

/**
 * Creates a generator from a seed.
 * @param {number} seed any uint32
 * @returns {Rng}
 */
export function createRng(seed) {
  const mix = splitmix32(seed >>> 0);
  return fromWords(mix(), mix(), mix(), mix());
}

/**
 * A cryptographically strong uint32, used to pick the seed of a new race.
 *
 * This is the one place in the engine that may touch a browser global. Picking a seed is not
 * part of the simulation — once the seed exists the race is fully deterministic — and
 * docs/03_RACE_ENGINE.md §5.1 puts randomSeed() in exactly this module.
 * @returns {number}
 */
export function randomSeed() {
  const buffer = new Uint32Array(1);
  // eslint-disable-next-line no-restricted-globals -- see the note above; seeds are not simulation
  crypto.getRandomValues(buffer);
  return buffer[0];
}
