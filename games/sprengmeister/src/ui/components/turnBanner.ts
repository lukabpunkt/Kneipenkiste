/**
 * Turn-Banner (Art Direction §4.2).
 *
 * Oben, Vollbreite, in Spielerfarbe: "RUDI GRÄBT". Der Wechsel laeuft als Wipe in der
 * **neuen** Farbe (200 ms) — nicht als Fade, damit der Farbwechsel als Ereignis
 * ankommt und nicht als Uebergang.
 *
 * Der Digger-Portraitkopf links kommt in M2 mit dem Atlas; bis dahin steht dort das
 * Farb-Badge.
 */

import { BANNER } from '@/config/choreo';
import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import { prefersReducedMotion } from '@/ui/animate';
import { createPlayerBadge } from './badge';

export interface TurnBanner {
  el: HTMLElement;
  /** Setzt den aktiven Spieler; wechselt per Wipe, wenn sich die Farbe aendert. */
  setPlayer(name: string, colorId: ColorId): void;
  /** Nimmt den Timer-Ring auf (optionaler Zug-Timer, GDD §3.4). */
  setTimer(el: HTMLElement | null): void;
}

export function createTurnBanner(): TurnBanner {
  const el = document.createElement('div');
  el.className = 'turn-banner';
  /*
   * `aria-live="polite"`: Wer dran ist, muss auch angesagt werden — das Handy liegt in
   * der Mitte, und der Screen ist die einzige Quelle dieser Information (Audit A5).
   */
  el.setAttribute('aria-live', 'polite');

  const badgeSlot = document.createElement('div');
  badgeSlot.className = 'turn-banner__badge';

  const label = document.createElement('span');
  label.className = 'turn-banner__label';

  const timerSlot = document.createElement('div');
  timerSlot.className = 'turn-banner__timer';

  el.append(badgeSlot, label, timerSlot);

  let currentColor: ColorId | null = null;

  return {
    el,

    setPlayer(name, colorId) {
      const changed = currentColor !== null && currentColor !== colorId;
      currentColor = colorId;

      const color = colorById(colorId);
      el.style.setProperty('--turn-color', hex(color.hex));
      el.style.setProperty('--turn-shade', hex(color.shade));
      el.style.setProperty('--turn-ink', hex(textColorOn(colorId)));

      badgeSlot.replaceChildren(createPlayerBadge({ colorId, size: 'sm' }));
      label.textContent = t('dig.turn', { name: name.toUpperCase() });

      if (!changed || prefersReducedMotion()) return;
      // Wipe in der neuen Farbe: Der Wechsel ist ein Ereignis, kein Uebergang.
      el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
        duration: BANNER.turnWipeMs,
        easing: 'cubic-bezier(.65,0,.35,1)',
      });
    },

    setTimer(timer) {
      timerSlot.replaceChildren();
      if (timer) timerSlot.append(timer);
    },
  };
}
