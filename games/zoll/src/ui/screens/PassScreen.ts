/**
 * Pass (GDD §5, Screen 3) — das Handy wandert.
 *
 * Der Beamte wird uebersprungen; hier steht nur, wer als Naechstes packt. Der Screen ist
 * eine grosse Taste, damit man ihn im Halbdunkel trifft — mit kurzer Sperre, weil er an
 * derselben Stelle sitzt wie "Koffer schliessen" davor.
 */

import { PASS_TAP_LOCK_MS } from '@/config/rules';
import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { symbolSvg } from '../components/button';
import { vibrate } from '../haptics';
import type { ScreenContext, ScreenInstance } from '../router';

export function createPassScreen(ctx: ScreenContext): ScreenInstance {
  const travelerId = ctx.fsm.currentTraveler() ?? '';
  const name = ctx.session.nameOf(travelerId);
  const colorId = ctx.session.colorOf(travelerId);
  const color = colorById(colorId);

  const el = document.createElement('main');
  el.className = 'screen screen--pass';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.style.setProperty('--pass-color', hex(color.hex));
  el.style.setProperty('--pass-shade', hex(color.shade));
  el.style.setProperty('--pass-text', hex(textColorOn(colorId)));

  const symbol = document.createElement('span');
  symbol.className = 'pass__symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.innerHTML = symbolSvg(colorId);

  const headline = document.createElement('h1');
  headline.className = 'pass__headline';
  headline.textContent = t('pass.headline', { name });

  const body = document.createElement('p');
  body.className = 'pass__body';
  body.textContent = t('pass.body', { name });

  const cta = document.createElement('p');
  cta.className = 'pass__cta';
  cta.textContent = t('pass.tap', { name });

  el.append(symbol, headline, body, cta);
  el.setAttribute('aria-label', `${t('pass.headline', { name })} ${t('pass.tap', { name })}`);

  let armed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const advance = (): void => {
    if (!armed) return;
    armed = false;
    vibrate('tap');
    ctx.fsm.send({ type: 'tap' });
  };

  el.addEventListener('click', advance);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advance();
    }
  });

  return {
    el,
    activate() {
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
