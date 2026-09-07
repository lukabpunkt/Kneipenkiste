/**
 * Die geheime Wahl (GDD §5, Screen 4) — das eine Handy in einer Hand.
 *
 * Der Screen zeigt die Brücke, die eigenen Sachen und sonst nichts: keine fremden
 * Wahlen, kein "drei haben schon versiegelt", kein morscher Balken. Wer als Letzter
 * wählt, hätte sonst ein anderes Spiel gespielt als alle vor ihm.
 *
 * Kein Zurück: Ist versiegelt, ist versiegelt (GDD §3.4).
 */

import { HUD } from '@/config/choreo';
import { GIVING_SAFE, GIVING_SAFE_DEATH_ZONE, type Weight } from '@/config/rules';
import { t } from '@/core/i18n';
import { vibrate } from '../haptics';
import { createButton } from '../components/button';
import { createBridgeTop, type PlankModel } from '../components/bridgeTop';
import { createWeightStepper } from '../components/weightStepper';
import { showToast } from '../components/toast';
import { pickRandomPlank } from '@/core/round';
import type { Choice } from '@/core/types';
import type { ScreenContext, ScreenInstance } from '../router';

export function createChooseScreen(ctx: ScreenContext): ScreenInstance {
  const playerId = ctx.fsm.currentPlayer();
  /* v8 ignore next */
  if (!playerId) throw new Error('Choose ohne Spieler.');

  const own = ctx.ownChoice(playerId);
  const el = document.createElement('section');
  el.className = 'screen screen--choose';

  const heading = document.createElement('h1');
  heading.className = 'choose__headline';
  heading.textContent = t('choose.headline');

  const hint = document.createElement('p');
  hint.className = 'choose__hint';
  hint.textContent = t('choose.tooltip');

  const bridgeBox = document.createElement('div');
  bridgeBox.className = 'choose__bridge';

  const extras = document.createElement('div');
  extras.className = 'choose__extras';

  const timerLabel = document.createElement('p');
  timerLabel.className = 'choose__timer';
  timerLabel.setAttribute('aria-live', 'polite');

  let weight: Weight = own.ownWeight ?? 1;
  let sealed = false;
  let countdown: ReturnType<typeof setInterval> | undefined;

  const stopTimer = (): void => {
    if (countdown !== undefined) clearInterval(countdown);
    countdown = undefined;
    timerLabel.textContent = '';
  };

  /** Die Wahl geht raus — genau einmal, danach ist der Screen tot. */
  const seal = (choice: Choice, auto = false): void => {
    if (sealed) return;
    sealed = true;
    stopTimer();

    if (ctx.fsm.context.modes.weights) ctx.fsm.chooseWeight(playerId, weight);

    el.dataset.sealed = 'true';
    vibrate('seal');

    if (auto && 'plank' in choice) {
      showToast(ctx.host, t('choose.autoPicked', { plank: choice.plank }));
    }

    /*
     * Kurz stehen lassen: Der Versiegel-Zustand ist die Quittung. Ohne sie wechselt der
     * Screen so schnell, dass man nicht weiß, ob der Tap angekommen ist.
     */
    globalThis.setTimeout(() => ctx.fsm.send({ type: 'seal', choice }), HUD.sealConfirmMs);
  };

  const renderBridge = (): void => {
    bridgeBox.replaceChildren();

    const planks: PlankModel[] = own.planks.map((plank): PlankModel => {
      const flagged = plank.flaggedBy.length > 0;
      return {
        id: plank.id,
        state: flagged ? 'flagged' : 'normal',
        markers: plank.flaggedBy.map((id) => ({
          playerId: id,
          colorId: ctx.session.colorOf(id),
          flag: true,
        })),
        onSelect: () => seal({ plank: plank.id }),
      };
    });

    bridgeBox.append(createBridgeTop({ planks, removed: own.bridge.removed, ariaLabel: t('choose.headline') }));
  };

  /* --- Modus-Zusätze --- */
  if (ctx.fsm.context.modes.weights) {
    const stepper = createWeightStepper({
      value: weight,
      givingPerWeight: own.deathZone ? GIVING_SAFE_DEATH_ZONE : GIVING_SAFE,
      onChange: (value) => {
        weight = value;
      },
    });
    extras.append(stepper.el);
  }

  if (ctx.fsm.context.modes.rope) {
    /*
     * Das Seil erscheint nur, solange es verfügbar ist. Ein ausgegrauter Knopf würde
     * jede Runde daran erinnern, dass man es schon verbraucht hat — das ist eine
     * Information, die niemand mehr braucht.
     */
    if (own.ropeAvailable) {
      extras.append(
        createButton({
          label: t('choose.rope'),
          variant: 'secondary',
          className: 'choose__rope',
          onClick: () => seal({ rope: true }),
        })
      );
    } else {
      const spent = document.createElement('p');
      spent.className = 'choose__rope-spent';
      spent.textContent = t('choose.ropeSpent');
      extras.append(spent);
    }
  }

  renderBridge();
  el.append(heading, hint, bridgeBox, extras, timerLabel);

  return {
    el,
    activate() {
      const seconds = ctx.session.settings().thinkTimerSec;
      if (seconds === 0) return;

      let remaining = seconds;
      timerLabel.textContent = t('choose.thinkTimer', { seconds: remaining });

      countdown = globalThis.setInterval(() => {
        remaining -= 1;
        timerLabel.textContent = t('choose.thinkTimer', { seconds: Math.max(0, remaining) });
        if (remaining > 0) return;

        stopTimer();
        /*
         * Zeit um: Das Spiel wählt. Über `crypto`, nicht über die Sitzordnung — diese
         * Wahl entscheidet die Runde genauso wie eine getippte (CLAUDE.md).
         */
        seal(pickRandomPlank(own.bridge.planks), true);
      }, 1000);
    },
    destroy: stopTimer,
  };
}
