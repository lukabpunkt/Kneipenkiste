/**
 * Dig (GDD §5, Screen 5) — die Grabphase.
 *
 * Ablauf eines Taps, und die Reihenfolge ist verbindlich (CLAUDE.md, Architektur §3):
 *
 * 1. `tileTap` an die FSM — dort faellt die Entscheidung, genau einmal.
 * 2. `DigDirector.play()` inszeniert das fertige Ergebnis: Kamera, Anticipation,
 *    Aufdecken, Farbring, Banner. Das Feld ist waehrenddessen gesperrt; Taps werden
 *    **ignoriert, nicht gepuffert**.
 * 3. `digShown` an die FSM: naechster Spieler, oder Rundenende.
 *
 * Der Screen inszeniert selbst nichts. Er haelt Banner, Timer und Token-Anzeige — was
 * auf dem Feld passiert, gehoert dem Director.
 */

import { t } from '@/core/i18n';
import { createDevPanel, devMode, type DevPanel } from '@/ui/components/devPanel';
import { seedActive } from '@/ui/devSeed';
import { createBannerHost, type KillLine } from '@/ui/components/drinkBanner';
import { tickTurn } from '@/audio/AudioManager';
import { createStageHost } from '@/ui/components/stageHost';
import { createTimerRing, type TimerRing } from '@/ui/components/timerRing';
import { createTokenStack } from '@/ui/components/tokenStack';
import { createTurnBanner } from '@/ui/components/turnBanner';
import { showToast } from '@/ui/components/toast';
import { digPayout } from '@/core/payout';
import { acquireWakeLock, releaseWakeLock } from '@/ui/wakeLock';
import type { ScreenFactory } from '@/ui/router';
import type { Cell, DigResult, PlayerId } from '@/core/types';

