/**
 * Kronzeuge (Backlog nach 1.0).
 *
 * Ab zwei Dieben liegt das Handy nach der Aufdeckung offen in der Mitte: Einer der
 * Diebe darf auspacken und halbiert damit seinen Anteil — was er spart, trinkt der
 * Verpfiffene zusätzlich (ADR-33).
 *
 * Der Screen ist bewusst **öffentlich**: keine Privatsphäre, kein Rumgeben, kein
 * Timer. Wer auspackt, greift vor allen zum Handy, und genau das ist der Moment. Zwei
 * Taps, beide sichtbar — erst wer, dann wen.
 *
 * "Keiner packt aus" steht gleichberechtigt daneben. Ein Screen, der nur einen Ausgang
 * zulässt, ist keine Entscheidung, und die Runde muss auch schweigend enden können.
 */

import { t } from '@/core/i18n';
import { applyCrownWitness } from '@/core/payout';
import type { PlayerId } from '@/core/types';
import { createPlayerBadge } from '@/ui/components/badge';
import { createButton, setButtonLabel } from '@/ui/components/button';
import { safeAnimate } from '@/ui/animate';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

export function createWitnessScreen(ctx: ScreenContext): ScreenInstance {
  const result = ctx.fsm.context.result;

  const el = document.createElement('section');
  el.className = 'screen screen--witness';

  if (!result || result.thieves.length < 2) return { el };

  const headline = document.createElement('h1');
  headline.className = 'witness__headline';
  headline.textContent = t('witness.headline');

  const sub = document.createElement('p');
  sub.className = 'witness__sub';
  sub.setAttribute('aria-live', 'polite');
  sub.textContent = t('witness.pickSelf');

  const row = document.createElement('div');
  row.className = 'witness__row';

  const skip = createButton({
    label: t('witness.skip'),
    variant: 'ghost',
    className: 'btn--block',
    onClick: () => finish(),
  });

  el.append(headline, sub, row, skip);

  /* ---------------------------------------------------------------- */

  /** Erst der Verpfeifer, dann der Verpfiffene — zwei Runden über dieselbe Reihe. */
  let witnessId: PlayerId | undefined;
  let settled = false;

  const buttons = new Map<PlayerId, HTMLButtonElement>();

  function render(): void {
    row.replaceChildren();
    buttons.clear();

    for (const id of result!.thieves) {
      const player = ctx.session.playerById(id);
      if (!player) continue;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'witness__thief';

      const badge = createPlayerBadge({ colorId: player.colorId, name: player.name, size: 'md' });
      button.append(badge);

      /*
       * Zwei Sperren, beide aus der Regel (ADR-33):
       *
       * 1. Wer den Eid gebrochen hat, kann nicht auspacken — sein ganzer Schluck ist die
       *    Meineid-Strafe, er hat keinen Beuteanteil zu halbieren. Verpfiffen werden kann
       *    er sehr wohl.
       * 2. Niemand verpfeift sich selbst.
       *
       * Gesperrte bleiben stehen statt zu verschwinden: Man soll sehen, wer schon
       * ausgepackt hat und wer gar nicht darf.
       */
      const isWitness = id === witnessId;
      const perjurer = result!.perjurers.includes(id);
      button.classList.toggle('is-witness', isWitness);
      button.classList.toggle('is-blocked', witnessId === undefined && perjurer);
      button.disabled = witnessId === undefined ? perjurer : isWitness;
      button.setAttribute(
        'aria-label',
        witnessId === undefined
          ? `${player.name}: ${perjurer ? t('witness.perjurerBlocked') : t('witness.pickSelf')}`
          : `${player.name}: ${t('witness.pickOther')}`
      );

      button.addEventListener('click', () => choose(id));
      buttons.set(id, button);
      row.append(button);
    }
  }

  function choose(id: PlayerId): void {
    if (settled) return;

    if (witnessId === undefined) {
      witnessId = id;
      vibrate('seal');
      sub.textContent = t('witness.pickOther');
      /*
       * Der Rückzug bleibt möglich, solange niemand genannt ist — aber er heißt jetzt
       * anders: "Keiner packt aus" stimmt nicht mehr, wenn schon jemand die Hand gehoben
       * hat. Ab hier ist es ein Zurücknehmen, und das soll auf dem Knopf stehen.
       */
      setButtonLabel(skip, t('witness.backOut'));
      render();
      const marked = buttons.get(id);
      if (marked) {
        void safeAnimate(
          marked,
          [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.5 }, { transform: 'scale(1)' }],
          { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        );
      }
      return;
    }

    // Zweiter Tap: Der Deal steht.
    settled = true;
    vibrate('alarm');
    finish({ witnessId, accusedId: id });
  }

  /**
   * Weiter zum Ergebnis — mit Deal oder ohne.
   *
   * Ohne Deal bleibt das Ergebnis exakt das der Aufdeckung: Schweigen ist der Normalfall
   * und darf nichts kosten.
   */
  function finish(deal?: { witnessId: PlayerId; accusedId: PlayerId }): void {
    settled = true;
    const next = deal ? applyCrownWitness(result!, deal) : result!;
    if (!ctx.fsm.send({ type: 'payout', result: next })) return;
    void ctx.router.go('result');
  }

  render();

  return {
    el,
    activate() {
      skip.focus({ preventScroll: true });
    },
  };
}
