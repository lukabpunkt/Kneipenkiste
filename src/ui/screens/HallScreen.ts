/**
 * Zollhalle (GDD §5, Screen 6) — **das Verhör ist das Spiel** (Design-Pfeiler 1).
 *
 * Das Handy liegt in der Mitte. Die Bühne inszeniert, gelogen wird am Tisch.
 *
 * Seit M2 rendert die Halle in PIXI; darüber liegt ein DOM-HUD mit Countdown,
 * Sprechblase und den Knöpfen des Beamten. Das HUD ist durchlässig, nur seine
 * Bedienelemente fangen Zeiger ab — sonst läge eine Glasscheibe über den Koffern.
 *
 * Zwei Regeln, die dieser Screen einhalten muss:
 * - Er bekommt ausschließlich `publicView` — Mengen und `truthful` existieren hier nicht.
 * - Ein Koffer mit Hinweis sieht nach der Animation aus wie einer ohne, bis auf das
 *   kleine Icon (Art Direction §7). Deshalb setzt der Screen das Icon **erst**, wenn der
 *   Director den Hinweis abgespielt hat — und die Icon-Leiste behält ihre Höhe.
 */

import { HUD } from '@/config/choreo';
import { HINT_REPLAY_LIMIT } from '@/config/rules';
import { t, tList } from '@/core/i18n';
import type { BribeAmount, PlayerId } from '@/core/types';
import type { PublicHint } from '@/core/publicView';
import { createBadge } from '../components/badge';
import { createButton, createOfficerButton } from '../components/button';
import { createBribeChip } from '../components/chips';
import { createCountdownRing } from '../components/countdownRing';
import { hintIcon } from '../components/suitcaseCard';
import { vibrate } from '../haptics';
import { createStageHost } from '../stageHost';
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

  /* --- Die Bühne --- */
  const stageHost = createStageHost(ctx, ctx.view('HALL'));

  /** Hinweis-Icons und Bestechungs-Chips, ausgerichtet an den Koffern. */
  const markers = document.createElement('div');
  markers.className = 'hall__markers';
  stageHost.hud.append(markers);

  /* --- Sprechblase mit Fragevorschlägen --- */
  const speech = document.createElement('p');
  speech.className = 'hall__speech';
  speech.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'hall__actions';

  let replaysLeft = HINT_REPLAY_LIMIT;

  const replay = createButton({
    label: t('hall.replayHints'),
    variant: 'secondary',
    disabled: true,
    onClick: () => {
      if (replaysLeft <= 0) return;
      replaysLeft -= 1;
      replay.disabled = true;
      void playHints();
    },
  });

  const end = createOfficerButton({
    label: t('hall.endInterrogation'),
    colorId: officerColor,
    onClick: () => endInterrogation(),
  });

  actions.append(replay, end);
  el.append(header, stageHost.el, speech, actions);

  /* ------------------------------------------------------------------ */
  /* Marker über den Koffern                                             */
  /* ------------------------------------------------------------------ */

  /** Welche Hinweise schon gelaufen sind — davor zeigt der Koffer kein Icon. */
  const shownHints: PublicHint[] = [];

  /**
   * Setzt Icons und Bestechungs-Chips an die Bildschirmposition ihres Koffers.
   *
   * Sie liegen im DOM, nicht auf der Bühne: Ein Icon aus Text und Vektor bleibt bei jeder
   * Auflösung scharf, und ein Chip muss antippbar sein, ohne den Hit-Test der Koffer zu
   * stören. Die Position kommt aus `worldToScreen` und wird bei jedem Resize neu geholt.
   */
  function renderMarkers(): void {
    const stage = stageHostStage;
    if (!stage) return;

    const view = ctx.view('HALL');
    markers.replaceChildren();
    const point = { x: 0, y: 0 };

    for (const suitcase of view.suitcases) {
      const node = stage.view.suitcaseOf(suitcase.playerId);
      if (!node) continue;

      /*
       * Über den Koffer, nicht auf ihn: Auf Höhe des Standpunkts läge das Icon genau auf
       * dem Gepäckanhänger und verdeckte den Namen.
       */
      stage.app.worldToScreen(node.view.x, node.view.y - node.bounds.height - 6, point);

      const marker = document.createElement('div');
      marker.className = 'hall__marker';
      marker.style.left = `${point.x}px`;
      marker.style.top = `${point.y}px`;
      marker.dataset.player = suitcase.playerId;

      /*
       * Die Icon-Zeile behält ihre Höhe, auch wenn sie leer ist. Sonst rutschten die
       * Chips der Koffer ohne Hinweis nach oben — und das wäre selbst ein Hinweis.
       */
      const icons = document.createElement('div');
      icons.className = 'hall__icons';
      for (const hint of shownHints.filter((h) => h.suitcaseOf === suitcase.playerId)) {
        icons.append(hintIcon(hint.type));
      }
      if (view.dogHint?.suitcaseOf === suitcase.playerId && hintsDone) {
        const dog = hintIcon('dog');
        dog.dataset.reliable = 'true';
        icons.append(dog);
      }
      marker.append(icons);

      if (view.modes.bribery && !suitcase.locked) {
        const offer = view.bribes.find((b) => b.from === suitcase.playerId);
        marker.append(
          offer && offer.accepted === null
            ? bribeOffer(suitcase.playerId, offer.amount)
            : createBribeChip({
                colorId: ctx.session.colorOf(suitcase.playerId),
                disabled: offer !== undefined,
                onOffer: (amount) => {
                  ctx.fsm.bribe(suitcase.playerId, amount);
                  refresh();
                },
              })
        );
      }

      markers.append(marker);
    }

    if (view.dogHint && hintsDone) {
      const dog = document.createElement('p');
      dog.className = 'hall__dog';
      dog.textContent = view.dogHint.barks ? t('hall.dogBark') : t('hall.dogQuiet');
      markers.append(dog);
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
          refresh();
        },
      }),
      createOfficerButton({
        label: t('hall.bribeDecline'),
        colorId: officerColor,
        variant: 'secondary',
        className: 'btn--compact',
        onClick: () => {
          ctx.fsm.answerBribe(from, false);
          refresh();
        },
      })
    );

    box.append(text, buttons);
    return box;
  }

  function refresh(): void {
    stageHostStage?.view.applyView(ctx.view('HALL'));
    renderMarkers();
  }

  /* ------------------------------------------------------------------ */
  /* Ablauf: erst die Hinweise, dann das Verhör                          */
  /* ------------------------------------------------------------------ */

  let stageHostStage: Awaited<ReturnType<typeof stageHost.ready>> | undefined;
  let questionTimer: ReturnType<typeof setInterval> | undefined;
  /* Im Closure, nicht auf Modulebene: Sonst teilten sich zwei Runden denselben Observer. */
  let resizeObserver: ResizeObserver | undefined;
  let ended = false;
  let hintsDone = false;

  async function playHints(): Promise<void> {
    const stage = stageHostStage;
    if (!stage) return;

    shownHints.length = 0;
    hintsDone = false;
    renderMarkers();
    status.textContent = t('hall.hintsRunning');

    const view = ctx.view('HALL');
    stage.view.setMode('hints');

    await stage.hints.rollIn(view);
    if (ended) return;

    await stage.hints.play(view.hints, (hint) => {
      shownHints.push(hint);
      renderMarkers();
      vibrate('tap');
    });
    if (ended) return;

    if (view.dogHint) {
      await stage.hints.dogHint(view.dogHint.suitcaseOf, view.dogHint.barks);
      if (ended) return;
    }

    hintsDone = true;
    renderMarkers();

    stage.view.setMode('interrogation');
    status.textContent = t('hall.interrogation');
    replay.disabled = replaysLeft <= 0;

    countdown.start();
    rotateQuestions();
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

  return {
    el,

    activate() {
      void stageHost
        .ready()
        .then((stage) => {
          if (ended) return;
          stageHostStage = stage;
          stage.view.applyView(ctx.view('HALL'));
          /* Marker beim Resize nachziehen — sie hängen an Weltkoordinaten. */
          resizeObserver = new ResizeObserver(() => renderMarkers());
          resizeObserver.observe(stageHost.el);
          return playHints();
        })
        .catch((error: unknown) => {
          console.warn('[hall] Bühne konnte nicht starten', error);
          status.textContent = t('hall.stageFailed');
        });
    },

    destroy() {
      ended = true;
      countdown.stop();
      resizeObserver?.disconnect();
      if (questionTimer !== undefined) clearInterval(questionTimer);
      stageHostStage?.hints.stop();
      stageHost.release();
    },
  };
}
