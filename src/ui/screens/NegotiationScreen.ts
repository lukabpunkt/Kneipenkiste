/**
 * Absprache (GDD §5, Screen 2) — der Screen, auf dem das Spiel wirklich stattfindet.
 *
 * Auf dem Handy passiert hier fast nichts: Brücke, Countdown, die Auszahlungsregel
 * dieser Runde und ein Satz, der alles trägt — "Versprechen sind nicht bindend."
 * Geredet wird um das Handy herum, nicht darauf (Design-Pfeiler 2).
 */

import { t } from '@/core/i18n';
import { ICON_CLOSE, createButton, createIconButton } from '../components/button';
import { createBridgeTop, type PlankModel } from '../components/bridgeTop';
import { createCountdownRing } from '../components/countdownRing';
import { createFlagRow } from '../components/flagRow';
import type { ScreenContext, ScreenInstance } from '../router';

export function createNegotiationScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--negotiation';

  const view = ctx.view('NEGOTIATION');
  const settings = ctx.session.settings();

  const ring = createCountdownRing({
    seconds: settings.negotiationSec,
    onFinish: () => ctx.fsm.send({ type: 'ready' }),
  });

  const header = document.createElement('header');
  header.className = 'negotiation__header';
  header.append(
    createIconButton({
      icon: ICON_CLOSE,
      ariaLabel: t('dialog.abortRound'),
      className: 'screen__abort',
      onClick: ctx.abortRound,
    }),
    ring.el
  );

  const heading = document.createElement('h1');
  heading.className = 'negotiation__headline';
  heading.textContent = t('negotiation.headline');

  /*
   * Die Regelzeile zeigt die Werte **dieser** Runde, nicht die des Regelwerks: In der
   * Todeszone verteilt man 2 statt 1, und das muss dastehen, bevor jemand wählt.
   */
  const rule = document.createElement('p');
  rule.className = 'negotiation__rule';
  rule.textContent = view.deathZone
    ? t('negotiation.deathZoneRule', { giving: view.givingPerSafePlayer })
    : t('negotiation.ruleLine', { giving: view.givingPerSafePlayer });

  const bridgeBox = document.createElement('div');
  bridgeBox.className = 'negotiation__bridge';

  const notBinding = document.createElement('p');
  notBinding.className = 'negotiation__promise';
  notBinding.textContent = t('negotiation.notBinding');

  const footer = document.createElement('footer');
  footer.className = 'negotiation__footer';
  footer.append(
    createButton({
      label: t('negotiation.ready'),
      variant: 'primary',
      onClick: () => {
        ring.stop();
        ctx.fsm.send({ type: 'ready' });
      },
    })
  );

  /** Brücke und Fahnen neu zeichnen — die Fahnen ändern sich während der Absprache. */
  const renderBridge = (): void => {
    const current = ctx.view('NEGOTIATION');
    bridgeBox.replaceChildren();

    const planks: PlankModel[] = current.planks.map((plank) => ({
      id: plank.id,
      state: plank.flaggedBy.length > 0 ? 'flagged' : 'normal',
      markers: plank.flaggedBy.map((playerId) => ({
        playerId,
        colorId: ctx.session.colorOf(playerId),
        flag: true,
      })),
    }));

    bridgeBox.append(
      createBridgeTop({
        planks,
        removed: current.bridge.removed,
        display: true,
        ariaLabel: t('lobby.bridgeInfo', { count: current.bridge.count, players: current.playerIds.length }),
      })
    );

    if (!current.modes.flags) return;

    bridgeBox.append(
      createFlagRow({
        players: current.playerIds.map((id) => {
          const flag = current.planks.find((p) => p.flaggedBy.includes(id))?.id;
          return {
            id,
            name: ctx.session.nameOf(id),
            colorId: ctx.session.colorOf(id),
            ...(flag !== undefined ? { flag } : {}),
          };
        }),
        planks: current.bridge.planks,
        onFlag: (playerId, plank) => {
          if (plank === null) ctx.fsm.lowerFlag(playerId);
          else ctx.fsm.raiseFlag(playerId, plank);
          renderBridge();
        },
      })
    );
  };

  renderBridge();
  el.append(header, heading, rule, bridgeBox, notBinding, footer);

  return {
    el,
    activate: () => ring.start(),
    destroy: () => ring.stop(),
  };
}
