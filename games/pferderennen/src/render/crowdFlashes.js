/**
 * Flashbulbs going off in the grandstand, more of them the closer the field gets to the line.
 *
 * The stand itself is drawn once into an offscreen cache and blitted with parallax, so the
 * flashes cannot live inside it — they are drawn live on top, which is also the only way they can
 * change rate during a race.
 *
 * Both orientations share this because the behaviour is identical; only the rectangle the stand
 * occupies differs, and each track knows its own.
 */

import { EFFECTS } from '../config.js';
import { TRACK_COLOURS } from './trackTheme.js';

/** How many can be alight at once. Beyond this it stops reading as individual cameras. */
const CAPACITY = 14;

/**
 * @returns {{update: Function, draw: Function, reset: Function}}
 */
export function createCrowdFlashes() {
  /** Position within the band, 0..1 on both axes, plus remaining life in seconds. */
  const u = new Float32Array(CAPACITY);
  const v = new Float32Array(CAPACITY);
  const life = new Float32Array(CAPACITY);
  let count = 0;
  /** Fractional flashes owed since the last frame, so a low rate still fires eventually. */
  let owed = 0;

  return {
    /**
     * @param {number} dt
     * @param {number} energy 0 at the start of a race, 1 at the line
     */
    update(dt, energy) {
      for (let i = count - 1; i >= 0; i -= 1) {
        life[i] -= dt;
        if (life[i] > 0) continue;
        // Swap-remove, the same trick the particle pool uses.
        count -= 1;
        u[i] = u[count];
        v[i] = v[count];
        life[i] = life[count];
      }

      const rate =
        EFFECTS.flashRateStart + (EFFECTS.flashRateFinish - EFFECTS.flashRateStart) * energy;
      owed += rate * dt;
      while (owed >= 1) {
        owed -= 1;
        if (count >= CAPACITY) break;
        u[count] = Math.random();
        v[count] = Math.random();
        life[count] = EFFECTS.flashSeconds;
        count += 1;
      }
    },

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x: number, y: number, width: number, height: number}} band where the stand is
     */
    draw(ctx, band) {
      if (count === 0) return;
      ctx.save();
      ctx.fillStyle = TRACK_COLOURS.white;
      const radius = Math.max(2, band.height * 0.11);
      for (let i = 0; i < count; i += 1) {
        // Brightest in the middle of its life, so a flash blooms rather than blinking on.
        const t = life[i] / EFFECTS.flashSeconds;
        const bloom = Math.sin(t * Math.PI);
        const x = band.x + u[i] * band.width;
        const y = band.y + v[i] * band.height;
        // A halo under the core: a single hard dot among hundreds of coloured ones just reads as
        // one more spectator.
        ctx.globalAlpha = bloom * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = bloom;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /** A new race starts with a quiet stand. */
    reset() {
      count = 0;
      owed = 0;
    },
  };
}
