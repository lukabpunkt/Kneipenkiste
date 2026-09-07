/**
 * The commentator: turns the engine's event log and the state of the field into a line someone
 * at the table can follow, plus the drinking-rule toast naming who is affected.
 *
 * This is the boundary the engine deliberately cannot cross. It deals in runner indices and has
 * never heard of a bet; mapping "runner 3 slipped" to "Nina drinks two" happens here, where the
 * players and their bets live (docs/03_RACE_ENGINE.md §10).
 *
 * Two rules shape everything below. **Priority:** an event always outranks a lead change, which
 * outranks filler — the funny thing that just happened must never be pushed off the line by
 * "Das Feld liegt eng beieinander". **No repeats:** the guarantee is about the finished sentence,
 * not the template it came from, so "{horse} ist vorne" drawn twice for the same horse counts as
 * a repeat and is dropped. Nobody hears the same line twice in one race.
 */

import { EVENTS_BY_ID } from '../data/events.js';
import { horseByIndex } from '../data/horses.js';
import {
  FILLER_LINES,
  FINAL_STRETCH_LINES,
  HORSE_LINES,
  HOUSE_LINES,
  LEAD_LINES,
  PHOTO_FINISH_LINES,
  START_LINES,
  TRAILING_LINES,
  WIN_LINES,
} from '../data/commentary.js';
import { COMMENTARY, TRACK_LENGTH } from '../config.js';
import { sips } from './strings.js';

/** How long a line of a given priority holds the display against a weaker one, in seconds. */
const HOLD = { event: 3.2, lead: 2.4, filler: 0 };
/** Ranking; a line only replaces one of equal or lower rank once its hold has expired. */
const RANK = { event: 3, lead: 2, filler: 1 };

/**
 * Creates the reader for one race.
 * @param {object} options
 * @param {object} options.hud
 * @param {() => any} options.getState
 * @param {(text: string) => void} [options.onRule] called with a drinking-rule sentence
 * @returns {object}
 */
