/**
 * Stake stepper: minus/plus, bounds, hold-to-repeat.
 *
 * Both buttons are at least 48 px so they stay comfortable with a thumb, and holding one down
 * repeats with an accelerating interval instead of forcing twelve separate taps. The value rolls
 * in the direction it moved, so a change reads as a change even from across the table.
 */

import { el } from '../dom.js';

/** Delay before a held button starts repeating, and the interval while it repeats. */
const HOLD_DELAY = 450;
const HOLD_INTERVAL = 120;
/** The repeat speeds up to this interval the longer a button is held. */
const HOLD_INTERVAL_MIN = 45;

/**
 * @param {object} options
 * @param {number} options.value
 * @param {number} options.min
 * @param {number} options.max
 * @param {string} options.label visible label above the value
 * @param {(value: number) => void} options.onChange
 * @param {(value: number) => string} [options.format] renders the value, e.g. "3 Schlücke"
 * @returns {{node: HTMLElement, setValue: (value: number) => void, destroy: () => void}}
 */
export function stepper({ value, min, max, label, onChange, format = String }) {
  let current = value;
  let holdTimer = null;
  let holdInterval = null;

  const roll = el('span', { className: 'stepper__roll' }, [
    el('span', { className: 'stepper__digit', text: format(current) }),
  ]);
  /* Reserves the width of the longest value the stepper can ever show, so the two buttons do not
     jump sideways when the text grows (1 -> 10 Schlücke). Measured rather than guessed in `ch`,
     which would depend on the display font. */
  const widest = [format(min), format(max)].reduce((a, b) => (b.length > a.length ? b : a));
  const output = el('output', { className: 'stepper__value num' }, [
    roll,
    el('span', {
      className: 'stepper__sizer',
      text: widest,
      attrs: { 'aria-hidden': 'true' },
    }),
  ]);

  /**
   * Swaps the displayed value, rolling the old one out and the new one in. While a held button
   * repeats faster than the animation lasts, the pending outgoing digit is dropped rather than
   * stacked, so the strip never grows.
   * @param {number} direction -1 down, +1 up, 0 no animation
   */
  const show = (direction) => {
    const text = format(current);
    const previous = roll.lastElementChild;
    if (previous && previous.textContent === text) return;
    if (direction === 0 || !previous) {
      roll.replaceChildren(el('span', { className: 'stepper__digit', text }));
      return;
    }
    while (roll.children.length > 1) roll.firstElementChild.remove();
    const way = direction > 0 ? 'up' : 'down';
    previous.className = `stepper__digit stepper__digit--out-${way}`;
    previous.addEventListener('animationend', () => previous.remove(), { once: true });
    roll.append(el('span', { className: `stepper__digit stepper__digit--in-${way}`, text }));
  };

  const stopHold = () => {
    if (holdTimer !== null) clearTimeout(holdTimer);
    if (holdInterval !== null) clearInterval(holdInterval);
    holdTimer = null;
    holdInterval = null;
  };

  /** Applies a step, clamps it and reports it upwards. */
  const step = (delta) => {
    const next = Math.min(max, Math.max(min, current + delta));
    if (next === current) {
      stopHold();
      return;
    }
    const direction = next > current ? 1 : -1;
    current = next;
    show(direction);
    minus.disabled = current <= min;
    plus.disabled = current >= max;
    onChange(current);
  };

  /** Starts the accelerating repeat while a button stays pressed. */
  const startHold = (delta) => {
    stopHold();
    holdTimer = setTimeout(() => {
      let interval = HOLD_INTERVAL;
      const tick = () => {
        step(delta);
        if (interval > HOLD_INTERVAL_MIN && holdInterval !== null) {
          clearInterval(holdInterval);
          interval = Math.max(HOLD_INTERVAL_MIN, interval - 15);
          holdInterval = setInterval(tick, interval);
        }
      };
      holdInterval = setInterval(tick, interval);
    }, HOLD_DELAY);
  };

  /** Builds one of the two round buttons. */
  const makeButton = (delta, symbol, name) =>
    el('button', {
      className: 'stepper__btn',
      text: symbol,
      attrs: { type: 'button', 'aria-label': name },
      on: {
        click: () => step(delta),
        pointerdown: () => startHold(delta),
        pointerup: stopHold,
        pointerleave: stopHold,
        pointercancel: stopHold,
      },
    });

  const minus = makeButton(-1, '−', 'Einsatz verringern');
  const plus = makeButton(+1, '+', 'Einsatz erhöhen');
  minus.disabled = current <= min;
  plus.disabled = current >= max;

  const node = el('div', { className: 'stepper' }, [
    el('span', { className: 'stepper__label', text: label }),
    el('div', { className: 'stepper__row' }, [minus, output, plus]),
  ]);

  return {
    node,
    setValue(next) {
      current = Math.min(max, Math.max(min, next));
      show(0);
      minus.disabled = current <= min;
      plus.disabled = current >= max;
    },
    destroy: stopHold,
  };
}
