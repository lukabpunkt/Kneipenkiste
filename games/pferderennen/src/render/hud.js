/**
 * HUD as a DOM overlay on top of the canvas: leaderboard, progress bar, commentary line.
 *
 * Deliberately DOM rather than canvas — the text stays crisp at any pixel ratio and a screen
 * reader can follow the race through the live region (docs/02_ARCHITECTURE.md §6).
 *
 * The leaderboard reorders with a FLIP animation: measure where each entry was, reorder, then
 * animate from the old position to the new one. Without it the positions would jump.
 */

import { el } from '../ui/dom.js';
import { TRACK_LENGTH } from '../config.js';

/**
 * Puts the runners in the order the board should show them.
 *
 * While the race is on, that is simply by position. Once it is over it has to be the engine's
 * finish order: every runner then sits on the line at exactly the track length, so sorting by
 * position would give an arbitrary order that contradicts the result screen. Audit A3 asks for
 * exactly this agreement, which is why the rule lives in its own tested function.
 *
 * @param {{index: number, x: number}[]} runners
 * @param {number[]|null} finishOrder runner indices in finishing order, or null while running
 * @returns {{index: number, x: number}[]}
 */
export function rankRunners(runners, finishOrder = null) {
  if (finishOrder) return finishOrder.map((index) => runners.find((r) => r.index === index));
  return [...runners].sort((a, b) => b.x - a.x);
}

/**
 * Builds the HUD.
 * @param {object[]} horses entries from data/horses.js, in runner order
 * @returns {object}
 */
export function createHud(horses) {
  const entries = horses.map((horse, index) => {
    const place = el('span', { className: 'board__place num' });
    const node = el(
      'li',
      {
        className: 'board__row',
        vars: { '--horse-color': horse.color, '--horse-dark': horse.colorDark },
        attrs: { 'data-runner': String(index) },
      },
      [
        el('span', { className: 'board__dot num', text: String(horse.number) }),
        el('span', { className: 'board__name', text: horse.name }),
        place,
      ],
    );
    return { node, place, index };
  });

  const board = el(
    'ol',
    { className: 'board', attrs: { 'aria-label': 'Zwischenstand' } },
    entries.map((entry) => entry.node),
  );

  const pips = horses.map((horse) =>
    el('span', {
      className: 'progress__pip num',
      text: String(horse.number),
      vars: { '--horse-color': horse.color },
    }),
  );
  const progress = el('div', { className: 'progress' }, [
    el('div', { className: 'progress__line' }, pips),
  ]);

  const commentary = el('p', { className: 'commentary' });

  /** Drinking-rule toasts, stacked above the commentary line. */
  const toasts = el('div', { className: 'event-toasts', attrs: { 'aria-live': 'polite' } });

  const root = el('div', { className: 'hud' }, [
    el('div', { className: 'hud__top' }, [progress, board]),
    el('div', { className: 'hud__bottom' }, [toasts, commentary]),
  ]);

  /** Last known order, so the board is only rebuilt when it actually changes. */
  let lastOrder = '';

  return {
    root,

    /**
     * Updates the standings and the progress pips.
     * @param {{index: number, x: number}[]} runners
     * @param {number[]|null} [finishOrder] runner indices in finishing order
     */
    update(runners, finishOrder = null) {
      const ranking = rankRunners(runners, finishOrder);

      for (const runner of runners) {
        const pip = pips[runner.index];
        pip.style.left = `${Math.min(100, (runner.x / TRACK_LENGTH) * 100)}%`;
      }

      const signature = ranking.map((runner) => runner.index).join(',');
      if (signature === lastOrder) return;
      lastOrder = signature;

      // FLIP: remember where every row is before the reorder.
      const before = new Map();
      for (const entry of entries) before.set(entry.index, entry.node.getBoundingClientRect().top);

      for (let place = 0; place < ranking.length; place += 1) {
        const entry = entries[ranking[place].index];
        entry.place.textContent = String(place + 1);
        board.append(entry.node);
      }

      for (const entry of entries) {
        const from = before.get(entry.index);
        const to = entry.node.getBoundingClientRect().top;
        const delta = from - to;
        if (Math.abs(delta) < 1) continue;
        entry.node.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    },

    /**
     * Shows a drinking rule as a toast: who is affected and how much.
     * At most two are on screen at once, so they never bury the race (GDD §4.4).
     * @param {string} text
     * @param {string} colour the horse's signature colour, or null for a rule that hits everyone
     */
    toast(text, colour = null) {
      while (toasts.children.length >= 2) toasts.firstElementChild?.remove();

      const node = el(
        'div',
        {
          className: 'event-toast',
          vars: colour ? { '--horse-color': colour } : {},
        },
        [
          el('span', {
            className: 'event-toast__icon',
            text: '🍺',
            attrs: { 'aria-hidden': 'true' },
          }),
          el('span', { text }),
        ],
      );
      toasts.append(node);
      setTimeout(() => {
        node.classList.add('event-toast--leaving');
        setTimeout(() => node.remove(), 320);
      }, 3000);
    },

    /** Removes every toast, for a fresh race. */
    clearToasts() {
      toasts.replaceChildren();
    },

    /** Sets the commentary line. */
    say(text) {
      if (commentary.textContent === text) return;
      commentary.textContent = text;
      commentary.animate(
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      );
    },
  };
}
