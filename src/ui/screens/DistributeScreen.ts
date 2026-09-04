/**
 * Distribute (GDD §5, Screen 6) — die Tokens verteilen.
 *
 * Nacheinander bekommt jeder Token-Besitzer das Handy: Finder zuerst, dann die Leger in
 * der Reihenfolge ihrer Explosionen (Architektur §3). Tap auf ein Badge gibt +1, langes
 * Druecken nimmt −1 zurueck. **An sich selbst geht nichts** (GDD §3.5) — das eigene
 * Badge ist deshalb gar nicht erst tippbar.
 *
 * Das ist ein Pass-Light-Screen: Handy weiterreichen ja, Privacy nein. Wer wem etwas
 * gibt, ist oeffentlich — es ist der Moment, in dem die Runde ihre Rechnung stellt.
 */

import { t } from '@/core/i18n';
import { validateDistribution } from '@/core/payout';
import { createPlayerBadge, setBadgeCount } from '@/ui/components/badge';
import { createButton } from '@/ui/components/button';
import { vibrate } from '@/ui/haptics';
import type { ScreenFactory } from '@/ui/router';
import type { PlayerId } from '@/core/types';

/** Ab dieser Dauer zaehlt ein Druck als "lang" und nimmt einen Schluck zurueck. */
const LONG_PRESS_MS = 400;

export const createDistributeScreen: ScreenFactory = ({ fsm, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--distribute';

  const giver = fsm.distributingPlayer();
  const budget = giver ? (fsm.context.result?.tokens[giver.id] ?? 0) : 0;

  /** Wieviel jeder bisher zugeteilt bekommen hat. */
  const assignments: Record<PlayerId, number> = {};

  const header = document.createElement('header');
  header.className = 'distribute__header';

  const handTo = document.createElement('p');
  handTo.className = 'distribute__hand-to';
  handTo.textContent = t('distribute.handTo', { name: giver?.name ?? '' });

  const headline = document.createElement('h1');
  headline.className = 'distribute__headline';
  headline.textContent = t('distribute.headline', { count: budget });

  const hint = document.createElement('p');
  hint.className = 'distribute__hint';
  hint.textContent = t('distribute.hint');

  const remaining = document.createElement('p');
  remaining.className = 'distribute__remaining';
  remaining.setAttribute('aria-live', 'polite');

  header.append(handTo, headline, hint, remaining);

  const targets = document.createElement('div');
  targets.className = 'distribute__targets';

  const payout = createButton({
    label: t('distribute.cta'),
    variant: 'primary',
    className: 'btn--wide',
    onClick: () => finish(),
  });

  el.append(header, targets, payout);

  const badges = new Map<PlayerId, HTMLElement>();

  for (const player of fsm.context.players) {
    const isSelf = player.id === giver?.id;

    const wrapper = document.createElement('button');
    wrapper.type = 'button';
    wrapper.className = 'distribute__target';
    wrapper.dataset['player'] = player.id;
    wrapper.disabled = isSelf;
    if (isSelf) wrapper.title = t('distribute.notYourself');

    const badge = createPlayerBadge({ colorId: player.colorId, name: player.name, size: 'lg', count: 0 });
    badges.set(player.id, badge);
    wrapper.append(badge);

    if (!isSelf) attachTapAndHold(wrapper, player.id);
    targets.append(wrapper);
  }

  /* ---------------------------------------------------------------- */

  /**
   * Tap gibt +1, langes Druecken nimmt −1. Ein `pointerdown`-Timer statt `contextmenu`,
   * weil Long-Press auf iOS sonst die Textauswahl aufruft.
   */
  function attachTapAndHold(element: HTMLElement, playerId: PlayerId): void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let longFired = false;

    const clear = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    element.addEventListener('pointerdown', () => {
      longFired = false;
      timer = globalThis.setTimeout(() => {
        longFired = true;
        change(playerId, -1);
      }, LONG_PRESS_MS);
    });

    element.addEventListener('pointerup', () => {
      clear();
      if (!longFired) change(playerId, +1);
    });

    element.addEventListener('pointercancel', clear);
    element.addEventListener('pointerleave', clear);
  }

  function assigned(): number {
    return Object.values(assignments).reduce((sum, value) => sum + value, 0);
  }

  function change(playerId: PlayerId, delta: number): void {
    const next = (assignments[playerId] ?? 0) + delta;
    if (next < 0) return;
    if (delta > 0 && assigned() >= budget) return;

    assignments[playerId] = next;
    vibrate('bottle');
    render();
  }

  function render(): void {
    for (const [playerId, badge] of badges) {
      setBadgeCount(badge, assignments[playerId] ?? 0);
    }
    const left = budget - assigned();
    remaining.textContent = t('distribute.remaining', { count: left });
    payout.disabled = left !== 0;
  }

  function finish(): void {
    const result = fsm.context.result;
    if (!result || !giver) return;
    // Der Screen rechnet nicht selbst nach — `core/payout.ts` sagt, ob es aufgeht.
    if (validateDistribution(result, giver.id, assignments).ok !== true) return;

    if (!fsm.send({ type: 'payout', assignments })) return;

    /*
     * Bleibt die FSM in DISTRIBUTE, ist der naechste Token-Besitzer dran — derselbe
     * Screen mit anderen Zahlen. `go('distribute')` taete hier nichts (der Router
     * ignoriert einen Wechsel auf sich selbst), also wird er neu aufgebaut.
     */
    if (fsm.state === 'DISTRIBUTE') void router.refresh();
    else void router.go('result');
  }

  return {
    el,
    activate() {
      render();
    },
  };
};
