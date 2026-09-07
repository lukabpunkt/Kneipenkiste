/**
 * Countdown-Ring um das Beamten-Portrait (Art Direction §4.3).
 *
 * Zeigt die verbleibende Verhoer-Zeit. Die letzten Sekunden pulsieren — das ist der
 * Druck, unter dem der Beamte seine Fragen stellt.
 */

import { HUD } from '@/config/choreo';
import { colorById, hex, type ColorId } from '@/config/theme';

export interface CountdownRingOptions {
  seconds: number;
  colorId: ColorId;
  onTick?: (remaining: number) => void;
  onFinish?: () => void;
}

export interface CountdownRing {
  el: HTMLElement;
  start(): void;
  stop(): void;
  remaining(): number;
}

export function createCountdownRing(options: CountdownRingOptions): CountdownRing {
  const el = document.createElement('div');
  el.className = 'countdown';
  el.style.setProperty('--countdown-color', hex(colorById(options.colorId).hex));
  el.setAttribute('role', 'timer');

  const label = document.createElement('span');
  label.className = 'countdown__label';
  el.append(label);

  let remaining = options.seconds;
  let timer: ReturnType<typeof setInterval> | undefined;

  const render = (): void => {
    label.textContent = String(remaining);
    el.style.setProperty('--countdown-progress', String(remaining / options.seconds));
    /* Erst spaet dringlich werden — sonst nutzt sich das Signal ab. */
    el.dataset.urgent = String(remaining <= HUD.tickFromSec);
    el.setAttribute('aria-label', `${remaining}`);
  };

  const stop = (): void => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };

  render();

  return {
    el,
    start() {
      stop();
      timer = globalThis.setInterval(() => {
        remaining -= 1;
        render();
        options.onTick?.(remaining);
        if (remaining <= 0) {
          stop();
          options.onFinish?.();
        }
      }, 1000);
    },
    stop,
    remaining: () => remaining,
  };
}
