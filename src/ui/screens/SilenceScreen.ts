/**
 * Nebel (GDD §3.6, Modus "Nebel").
 *
 * Zehn Sekunden Stille statt Absprache. Der Screen ist absichtlich fast leer: Es gibt
 * nichts zu lesen, nichts zu tippen, nur die Zahl und den Wind. Wer hier redet, hat den
 * Modus nicht verstanden — und genau deshalb steht kein "Alle bereit" darauf.
 */

import { FOG_SILENCE_SEC } from '@/config/rules';
import { t } from '@/core/i18n';
import { ICON_CLOSE, createIconButton } from '../components/button';
import { createCountdownRing } from '../components/countdownRing';
import type { ScreenContext, ScreenInstance } from '../router';

export function createSilenceScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--silence';

  const ring = createCountdownRing({
    seconds: FOG_SILENCE_SEC,
    onFinish: () => ctx.fsm.send({ type: 'ready' }),
  });

  const abort = createIconButton({
    icon: ICON_CLOSE,
    ariaLabel: t('dialog.abortRound'),
    className: 'screen__abort',
    onClick: ctx.abortRound,
  });

  const heading = document.createElement('h1');
  heading.className = 'silence__headline';
  heading.textContent = t('silence.headline');

  const body = document.createElement('p');
  body.className = 'silence__body';
  body.textContent = t('silence.body');

  const fog = document.createElement('div');
  fog.className = 'silence__fog';
  fog.setAttribute('aria-hidden', 'true');

  el.append(abort, fog, heading, ring.el, body);

  return {
    el,
    activate: () => ring.start(),
    destroy: () => ring.stop(),
  };
}
