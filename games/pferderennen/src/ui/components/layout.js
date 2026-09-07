/**
 * Shared building blocks for the screen layout.
 *
 * Every screen is a header, a scrolling body and a sticky footer holding the primary action.
 * Keeping that shape in one place is what makes the screens feel like one product rather than
 * eight separate pages.
 */

import { el } from '../dom.js';
import { createPortrait } from '../../render/horsePortrait.js';
import { RENDER } from '../../config.js';

/**
 * Assembles a screen.
 * @param {object} options
 * @param {Node} [options.header]
 * @param {Node[]} options.body
 * @param {Node} [options.footer] sticky at the bottom edge, above the safe area
 * @returns {DocumentFragment}
 */
export function page({ header, body, footer }) {
  const fragment = document.createDocumentFragment();
  if (header) fragment.append(header);
  fragment.append(el('div', { className: 'screen__body' }, body));
  if (footer) fragment.append(el('footer', { className: 'screen__footer' }, [footer]));
  return fragment;
}

/**
 * Screen header with a title and an optional line underneath.
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {Node} [options.aside] shown on the right, e.g. a progress counter
 * @returns {HTMLElement}
 */
export function header({ title, subtitle, aside }) {
  return el('header', { className: 'screen__header' }, [
    el('div', { className: 'screen__heading' }, [
      el('h1', { className: 'screen__title', text: title }),
      subtitle ? el('p', { className: 'screen__subtitle', text: subtitle }) : null,
    ]),
    aside ?? null,
  ]);
}

/**
 * A cream panel.
 * @param {Node[]} children
 * @param {string} [className] extra classes
 * @returns {HTMLElement}
 */
export function card(children, className = '') {
  return el('div', { className: `card ${className}`.trim() }, children);
}

/**
 * The coloured disc carrying a horse's starting number. Used wherever the horse only needs to be
 * identified, not looked at: the leaderboard, the overview table, the podium plinth.
 * @param {{color: string, number: number, name: string}} horse
 * @param {string} [size] 'sm' | 'md' | 'lg'
 * @returns {HTMLElement}
 */
export function horseBadge(horse, size = 'md') {
  return el('span', {
    className: `horse-badge horse-badge--${size} num`,
    text: String(horse.number),
    vars: { '--horse-color': horse.color, '--horse-dark': horse.colorDark },
    attrs: { 'aria-hidden': 'true' },
  });
}

/**
 * A drawn portrait of the horse, with its starting number on a badge in the corner.
 *
 * The betting cards and the podium show this rather than a coloured circle: a horse you are
 * about to bet drinks on should have a face (docs/05_MILESTONES.md, M6 task 6).
 *
 * @param {object} horse entry from data/horses.js
 * @param {number} size in CSS pixels
 * @returns {HTMLElement}
 */
export function horsePortrait(horse, size = 64) {
  const ratio = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
  return el(
    'span',
    {
      className: 'portrait',
      vars: { '--horse-color': horse.color, '--horse-dark': horse.colorDark },
      attrs: { style: `width:${size}px;height:${size}px` },
    },
    [
      createPortrait(horse, size, ratio),
      el('span', { className: 'portrait__number num', text: String(horse.number) }),
    ],
  );
}

/**
 * A player's avatar with their name.
 * @param {{avatar: string, name: string}} player
 * @returns {HTMLElement}
 */
export function playerChip(player) {
  return el('span', { className: 'player-chip' }, [
    el('span', {
      className: 'player-chip__avatar',
      text: player.avatar,
      attrs: { 'aria-hidden': 'true' },
    }),
    el('span', { className: 'player-chip__name', text: player.name }),
  ]);
}
