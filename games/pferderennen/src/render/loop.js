/**
 * requestAnimationFrame loop with an accumulator: fixed simulation timestep, interpolated
 * rendering.
 *
 * The simulation must advance in fixed steps, otherwise a fast phone and a slow one would
 * produce different races (fairness requirement F5). Rendering then interpolates between the
 * last two states, so the picture stays smooth even when the step and the frame do not line up.
 *
 * When the tab goes to the background the loop pauses rather than catching up: a race must not
 * run to its finish in a single frame while nobody is watching (docs/02_ARCHITECTURE.md §5.4).
 */

import { TIMESTEP } from '../config.js';

/** Never simulate more than this many steps in one frame, so a hitch cannot spiral. */
const MAX_STEPS_PER_FRAME = 8;

/**
 * @param {object} options
 * @param {() => void} options.update      advances the simulation by exactly one timestep
 * @param {(alpha: number) => void} options.render alpha is 0..1 between the last two steps
 * @param {() => void} [options.onPause]
 * @param {() => void} [options.onResume]
 * @returns {{start: () => void, stop: () => void, isRunning: () => boolean, setTimeScale: (scale: number) => void, timeScale: () => number}}
 */
export function createLoop({ update, render, onPause, onResume }) {
  let running = false;
  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let timeScale = 1;

  /** One animation frame: catch the simulation up, then draw. */
  function tick(now) {
    if (!running) return;
    frame = requestAnimationFrame(tick);

    const elapsed = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    accumulator += elapsed * timeScale;

    let steps = 0;
    while (accumulator >= TIMESTEP && steps < MAX_STEPS_PER_FRAME) {
      update();
      accumulator -= TIMESTEP;
      steps += 1;
    }
    // Whatever is left over would only pile up; drop it rather than run a burst next frame.
    if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

    // The real frame time goes with it: the quality monitor has to see how long a frame actually
    // took, and the fixed simulation step would tell it a comfortable lie every time.
    render(accumulator / TIMESTEP, elapsed);
  }

  /**
   * Pauses while the tab is hidden.
   *
   * Deliberately *not* catching up on return: a race must not run to its finish in a single
   * frame while nobody is watching. The elapsed time is simply dropped and the race carries on
   * where it left off (docs/02_ARCHITECTURE.md §9).
   */
  function onVisibilityChange() {
    if (document.hidden) {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
      onPause?.();
    } else if (!running && wasPausedByVisibility) {
      wasPausedByVisibility = false;
      onResume?.();
      loop.start();
    }
    if (document.hidden) wasPausedByVisibility = true;
  }

  /** Distinguishes a pause we caused from one the caller asked for. */
  let wasPausedByVisibility = false;

  const loop = {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', onVisibilityChange);
    },

    stop() {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },

    isRunning() {
      return running;
    },

    /** Slow motion for the photo finish; 1 is real time. */
    setTimeScale(scale) {
      timeScale = scale;
    },

    timeScale() {
      return timeScale;
    },
  };

  return loop;
}
