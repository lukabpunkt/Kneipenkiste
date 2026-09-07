/**
 * Officer-Intro (GDD §5, Screen 2).
 *
 * Vollbild in der Farbe des Beamten: "{Name} ist Zollbeamter. Alle anderen packen."
 * Er sieht seine Rolle, alle anderen sehen sie auch — das ist Absicht, der Beamte ist
 * keine geheime Rolle.
 */

import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { symbolSvg } from '../components/button';
import type { ScreenContext, ScreenInstance } from '../router';

export function createOfficerIntroScreen(ctx: ScreenContext): ScreenInstance {
  const officerId = ctx.view('HALL').officerId;
  const colorId = ctx.session.colorOf(officerId);
  const color = colorById(colorId);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'screen screen--officer-intro';
  el.style.setProperty('--intro-color', hex(color.hex));
  el.style.setProperty('--intro-shade', hex(color.shade));
  el.style.setProperty('--intro-text', hex(textColorOn(colorId)));

  const symbol = document.createElement('span');
  symbol.className = 'officer-intro__symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.innerHTML = symbolSvg(colorId);

  const headline = document.createElement('h1');
  headline.className = 'officer-intro__headline';
  headline.textContent = t('officerIntro.headline', { name: ctx.session.nameOf(officerId) });

  const body = document.createElement('p');
  body.className = 'officer-intro__body';
  body.textContent = t('officerIntro.body');

  el.append(symbol, headline, body);
  el.addEventListener('click', () => ctx.fsm.send({ type: 'tap' }));

  return { el };
}
