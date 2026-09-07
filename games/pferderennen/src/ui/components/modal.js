/**
 * Modal: bottom sheet on mobile, centred on desktop, focus trap and Esc.
 *
 * Rules, settings and statistics are overlays rather than screens (docs/02_ARCHITECTURE.md §3),
 * so they all run through here. While a modal is open focus cannot leave it, and on close it
 * returns to whatever opened the modal.
 */

import { el, listen, focus } from '../dom.js';
import { iconButton } from './button.js';

/** Elements that can receive focus inside a modal. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every modal currently open. A modal lives on document.body rather than inside a screen, so
 * without this the router could navigate away and leave one floating with its keydown listener
 * still attached (audit A6, no listener leaks).
 */
const openModals = new Set();

/** Closes every open modal, e.g. when the router switches screens. */
export function closeAllModals() {
  for (const close of [...openModals]) close();
}

/**
 * Opens a modal.
 * @param {object} options
 * @param {string} options.title
 * @param {Node} options.content
 * @param {() => void} [options.onClose]
 * @returns {{close: () => void, node: HTMLElement}}
 */
export function modal({ title, content, onClose }) {
  const previouslyFocused = document.activeElement;

  const closeButton = iconButton({ icon: 'close', label: 'Schließen', onClick: () => close() });

  const dialog = el(
    'div',
    {
      className: 'modal',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
    },
    [
      el('header', { className: 'modal__header' }, [
        el('h2', { className: 'modal__title', text: title, attrs: { id: 'modal-title' } }),
        closeButton,
      ]),
      el('div', { className: 'modal__body' }, [content]),
    ],
  );

  const backdrop = el(
    'div',
    {
      className: 'modal-backdrop',
      on: {
        // Only a click on the backdrop itself closes; a click inside the dialog must not.
        click: (event) => {
          if (event.target === backdrop) close();
        },
      },
    },
    [dialog],
  );

  /** Keeps Tab inside the dialog and closes on Esc. */
  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const targets = [...dialog.querySelectorAll(FOCUSABLE)];
    if (targets.length === 0) return;
    const first = targets[0];
    const last = targets[targets.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      focus(last);
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      focus(first);
    }
  }

  const unlisten = listen([[document, 'keydown', onKeydown]]);
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    openModals.delete(close);
    unlisten();
    backdrop.remove();
    document.body.classList.remove('has-modal');
    focus(previouslyFocused instanceof HTMLElement ? previouslyFocused : null);
    onClose?.();
  }

  openModals.add(close);

  document.body.append(backdrop);
  document.body.classList.add('has-modal');
  focus(dialog.querySelector(FOCUSABLE) ?? closeButton);

  return { close, node: dialog };
}
