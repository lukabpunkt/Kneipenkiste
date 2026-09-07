/**
 * Automatic quality control.
 *
 * A three-year-old mid-range phone has to hold 55 frames per second (docs/05_MILESTONES.md, M4).
 * When it cannot, the right answer is to drop decoration rather than frames: the race itself —
 * the horses, their positions, the finish — never changes, only the dust and the gradients do.
 *
 * The level is module state on purpose. It is a property of the renderer as a whole, and
 * threading it through every draw call would put a parameter on functions that otherwise only
 * take geometry.
 */

import { RENDER } from '../config.js';

/** Current level. 'high' is everything; 'low' drops gradients and thins the particles. */
export const quality = { level: 'high' };

/**
 * Watches the frame rate and steps the quality down when it stays too low.
 *
 * It only ever steps down. Stepping back up would make the picture flicker between two looks
 * every time the frame rate wobbles around the threshold.
 *
 * @param {(level: string) => void} [onChange] called once when the level drops
 * @returns {{sample: (dt: number) => void, fps: () => number}}
 */
export function createQualityMonitor(onChange) {
  const { fpsThreshold, windowSeconds, mode } = RENDER.quality;
  let elapsed = 0;
  let frames = 0;
  let lowFor = 0;
  let current = 0;

  return {
    /**
     * Records one frame.
     * @param {number} dt seconds since the previous frame
     */
    sample(dt) {
      elapsed += dt;
      frames += 1;
      if (elapsed < 0.5) return;

      current = frames / elapsed;
      frames = 0;
      elapsed = 0;

      if (mode !== 'auto' || quality.level === 'low') return;

      if (current < fpsThreshold) {
        lowFor += 0.5;
        if (lowFor >= windowSeconds) {
          quality.level = 'low';
          onChange?.('low');
        }
      } else {
        lowFor = 0;
      }
    },

    /** The most recent measurement. */
    fps() {
      return Math.round(current);
    },
  };
}

/** Resets to full quality, for a fresh session or the horse lab. */
export function resetQuality() {
  quality.level = 'high';
}
