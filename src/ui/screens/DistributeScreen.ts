/**
 * Verteilen (GDD §5, Screen 9 / §3.6).
 *
 * Wer Tokens hat, verteilt sie: Beamter zuerst, dann die Schmuggler in Schranken-
 * Reihenfolge. Tap = +1, langer Druck = −1, nicht an sich selbst — alles auf eine
 * Person ist erlaubt und meistens die Pointe.
 */

import { STEPPER_REPEAT_MS } from '@/config/rules';
import { t } from '@/core/i18n';
import type { Distribution, PlayerId } from '@/core/types';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createTokenStack } from '../components/chips';
import { vibrate } from '../haptics';
import type { ScreenContext, ScreenInstance } from '../router';

export function createDistributeScreen(ctx: ScreenContext): ScreenInstance {
  const owners = ctx.fsm.context.tokenOwners;
  const ownerId = owners[ctx.fsm.context.distributeIndex] ?? owners[0]!;
  const total = ctx.fsm.context.result?.tokens[ownerId] ?? 0;
  const ownerColor = ctx.session.colorOf(ownerId);

  /** Wie viele Schlücke jeder von diesem Verteiler bekommt. */
  const given = new Map<PlayerId, number>();

  const el = document.createElement('main');
  el.className = 'screen screen--distribute';

  const headline = document.createElement('h1');
  headline.className = 'distribute__headline';
  headline.textContent = t('distribute.headline', {
    name: ctx.session.nameOf(ownerId),
    tokens: total,
  });

  const stack = document.createElement('div');
  stack.className = 'distribute__stack';

  const hint = document.createElement('p');
  hint.className = 'distribute__hint';
  hint.textContent = t('distribute.hint');

  const list = document.createElement('ul');
  list.className = 'distribute__targets';

  const done = createButton({
    label: t('distribute.done'),
    variant: 'primary',
    disabled: true,
    onClick: () => {
      const distribution: Distribution[] = [...given.entries()]
        .filter(([, sips]) => sips > 0)
        .map(([to, sips]) => ({ from: ownerId, to, sips }));
      ctx.fsm.send({ type: 'distributeNext', distribution });
    },
  });

  el.append(headline, stack, hint, list, done);

  const spent = (): number => [...given.values()].reduce((sum, n) => sum + n, 0);
  const left = (): number => total - spent();

  function change(targetId: PlayerId, delta: number): void {
    const current = given.get(targetId) ?? 0;
    const next = Math.max(0, Math.min(current + delta, current + left()));
    if (next === current) return;
    given.set(targetId, next);
    vibrate('tap');
    render();
  }

  function render(): void {
    stack.replaceChildren(createTokenStack({ total, left: left(), colorId: ownerColor }));
    list.replaceChildren();

    for (const player of ctx.session.players()) {
      /* Nicht an sich selbst — das waere kein Verteilen, sondern Selbstbedienung. */
      if (player.id === ownerId) continue;

      const item = document.createElement('li');
      item.className = 'distribute__target';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'distribute__btn';
      button.append(createBadge({ name: player.name, colorId: player.colorId, small: true }));

      const count = document.createElement('span');
      count.className = 'distribute__count';
      const sips = given.get(player.id) ?? 0;
      count.textContent = String(sips);
      count.dataset.zero = String(sips === 0);
      button.append(count);

      button.setAttribute(
        'aria-label',
        t('distribute.giveTo', { name: player.name, sips })
      );
      button.disabled = left() === 0 && sips === 0;

      bindLongPress(button, {
        onTap: () => change(player.id, +1),
        onLongPress: () => change(player.id, -1),
      });

      item.append(button);
      list.append(item);
    }

    done.disabled = left() > 0;
  }

  render();
  return { el };
}

/**
 * Tap = +1, langer Druck = −1.
 *
 * Der lange Druck feuert **einmal** und unterdrueckt dann den folgenden Klick — sonst
 * zaehlt derselbe Finger erst herunter und gleich wieder herauf.
 */
function bindLongPress(
  button: HTMLButtonElement,
  handlers: { onTap: () => void; onLongPress: () => void }
): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let longFired = false;

  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  button.addEventListener('pointerdown', () => {
    longFired = false;
    timer = globalThis.setTimeout(() => {
      longFired = true;
      handlers.onLongPress();
    }, STEPPER_REPEAT_MS.initial + 200);
  });

  button.addEventListener('pointerup', clear);
  button.addEventListener('pointercancel', clear);
  button.addEventListener('pointerleave', clear);

  button.addEventListener('click', () => {
    clear();
    if (longFired) {
      longFired = false;
      return;
    }
    handlers.onTap();
  });
}
