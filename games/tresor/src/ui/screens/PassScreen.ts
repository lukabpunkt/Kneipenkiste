/**
 * Privacy-Screen (GDD §3.4, §5 Screen 3).
 *
 * Vollflaeche in der Spielerfarbe. Der Screen ist 800 ms lang **taub** — sonst reicht
 * ein Doppeltap vom Versiegeln des Vorgaengers bis hierher durch, und der Nachbar sieht
 * den Wahl-Screen (Audit A1, MUSS).
 */

import { PASS_LOCK_MS } from '@/config/rules';
import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

export function createPassScreen(ctx: ScreenContext): ScreenInstance {
  const { players, playerIndex } = ctx.fsm.context;
  const player = players[playerIndex];
  const colorId = player?.colorId ?? 'red';
  const color = colorById(colorId);

  const el = document.createElement('section');
  // `is-locked` steht schon beim Mount, nicht erst in activate(): Sonst gibt es ein
  // Zeitfenster, in dem der Screen entsperrt *aussieht*, aber noch nicht reagiert.
  el.className = 'screen screen--pass is-locked';
  el.style.setProperty('--pass-color', hex(color.hex));
  el.style.setProperty('--pass-shade', hex(color.shade));
  el.style.setProperty('--pass-ink', hex(textColorOn(colorId)));

  const stripes = document.createElement('div');
  stripes.className = 'pass__stripes';
  stripes.setAttribute('aria-hidden', 'true');

  const inner = document.createElement('div');
  inner.className = 'pass__inner';

  const position = document.createElement('p');
  position.className = 'pass__position';
  position.textContent = `${playerIndex + 1}/${players.length}`;

  const name = document.createElement('p');
  name.className = 'pass__name';
  name.textContent = t('pass.headline', { name: player?.name ?? '' });

  const instruction = document.createElement('p');
  instruction.className = 'pass__instruction';
  instruction.textContent = t('pass.body');

  inner.append(position, name, instruction);
  el.append(stripes, inner);

  let armed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onTap = (): void => {
    if (!armed) return;
    armed = false;
    vibrate('tap');
    if (!ctx.fsm.send({ type: 'tap' })) return;
    void ctx.router.go('choice');
  };

  el.addEventListener('click', onTap);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTap();
    }
  });

  // Der Screen ist selbst der Button — deshalb fokussierbar und beschriftet.
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${name.textContent} ${instruction.textContent}`);

  return {
    el,
    activate() {
      timer = globalThis.setTimeout(() => {
        armed = true;
        el.classList.remove('is-locked');
      }, PASS_LOCK_MS);
      el.focus({ preventScroll: true });
    },
    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
