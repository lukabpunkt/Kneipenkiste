/**
 * Schluck-Stapel: n Becher nebeneinander, ab einer Schwelle als "×n".
 *
 * Eine Zahl allein liest sich auf einem Partyhandy zu langsam. Drei Becher sieht man,
 * ohne zu lesen — und genau darum geht es beim Verteilen.
 */

import { colorById, hex, type ColorId } from '@/config/theme';
import { plural } from '@/core/i18n';

/** Ab hier werden aus Bechern eine Zahl — mehr als das zählt niemand mit dem Auge. */
const MAX_VISIBLE = 5;

export interface TokenStackOptions {
  count: number;
  colorId?: ColorId;
  small?: boolean;
}

export function createTokenStack(options: TokenStackOptions): HTMLElement {
  const el = document.createElement('span');
  el.className = options.small ? 'tokens tokens--small' : 'tokens';
  el.setAttribute('aria-label', `${options.count} ${plural('common.sips', options.count)}`);

  if (options.colorId) {
    const color = colorById(options.colorId);
    el.style.setProperty('--token-color', hex(color.hex));
    el.style.setProperty('--token-shade', hex(color.shade));
  }

  const visible = Math.min(options.count, MAX_VISIBLE);
  for (let i = 0; i < visible; i += 1) {
    const cup = document.createElement('span');
    cup.className = 'tokens__cup';
    cup.setAttribute('aria-hidden', 'true');
    el.append(cup);
  }

  if (options.count > MAX_VISIBLE) {
    const rest = document.createElement('span');
    rest.className = 'tokens__count';
    rest.setAttribute('aria-hidden', 'true');
    rest.textContent = `×${options.count}`;
    el.append(rest);
  }

  return el;
}
