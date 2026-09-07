/**
 * Packed (GDD §5, Screen 5) — die Uebergabe.
 *
 * "Alle Koffer geschlossen. Handy in die Mitte." Der Knopf bleibt kurz taub: Er sitzt
 * dort, wo eben noch "Koffer schliessen" war, und ein Doppeltap wuerde die Hinweise
 * starten, bevor das Handy auf dem Tisch liegt.
 */

import { PACKED_ARM_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '../components/button';
import type { ScreenContext, ScreenInstance } from '../router';

export function createPackedScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('main');
  el.className = 'screen screen--packed';

  const headline = document.createElement('h1');
  headline.className = 'packed__headline';
  headline.textContent = t('packed.headline');

  const body = document.createElement('p');
  body.className = 'packed__body';
  body.textContent = t('packed.body');

  const cta = createButton({
    label: t('common.next'),
    variant: 'primary',
    disabled: true,
    onClick: () => ctx.fsm.send({ type: 'tap' }),
  });

  el.append(headline, body, cta);

  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    el,
    activate() {
      timer = globalThis.setTimeout(() => {
        cta.disabled = false;
      }, PACKED_ARM_MS);
    },
    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
