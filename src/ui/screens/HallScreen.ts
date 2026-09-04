/**
 * Zollhalle (GDD §5, Screen 6) — **das Verhör ist das Spiel** (Design-Pfeiler 1).
 *
 * Das Handy liegt in der Mitte. Der Screen inszeniert nur: Hinweise laufen einmal ab,
 * hinterlassen ihr Icon, danach laeuft der Countdown und der Beamte fragt. Gelogen wird
 * am Tisch, nicht hier.
 *
 * Zwei Regeln, die dieser Screen einhalten muss:
 * - Er bekommt ausschliesslich `publicView` — Mengen und `truthful` existieren hier nicht.
 * - Nach der Hinweis-Animation sieht ein Koffer mit Hinweis aus wie einer ohne, bis auf
 *   das kleine Icon (Art Direction §7).
 *
 * M1 zeigt die Hinweise als DOM-Karten; die Animationen kommen mit der PIXI-Halle in M2/M3.
 */

import { HINTS } from '@/config/choreo';
import { HINT_REPLAY_LIMIT } from '@/config/rules';
import { t, tList } from '@/core/i18n';
import type { BribeAmount, PlayerId } from '@/core/types';
import { createBadge } from '../components/badge';
import { createOfficerButton, createButton } from '../components/button';
import { createBribeChip } from '../components/chips';
import { createCountdownRing } from '../components/countdownRing';
import { createSuitcaseCard } from '../components/suitcaseCard';
import { HUD } from '@/config/choreo';
import { vibrate } from '../haptics';
import type { ScreenContext, ScreenInstance } from '../router';

