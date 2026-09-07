/**
 * Everything the race says out loud, in one place: the commentary line, the sound cues, the
 * drinking-rule toasts, and the polite live region that lets someone follow the race without
 * seeing it.
 *
 * The race screen is about simulating and drawing. This module is about narrating, and it keeps
 * the three channels — screen, sound, screen reader — in step with each other rather than having
 * the race screen remember to feed all three.
 */

import { horseByIndex } from '../data/horses.js';
import { createCommentary } from './raceCommentary.js';
import { createRaceAudio } from './raceAudio.js';
import { sips } from './strings.js';

/** Floor between two spoken lead changes, so a screen reader stays followable (audit A4). */
const LEAD_ANNOUNCE_MIN_MS = 3000;

/**
 * @param {object} options
 * @param {object} options.hud
 * @param {HTMLCanvasElement} options.canvas
 * @param {{getState: Function}} options.store
 * @param {number} options.baseSpeed
 * @param {(pattern: number|number[]) => void} options.buzz
 * @returns {object}
 */
export function createNarration({ hud, canvas, store, baseSpeed, buzz }) {
  const audio = createRaceAudio({
    enabled: store.getState().settings.sound,
    baseSpeed,
  });
  /** Every drinking rule the race triggered, in order, for the recap on the result screen. */
  const rules = [];
  const commentary = createCommentary({
    hud,
    getState: () => store.getState(),
    onRule: (text) => rules.push(text),
  });

  /** How many entries of the event log have already been sounded. */
  let heard = 0;
  let lastLeader = -1;
  let lastAnnounce = 0;

  /** Puts one sentence into the page's polite live region. */
  function speak(text) {
    const region = document.getElementById('live-region');
    if (region) region.textContent = text;
  }

  /**
   * Keeps the canvas label and the live region current. Only speaks when the lead actually
   * changes, and at most every three seconds: in a tight pack the lead can change several times
   * a second, and a screen reader would never stop talking (audit A4).
   * @param {{index: number, x: number}[]} runners
   */
  function announce(runners) {
    let leader = runners[0];
    for (const runner of runners) if (runner.x > leader.x) leader = runner;
    if (leader.index === lastLeader) return;

    const now = performance.now();
    if (now - lastAnnounce < LEAD_ANNOUNCE_MIN_MS) return;
    lastAnnounce = now;
    lastLeader = leader.index;

    const name = horseByIndex(leader.index).name;
    canvas.setAttribute('aria-label', `Rennbahn. ${name} führt.`);
    speak(`${name} führt.`);
  }

  /**
   * The lead-change rule (GDD §6, off by default): every change of the lead in the final stretch
   * costs the whole table one sip. It is a pure UI rule — the engine neither knows nor cares.
   * @param {{leadChange: boolean, inStretch: boolean}} seen
   */
  function leadChangeRule(seen) {
    if (!seen.leadChange || !seen.inStretch) return;
    const settings = store.getState().settings;
    if (!settings.leadChangeRule) return;
    const text = `Führungswechsel! Alle trinken ${sips(settings, 1)}!`;
    hud.toast(text, null);
    rules.push(text);
    buzz(20);
  }

  return {
    /** The gates have opened. */
    start() {
      audio.start();
      commentary.start();
      speak('Das Rennen läuft.');
    },

    /**
     * One simulation step's worth of narration: new events get a cue and a line, the field gets
     * looked at, the lead-change rule fires, and the beds follow the pace.
     * @param {object} race
     */
    step(race) {
      const clock = race.state.t;
      const log = race.eventLog;
      while (heard < log.length) {
        audio.event(log[heard].id);
        heard += 1;
      }
      commentary.read(race, clock);
      leadChangeRule(commentary.update(race.runners, clock));
      audio.follow(race.runners);
    },

    /** Called once per rendered frame, only for the live region. */
    frame(runners) {
      announce(runners);
    },

    /** The winner tore through the finish tape. */
    tape() {
      audio.tape();
    },

    /** Head to head at the line. */
    photoFinish(clock) {
      commentary.photoFinish(clock);
      audio.photoFinish();
      speak('Fotofinish!');
    },

    /** The drama is over. */
    photoFinishOver() {
      audio.photoFinishOver();
    },

    /**
     * @param {{name: string, id: string}} winner
     * @param {boolean} houseWins nobody had backed the winner
     * @param {number} clock
     */
    win(winner, houseWins, clock) {
      commentary.win(winner, houseWins, clock);
      audio.win();
      canvas.setAttribute('aria-label', `Rennen beendet. ${winner.name} gewinnt.`);
      speak(`${winner.name} gewinnt!`);
    },

    /** The drinking rules this race produced, for the result screen. */
    rules() {
      return [...rules];
    },

    /** Starts over for a new race. */
    reset() {
      commentary.reset();
      heard = 0;
      lastLeader = -1;
      lastAnnounce = 0;
      rules.length = 0;
    },

    /** Silence. */
    stop() {
      audio.stop();
    },
  };
}
