/**
 * Translates a finished race into the payload the rest of the game works with.
 *
 * The engine speaks in runner indices; everything from the result screen onwards speaks in horse
 * ids. This is the one place that conversion happens, which is why payout.js can stay free of
 * any knowledge about horses at all.
 */

import { horseByIndex } from '../data/horses.js';
import { EVENTS_BY_ID } from '../data/events.js';

/**
 * @param {object} race a finished race instance
 * @param {number} seed
 * @returns {{seed: number, order: string[], events: object[]}}
 */
export function toResultPayload(race, seed) {
  return {
    seed,
    order: race.order.map((index) => horseByIndex(index).id),
    events: race.eventLog.map((entry) => ({
      id: entry.id,
      horseId: entry.runner >= 0 ? horseByIndex(entry.runner).id : null,
      t: entry.t,
      // payout.js needs the rule but must not import the event table itself.
      drinkRule: EVENTS_BY_ID[entry.id]?.drinkRule ?? null,
    })),
  };
}
