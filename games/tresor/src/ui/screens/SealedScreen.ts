/**
 * "Alle Karten versiegelt." (GDD §3.4, §5 Screen 5).
 *
 * Der Moment, in dem das Handy aufhoert zu wandern. Eine Reihe verdeckter Karten in den
 * Spielerfarben — **ohne** jede Andeutung, was darauf steht. Der Screen zeigt nur, dass
 * alle abgegeben haben.
 */

import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { symbolSvg } from '@/ui/components/badge';
import { createButton } from '@/ui/components/button';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';
import { acquireWakeLock } from '@/ui/wakeLock';

export function createSealedScreen(ctx: ScreenContext): ScreenInstance {
  const { players } = ctx.fsm.context;

  const el = document.createElement('section');
  el.className = 'screen screen--sealed';

  const headline = document.createElement('h1');
  headline.className = 'sealed__headline';
  headline.textContent = t('sealed.headline');

  const body = document.createElement('p');
  body.className = 'sealed__body';
  body.textContent = t('sealed.body');

  const row = document.createElement('div');
  row.className = 'sealed__cards';
  row.setAttribute('aria-hidden', 'true');

  players.forEach((player, index) => {
    const color = colorById(player.colorId);
    const card = document.createElement('span');
    card.className = 'sealed__card';
    card.style.setProperty('--card-color', hex(color.hex));
    card.style.setProperty('--card-shade', hex(color.shade));
    // Leichter Versatz: ein Stapel auf dem Tisch, keine Tabelle.
    card.style.setProperty('--card-tilt', `${(index % 2 === 0 ? -1 : 1) * (2 + (index % 3))}deg`);
    card.innerHTML = symbolSvg(color.symbol, hex(textColorOn(player.colorId)));
    row.append(card);
  });

  const cta = createButton({
    label: t('sealed.cta'),
    variant: 'primary',
    className: 'btn--block',
    wobble: true,
    onClick: () => {
      vibrate('tap');
      // Hier faellt die Entscheidung — genau einmal (CLAUDE.md).
      if (!ctx.fsm.send({ type: 'reveal' })) return;
      void ctx.router.go('reveal');
    },
  });

  el.append(headline, row, body, cta);

  return {
    el,
    activate() {
      // Ab jetzt liegt das Handy in der Mitte und darf nicht ausgehen (GDD §5).
      void acquireWakeLock();
      cta.focus({ preventScroll: true });
    },
  };
}
