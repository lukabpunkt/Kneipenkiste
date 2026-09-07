/**
 * The start signal and the finish line: everything that gives a race a beginning and an end.
 *
 * The starter raising his arm over the counted steps, the shot and its smoke, the tape across the
 * line and the way the picture leans in over the final stretch are one idea — the ceremony around
 * the race — and they share the two clocks that drive it (`sinceShot` and the eased zoom). The
 * race screen owns the race; this owns the occasion.
 *
 * Nothing in here can reach the simulation. It is handed the *drawn* positions, which are the
 * interpolated ones the player is looking at, so the tape gives way in the same frame a nose
 * crosses the line and it is structurally impossible for the tape to decide anything.
 */

import { COMMENTARY, EFFECTS, STARTER, TRACK_LENGTH } from '../config.js';
import { createFinishTape } from '../render/finishTape.js';
import { drawStarter } from '../render/starter.js';
import { DUST } from '../render/particles.js';

/**
 * @param {object} options
 * @param {() => object} options.track the current track — it is rebuilt on every rotation
 * @param {{spawn: Function}} options.particles
 * @param {{setZoomBoost: (zoom: number) => void}} options.camera
 * @param {{tape: () => void}} options.narration
 * @param {{isActive: () => boolean}} options.drama the photo finish, which owns the zoom while it runs
 * @param {() => boolean} options.calm reduced motion: no smoke, no push-in
 * @returns {object}
 */
export function createRaceCeremony({ track, particles, camera, narration, drama, calm }) {
  const tape = createFinishTape();
  /** Which countdown step is on screen, and how long ago the pistol went off. */
  let countdownStep = -1;
  let sinceShot = -1;
  /** The gentle push in over the final stretch; the photo finish returns to this, not to 1. */
  let stretchZoom = 1;

  /**
   * The starter fires. Everything that follows is decoration — the gates are released by the
   * countdown's own callback, not by this.
   */
  function fireStartingPistol() {
    sinceShot = 0;
    const anchor = track()?.starterAnchor();
    if (!anchor || calm()) return;
    // Smoke off the muzzle, which sits at the top of the raised arm.
    const muzzleY = anchor.y - anchor.size * 1.05;
    for (let i = 0; i < STARTER.smokePuffs; i += 1) {
      particles.spawn(DUST, anchor.x + anchor.size * 0.12, muzzleY, {
        speedX: (Math.random() - 0.5) * 26,
        speedY: -18 - Math.random() * 26,
        radius: anchor.size * 0.07,
        seconds: STARTER.smokeSeconds,
      });
    }
  }

  return {
    /**
     * Follows the countdown, so the shot lands on exactly the frame "LOS!" appears rather than on
     * a clock of its own.
     * @param {number} index
     * @param {number} total
     */
    countdownStep(index, total) {
      countdownStep = index;
      if (index === total - 1) fireStartingPistol();
    },

    /**
     * Leans into the end of the race: the crowd's cameras come out, and the picture closes in a
     * little. Both are driven by how far the leader has got, so they build rather than switch on.
     * @param {number} dt
     * @param {Float64Array} drawn interpolated positions
     * @param {boolean} racing false while the countdown is still up
     */
    advance(dt, drawn, racing) {
      if (sinceShot >= 0) sinceShot += dt;
      if (!racing || calm()) return;

      let lead = 0;
      for (let i = 0; i < drawn.length; i += 1) if (drawn[i] > lead) lead = drawn[i];
      const progress = Math.min(1, lead / TRACK_LENGTH);
      track().setCrowdEnergy(progress ** 2);

      const from = COMMENTARY.finalStretchFrom;
      const stretch = progress <= from ? 0 : (progress - from) / (1 - from);
      const target = 1 + (EFFECTS.finalZoom - 1) * stretch;
      // Eased rather than set, so the push is something you notice only afterwards.
      stretchZoom += (target - stretchZoom) * Math.min(1, dt * 2);
      if (!drama.isActive()) camera.setZoomBoost(stretchZoom);
    },

    /**
     * The tape: advanced, torn by whoever is drawn past the line, then drawn.
     *
     * In front of the field, because a tape you can see through is not a tape.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} options
     */
    finishLine(ctx, { dt, drawn, lanes, racing, width, height }) {
      tape.update(dt, calm());
      if (racing && !tape.isTorn()) {
        for (let i = 0; i < drawn.length; i += 1) {
          if (drawn[i] < TRACK_LENGTH) continue;
          if (tape.tear(lanes[i])) narration.tape();
          break;
        }
      }
      tape.draw(ctx, track(), width, height);
    },

    /**
     * The starter, while he is still anywhere near the picture.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} width
     */
    drawStartingPistol(ctx, width) {
      if (sinceShot > STARTER.linger) return;
      const anchor = track().starterAnchor();
      if (anchor.x < -anchor.size * 2 || anchor.x > width + anchor.size * 2) return;
      // The arm comes up over the three counted steps and is at the top when "LOS!" shows.
      const raise = countdownStep < 0 ? 0 : Math.min(1, (countdownStep + 1) / 3);
      drawStarter(ctx, { ...anchor, raise, since: sinceShot, calm: calm() });
    },

    /** What the photo finish should return the zoom to when it lets go. */
    zoom() {
      return stretchZoom;
    },

    /** A new race: arm down, tape whole, camera back out. */
    reset() {
      countdownStep = -1;
      sinceShot = -1;
      stretchZoom = 1;
      tape.reset();
    },
  };
}
