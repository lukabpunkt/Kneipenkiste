/**
 * The last races as a row of coloured dots.
 *
 * It is the fairness rule made visible: over a session the six colours turn up in no order at
 * all, which is a lot more convincing at a kitchen table than a sentence claiming 1/6 each.
 * Shown on the start screen and again, larger, in the statistics.
 */

import { el } from '../dom.js';
import { HORSES_BY_ID } from '../../data/horses.js';

/** How many races the strip shows. */
const LENGTH = 20;

/**
 * @param {any} state
 * @param {{title?: string, compact?: boolean}} [options]
 * @returns {HTMLElement|null} null when nothing has been raced yet
 */
export function historyStrip(state, { title = 'Die letzten Rennen', compact = false } = {}) {
  const entries = state.session.history.slice(-LENGTH);
  if (entries.length === 0) return null;

  const dots = el(
    'ol',
    { className: 'history__dots', attrs: { 'aria-label': title } },
    entries.map((entry) => {
      const horse = HORSES_BY_ID[entry.winnerId];
      return el('li', {
        className: 'history__dot',
        vars: {
          '--horse-color': horse?.color ?? 'var(--text-muted)',
          '--horse-dark': horse?.colorDark ?? 'var(--text-muted)',
        },
        attrs: { title: horse?.name ?? 'Unbekannt' },
      });
    }),
  );

  return el('div', { className: `history${compact ? ' history--compact' : ''}` }, [
    compact ? null : el('h3', { text: title }),
    dots,
  ]);
}
