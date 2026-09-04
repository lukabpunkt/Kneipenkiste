/**
 * Nachtschicht (GDD §3.7, §5).
 *
 * Keine Verhandlung, keine Tabelle, kein Kassel — zehn Sekunden Stille mit tickender
 * Uhr. Der Screen ist absichtlich fast leer: Spaeter am Abend will niemand mehr lesen,
 * und das Schweigen selbst ist der Effekt.
 */

import { t } from '@/core/i18n';
import { openingPhase } from '@/core/modes';
import { createCountdownRing } from '@/ui/components/countdownRing';
import { createVaultWidget } from '@/ui/components/vaultWidget';
import { vaultSpec } from '@/core/vault';
import type { ScreenContext, ScreenInstance } from '@/ui/router';
import { acquireWakeLock, releaseWakeLock } from '@/ui/wakeLock';

export function createSilenceScreen(ctx: ScreenContext): ScreenInstance {
  const { settings } = ctx.fsm.context;
  const phase = openingPhase(settings);
  const vault = ctx.fsm.context.setup?.vault ?? ctx.fsm.context.vault;

  const el = document.createElement('section');
  el.className = 'screen screen--silence';

  const headline = document.createElement('h1');
  headline.className = 'silence__headline';
  headline.textContent = t('silence.headline');

  const body = document.createElement('p');
  body.className = 'silence__body';
  body.textContent = t('silence.body');

  const stage = document.createElement('div');
  stage.className = 'negotiation__stage';

  const widget = createVaultWidget({ vault, spec: vaultSpec(settings), size: 'lg' });
  const ring = createCountdownRing({ seconds: phase.seconds, onDone: () => proceed() });
  stage.append(ring.el, widget.el);

  el.append(headline, stage, body);

  let done = false;

  function proceed(): void {
    if (done) return;
    done = true;
    ring.stop();
    if (!ctx.fsm.send({ type: 'proceed' })) return;
    void ctx.router.go('pass');
  }

  return {
    el,
    activate() {
      ring.start();
      void acquireWakeLock();
    },
    destroy() {
      done = true;
      ring.stop();
      void releaseWakeLock();
    },
  };
}
