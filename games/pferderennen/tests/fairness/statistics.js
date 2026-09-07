/**
 * The statistics the fairness audit needs, implemented from scratch.
 *
 * No dependency: the audit is the proof that the game is fair, so it should not rest on a
 * library nobody in this project has read (docs/03_RACE_ENGINE.md §7).
 */

/** Lanczos coefficients for the log-gamma approximation. */
const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/**
 * Natural logarithm of the gamma function (Lanczos approximation).
 * @param {number} x
 * @returns {number}
 */
export function lnGamma(x) {
  if (x < 0.5) {
    // Reflection formula, so the approximation only has to cover x >= 0.5.
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  const z = x - 1;
  let sum = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i += 1) {
    sum += LANCZOS[i] / (z + i + 1);
  }
  const t = z + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

/** Iteration limits for the incomplete gamma routines. */
const MAX_ITERATIONS = 300;
const EPSILON = 1e-14;

/**
 * Regularised lower incomplete gamma P(a, x), via its series expansion.
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
function gammaSeries(a, x) {
  let term = 1 / a;
  let sum = term;
  let n = a;
  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    n += 1;
    term *= x / n;
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPSILON) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/**
 * Regularised upper incomplete gamma Q(a, x), via its continued fraction.
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
function gammaContinuedFraction(a, x) {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= MAX_ITERATIONS; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/**
 * Upper tail of the chi-square distribution — the p-value of a chi-square statistic.
 * @param {number} statistic
 * @param {number} degreesOfFreedom
 * @returns {number} probability of seeing a statistic at least this large by chance alone
 */
export function chiSquareP(statistic, degreesOfFreedom) {
  if (statistic <= 0) return 1;
  const a = degreesOfFreedom / 2;
  const x = statistic / 2;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x);
}

/**
 * Chi-square statistic of observed counts against a uniform expectation.
 * @param {number[]|Int32Array} counts
 * @returns {{statistic: number, degreesOfFreedom: number, p: number}}
 */
export function uniformityTest(counts) {
  let total = 0;
  for (let i = 0; i < counts.length; i += 1) total += counts[i];
  if (total === 0) return { statistic: 0, degreesOfFreedom: counts.length - 1, p: 1 };

  const expected = total / counts.length;
  let statistic = 0;
  for (let i = 0; i < counts.length; i += 1) {
    const diff = counts[i] - expected;
    statistic += (diff * diff) / expected;
  }
  const degreesOfFreedom = counts.length - 1;
  return { statistic, degreesOfFreedom, p: chiSquareP(statistic, degreesOfFreedom) };
}

/**
 * A percentile read out of a histogram.
 * @param {Int32Array|number[]} histogram counts per bin
 * @param {number} binWidth
 * @param {number} percentile between 0 and 1
 * @returns {number} the upper edge of the bin the percentile falls into
 */
export function percentileFromHistogram(histogram, binWidth, percentile) {
  let total = 0;
  for (let i = 0; i < histogram.length; i += 1) total += histogram[i];
  if (total === 0) return Number.NaN;

  const target = total * percentile;
  let seen = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    seen += histogram[i];
    if (seen >= target) return (i + 1) * binWidth;
  }
  return histogram.length * binWidth;
}
