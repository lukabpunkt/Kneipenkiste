/**
 * The audio side of one race: hoofbeats that follow the field, a crowd that swells towards the
 * line, and a cue for every event.
 *
 * It exists as its own module so the race screen does not have to know anything about Web Audio,
 * and so that a muted game costs exactly one branch per frame. Everything is a no-op when sound
 * is off — no context is created, no node is scheduled.
 */

import * as sfx from '../audio/sfx.js';
import { ready, unlock } from '../audio/audio.js';
import { TRACK_LENGTH } from '../config.js';

/**
 * @param {object} options
 * @param {boolean} options.enabled the `sound` setting
 * @param {number} options.baseSpeed units per second at the race's chosen duration; the
 *   hoofbeat tempo is expressed relative to it, so a short race really does sound faster
 * @returns {object}
 */
export function createRaceAudio({ enabled, baseSpeed }) {
  /** @type {{setSpeed: Function, stop: Function}|null} */
  let hooves = null;
  /** @type {{setIntensity: Function, stop: Function}|null} */
  let crowd = null;
  let live = false;

  /** True only when sound is on *and* the browser has actually given us a running context. */
  function on() {
    return enabled && ready();
  }

  return {
    /** The pistol goes off and the beds come up behind it. */
    start() {
      if (!enabled) return;
      unlock();
      if (!ready()) return;
      sfx.shot();
      hooves = sfx.hoofbeats();
      crowd = sfx.crowd();
      live = true;
    },

    /**
     * Follows the field. Called once per rendered frame; both beds smooth internally, so this
     * can be as jittery as it likes.
     * @param {{x: number, v: number}[]} runners
     */
    follow(runners) {
      if (!live || !on()) return;
      let sum = 0;
      let lead = 0;
      for (const runner of runners) {
        sum += runner.v;
        if (runner.x > lead) lead = runner.x;
      }
      hooves?.setSpeed(sum / runners.length / baseSpeed);
      crowd?.setIntensity(lead / TRACK_LENGTH);
    },

    /**
     * @param {string} id event id
     */
    event(id) {
      if (!on()) return;
      sfx.playEvent(id);
    },

    /** The winner goes through the tape. */
    tape() {
      if (!on()) return;
      sfx.tapeRip();
    },

    /** Shutters, and the mix ducks. */
    photoFinish() {
      if (!on()) return;
      sfx.photoFinish();
    },

    /** The mix opens up again. */
    photoFinishOver() {
      if (!enabled) return;
      sfx.photoFinishOver();
    },

    /** Fanfare, and the beds fade out under it. */
    win() {
      if (!on()) return;
      sfx.fanfare();
      hooves?.stop();
      crowd?.setIntensity(1);
    },

    /** Silence, whatever state the race was in. */
    stop() {
      live = false;
      hooves?.stop();
      crowd?.stop();
      hooves = null;
      crowd = null;
      if (enabled) sfx.photoFinishOver();
    },
  };
}
