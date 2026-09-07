/**
 * The 3 - 2 - 1 - LOS! overlay before a race.
 *
 * Each number is scaled down from three times its size with a bounce; "LOS!" is the cue the
 * gates open on (docs/04_DESIGN_SYSTEM.md §4.4).
 *
 * The overlay reports each step as it appears. That is what lets the renderer put the starter's
 * arm in the right place: the timing lives here, in one `setTimeout` chain, and nothing else
 * should have to keep a second clock in sync with it.
 */

import { el } from '../dom.js';

/** What is shown, and for how long each step stays. */
const STEPS = ['3', '2', '1', 'LOS!'];
const STEP_MS = 750;

/**
 * Creates the overlay.
 * @param {{onStep?: (index: number, total: number) => void}} [options]
 * @returns {{node: HTMLElement, start: (onFinished: () => void) => void, stop: () => void}}
 */
export function createCountdown({ onStep } = {}) {
  const node = el('div', { className: 'countdown', attrs: { 'aria-hidden': 'true' } });
  let timer = null;
  let step = 0;

  /** Shows the next step, or hands back when the last one is done. */
  function tick(onFinished) {
    if (step >= STEPS.length) {
      node.textContent = '';
      node.classList.remove('countdown--visible');
      onFinished();
      return;
    }
    node.textContent = STEPS[step];
    node.classList.remove('countdown--visible');
    // Force a reflow between the two class changes, otherwise the animation is not restarted.
    void node.offsetWidth;
    node.classList.add('countdown--visible');
    onStep?.(step, STEPS.length);
    step += 1;
    timer = setTimeout(() => tick(onFinished), STEP_MS);
  }

  return {
    node,

    /**
     * Runs the countdown from the beginning.
     * @param {() => void} onFinished called after the last step
     */
    start(onFinished) {
      this.stop();
      step = 0;
      tick(onFinished);
    },

    stop() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      node.textContent = '';
      node.classList.remove('countdown--visible');
    },
  };
}
