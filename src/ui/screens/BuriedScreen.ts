/**
 * Buried (GDD §5, Screen 4).
 *
 * "Alle Minen vergraben. Handy in die Mitte." Ein Tap startet die Grabphase — und
 * **erst dort** legt das Spiel die Kiste (ADR-4). Das ist wichtiger, als es aussieht:
 * Wer zuletzt eine Mine gelegt hat, kennt die Kistenposition genauso wenig wie alle
 * anderen, weil sie zu diesem Zeitpunkt noch gar nicht existiert.
 */

import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { vibrate } from '@/ui/haptics';
import type { ScreenFactory } from '@/ui/router';

export const createBuriedScreen: ScreenFactory = ({ fsm, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--buried';

  const icon = document.createElement('div');
  icon.className = 'buried__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🕳️';

  const headline = document.createElement('h1');
  headline.className = 'buried__headline';
  headline.textContent = t('buried.headline');

  const body = document.createElement('p');
  body.className = 'buried__body';
  body.textContent = t('buried.body');

  const cta = createButton({
    label: t('buried.cta'),
    variant: 'primary',
    className: 'btn--wide',
    wobble: true,
    onClick: () => {
      vibrate('tap');
      if (!fsm.send({ type: 'begin' })) return;
      void router.go('dig');
    },
  });

  el.append(icon, headline, body, cta);

  return { el };
};
