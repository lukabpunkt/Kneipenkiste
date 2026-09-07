/**
 * Versiegelt (GDD §5, Screen 5).
 *
 * Der Übergang vom Privaten zum Öffentlichen: Ab hier schaut niemand mehr allein aufs
 * Handy, es liegt in der Mitte. Der Knopf ist kurz taub, weil er an derselben Stelle
 * sitzt wie eben noch die Wahl.
 */

import { SEALED_ARM_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '../components/button';
import type { ScreenContext, ScreenInstance } from '../router';

export function createSealedScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--sealed';

  const heading = document.createElement('h1');
  heading.className = 'sealed__headline';
  heading.textContent = t('sealed.headline');

  const body = document.createElement('p');
  body.className = 'sealed__body';
  body.textContent = t('sealed.body');

  const cta = createButton({
    label: t('sealed.cta'),
    variant: 'primary',
    className: 'sealed__cta',
    disabled: true,
    onClick: () => ctx.fsm.send({ type: 'tap' }),
  });

  el.append(heading, body, cta);

  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    el,
    activate() {
      timer = globalThis.setTimeout(() => {
        cta.disabled = false;
      }, SEALED_ARM_MS);
    },
    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
