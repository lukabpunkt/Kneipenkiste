/**
 * Countdown-Ring mit Gustav (Art Direction §4.2).
 *
 * Zeigt die verbleibende Absprache-Zeit. Der Ring gehoert niemandem — anders als beim
 * Tresor tickt hier die Uhr fuer alle gleichzeitig. In den letzten Sekunden pulsiert er,
 * und der Geier schaut auf die Uhr.
 */

import { HUD } from '@/config/choreo';

export interface CountdownRingOptions {
  seconds: number;
  onTick?: (remaining: number) => void;
  onFinish?: () => void;
}

export interface CountdownRing {
  el: HTMLElement;
  start(): void;
  stop(): void;
  remaining(): number;
}

/** Gustav auf seinem Pfahl — kahler rosa Kopf, `ink`-Outline (Art Direction §5.2). */
const VULTURE_SVG = `
<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="countdown__vulture">
  <ellipse cx="24" cy="32" rx="13" ry="11" fill="var(--rock-dark)" stroke="var(--ink)" stroke-width="2.5" />
  <path d="M11 30c-4 2-6 6-5 9 3 1 7-1 9-4" fill="var(--rock-dark)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
  <circle cx="24" cy="17" r="8" fill="#E8A0A8" stroke="var(--ink)" stroke-width="2.5" />
  <path d="M31 17c4 0 6 2 6 3s-2 3-6 3" fill="var(--canyon)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
  <circle class="countdown__eye" cx="26" cy="15" r="2.2" fill="var(--ink)" />
</svg>`;

export function createCountdownRing(options: CountdownRingOptions): CountdownRing {
  const el = document.createElement('div');
  el.className = 'countdown';
  el.setAttribute('role', 'timer');

  const vulture = document.createElement('span');
  vulture.className = 'countdown__portrait';
  vulture.innerHTML = VULTURE_SVG;

  const label = document.createElement('span');
  label.className = 'countdown__label';

  el.append(vulture, label);

  let remaining = options.seconds;
  let timer: ReturnType<typeof setInterval> | undefined;

  const render = (): void => {
    label.textContent = String(Math.max(0, remaining));
    el.style.setProperty('--countdown-progress', String(Math.max(0, remaining) / options.seconds));
    /* Erst spaet dringlich werden — sonst nutzt sich das Signal ab. */
    el.dataset.urgent = String(remaining <= HUD.tickFromSec);
    el.setAttribute('aria-label', String(Math.max(0, remaining)));
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