export function createHallScreen(ctx: ScreenContext): ScreenInstance {
  const officerId = ctx.view('HALL').officerId;
  const officerColor = ctx.session.colorOf(officerId);

  const el = document.createElement('main');
  el.className = 'screen screen--hall';

  /* --- Kopf: wer kontrolliert, wie lange noch --- */
  const header = document.createElement('header');
  header.className = 'hall__header';

  const status = document.createElement('p');
  status.className = 'hall__status';
  status.setAttribute('aria-live', 'polite');

  const countdown = createCountdownRing({
    seconds: ctx.session.settings().interrogationSec,
    colorId: officerColor,
    onTick: (remaining) => {
      if (remaining <= HUD.tickFromSec && remaining > 0) vibrate('tap');
    },
    onFinish: () => endInterrogation(),
  });

  header.append(
    createBadge({
      name: ctx.session.nameOf(officerId),
      colorId: officerColor,
      small: true,
      note: t('hall.officerNote'),
    }),
    status,
    countdown.el
  );

  /* --- Die Kofferreihe --- */
  const board = document.createElement('div');
  board.className = 'hall__board';

  /* --- Sprechblase mit Fragevorschlaegen --- */
  const speech = document.createElement('p');
  speech.className = 'hall__speech';
  speech.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'hall__actions';

  let replaysLeft = HINT_REPLAY_LIMIT;

  const replay = createButton({
    label: t('hall.replayHints'),
    variant: 'secondary',
    onClick: () => {
      if (replaysLeft <= 0) return;
      replaysLeft -= 1;
      replay.disabled = replaysLeft <= 0;
      void playHints();
    },
  });

  const end = createOfficerButton({
    label: t('hall.endInterrogation'),
    colorId: officerColor,
    onClick: () => endInterrogation(),
  });

  actions.append(replay, end);
  el.append(header, board, speech, actions);

  /* --- Rendern --- */

  /** Welche Hinweise schon "gelaufen" sind — davor zeigt der Koffer kein Icon. */
  let revealedHints = 0;

  function render(): void {
    const view = ctx.view('HALL');
    board.replaceChildren();

    /*
     * Die Hinweise werden nacheinander freigeschaltet. Bis ein Hinweis dran war, sieht
     * sein Koffer aus wie jeder andere — genau das ist der Punkt.
     */
    const shown = view.hints.slice(0, revealedHints);

    for (const suitcase of view.suitcases) {
      const wrapper = document.createElement('div');
      wrapper.className = 'hall__slot';

      wrapper.append(
        createSuitcaseCard({
          playerId: suitcase.playerId,
          name: ctx.session.nameOf(suitcase.playerId),
          colorId: ctx.session.colorOf(suitcase.playerId),
          hints: shown.filter((h) => h.suitcaseOf === suitcase.playerId).map((h) => h.type),
          sniffed: view.dogHint?.suitcaseOf === suitcase.playerId && revealedHints >= view.hints.length,
          locked: suitcase.locked,
        })
      );

      /* Bestechung: jeder Reisende darf bieten — auch die sauberen (GDD §3.7). */
      if (view.modes.bribery && !suitcase.locked) {
        const offer = view.bribes.find((b) => b.from === suitcase.playerId);
        wrapper.append(
          offer && offer.accepted === null
            ? bribeOffer(suitcase.playerId, offer.amount)
            : createBribeChip({
                colorId: ctx.session.colorOf(suitcase.playerId),
                disabled: offer !== undefined,
                onOffer: (amount) => {
                  ctx.fsm.bribe(suitcase.playerId, amount);
                  render();
                },
              })
        );
      }

      board.append(wrapper);
    }

    if (view.dogHint && revealedHints >= view.hints.length) {
      const dog = document.createElement('p');
      dog.className = 'hall__dog';
      dog.textContent = view.dogHint.barks ? t('hall.dogBark') : t('hall.dogQuiet');
      board.append(dog);
    }
  }

  /** Ein offenes Angebot: Der Beamte — und nur er — nimmt an oder lehnt ab. */
  function bribeOffer(from: PlayerId, amount: BribeAmount): HTMLElement {
    const box = document.createElement('div');
    box.className = 'hall__offer';

    const text = document.createElement('p');
    text.className = 'hall__offer-text';
    text.textContent = t('hall.bribeSpeech', { amount });

    const buttons = document.createElement('div');
    buttons.className = 'hall__offer-actions';
    buttons.append(
      createOfficerButton({
        label: t('hall.bribeAccept'),
        colorId: officerColor,
        className: 'btn--compact',
        onClick: () => {
          ctx.fsm.answerBribe(from, true);
          render();
        },
      }),
      createOfficerButton({
        label: t('hall.bribeDecline'),
        colorId: officerColor,
        variant: 'secondary',
        className: 'btn--compact',
        onClick: () => {
          ctx.fsm.answerBribe(from, false);
          render();
        },
      })
    );

    box.append(text, buttons);
    return box;
  }

  /* --- Ablauf: erst Hinweise, dann Verhoer --- */

  let timers: ReturnType<typeof setTimeout>[] = [];
  let questionTimer: ReturnType<typeof setInterval> | undefined;
  let ended = false;

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timers.push(globalThis.setTimeout(resolve, ms));
    });

  /**
   * Spielt die Hinweise nacheinander ab. In M1 heisst "abspielen": Icon erscheint.
   * Die 1.5-s-Animationen kommen in M3 — das Timing steht schon jetzt in `choreo.ts`,
   * damit der Rhythmus derselbe bleibt.
   */
  async function playHints(): Promise<void> {
    const total = ctx.view('HALL').hints.length;
    revealedHints = 0;
    render();
    status.textContent = t('hall.hintsRunning');

    for (let i = 0; i < total; i++) {
      await wait((HINTS.duration + HINTS.gap) * 1000);
      if (ended) return;
      revealedHints = i + 1;
      render();
      vibrate('tap');
    }

    status.textContent = t('hall.interrogation');
  }

  function rotateQuestions(): void {
    const questions = tList('questions');
    if (questions.length === 0) return;

    let index = Math.floor(Math.random() * questions.length);
    const show = (): void => {
      speech.textContent = questions[index % questions.length]!;
      index += 1;
    };
    show();
    questionTimer = globalThis.setInterval(show, HUD.questionRotateSec * 1000);
  }

  function endInterrogation(): void {
    if (ended) return;
    ended = true;
    countdown.stop();
    ctx.fsm.send({ type: 'endInterrogation' });
  }

  render();

  return {
    el,
    activate() {
      void playHints().then(() => {
        if (ended) return;
        countdown.start();
        rotateQuestions();
      });
    },
    destroy() {
      ended = true;
      countdown.stop();
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      if (questionTimer !== undefined) clearInterval(questionTimer);
    },
  };
}
