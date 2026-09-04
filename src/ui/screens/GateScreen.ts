/**
 * Schranke (GDD §5, Screen 8) — der zweite Spannungsbogen (ADR-4).
 *
 * Die nicht geoeffneten Koffer passieren nacheinander: saubere zuerst, Schmuggler
 * zuletzt. Erst hier werden ihre Mengen oeffentlich — und damit weiss der Tisch am Ende,
 * wer wie dreist gelogen hat.
 */

import { GATE } from '@/config/choreo';
import { BANNER_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import type { GateResult } from '@/core/types';
import { createSuitcaseCard } from '../components/suitcaseCard';
import { vibrate } from '../haptics';
import { itemSetName } from './InspectScreen';
import type { ScreenContext, ScreenInstance } from '../router';

export function createGateScreen(ctx: ScreenContext): ScreenInstance {
  const itemSet = ctx.view('GATE').itemSet;
  const gate = ctx.fsm.context.gate;

  const el = document.createElement('main');
  el.className = 'screen screen--gate';

  const headline = document.createElement('h1');
  headline.className = 'gate__headline';
  headline.textContent = t('gate.headline');

  /* Split-Flap-Tafel: wer als Naechstes durchgeht. */
  const board = document.createElement('p');
  board.className = 'gate__next';
  board.setAttribute('aria-live', 'polite');

  const lane = document.createElement('div');
  lane.className = 'gate__lane';

  const banner = document.createElement('p');
  banner.className = 'gate__banner';
  banner.setAttribute('aria-live', 'polite');

  el.append(headline, board, lane, banner);

  let timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timers.push(globalThis.setTimeout(resolve, ms));
    });

  function bannerText(entry: GateResult): string {
    const name = ctx.session.nameOf(entry.suitcaseOf);
    return entry.kind === 'smuggler'
      ? t('gate.bannerThrough', { name, tokens: entry.amount })
      : t('gate.bannerOk', { name });
  }

  async function run(): Promise<void> {
    for (const [index, entry] of gate.entries()) {
      if (cancelled) return;

      board.textContent = t('gate.next', { name: ctx.session.nameOf(entry.suitcaseOf) });
      await wait(GATE.walkUp * 1000);
      if (cancelled) return;

      /*
       * Schmuggler-Koffer bekommen einen Stall: Die Ampel bleibt gelb, alle halten kurz
       * die Luft an — und dann klappt der Koffer doch auf (GDD §4.2).
       */
      if (entry.kind === 'smuggler') {
        board.dataset.stalling = 'true';
        await wait(GATE.smugglerStall * 1000);
        board.dataset.stalling = 'false';
        if (cancelled) return;
      }

      lane.append(
        createSuitcaseCard({
          playerId: entry.suitcaseOf,
          name: ctx.session.nameOf(entry.suitcaseOf),
          colorId: ctx.session.colorOf(entry.suitcaseOf),
          hints: [],
          opened: true,
          reveal:
            entry.kind === 'smuggler'
              ? itemSetName(itemSet, entry.amount)
              : t('gate.stampOk'),
          ...(entry.kind === 'smuggler' ? { note: t('gate.stampThrough') } : {}),
        })
      );

      banner.textContent = bannerText(entry);
      banner.dataset.kind = entry.kind;
      vibrate('stamp');

      await wait(index === gate.length - 1 ? BANNER_MS : GATE.gap * 1000 + GATE.stamp * 1000);
    }

    if (!cancelled) ctx.fsm.send({ type: 'allPassed' });
  }

  return {
    el,
    activate() {
      /* Keine Koffer uebrig (alle geoeffnet): direkt weiter zur Abrechnung. */
      if (gate.length === 0) {
        ctx.fsm.send({ type: 'allPassed' });
        return;
      }
      void run();
    },
    destroy() {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      timers = [];
    },
  };
}