export const createDigScreen: ScreenFactory = ({ fsm, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--dig';

  const playerById = (id: PlayerId) => fsm.context.players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => playerById(id)?.name;
  const colorOf = (id: PlayerId) => playerById(id)?.colorId;

  const turnBanner = createTurnBanner();
  const bannerHost = createBannerHost();

  /*
   * Der Director ruft `showBanner` im Moment des Aufdeckens auf — Schluecke und
   * Schuldiger erscheinen also **mit** der Explosion, nicht danach (Design-Prioritaet 2).
   */
  const stage = createStageHost({ showBanner: (result) => void present(result) });

  const tokenStack = createTokenStack({ colorOf, nameOf });

  const footer = document.createElement('div');
  footer.className = 'dig__footer';

  const minesLeft = document.createElement('p');
  minesLeft.className = 'dig__mines-left';

  footer.append(minesLeft, tokenStack.el);
  el.append(turnBanner.el, bannerHost.el, stage.el, footer);

  if (seedActive()) {
    const note = document.createElement('p');
    note.className = 'dig__seed-note';
    note.textContent = 'Test-Seed aktiv';
    el.append(note);
  }

  let ring: TimerRing | null = null;
  let detachTap: (() => void) | undefined;
  let dev: DevPanel | undefined;
  let busy = false;
  /** Token-Konten, wie sie sich waehrend der Runde ansammeln (Anzeige, nicht Wahrheit). */
  const tokens: Record<PlayerId, number> = {};

  /* ---------------------------------------------------------------- */

  /**
   * Ein Tick pro Zug (GDD §6). Er macht aus einer Reihe von Grabungen einen Takt — man
   * hoert, dass die Runde laeuft, ohne dass jemand mitzaehlen muss.
   */
  function renderTurn(): void {
    const player = fsm.currentPlayer();
    if (!player) return;
    turnBanner.setPlayer(player.name, player.colorId);
    tickTurn();
  }

  function renderBoard(): void {
    const view = fsm.view();
    stage.board?.renderPublic(view);
    minesLeft.textContent = t('dig.minesRemaining', { count: view.minesRemaining });
    tokenStack.render(tokens);
  }

  function startTimer(): void {
    ring?.stop();
    turnBanner.setTimer(null);

    const seconds = fsm.context.settings.digTimerSec;
    if (seconds === 0) return;

    ring = createTimerRing({
      seconds,
      onDone: () => {
        if (busy) return;
        showToast(t('dig.timeUp'), { variant: 'info' });
        // Auch der erzwungene Zug laeuft ueber die FSM und sicheren Zufall.
        void run(() => fsm.digRandom());
      },
    });
    turnBanner.setTimer(ring.el);
    ring.start();
  }

  /**
   * Der gemeinsame Weg fuer den Tap und den abgelaufenen Timer: entscheiden lassen,
   * inszenieren, weitergeben.
   */
  async function run(dig: () => boolean): Promise<void> {
    const board = stage.board;
    if (busy || !board) return;
    busy = true;
    ring?.stop();

    if (!dig()) {
      busy = false;
      startTimer();
      return;
    }

    const result = fsm.context.lastDig;
    if (!result) {
      busy = false;
      return;
    }

    // Der Director sperrt das Feld selbst und gibt es danach wieder frei.
    await board.play(result, fsm.view());

    minesLeft.textContent = t('dig.minesRemaining', { count: fsm.view().minesRemaining });

    const roundOver = result.roundOver;
    fsm.send({ type: 'digShown' });
    busy = false;

    if (roundOver) {
      void router.go(fsm.state === 'DISTRIBUTE' ? 'distribute' : 'result');
      return;
    }

    renderTurn();
    startTimer();
  }

  /**
   * Das Banner zu einer Grabung. Ein Banner pro Ergebnis, und **Schluecke und
   * Schuldiger stehen darin zusammen** — nie nacheinander (Design-Prioritaet 2).
   */
  async function present(result: DigResult): Promise<void> {
    const digger = playerById(result.by);
    if (!digger) return;

    const payout = digPayout(result, fsm.view().size, fsm.context.settings.modes);
    for (const [playerId, amount] of Object.entries(payout.tokens)) {
      tokens[playerId] = (tokens[playerId] ?? 0) + amount;
    }
    tokenStack.render(tokens);

    const kills: KillLine[] = payout.kills.flatMap((kill) => {
      const layer = playerById(kill.layer);
      const victim = playerById(kill.victim);
      if (!layer || !victim) return [];
      return [
        {
          layerName: layer.name,
          layerColor: layer.colorId,
          victimName: victim.name,
          victimColor: victim.colorId,
        },
      ];
    });

    if (result.chainReveals.length > 0) showToast(t('dig.chainReaction'), { variant: 'info' });

    switch (result.kind) {
      case 'crater':
        await bannerHost.show({
          drinker: { name: digger.name, sips: payout.sips },
          kills,
          variant: 'boom',
        });
        return;

      case 'greed':
        await bannerHost.show({
          headline: t('dig.greed'),
          drinker: { name: digger.name, sips: payout.sips },
          kills,
          variant: 'boom',
        });
        return;

      case 'treasure':
        await bannerHost.show({
          headline: t('dig.chest', { name: digger.name.toUpperCase() }),
          kills: [],
          variant: 'treasure',
        });
        return;

      case 'dud': {
        const layers: KillLine[] = result.dudOwners.flatMap((id) => {
          const layer = playerById(id);
          if (!layer) return [];
          // Der Blindgaenger nennt seinen Leger, kostet aber nichts — genau das ist
          // der Bluff des Doppelagent-Modus (GDD §3.6).
          return [
            {
              layerName: layer.name,
              layerColor: layer.colorId,
              victimName: digger.name,
              victimColor: digger.colorId,
            },
          ];
        });
        await bannerHost.show({ headline: t('dig.dud'), kills: layers, variant: 'dud' });
        return;
      }

      /*
       * `empty` — und damit auch der stumme eigene Trittstein. Kein Banner, kein Ton,
       * kein Frame Unterschied (ADR-2).
       */
      case 'empty':
        return;
    }
  }

  return {
    el,

    activate() {
      void acquireWakeLock();
      renderTurn();

      if (devMode()) {
        dev = createDevPanel(fsm, () => stage.board);
        el.append(dev.el);
        dev.start();
      }

      void stage.mount(fsm, 'dig').then((board) => {
        detachTap = board.onTileTap((cell: Cell) => void run(() => fsm.send({ type: 'tileTap', cell })));
        renderBoard();
        startTimer();
      });
    },

    destroy() {
      ring?.stop();
      detachTap?.();
      dev?.stop();
      bannerHost.clear();
      stage.unmount();
      void releaseWakeLock();
    },
  };
};
