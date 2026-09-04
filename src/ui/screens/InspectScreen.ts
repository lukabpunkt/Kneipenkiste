/**
 * Kontrolle (GDD §5, Screen 7) — der Röntgen-Moment (Design-Pfeiler 4).
 *
 * Der Beamte tippt bis zu k Koffer an. M1 ersetzt die Röntgen-Sequenz durch einen
 * Text-Reveal — aber **die Regel bleibt**: Waehrend des Scans steht dort "Röntgen läuft",
 * das Ergebnis erscheint erst danach. Wer hier das Ergebnis frueher zeigt, nimmt dem
 * Spiel seinen besten Moment, egal ob als Text oder als Scanline (Art Direction §7).
 */

import { BANNER_MS } from '@/config/rules';
import { XRAY } from '@/config/choreo';
import { t } from '@/core/i18n';
import type { InspectResult, ItemSet, PlayerId } from '@/core/types';
import { createBadge } from '../components/badge';
import { createOfficerButton } from '../components/button';
import { createOpeningsChip } from '../components/chips';
import { createSuitcaseCard } from '../components/suitcaseCard';
import { vibrate } from '../haptics';
import type { ScreenContext, ScreenInstance } from '../router';

/** Wie die Ware in dieser Runde heisst — pro Runde nur ein Set (ADR-5). */
export function itemSetName(itemSet: ItemSet, amount: number): string {
  return t(`items.${itemSet}`, { count: amount });
}

export function createInspectScreen(ctx: ScreenContext): ScreenInstance {
  const officerId = ctx.view('INSPECT').officerId;
  const officerColor = ctx.session.colorOf(officerId);

  const el = document.createElement('main');
  el.className = 'screen screen--inspect';

  const header = document.createElement('header');
  header.className = 'inspect__header';

  const openings = document.createElement('div');
  openings.className = 'inspect__openings';

  header.append(
    createBadge({ name: ctx.session.nameOf(officerId), colorId: officerColor, small: true, note: t('hall.officerNote') }),
    openings
  );

  /** Der Monitor: waehrend des Scans absichtlich nichtssagend. */
  const monitor = document.createElement('div');
  monitor.className = 'xray';
  monitor.setAttribute('aria-live', 'polite');

  const monitorText = document.createElement('p');
  monitorText.className = 'xray__text';
  monitor.append(monitorText);

  const board = document.createElement('div');
  board.className = 'inspect__board';

  const actions = document.createElement('div');
  actions.className = 'inspect__actions';

  const waveAll = createOfficerButton({
    label: t('inspect.waveAll'),
    colorId: officerColor,
    variant: 'secondary',
    onClick: () => {
      if (busy) return;
      ctx.fsm.send({ type: 'waveAll' });
    },
  });

  actions.append(waveAll);
  el.append(header, monitor, board, actions);

  let busy = false;

  function render(): void {
    const view = ctx.view('INSPECT');

    openings.replaceChildren(
      createOpeningsChip({ left: view.openingsLeft, max: view.maxOpenings, colorId: officerColor })
    );

    board.replaceChildren();
    for (const suitcase of view.suitcases) {
      const done = view.openings.find((o) => o.suitcaseOf === suitcase.playerId);

      board.append(
        createSuitcaseCard({
          playerId: suitcase.playerId,
          name: ctx.session.nameOf(suitcase.playerId),
          colorId: ctx.session.colorOf(suitcase.playerId),
          hints: suitcase.hints,
          sniffed: suitcase.sniffed,
          locked: suitcase.locked,
          opened: suitcase.opened,
          ...(done ? { reveal: revealText(done, view.itemSet) } : {}),
          ...(suitcase.inspectable && !busy ? { onTap: () => open(suitcase.playerId) } : {}),
        })
      );
    }

    if (!busy) monitorText.textContent = t('inspect.pickSuitcase');
  }

  /** Was das Roentgenbild am Ende zeigt — Menge inklusive, denn jetzt ist sie oeffentlich. */
  function revealText(result: InspectResult, itemSet: ItemSet): string {
    if (result.kind === 'clean') return t('inspect.revealClean');
    if (result.kind === 'diplomat') return t('inspect.revealDiplomat');
    return itemSetName(itemSet, result.amount);
  }

  /** Banner nach dem Scan: wer trinkt, wie viel. */
  function bannerText(result: InspectResult): string {
    switch (result.kind) {
      case 'caught':
        return t('inspect.bannerCaught', {
          name: ctx.session.nameOf(result.suitcaseOf),
          sips: result.drinkers[0]?.sips ?? 0,
        });
      case 'clean':
        return t('inspect.bannerClean', {
          officer: ctx.session.nameOf(officerId),
          sips: result.drinkers[0]?.sips ?? 0,
        });
      case 'diplomat':
        return t('inspect.bannerDiplomat', {
          officer: ctx.session.nameOf(officerId),
          sips: result.drinkers[0]?.sips ?? 0,
        });
    }
  }

  let timers: ReturnType<typeof setTimeout>[] = [];
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timers.push(globalThis.setTimeout(resolve, ms));
    });

  async function open(suitcaseOf: PlayerId): Promise<void> {
    if (busy) return;
    busy = true;
    waveAll.disabled = true;

    if (!ctx.fsm.send({ type: 'inspectSuitcase', suitcaseOf })) {
      busy = false;
      waveAll.disabled = false;
      return;
    }

    render();

    /*
     * Der Scan. Bis er durch ist, steht hier nichts als "Röntgen läuft" — der Stall
     * bei 50 % ist in M1 nur eine Pause, aber er ist da, weil der Rhythmus stimmen muss.
     */
    monitor.dataset.state = 'scanning';
    monitorText.textContent = t('inspect.scanning');
    await wait((XRAY.travelIn + XRAY.powerUp) * 1000);
    await wait(XRAY.scanDuration * XRAY.stallAt * 1000);

    monitor.dataset.state = 'stall';
    vibrate('scanStall');
    await wait(XRAY.stallDuration * 1000);

    monitor.dataset.state = 'scanning';
    await wait(XRAY.scanDuration * (1 - XRAY.stallAt) * 1000);

    /* Jetzt — und keinen Frame frueher — steht das Ergebnis da. */
    const result = ctx.fsm.context.pendingResult;
    if (!result) return;

    monitor.dataset.state = result.kind;
    monitorText.textContent = `${revealText(result, ctx.view('INSPECT').itemSet)} · ${bannerText(result)}`;
    vibrate(result.kind === 'caught' ? 'alarm' : 'confirm');

    render();
    await wait(BANNER_MS);

    /*
     * Das Board wieder freigeben — und zwar **vor** dem `resultShown`. Bleibt eine
     * Oeffnung uebrig, wechselt die FSM nicht den State und der Router baut den Screen
     * nicht neu auf: Ohne dieses `render()` waere danach kein Koffer mehr tippbar.
     */
    busy = false;
    waveAll.disabled = false;
    render();
    ctx.fsm.send({ type: 'resultShown' });
  }

  render();

  return {
    el,
    destroy() {
      for (const timer of timers) clearTimeout(timer);
      timers = [];
    },
  };
}
