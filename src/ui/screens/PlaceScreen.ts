/**
 * Place (GDD §5, Screen 3) — die geheime Minenphase.
 *
 * Das Feld sieht fuer jeden gleich leer aus: Der Screen bekommt `placeViewFor(spieler)`
 * und damit **nur die eigenen** Sprengkoerper (ADR-2). Was die Vorgaenger gelegt haben,
 * existiert hier nicht einmal als Datenstruktur.
 *
 * "Vergraben" wird erst aktiv, wenn das Kontingent voll ist. Laeuft die optionale
 * Bedenkzeit ab, fuellt die FSM den Rest mit sicherem Zufall auf (GDD §3.3) — die
 * Entscheidung faellt in `core/`, nicht hier.
 */

import { loadoutFor } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { createStageHost, type StageHost } from '@/ui/components/stageHost';
import { createTimerRing, type TimerRing } from '@/ui/components/timerRing';
import { showToast } from '@/ui/components/toast';
import { play } from '@/audio/AudioManager';
import { vibrate } from '@/ui/haptics';
import { acquireWakeLock, releaseWakeLock } from '@/ui/wakeLock';
import type { ScreenFactory } from '@/ui/router';
import type { MineKind } from '@/core/board';

export const createPlaceScreen: ScreenFactory = ({ fsm, router }) => {
  const player = fsm.currentPlayer();
  const { modes } = fsm.context.settings;
  const loadout = loadoutFor(modes);
  const total = loadout.mine + loadout.dud;

  const el = document.createElement('section');
  el.className = 'screen screen--place';

  const header = document.createElement('header');
  header.className = 'place__header';

  const headline = document.createElement('h1');
  headline.className = 'place__headline';
  headline.textContent = modes.doubleAgent
    ? t('place.headlineDoubleAgent')
    : t('place.headline', { count: loadout.mine });

  const counter = document.createElement('p');
  counter.className = 'place__counter';

  header.append(headline, counter);

  /*
   * Doppelagent: zwei Werkzeug-Chips zum Umschalten. In Klassik gibt es nur Minen —
   * dann waere ein Umschalter eine Frage ohne zweite Antwort.
   */
  let tool: MineKind = 'mine';
  const tools = document.createElement('div');
  tools.className = 'place__tools';
  if (modes.doubleAgent) {
    tools.append(
      createToolChip('mine', t('place.toolMine'), '💣'),
      createToolChip('dud', t('place.toolDud'), '🧨')
    );
  }

  const stage: StageHost = createStageHost();

  const tooltip = document.createElement('p');
  tooltip.className = 'place__tooltip';
  tooltip.textContent = t('place.tooltip');

  const bury = createButton({
    label: t('place.bury'),
    variant: 'primary',
    className: 'btn--wide',
    onClick: () => confirmAndAdvance(),
  });

  const timerSlot = document.createElement('div');
  timerSlot.className = 'place__timer';

  el.append(header, tools, stage.el, tooltip, timerSlot, bury);

  let ring: TimerRing | null = null;
  let detachTap: (() => void) | undefined;

  /* ---------------------------------------------------------------- */

  function createToolChip(kind: MineKind, label: string, icon: string): HTMLButtonElement {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip chip--tool';
    chip.dataset['tool'] = kind;
    chip.setAttribute('role', 'radio');
    chip.innerHTML = `<span aria-hidden="true">${icon}</span>`;

    const text = document.createElement('span');
    text.textContent = label;
    chip.append(text);

    chip.addEventListener('click', () => {
      tool = kind;
      render();
    });
    return chip;
  }

  /**
   * Doppelagent: Sobald die Mine liegt, ist der Blindgaenger dran — und umgekehrt.
   *
   * Ohne das muesste man nach der ersten Platte selbst auf den anderen Chip tippen, und
   * der zweite Tap aufs Feld liefe ins Leere ("Kontingent voll"), ohne dass sichtbar
   * waere, warum. Das Umschalten ist keine Entscheidung, sondern Buchhaltung — die
   * nimmt der Screen ab (Design-Prioritaet 5, Zero Friction).
   */
  function switchToolIfExhausted(): void {
    if (!modes.doubleAgent || !player) return;
    const view = fsm.placeViewFor(player.id);
    if (tool === 'mine' && view.ownMines.length >= loadout.mine) tool = 'dud';
    else if (tool === 'dud' && view.ownDuds.length >= loadout.dud) tool = 'mine';
  }

  function render(): void {
    if (!player) return;
    const view = fsm.placeViewFor(player.id);
    const placed = view.ownMines.length + view.ownDuds.length;

    stage.board?.renderPlace(view);
    counter.textContent = t('place.counter', { placed, total });

    for (const chip of tools.querySelectorAll<HTMLElement>('.chip--tool')) {
      const active = chip.dataset['tool'] === tool;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-checked', String(active));
    }

    bury.disabled = !fsm.canBury();
  }

  /** "Vergraben": 400 ms Bestaetigung (die Platten stampfen sich fest), dann weiter. */
  function confirmAndAdvance(): void {
    if (!fsm.canBury()) return;
    ring?.stop();
    vibrate('bury');
    // Die Platten stampfen sich fest — ein Schlag, kein Klick.
    play('plate_stomp');

    const last = fsm.context.playerIndex === fsm.context.players.length - 1;
    globalThis.setTimeout(() => {
      if (!fsm.send({ type: 'bury' })) return;
      void router.go(last ? 'buried' : 'pass');
    }, 400);
  }

  return {
    el,

    activate() {
      void acquireWakeLock();

      void stage.mount(fsm, 'place').then((board) => {
        detachTap = board.onTileTap((cell) => {
          if (!fsm.togglePlacement(cell, tool)) {
            // Kontingent voll: Der Screen sagt es, die Logik bleibt unangetastet.
            vibrate('tap');
            play('ui_tap');
            return;
          }
          vibrate('bury');
          play('mine_place');
          switchToolIfExhausted();
          render();
        });
        render();
      });

      render();

      const seconds = fsm.context.settings.placeTimerSec;
      if (seconds > 0) {
        ring = createTimerRing({
          seconds,
          onDone: () => {
            // Die FSM fuellt auf — mit `crypto`, damit auch eine erzwungene
            // Platzierung nicht vorhersagbar ist.
            fsm.fillPlacements();
            render();
            showToast(t('place.timeUp'), { variant: 'info' });
            confirmAndAdvance();
          },
        });
        timerSlot.append(ring.el);
        ring.start();
      }
    },

    destroy() {
      ring?.stop();
      detachTap?.();
      stage.unmount();
      void releaseWakeLock();
    },
  };
};
