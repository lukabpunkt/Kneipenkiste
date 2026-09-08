/**
 * Der Schritt (GDD §5, Screen 6) — ab M2 die PIXI-Schlucht.
 *
 * Der Screen selbst kann fast nichts: Er hängt die Bühne ein, startet sie und gibt den
 * Skip-Knopf frei, sobald der letzte Balken gebrochen ist. Alles andere entscheidet das
 * `StepScript`, und das steht seit `resolveRound()` fest.
 *
 * Die Bühne wird **lazy** geladen (Architektur §1): PIXI und GSAP wiegen mehr als der
 * ganze Rest der App und werden nur hier gebraucht. Der Preload läuft während der
 * Absprache, sodass beim Tippen auf "Der Schritt" nichts mehr fehlt.
 */

import { play, playMusic } from '@/audio/AudioManager';
import { t } from '@/core/i18n';
import { vibrate } from '../haptics';
import { createButton } from '../components/button';
import type { MountedStage } from '@/game';
import type { ScreenContext, ScreenInstance } from '../router';

export function createStepScreen(ctx: ScreenContext): ScreenInstance {
  const script = ctx.stepScript();
  const reveal = ctx.reveal();

  const el = document.createElement('section');
  el.className = 'screen screen--step';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'step__stage';

  /* Bis die Atlanten da sind, steht hier die Schlucht als Farbfläche — kein Spinner. */
  const loading = document.createElement('p');
  loading.className = 'step__loading';
  loading.textContent = t('step.loading');

  const skip = createButton({
    label: t('step.skip'),
    variant: 'primary',
    className: 'step__skip',
    disabled: true,
    onClick: () => finish(),
  });

  el.append(canvasHost, loading, skip);

  let stage: MountedStage | undefined;
  let finished = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    ctx.fsm.send({ type: 'showFinished' });
  };

  /**
   * Die Bühne meldet ihre Beats — der Screen setzt keine eigenen Wecker.
   *
   * Im Blickkontakt läuft die Timeline auf halber Geschwindigkeit. Ein `setTimeout` auf
   * `script.skippableFrom` würde den Skip-Knopf dann freigeben, **bevor** es gekracht hat
   * (GDD §4.2) — und die Haptik würde ins Leere schlagen.
   */
  const onBeat = (beat: 'step' | 'break' | 'skippable'): void => {
    if (beat === 'step') vibrate('step');
    else if (beat === 'break') vibrate('snap');
    else skip.disabled = false;
  };

  return {
    el,

    activate() {
      /* Der Spannungs-Drone läuft, bis es kracht (GDD §6). */
      playMusic('music_step');

      void (async () => {
        try {
          const game = await import('@/game');
          if (finished) return;

          stage = await game.mountStage({
            host: canvasHost,
            script,
            reveal,
            colors: new Map(ctx.session.players().map((p) => [p.id, p.colorId])),
            slots: ctx.session.get().bridge.planks.length + ctx.session.get().bridge.removed.length,
            playerCount: ctx.session.players().length,
            lowEffects: ctx.session.settings().lowEffects || game.detectLowEffects(),
            seed: script.totalMs,
            onFinished: () => finish(),
            onBeat,
            /* Die Bühne kennt weder i18n noch Audio — sie bekommt beides gereicht. */
            t,
            play,
          });

          loading.remove();
          stage.play();
        } catch (error) {
          /*
           * Ohne Bühne ist die Runde nicht verloren: Das Ergebnis steht längst fest, also
           * geht es zum Result weiter. Ein schwarzer Screen wäre die schlechtere Antwort.
           */
          console.error('[step] Buehne konnte nicht starten', error);
          loading.textContent = t('step.stageFailed');
          skip.disabled = false;
        }
      })();
    },

    destroy() {
      stage?.destroy();
      stage = undefined;
    },
  };
}
