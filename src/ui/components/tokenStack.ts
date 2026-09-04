/**
 * Token-Anzeige (Art Direction §4.4).
 *
 * Rechts unten im Dig-Screen: kleine Stapel-Badges "🍺 ×2" pro Spieler mit Tokens, die
 * bei jeder Vergabe mit Overshoot aufploppen. Sie sind der einzige Ort, an dem waehrend
 * der Grabphase sichtbar ist, dass sich am Rundenende noch etwas ansammelt.
 */

import { colorById, hex, type ColorId } from '@/config/theme';
import type { PlayerId } from '@/core/types';
import { prefersReducedMotion } from '@/ui/animate';

export interface TokenStackOptions {
  colorOf: (playerId: PlayerId) => ColorId | undefined;
  nameOf: (playerId: PlayerId) => string | undefined;
}

export interface TokenStack {
  el: HTMLElement;
  /** Zeigt die aktuellen Token-Konten; neu hinzugekommene ploppen auf. */
  render(tokens: Record<PlayerId, number>): void;
}

export function createTokenStack(options: TokenStackOptions): TokenStack {
  const el = document.createElement('div');
  el.className = 'token-stack';
  el.setAttribute('aria-hidden', 'true');

  /** Was zuletzt angezeigt wurde — nur Zuwachs wird animiert. */
  const shown = new Map<PlayerId, number>();

  return {
    el,

    render(tokens) {
      el.replaceChildren();

      for (const [playerId, count] of Object.entries(tokens)) {
        if (count <= 0) continue;
        const colorId = options.colorOf(playerId);
        if (!colorId) continue;

        const chip = document.createElement('div');
        chip.className = 'token-chip';
        chip.style.setProperty('--token-color', hex(colorById(colorId).hex));
        chip.title = options.nameOf(playerId) ?? '';

        const icon = document.createElement('span');
        icon.className = 'token-chip__icon';
        icon.textContent = '🍺';

        const value = document.createElement('span');
        value.className = 'token-chip__count';
        value.textContent = `×${count}`;

        chip.append(icon, value);
        el.append(chip);

        if (count > (shown.get(playerId) ?? 0) && !prefersReducedMotion()) {
          chip.animate([{ transform: 'scale(0.4)' }, { transform: 'scale(1)' }], {
            duration: 320,
            easing: 'cubic-bezier(.34,1.56,.64,1)',
          });
        }
        shown.set(playerId, count);
      }

      for (const playerId of [...shown.keys()]) {
        if (!((tokens[playerId] ?? 0) > 0)) shown.delete(playerId);
      }
    },
  };
}
