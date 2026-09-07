/**
 * Button component with a bottom edge, states and tap feedback.
 *
 * The bottom edge is what makes the buttons feel physical: pressing moves the label down and
 * shortens the edge, so a tap reads as an actual press (docs/04_DESIGN_SYSTEM.md §11).
 */

import { el } from '../dom.js';
import { icon as glyph } from './icon.js';

/**
 * @param {object} options
 * @param {string} options.label
 * @param {string} [options.icon] name from the icon set, drawn before the label
 * @param {'primary'|'secondary'|'ghost'|'danger'} [options.variant]
 * @param {(event: MouseEvent) => void} [options.onClick]
 * @param {boolean} [options.disabled]
 * @param {string} [options.title] tooltip, e.g. why a button is disabled
 * @param {string} [options.describedBy] id of the element that says why, e.g. the hint next to it
 * @param {boolean} [options.wide] full width
 * @param {'button'|'submit'} [options.type]
 * @returns {HTMLButtonElement}
 */
export function button({
  label,
  icon,
  variant = 'primary',
  onClick,
  disabled = false,
  title,
  describedBy,
  wide = false,
  type = 'button',
}) {
  const classes = ['btn', `btn--${variant}`];
  if (wide) classes.push('btn--wide');

  return el(
    'button',
    {
      className: classes.join(' '),
      attrs: {
        type,
        disabled: disabled || null,
        title: title ?? null,
        // Why a button cannot be used is a description, not a name. Mirroring the title into an
        // aria-label replaced the label entirely: a screen reader on the disabled start button
        // heard "Es fehlen noch 2 Wetten" and never learnt what the button was for (audit A4).
        // The reason is on screen anyway, so it is pointed at rather than repeated.
        'aria-describedby': describedBy ?? null,
      },
      on: onClick ? { click: onClick } : {},
    },
    [icon ? glyph(icon) : null, el('span', { text: label })],
  );
}

/**
 * A small round icon button, used for removing a player or closing a modal.
 * @param {object} options
 * @param {string} options.icon name from the icon set
 * @param {string} options.label accessible name — icon buttons must never be unlabelled
 * @param {(event: MouseEvent) => void} options.onClick
 * @returns {HTMLButtonElement}
 */
export function iconButton({ icon, label, onClick }) {
  return el(
    'button',
    {
      className: 'btn-icon',
      attrs: { type: 'button', 'aria-label': label, title: label },
      on: { click: onClick },
    },
    [glyph(icon, { size: 22 })],
  );
}
