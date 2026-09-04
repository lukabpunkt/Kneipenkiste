/**
 * Geheime Wahl (GDD §3.4, §5 Screen 4).
 *
 * Zwei Karten, ein Tap, kein Zurueck. Nach dem Versiegeln ist die Wahl nirgends mehr
 * sichtbar — auch nicht in der Ueberschrift, auch nicht im DOM des Folge-Screens
 * (Audit A1, MUSS).
 *
 * Der optionale Bedenkzeit-Timer (5 s) waehlt bei Ablauf TEILEN. Nicht aus Freundlichkeit:
 * Wer 30 s gruebelt, verraet sich, und die Gruppe zieht daraus Schluesse (GDD §3.4).
 */

import { t } from '@/core/i18n';
import { forcedChoice, isMole } from '@/core/modes';
import type { Choice } from '@/core/types';
import { createChoiceCards } from '@/ui/components/choiceCard';
import { showHint } from '@/ui/components/onboarding';
import { showToast } from '@/ui/components/toast';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

export function createChoiceScreen(ctx: ScreenContext): ScreenInstance {
  const { players, playerIndex, settings } = ctx.fsm.context;
  const setup = ctx.fsm.context.setup;
  const player = players[playerIndex];
  const mole = player !== undefined && setup !== null && isMole(player.id, setup);

  const el = document.createElement('section');
  el.className = 'screen screen--choice';
  if (mole) el.classList.add('screen--choice-mole');

  const headline = document.createElement('h1');
  headline.className = 'choice__headline';
  headline.textContent = mole ? t('choice.moleHeadline') : t('choice.headline');

  const sub = document.createElement('p');
  sub.className = 'choice__sub';
  sub.textContent = mole ? t('choice.moleSub') : t('choice.sub');

  const who = document.createElement('p');
  who.className = 'choice__who';
  who.textContent = player?.name ?? '';

  const cards = createChoiceCards({
    colorId: player?.colorId ?? 'red',
    // Der Maulwurf sieht TEILEN in Ketten — er soll wissen, was er nicht darf.
    ...(mole ? { lockedChoice: 'share' as const } : {}),
    onChoose: (choice) => void choose(choice, false),
  });

  const timerBar = document.createElement('p');
  timerBar.className = 'choice__timer';

  el.append(who, headline, sub, cards.el, timerBar);

  /* ---------------------------------------------------------------- */

  let settled = false;
  let raf = 0;
  let deadline = 0;

  async function choose(choice: Choice, auto: boolean): Promise<void> {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(raf);
    cards.lock();

    const effective =
      player !== undefined && setup !== null ? (forcedChoice(player.id, setup) ?? choice) : choice;

    vibrate('seal');
    if (auto) showToast(t('choice.autoShared'));

    await cards.seal(effective);

    if (!ctx.fsm.send({ type: 'choose', choice: effective })) return;
    void ctx.router.go(ctx.fsm.state === 'SEALED' ? 'sealed' : 'pass');
  }

  /** Bedenkzeit: laeuft sie ab, wird TEILEN gewaehlt (GDD §3.4). */
  function startThinkTimer(): void {
    if (settings.thinkTimerSec === 0) {
      timerBar.hidden = true;
      return;
    }
    deadline = performance.now() + settings.thinkTimerSec * 1000;

    const tick = (now: number): void => {
      if (settled) return;
      const left = Math.max(0, deadline - now);
      timerBar.textContent = t('choice.thinkTimer', { count: Math.ceil(left / 1000) });
      timerBar.classList.toggle('is-urgent', left <= 2000);
      if (left <= 0) {
        void choose('share', true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  return {
    el,
    activate() {
      startThinkTimer();
      /*
       * Einmal pro Geraet: Nein, der Naechste sieht deine Wahl nicht (Roadmap M5.5).
       * Die Frage stellt sich beim ersten Rumgeben jeder — und wer sie nicht beantwortet
       * bekommt, tippt vorsichtiger, als das Spiel es verdient.
       */
      showHint(el, 'choice');
    },
    destroy() {
      settled = true;
      cancelAnimationFrame(raf);
      // Die Wahl darf den Screen nicht ueberleben: Der DOM-Knoten wird ohnehin
      // ersetzt, aber der Timer haette sonst noch einen `choose()` im Ruecken.
    },
  };
}
