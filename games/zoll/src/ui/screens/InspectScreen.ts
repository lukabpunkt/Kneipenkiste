/**
 * Kontrolle (GDD §5, Screen 7) — der Röntgen-Moment (Design-Pfeiler 4).
 *
 * Der Beamte tippt einen Koffer an, der fährt ins Gerät, und der Monitor baut sein Bild
 * zeilenweise auf. **Das Ergebnis erscheint nie vor 100 %** — durchgesetzt wird das im
 * `XrayMonitor` über eine wachsende Maske, nicht hier. Dieser Screen darf das Banner
 * deshalb erst setzen, wenn der Director ihm das Signal gibt.
 *
 * Getippt wird auf dem Canvas: Die Trefferflächen liegen in der Bühne (≥ 56 px), das HUD
 * darüber ist durchlässig.
 */

import { XRAY } from '@/config/choreo';
import { BANNER_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import type { InspectResult, ItemSet, PlayerId } from '@/core/types';
import { createBadge } from '../components/badge';
import { createOfficerButton } from '../components/button';
import { createOpeningsChip } from '../components/chips';
import { vibrate } from '../haptics';
import { createStageHost } from '../stageHost';
import type { ScreenContext, ScreenInstance } from '../router';

/** Wie die Ware in dieser Runde heißt — pro Runde nur ein Set (ADR-5). */
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
    createBadge({
      name: ctx.session.nameOf(officerId),
      colorId: officerColor,
      small: true,
      note: t('hall.officerNote'),
    }),
    openings
  );

  const stageHost = createStageHost(ctx, ctx.view('INSPECT'));

  /*
   * Die Koffer liegen auf dem Canvas — für Tastatur und Screenreader existieren sie
   * dort nicht. Diese Liste ist ihr Gegenstück im DOM: unsichtbar, aber fokussierbar,
   * mit demselben Ziel und demselben Namen. Ohne sie wäre der Kern des Spiels für
   * jemanden, der nicht tippen kann, gar nicht bedienbar (Audit A5, Tastatur).
   */
  const keyboardBoard = document.createElement('ul');
  keyboardBoard.className = 'inspect__keys';
  keyboardBoard.setAttribute('aria-label', t('inspect.pickSuitcase'));

  /** Die Aufforderung bzw. das Banner — im HUD, damit es über der Bühne steht. */
  const banner = document.createElement('p');
  banner.className = 'inspect__banner';
  banner.setAttribute('aria-live', 'polite');
  stageHost.hud.append(banner);

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
  el.append(header, stageHost.el, keyboardBoard, actions);

  let stage: Awaited<ReturnType<typeof stageHost.ready>> | undefined;
  let busy = false;

  function renderChip(): void {
    const view = ctx.view('INSPECT');
    openings.replaceChildren(
      createOpeningsChip({
        left: view.openingsLeft,
        max: view.maxOpenings,
        colorId: officerColor,
        sniffer: view.modes.sniffer,
      })
    );
    if (!busy) {
      banner.textContent = t('inspect.pickSuitcase');
      banner.dataset.kind = 'idle';
    }

    renderKeyboardBoard(view);
  }

  /** Baut die Tastatur-Liste neu — sie spiegelt exakt, was auf der Bühne tippbar ist. */
  function renderKeyboardBoard(view: ReturnType<typeof ctx.view>): void {
    keyboardBoard.replaceChildren();

    for (const suitcase of view.suitcases) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'visually-hidden-focusable';
      button.disabled = !suitcase.inspectable || busy;
      button.dataset.player = suitcase.playerId;

      /* Der Name, sein Zustand und die Hinweise — dasselbe, was das Auge sieht. */
      const parts = [ctx.session.nameOf(suitcase.playerId)];
      for (const hint of suitcase.hints) parts.push(t(`hints.${hint}`));
      if (suitcase.locked) parts.push(t('hall.bribeAccepted'));
      const done = view.openings.find((o) => o.suitcaseOf === suitcase.playerId);
      if (done) parts.push(bannerText(done));
      button.textContent = parts.join(', ');

      button.addEventListener('click', () => void open(suitcase.playerId));
      item.append(button);
      keyboardBoard.append(item);
    }
  }

  /** Was der Tisch nach dem Scan liest — jetzt ist die Menge öffentlich. */
  function bannerText(result: InspectResult): string {
    switch (result.kind) {
      case 'caught':
        return `${itemSetName(ctx.view('INSPECT').itemSet, result.amount)} · ${t('inspect.bannerCaught', {
          name: ctx.session.nameOf(result.suitcaseOf),
          sips: result.drinkers[0]?.sips ?? 0,
        })}`;
      case 'clean':
        return `${t('inspect.revealClean')} · ${t('inspect.bannerClean', {
          officer: ctx.session.nameOf(officerId),
          sips: result.drinkers[0]?.sips ?? 0,
        })}`;
      case 'diplomat':
        return `${t('inspect.revealDiplomat')} · ${t('inspect.bannerDiplomat', {
          officer: ctx.session.nameOf(officerId),
          sips: result.drinkers[0]?.sips ?? 0,
        })}`;
    }
  }

  let timers: ReturnType<typeof setTimeout>[] = [];
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timers.push(globalThis.setTimeout(resolve, ms));
    });

  async function open(suitcaseOf: PlayerId): Promise<void> {
    if (busy || !stage) return;
    busy = true;
    waveAll.disabled = true;

    if (!ctx.fsm.send({ type: 'inspectSuitcase', suitcaseOf })) {
      busy = false;
      waveAll.disabled = false;
      return;
    }

    const result = ctx.fsm.context.pendingResult;
    if (!result) return;

    renderChip();
    banner.textContent = t('inspect.scanning');
    banner.dataset.kind = 'scanning';

    /*
     * Der Director hält die Reihenfolge ein: Scan → Gesicht → Konsequenz → Banner.
     * Der Screen wartet auf das Banner-Label, statt selbst zu timen — so bleiben Bühne
     * und Text auch dann synchron, wenn sich die Choreografie ändert.
     */
    const timeline = stage.inspect.play(result, ctx.view('INSPECT').itemSet);

    await wait((XRAY.travelIn + XRAY.powerUp + XRAY.scanDuration + XRAY.stallDuration) * 1000);
    vibrate(result.kind === 'caught' ? 'alarm' : 'confirm');

    banner.textContent = bannerText(result);
    banner.dataset.kind = result.kind;

    await timeline;
    await wait(BANNER_MS * 0.4);

    busy = false;
    waveAll.disabled = false;
    stage.view.applyView(ctx.view('INSPECT'));
    renderChip();
    ctx.fsm.send({ type: 'resultShown' });
  }

  renderChip();

  return {
    el,

    activate() {
      void stageHost
        .ready()
        .then((ready) => {
          stage = ready;
          ready.view.setMode('inspect');
          ready.view.applyView(ctx.view('INSPECT'));
          ready.view.events.on('suitcaseTap', ({ suitcaseOf }) => void open(suitcaseOf));
          renderChip();
        })
        .catch((error: unknown) => {
          console.warn('[inspect] Bühne konnte nicht starten', error);
          banner.textContent = t('hall.stageFailed');
        });
    },

    destroy() {
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      stage?.inspect.stop();
      stage?.view.events.clear();
      stageHost.release();
    },
  };
}
