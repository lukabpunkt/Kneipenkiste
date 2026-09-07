/**
 * Verteilen (GDD §5, Screen 7 · ADR-5).
 *
 * Zwei Wege: Verteilen bei allen dasselbe eine Schluck, läuft es öffentlich als
 * Badge-Grid (`quick`). Sobald jemand 2 oder mehr hat — Todeszone, Schwergewicht,
 * Balkendieb — geht es einzeln durch, denn dann ist die Entscheidung eine echte.
 */

import { plural, t } from '@/core/i18n';
import { createBadge } from '../components/badge';
import { createQuickDistribute } from '../components/quickDistribute';
import { createTokenStack } from '../components/tokenStack';
import type { Distribution, PlayerId } from '@/core/types';
import type { ScreenContext, ScreenInstance } from '../router';

export function createDistributeScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--distribute';

  const reveal = ctx.reveal();
  const players = ctx.session.players().map((p) => ({ id: p.id, name: p.name, colorId: p.colorId }));

  if (ctx.fsm.context.distributeMode === 'quick') {
    const quick = createQuickDistribute({
      givers: ctx.fsm.context.givers.map((id) => ({
        id,
        name: ctx.session.nameOf(id),
        colorId: ctx.session.colorOf(id),
        sips: reveal.giving[id] ?? 1,
      })),
      players,
      /*
       * Ein Ereignis **pro Verteiler**: Die FSM zählt `distributeIndex` einzeln hoch, und
       * ein einziges Sammel-Ereignis liesse alle bis auf den ersten stehen.
       */
      onComplete: (distribution) => {
        for (const entry of distribution) ctx.fsm.send({ type: 'distributeNext', distribution: [entry] });
      },
    });
    el.append(quick.el);
    return { el };
  }

  /* --- Einzeln: einer nach dem anderen, mit voller Aufmerksamkeit --- */
  const giverId = ctx.fsm.currentGiver();
  /* v8 ignore next */
  if (!giverId) throw new Error('Distribute ohne Verteiler.');

  const total = reveal.giving[giverId] ?? 0;
  const assigned: Distribution[] = [];

  const heading = document.createElement('h1');
  heading.className = 'distribute__headline';
  heading.textContent = t('distribute.headline', { name: ctx.session.nameOf(giverId) });

  const stack = createTokenStack({ count: total, colorId: ctx.session.colorOf(giverId) });

  const remaining = document.createElement('p');
  remaining.className = 'distribute__remaining';
  remaining.setAttribute('aria-live', 'polite');

  const grid = document.createElement('div');
  grid.className = 'distribute__targets';

  const left = (): number => total - assigned.reduce((sum, d) => sum + d.sips, 0);

  const render = (): void => {
    const open = left();
    remaining.textContent = `${open} ${plural('common.sips', open)}`;

    grid.replaceChildren();
    for (const player of players) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'distribute__target';
      /* An sich selbst geht nicht (Audit A1). */
      button.disabled = player.id === giverId || open === 0;
      button.append(createBadge({ name: player.name, colorId: player.colorId, small: true }));

      const got = assigned.filter((d) => d.to === player.id).reduce((sum, d) => sum + d.sips, 0);
      if (got > 0) button.append(createTokenStack({ count: got, colorId: player.colorId, small: true }));

      button.addEventListener('click', () => give(player.id));
      grid.append(button);
    }
  };

  const give = (to: PlayerId): void => {
    if (left() <= 0) return;
    assigned.push({ from: giverId, to, sips: 1 });
    render();
    /* Sobald das Guthaben leer ist, ist dieser Verteiler durch. */
    if (left() === 0) {
      globalThis.setTimeout(
        () => ctx.fsm.send({ type: 'distributeNext', distribution: merge(assigned) }),
        260
      );
    }
  };

  el.append(heading, stack, remaining, grid);
  render();

  return { el };

  /** Mehrere Einzelschlucke an dieselbe Person werden eine Zeile — so liest es sich. */
  function merge(distribution: readonly Distribution[]): Distribution[] {
    const byTarget = new Map<string, Distribution>();
    for (const entry of distribution) {
      const key = `${entry.from}→${entry.to}`;
      const existing = byTarget.get(key);
      if (existing) existing.sips += entry.sips;
      else byTarget.set(key, { ...entry });
    }
    return [...byTarget.values()];
  }
}