export function createCommentary({ hud, getState, onRule }) {
  /** How many entries of the log have been spoken already. */
  let consumed = 0;
  /** Templates already drawn this race. */
  let used = new Set();
  /**
   * Finished sentences already spoken this race. The template pool is only half the guarantee:
   * "{horse} ist vorne" drawn twice for the same horse is the same line to anyone listening, so
   * the promise is enforced on the substituted text.
   */
  let spoken = new Set();
  /** Priority and clock of the line currently on screen. */
  let currentRank = 0;
  let heldUntil = 0;
  let nextFiller = 0;
  let lastLeader = -1;
  let announcedStretch = false;
  let leadChangesInStretch = 0;

  /**
   * Picks an unused line from a pool. When the pool runs dry — a very long race with a lot of
   * lead changes — it is released and starts over rather than falling silent.
   * @param {string[]} pool
   * @returns {string|null}
   */
  function pick(pool) {
    const fresh = pool.filter((line) => !used.has(line));
    const from = fresh.length > 0 ? fresh : pool;
    if (fresh.length === 0) for (const line of pool) used.delete(line);
    const line = from[Math.floor(Math.random() * from.length)];
    used.add(line);
    return line ?? null;
  }

  /**
   * Puts a line on screen if nothing more important is holding it.
   * @param {string} text
   * @param {'event'|'lead'|'filler'} priority
   * @param {number} clock seconds since the gates opened
   * @returns {boolean} whether it was spoken
   */
  function speak(text, priority, clock, force = false) {
    if (!text) return false;
    const rank = RANK[priority];
    if (clock < heldUntil && rank < currentRank) return false;
    if (!force && spoken.has(text)) return false;
    spoken.add(text);
    hud.say(text);
    currentRank = rank;
    heldUntil = clock + HOLD[priority];
    nextFiller = clock + COMMENTARY.fillerMin + Math.random() * COMMENTARY.fillerSpread;
    return true;
  }

  /**
   * Names the players a drinking rule hits and puts it on screen.
   * @param {object} definition event definition from data/events.js
   * @param {object|null} horse
   * @param {any} state
   */
  function announceDrinkRule(definition, horse, state) {
    const rule = definition.drinkRule;
    const affected =
      rule.scope === 'everyone'
        ? state.players
        : state.players.filter((player) =>
            state.bets.some((bet) => bet.playerId === player.id && bet.horseId === horse?.id),
          );
    if (affected.length === 0) return;

    const amount = sips(state.settings, rule.sips);
    const who = affected.map((player) => player.name).join(' und ');
    const many = affected.length > 1;
    const verb =
      rule.direction === 'deal' ? (many ? 'verteilen' : 'verteilt') : many ? 'trinken' : 'trinkt';

    const text =
      rule.scope === 'everyone'
        ? `Alle ${rule.direction === 'deal' ? 'verteilen' : 'trinken'} ${amount}!`
        : `${who} ${verb} ${amount}!`;
    hud.toast(text, horse ? horse.color : null);
    onRule?.(text);
  }

  return {
    /** The gates have opened. */
    start() {
      speak(pick(START_LINES), 'lead', 0);
    },

    /**
     * Speaks whatever is new in the event log. Events always win the line.
     * @param {object} race
     * @param {number} clock seconds since the gates opened
     */
    read(race, clock = 0) {
      const log = race.eventLog;
      if (consumed >= log.length) return;
      const state = getState();

      while (consumed < log.length) {
        const entry = log[consumed];
        consumed += 1;
        const definition = EVENTS_BY_ID[entry.id];
        if (!definition) continue;

        const horse = entry.runner >= 0 ? horseByIndex(entry.runner) : null;
        const line = pick(definition.commentary);
        speak(horse ? `${horse.name}: ${line}` : line, definition.minor ? 'lead' : 'event', clock);

        if (definition.drinkRule && state.settings.eventDrinkRules) {
          announceDrinkRule(definition, horse, state);
        }
      }
    },

    /**
     * Looks at the field and finds something to say: a lead change, the final stretch, the horse
     * that is falling away, or — when nothing else is going on — a filler line.
     * @param {{index: number, x: number}[]} runners
     * @param {number} clock seconds since the gates opened
     * @returns {{leadChange: boolean, inStretch: boolean}} what it saw, for the drinking rule
     */
    update(runners, clock) {
      let leader = runners[0];
      let trailer = runners[0];
      for (const runner of runners) {
        if (runner.x > leader.x) leader = runner;
        if (runner.x < trailer.x) trailer = runner;
      }
      const progress = leader.x / TRACK_LENGTH;
      const inStretch = progress >= COMMENTARY.finalStretchFrom;

      let leadChange = false;
      if (leader.index !== lastLeader) {
        // The very first "lead" is just the start of the race, not a change.
        leadChange = lastLeader !== -1;
        lastLeader = leader.index;
        if (leadChange) {
          if (inStretch) leadChangesInStretch += 1;
          const name = horseByIndex(leader.index).name;
          speak(pick(LEAD_LINES).replace('{horse}', name), 'lead', clock);
        }
      }

      if (inStretch && !announcedStretch) {
        announcedStretch = true;
        speak(pick(FINAL_STRETCH_LINES), 'lead', clock);
      }

      if (clock >= nextFiller) {
        // Somebody dropping off the back is more interesting than a generic line, so it gets
        // first refusal on the filler slot.
        const gap = leader.x - trailer.x;
        const name = horseByIndex(trailer.index).name;
        const pool =
          gap > TRACK_LENGTH * COMMENTARY.trailingGap
            ? TRAILING_LINES
            : (HORSE_LINES[horseByIndex(leader.index).id] ?? FILLER_LINES);
        const line = Math.random() < 0.5 ? pick(pool) : pick(FILLER_LINES);
        speak(line.replace('{horse}', name), 'filler', clock);
      }

      return { leadChange, inStretch };
    },

    /** Head to head at the line. */
    photoFinish(clock) {
      speak(pick(PHOTO_FINISH_LINES), 'event', clock);
    },

    /**
     * The race is over.
     * @param {{name: string}} winner
     * @param {boolean} houseWins nobody had backed the winner
     * @param {number} clock
     */
    win(winner, houseWins, clock) {
      const pool = houseWins ? HOUSE_LINES : WIN_LINES;
      // A win line must never be held back, whatever is on screen.
      heldUntil = 0;
      currentRank = 0;
      speak(pick(pool).replace('{horse}', winner.name), 'event', clock, true);
    },

    /** How often the lead changed in the final stretch — the lead-change drinking rule. */
    leadChanges() {
      return leadChangesInStretch;
    },

    /** Starts over for a new race. */
    reset() {
      consumed = 0;
      used = new Set();
      spoken = new Set();
      currentRank = 0;
      heldUntil = 0;
      nextFiller = COMMENTARY.fillerMin;
      lastLeader = -1;
      announcedStretch = false;
      leadChangesInStretch = 0;
    },
  };
}
