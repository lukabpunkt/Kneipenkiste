/**
 * Short notifications at the bottom edge, stacked and auto-dismissing.
 *
 * The container is created once and lives above every screen, so a toast survives a screen
 * change — that is what makes the "race was abandoned" hint after a reload possible.
 */

import { el } from '../dom.js';

/** How long a toast stays before it fades, and how many are shown at once. */
const TOAST_DURATION = 3200;
const MAX_VISIBLE = 2;

let container = null;

/** Creates the toast container on first use. */
function ensureContainer() {
  if (container?.isConnected) return container;
  container = el('div', {
    className: 'toasts',
    // Announced politely so a toast never interrupts what a screen reader is reading.
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  document.body.append(container);
  return container;
}

/**
 * Shows a toast.
 * @param {string} message
 * @param {{icon?: string, duration?: number, variant?: 'info'|'success'|'warning'}} [options]
 * @returns {() => void} dismisses the toast early
 */
export function toast(message, { icon, duration = TOAST_DURATION, variant = 'info' } = {}) {
  const parent = ensureContainer();

  while (parent.children.length >= MAX_VISIBLE) {
    parent.firstElementChild?.remove();
  }

  const node = el('div', { className: `toast toast--${variant}` }, [
    icon
      ? el('span', { className: 'toast__icon', text: icon, attrs: { 'aria-hidden': 'true' } })
      : null,
    el('span', { className: 'toast__text', text: message }),
  ]);
  parent.append(node);

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    node.classList.add('toast--leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    // Fallback in case animations are disabled by prefers-reduced-motion.
    setTimeout(() => node.remove(), 400);
  };

  const timer = setTimeout(remove, duration);
  return () => {
    clearTimeout(timer);
    remove();
  };
}
