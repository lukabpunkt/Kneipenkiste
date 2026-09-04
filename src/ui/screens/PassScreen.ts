/**
 * Pass (GDD §5, Screen 2).
 *
 * Der Privacy-Screen zwischen zwei Spielern. Er ist absichtlich karg: eine Farbe, ein
 * Name, eine Frage. Wer ihn sieht, soll das Handy weiterreichen und nichts anderes tun.
 *
 * Die kurze Tap-Sperre (`PASS_LOCK_MS`) verhindert den einen Fehler, der die Runde
 * ruiniert: Der vorherige Spieler tippt aus Reflex noch einmal und sieht den Minen-Screen
 * des naechsten.
 */

import { PASS_LOCK_MS } from '@/config/rules';
import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { createPlayerBadge } from '@/ui/components/badge';
import { vibrate } from '@/ui/haptics';
import type { ScreenFactory } from '@/ui/router';

export const createPassScreen: ScreenFactory = ({ fsm, router }) => {
  const player = fsm.currentPlayer();

  const el = document.createElement('section');
  el.className = 'screen screen--pass';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');

  if (player) {
    const color = colorById(player.colorId);
    el.style.setProperty('--pass-color', hex(color.hex));
    el.style.setProperty('--pass-shade', hex(color.shade));
    el.style.setProperty('--pass-ink', hex(textColorOn(player.colorId)));
    el.append(createPlayerBadge({ colorId: player.colorId, size: 'lg' }));
  }

  const headline = document.createElement('h1');
  headline.className = 'pass__headline';
  headline.textContent = t('pass.handTo', { name: player?.name ?? '' });

  const privacy = document.createElement('p');
  privacy.className = 'pass__privacy';
  privacy.textContent = t('pass.privacy');

  const hint = document.createElement('p');
  hint.className = 'pass__hint';
  hint.textContent = t('pass.tapToStart');

  el.append(headline, privacy, hint);
  el.setAttribute('aria-label', `${headline.textContent}. ${hint.textContent}`);

  let unlocked = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const proceed = (): void => {
    if (!unlocked) return;
    vibrate('tap');
    if (!fsm.send({ type: 'tap' })) return;
    void router.go('place');
  };

  el.addEventListener('click', proceed);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      proceed();
    }
  });

  return {
    el,

    activate() {
      el.classList.add('is-locked');
      timer = globalThis.setTimeout(() => {
        unlocked = true;
        el.classList.remove('is-locked');
      }, PASS_LOCK_MS);
    },

    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
};
