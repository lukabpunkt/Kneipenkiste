/**
 * Worker of the fairness audit: simulates a range of races and reports aggregated counters.
 *
 * Only counters travel back to the main process, never per-race data, so memory stays flat no
 * matter how many races are run. Because every race is seeded from its own index, splitting the
 * work across workers cannot change the result — running with --workers=1 gives byte-identical
 * numbers, and the audit has a check for exactly that.
 */

import { parentPort, workerData } from 'node:worker_threads';
import { createRace } from '../../src/engine/race.js';
import { RUNNER_COUNT, EVENT_RULES } from '../../src/config.js';
import { PHOTO_FINISH } from '../../src/config.js';

/** Bin width of the gap histogram, in track units. */
export const GAP_BIN = 2;
/** Number of bins; anything larger lands in the last one. */
export const GAP_BINS = 256;

/**
 * Runs a contiguous block of races and aggregates everything the audit checks.
 * @param {{from: number, to: number, auditSeed: number, duration: number, chaos: string}} task
 * @returns {object} plain counters, safe to post between threads
 */
export function runBlock({ from, to, auditSeed, duration, chaos }) {
  const winsByRunner = new Int32Array(RUNNER_COUNT);
  const winsByLane = new Int32Array(RUNNER_COUNT);
  const placeCounts = new Int32Array(RUNNER_COUNT * RUNNER_COUNT);
  const eventsByRunner = new Int32Array(RUNNER_COUNT);
  const gapHistogram = new Int32Array(GAP_BINS);
  /** How often the winner was in each position at half distance. */
  const winsByHalfRank = new Int32Array(RUNNER_COUNT);

  let races = 0;
  let leadChangesSum = 0;
  let leaderHalfWins = 0;
  let leaderLateWins = 0;
  let lastHalfWins = 0;
  let photoFinishes = 0;
  let maxEventsOnOneRunner = 0;
  let eventsOutsideWindow = 0;
  let unfinishedRaces = 0;

  const earliest = EVENT_RULES.windowStart * duration;
  const latest = EVENT_RULES.windowEnd * duration;

  for (let i = from; i < to; i += 1) {
    const race = createRace({ seed: (auditSeed + i) >>> 0, duration, chaos }).run();
    const order = race.order;
    if (!order) {
      unfinishedRaces += 1;
      continue;
    }

    races += 1;
    const winner = order[0];
    const metrics = race.metrics;

    winsByRunner[winner] += 1;
    winsByLane[metrics.lanes[winner]] += 1;
    for (let place = 0; place < order.length; place += 1) {
      placeCounts[place * RUNNER_COUNT + order[place]] += 1;
    }

    leadChangesSum += metrics.leadChanges;
    if (metrics.leaderAtHalf === winner) leaderHalfWins += 1;
    if (metrics.leaderAtLate === winner) leaderLateWins += 1;
    if (metrics.lastAtHalf === winner) lastHalfWins += 1;
    const halfRank = metrics.orderAtHalf.indexOf(winner);
    if (halfRank >= 0) winsByHalfRank[halfRank] += 1;
    if (metrics.gapFirstSecond < PHOTO_FINISH.maxGap) photoFinishes += 1;

    const gap = metrics.gapFirstLast;
    if (Number.isFinite(gap)) {
      const bin = Math.min(GAP_BINS - 1, Math.max(0, Math.floor(gap / GAP_BIN)));
      gapHistogram[bin] += 1;
    }

    for (let r = 0; r < RUNNER_COUNT; r += 1) {
      const count = metrics.eventsPerRunner[r];
      eventsByRunner[r] += count;
      if (count > maxEventsOnOneRunner) maxEventsOnOneRunner = count;
    }

    // The scheduler promises the 8-95 % window; this verifies it rather than trusting it.
    for (const event of race.eventLog) {
      if (event.id === 'slipstream') continue;
      if (event.t < earliest || event.t > latest) eventsOutsideWindow += 1;
    }
  }

  return {
    races,
    winsByRunner: Array.from(winsByRunner),
    winsByLane: Array.from(winsByLane),
    placeCounts: Array.from(placeCounts),
    eventsByRunner: Array.from(eventsByRunner),
    gapHistogram: Array.from(gapHistogram),
    winsByHalfRank: Array.from(winsByHalfRank),
    leadChangesSum,
    leaderHalfWins,
    leaderLateWins,
    lastHalfWins,
    photoFinishes,
    maxEventsOnOneRunner,
    eventsOutsideWindow,
    unfinishedRaces,
  };
}

if (parentPort) {
  parentPort.postMessage(runBlock(workerData));
}
