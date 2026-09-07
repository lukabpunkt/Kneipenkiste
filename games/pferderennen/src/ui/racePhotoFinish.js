/**
 * The photo finish: detecting a genuine head-to-head, and the slow motion, push-in and vignette
 * that go with it.
 *
 * The threshold is the same one the fairness audit measures (S5), so what the audit calls a photo
 * finish is exactly what the player sees — currently just under 40 % of races. It fires at most
 * once per race and always resolves itself, because a race that ends in slow motion and stays
 * there would take the next one down with it.
 */

import { PHOTO_FINISH, TRACK_LENGTH } from '../config.js';

/** How far the camera pushes in while the drama lasts. */
const ZOOM_BOOST = 1.4;

/**
 * @param {object} options
 * @param {{setTimeScale: (scale: number) => void}} options.loop
 * @param {{setZoomBoost: (zoom: number) => void}} options.camera
 * @param {HTMLElement} options.stage
 * @param {{photoFinish: Function, photoFinishOver: Function}} options.narration
 * @param {() => boolean} options.calm reduced motion is on, so no drama at all
 * @param {() => number} options.baseZoom what the zoom should return to afterwards — the race
 *   already pushes in gently over the final stretch, and snapping back to 1 would undo it
 * @returns {{check: Function, end: Function, isActive: () => boolean}}
 */
export function createPhotoFinish({ loop, camera, stage, narration, calm, baseZoom }) {
  let active = false;

  return {
    /**
     * Turns the last few metres into a photo finish when they deserve one.
     * @param {{x: number}[]} runners
     * @param {number} clock the simulation time, for the commentary line
     */
    check(runners, clock) {
      if (active || calm()) return;

      let first = -Infinity;
      let second = -Infinity;
      for (const runner of runners) {
        if (runner.x > first) {
          second = first;
          first = runner.x;
        } else if (runner.x > second) {
          second = runner.x;
        }
      }
      if (first < TRACK_LENGTH * PHOTO_FINISH.fromProgress) return;
      if (first - second >= PHOTO_FINISH.maxGap) return;

      active = true;
      loop.setTimeScale(PHOTO_FINISH.timeScale);
      camera.setZoomBoost(ZOOM_BOOST);
      stage.classList.add('is-photo-finish');
      narration.photoFinish(clock);
    },

    /** Puts time, zoom and the vignette back to normal. */
    end() {
      if (!active) return;
      active = false;
      narration.photoFinishOver();
      loop.setTimeScale(1);
      camera.setZoomBoost(baseZoom?.() ?? 1);
      stage.classList.remove('is-photo-finish');
    },

    isActive() {
      return active;
    },
  };
}
