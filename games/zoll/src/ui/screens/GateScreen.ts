/**
 * Schranke (GDD §5, Screen 8) — der zweite Spannungsbogen (ADR-4).
 *
 * Die nicht geöffneten Koffer passieren nacheinander: saubere zuerst, Schmuggler zuletzt.
 * Erst hier werden ihre Mengen öffentlich — und damit weiß der Tisch am Ende, wer wie
 * dreist gelogen hat.
 *
 * Vor jedem Schmuggler-Koffer steht ein Stall von 600 ms mit gelber Ampel. Das ist die
 * halbe Sekunde, in der alle noch glauben, es sei nichts.
 */

import { BANNER_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import type { GateResult } from '@/core/types';
import { vibrate } from '../haptics';
import { createStageHost } from '../stageHost';
import { itemSetName } from './InspectScreen';
import type { ScreenContext, ScreenInstance } from '../router';

export function createGateScreen(ctx: ScreenContext): ScreenInstance {
  const view = ctx.view('GATE');
  const itemSet = view.itemSet;
  const gate = ctx.fsm.context.gate;

  const el = document.createElement('main');
  el.className = 'screen screen--gate';

  const stageHost = createStageHost(ctx, view);

  /* Split-Flap-Tafel: wer als Nächstes durchgeht. */
  const board = document.createElement('p');
  board.className = 'gate__next';
  board.setAttribute('aria-live', 'polite');

  const banner = document.createElement('p');
  banner.className = 'gate__banner';
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;

  stageHost.hud.append(board, banner);
  el.append(stageHost.el);

  let stage: Awaited<ReturnType<typeof stageHost.ready>> | undefined;
  let cancelled = false;
  let timers: ReturnType<typeof setTimeout>[] = [];
  /** Wird gesetzt, wenn jemand den laufenden Durchgang wegtippt. */
  let skipCurrent: (() => void) | undefined;

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timers.push(globalThis.setTimeout(resolve, ms));
    });

  function bannerText(entry: GateResult): string {
    const name = ctx.session.nameOf(entry.suitcaseOf);
    return entry.kind === 'smuggler'
      ? `${itemSetName(itemSet, entry.amount)} · ${t('gate.bannerThrough', { name, tokens: entry.amount })}`
      : t('gate.bannerOk', { name });
  }

  async function run(): Promise<void> {
    if (!stage) return;

    for (const [index, entry] of gate.entries()) {
      if (cancelled) return;

      board.textContent = t('gate.next', { name: ctx.session.nameOf(entry.suitcaseOf) });
      banner.hidden = true;

      const timeline = stage.gate.play(entry, itemSet, () => {
        banner.hidden = false;
        banner.textContent = bannerText(entry);
        banner.dataset.kind = entry.kind;
        vibrate('stamp');
      });

      /*
       * Überspringen ist ab dem **zweiten** Koffer erlaubt und nie beim letzten
       * (Architektur §6). Der erste braucht seinen Auftritt, damit alle verstehen, was
       * hier passiert — und der letzte ist der, auf den die ganze Runde hinausläuft
       * (ADR-4: Schmuggler zuletzt).
       */
      const skippable = index > 0 && index < gate.length - 1;
      el.dataset.skippable = String(skippable);
      skipCurrent = skippable ? () => timeline.progress(1) : undefined;

      await timeline;

      skipCurrent = undefined;
      if (cancelled) return;
      await wait(BANNER_MS * 0.35);
    }

    if (!cancelled) ctx.fsm.send({ type: 'allPassed' });
  }

  /* Ein Tap auf die Bühne springt ans Ende des laufenden Durchgangs. */
  stageHost.el.addEventListener('pointerdown', () => skipCurrent?.());

  return {
    el,

    activate() {
      /* Keine Koffer übrig (alle geöffnet): direkt zur Abrechnung. */
      if (gate.length === 0) {
        ctx.fsm.send({ type: 'allPassed' });
        return;
      }

      void stageHost
        .ready()
        .then((ready) => {
          if (cancelled) return;
          stage = ready;
          ready.view.setMode('gate');
          return run();
        })
        .catch((error: unknown) => {
          console.warn('[gate] Bühne konnte nicht starten', error);
          /* Ohne Bühne wäre die Runde blockiert — die Abrechnung muss trotzdem laufen. */
          ctx.fsm.send({ type: 'allPassed' });
        });
    },

    destroy() {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      stage?.gate.stop();
      stageHost.release();
    },
  };
}
