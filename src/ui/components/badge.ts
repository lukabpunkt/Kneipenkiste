/**
 * Spieler-Badge: Farbpunkt mit Symbol und Name.
 *
 * Das Symbol ist nicht Dekoration — acht Spielerfarben muessen auch bei Deuteranopie
 * unterscheidbar sein (Audit A2).
 */

import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';
import { symbolSvg } from './button';

export interface BadgeOptions {
  name: string;
  colorId: ColorId;
  /** Kleine Variante fuer Listen und Chips. */
  small?: boolean;
  /** Zusatz rechts, z. B. "Beamter". */
  note?: string;
}

export function createBadge(options: BadgeOptions): HTMLElement {
  const color = colorById(options.colorId);

  const el = document.createElement('span');
  el.className = options.small ? 'badge badge--small' : 'badge';
  el.style.setProperty('--badge-color', hex(color.hex));
  el.style.setProperty('--badge-shade', hex(color.shade));
  el.style.setProperty('--badge-text', hex(textColorOn(options.colorId)));

  const dot = document.createElement('span');
  dot.className = 'badge__dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = symbolSvg(options.colorId);

  const name = document.createElement('span');
  name.className = 'badge__name';
  name.textContent = options.name;

  el.append(dot, name);

  if (options.note) {
    const note = document.createElement('span');
    note.className = 'badge__note';
    note.textContent = options.note;
    el.append(note);
  }

  return el;
}
