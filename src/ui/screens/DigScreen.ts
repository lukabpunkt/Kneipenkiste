/**
 * Dig (GDD §5, Screen 5) — die Grabphase.
 *
 * Ablauf eines Taps, und die Reihenfolge ist verbindlich (CLAUDE.md, Architektur §3):
 *
 * 1. Feld sperren. Taps waehrenddessen werden **ignoriert, nicht gepuffert**.
 * 2. `tileTap` an die FSM — dort faellt die Entscheidung, genau einmal.
 * 3. Das Feld auf den neuen `publicView` bringen.
 * 4. Das Ergebnis zeigen: Schluecke **und** Schuldiger im selben Banner
 *    (Design-Prioritaet 2 — der Schuldige wartet nie hinter dem Gag).
 * 5. `digShown` an die FSM: naechster Spieler, oder Rundenende.
 *
 * In M1 ist Schritt 4 ein Banner. In M2 haengt sich dort der `DigDirector` ein und
 * spielt die Anticipation und die Sequenz ab; alles andere bleibt, wie es ist.
 */

import { t } from '@/core/i18n';
import { seedActive } from '@/ui/devSeed';
import { createBannerHost, type KillLine } from '@/ui/components/drinkBanner';
import { createBoardGrid } from '@/ui/components/boardGrid';
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

  const grid = createBoardGrid({
    size: fsm.view().size,
    mode: 'dig',
    colorOf,
    nameOf,
    onTileTap: (cell) => void handleTap(cell),
  });

  const tokenStack = createTokenStack({ colorOf, nameOf });

  const footer = document.createElement('div');
  footer.className = 'dig__footer';

  const minesLeft = document.createElement('p');
  minesLeft.className = 'dig__mines-left';

  footer.append(minesLeft, tokenStack.el);

  el.append(turnBanner.el, bannerHost.el, grid.el, footer);

  if (seedActive()) {
    const note = document.createElement('p');
    note.className = 'dig__seed-note';
    note.textContent = 'Test-Seed aktiv';
    el.append(note);
  }

  let ring: TimerRing | null = null;
  /** Token-Konten, wie sie sich waehrend der Runde ansammeln (Anzeige, nicht Wahrheit). */
  const tokens: Record<PlayerId, number> = {};

  /* ---------------------------------------------------------------- */

  function renderTurn(): void {
    const player = fsm.currentPlayer();
    if (player) turnBanner.setPlayer(player.name, player.colorId);
  }

  function renderBoard(): void {
    const view = fsm.view();
    grid.renderPublic(view);
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
        if (grid.locked) return;
        showToast(t('dig.timeUp'), { variant: 'info' });
        // Auch der erzwungene Zug laeuft ueber die FSM und sicheren Zufall.
        void afterTap(() => fsm.digRandom());
      },
    });
    turnBanner.setTimer(ring.el);
    ring.start();
  }

  async function handleTap(cell: Cell): Promise<void> {
    await afterTap(() => fsm.send({ type: 'tileTap', cell }));
  }

  /**
   * Der gemeinsame Weg fuer den Tap und den abgelaufenen Timer: sperren, entscheiden
   * lassen, zeigen, weitergeben.
   */
  async function afterTap(dig: () => boolean): Promise<void> {
    if (grid.locked) return;
    grid.setLocked(true);
    ring?.stop();

    if (!dig()) {
      grid.setLocked(false);
      startTimer();
      return;
    }

    const result = fsm.context.lastDig;
    if (!result) {
      grid.setLocked(false);
      return;
    }

    renderBoard();
    await present(result);

    const roundOver = result.roundOver;
    fsm.send({ type: 'digShown' });

    if (roundOver) {
      void router.go(fsm.state === 'DISTRIBUTE' ? 'distribute' : 'result');
      return;
    }

    grid.setLocked(false);
    renderTurn();
    startTimer();
  }

  /**
   * Das Ergebnis zeigen. Ein Banner pro Grabung, und **Schluecke und Schuldiger stehen
   * darin zusammen** — nie nacheinander (Design-Prioritaet 2).
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
       * kein Frame Unterschied (ADR-2). Nur die kurze Pause, die jede Grabung hat.
       */
      case 'empty':
        await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
    }
  }

  return {
    el,

    activate() {
      void acquireWakeLock();
      renderTurn();
      renderBoard();
      startTimer();
    },

    destroy() {
      ring?.stop();
      bannerHost.clear();
      void releaseWakeLock();
    },
  };
};
