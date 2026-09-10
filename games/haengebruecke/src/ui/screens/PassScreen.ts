/**
 * Handy weitergeben (GDD §5, Screen 3 — wie Drinkshot).
 *
 * Der Screen hat genau eine Aufgabe: dafür sorgen, dass zwischen zwei geheimen Wahlen
 * niemand mitliest. Deshalb ist er ganzflächig tippbar und für kurze Zeit taub — ein
 * durchgereichter Doppeltap darf nicht die Wahl des Nächsten öffnen.
 */

import { PASS_TAP_LOCK_MS } from '@/config/rules';
import { colorById, hex } from '@/config/theme';
import { t } from '@/core/i18n';
import { symbolSvg } from '../components/button';
import type { ScreenContext, ScreenInstance } from '../router';

export function createPassScreen(ctx: ScreenContext): ScreenInstance {
  const playerId = ctx.fsm.currentPlayer();
  const name = playerId ? ctx.session.nameOf(playerId) : '';
  const colorId = playerId ? ctx.session.colorOf(playerId) : 'red';
  const color = colorById(colorId);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'screen screen--pass';
  el.style.setProperty('--pass-color', hex(color.hex));
  el.style.setProperty('--pass-shade', hex(color.shade));

  const symbol = document.createElement('span');
  symbol.className = 'pass__symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.innerHTML = symbolSvg(colorId);

  const heading = document.createElement('h1');
  heading.className = 'pass__headline';
  heading.textContent = t('pass.headline', { name });

  const body = document.createElement('p');
  body.className = 'pass__body';
  body.textContent = t('pass.body');

  const cta = document.createElement('span');
  cta.className = 'pass__cta';
  cta.textContent = t('pass.cta');

  el.append(symbol, heading, body, cta);

  let armed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  el.addEventListener('click', () => {
    if (!armed) return;
    ctx.fsm.send({ type: 'tap' });
  });

  return {
    el,
    activate() {
      el.dataset.armed = 'false';
      timer = globalThis.setTimeout(() => {
        armed = true;
        el.dataset.armed = 'true';
      }, PASS_TAP_LOCK_MS);
    },
    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
