/**
 * Verteil-UI (GDD §3.6, Art Direction §4.5, ADR-4).
 *
 * Nur beim Alleingang. Der Dieb bekommt das Handy und verteilt den Tresor frei —
 * er darf alles einer Person geben. Das ist Absicht: Rache ist Teil des Spiels und
 * der zweite Comedy-Moment der Runde.
 *
 * "Auszahlen" wird erst aktiv, wenn nichts mehr uebrig ist. Tap = +1, Halten = −1.
 */

import { plural, t } from '@/core/i18n';
import { applyDistribution } from '@/core/payout';
import type { PlayerId } from '@/core/types';
import { createPlayerBadge, setBadgeCount } from '@/ui/components/badge';
import { createButton } from '@/ui/components/button';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

/** Ab wann ein Druck als "Halten" zaehlt. */
const LONG_PRESS_MS = 420;

export function createDistributeScreen(ctx: ScreenContext): ScreenInstance {
  const result = ctx.fsm.context.result;

  const el = document.createElement('section');
  el.className = 'screen screen--distribute';

  if (!result || result.outcome !== 'soloSteal') return { el };

  const thief = ctx.session.playerById(result.distributorId!);
  const budget = result.distributableSips ?? 0;
  const distribution = new Map<PlayerId, number>(result.sharers.map((id) => [id, 0]));

  const handover = document.createElement('p');
  handover.className = 'distribute__handover';
  handover.textContent = t('distribute.handover', { name: thief?.name ?? '' });

  const headline = document.createElement('h1');
  headline.className = 'distribute__headline';
  headline.textContent = t('distribute.headline', { count: budget });

  const sub = document.createElement('p');
  sub.className = 'distribute__sub';
  sub.textContent = t('distribute.sub');

  const remaining = document.createElement('p');
  remaining.className = 'distribute__remaining';
  remaining.setAttribute('aria-live', 'polite');

  const row = document.createElement('div');
  row.className = 'distribute__targets';

  const cta = createButton({
    label: t('distribute.cta'),
    variant: 'primary',
    className: 'btn--block',
    disabled: true,
    onClick: () => payout(),
  });

  el.append(handover, headline, sub, remaining, row, cta);

  /* ---------------------------------------------------------------- */

  const badges = new Map<PlayerId, HTMLElement>();

  const left = (): number => budget - [...distribution.values()].reduce((sum, value) => sum + value, 0);

  const sync = (): void => {
    const rest = left();
    remaining.textContent = t(rest === 1 ? 'distribute.remaining_one' : 'distribute.remaining_other', {
      count: rest,
    });
    remaining.classList.toggle('is-done', rest === 0);
    cta.disabled = rest !== 0;
    for (const [id, badge] of badges) setBadgeCount(badge, distribution.get(id) ?? 0);
  };

  const give = (id: PlayerId): void => {
    if (left() <= 0) return;
    distribution.set(id, (distribution.get(id) ?? 0) + 1);
    vibrate('coin');
    flyCoin(badges.get(id));
    sync();
  };

  const takeBack = (id: PlayerId): void => {
    const current = distribution.get(id) ?? 0;
    if (current <= 0) return;
    distribution.set(id, current - 1);
    vibrate('tap');
    sync();
  };

  for (const id of result.sharers) {
    const player = ctx.session.playerById(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'distribute__target';
    button.setAttribute('aria-label', `${player?.name ?? id}: ${plural('common.sips', 0)}`);

    const badge = createPlayerBadge({
      colorId: player?.colorId ?? 'red',
      name: player?.name ?? id,
      size: 'md',
      count: 0,
    });
    badges.set(id, badge);
    button.append(badge);

    /*
     * Halten heisst zuruecknehmen. Der Timer laeuft beim Druck los; feuert er, gilt der
     * folgende `click` nicht mehr — sonst gaebe ein Long-Press erst −1 und dann +1.
     */
    let pressTimer: ReturnType<typeof setTimeout> | undefined;
    let longPressed = false;

    const startPress = (): void => {
      longPressed = false;
      pressTimer = globalThis.setTimeout(() => {
        longPressed = true;
        takeBack(id);
      }, LONG_PRESS_MS);
    };
    const endPress = (): void => {
      if (pressTimer !== undefined) clearTimeout(pressTimer);
    };

    button.addEventListener('pointerdown', startPress);
    button.addEventListener('pointerup', endPress);
    button.addEventListener('pointercancel', endPress);
    button.addEventListener('pointerleave', endPress);
    button.addEventListener('click', () => {
      if (longPressed) {
        longPressed = false;
        return;
      }
      give(id);
    });
    // Tastatur: Pfeile hoch/runter statt Halten.
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === '-') {
        event.preventDefault();
        takeBack(id);
      }
    });

    row.append(button);
  }

  function payout(): void {
    if (left() !== 0) return;
    const record = Object.fromEntries(distribution) as Record<PlayerId, number>;
    const completed = applyDistribution(result!, record);
    vibrate('seal');
    if (!ctx.fsm.send({ type: 'payout', result: completed })) return;
    void ctx.router.go('result');
  }

  sync();

  return { el };
}

/** Eine Muenze fliegt aus dem Sack ins Badge (Art Direction §4.5). */
function flyCoin(badge: HTMLElement | undefined): void {
  if (!badge || typeof badge.animate !== 'function') return;
  const coin = document.createElement('span');
  coin.className = 'coin';
  coin.setAttribute('aria-hidden', 'true');
  badge.append(coin);
  const animation = coin.animate(
    [
      { transform: 'translate(0, -70px) scale(0.6)', opacity: 0 },
      { transform: 'translate(0, -34px) scale(1.1)', opacity: 1, offset: 0.55 },
      { transform: 'translate(0, 0) scale(0.9)', opacity: 0 },
    ],
    { duration: 300, easing: 'cubic-bezier(.4,0,.6,1)' }
  );
  animation.addEventListener('finish', () => coin.remove());
  // Falls die Animation im Hintergrund-Tab nie endet: nach einer Sekunde selbst aufraeumen.
  globalThis.setTimeout(() => coin.remove(), 1000);
}
