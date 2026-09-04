/**
 * Countdown-Ring (Art Direction §4.3).
 *
 * Kreisring um den Tresor, Stroke 10 px. Gold, in den letzten 10 s `steal`-rot; in den
 * letzten 5 s pulsiert er und die Ziffer bekommt einen Punch. Stumm muss der Countdown
 * genauso lesbar sein wie mit Ton (GDD §6) — deshalb steckt die ganze Information im Bild.
 */

import { COUNTDOWN_TICK_SEC, COUNTDOWN_WARN_SEC } from '@/config/rules';
import { prefersReducedMotion } from '@/ui/animate';

export interface CountdownRingOptions {
  seconds: number;
  /** Laeuft ab, wenn die Zeit um ist. */
  onDone: () => void;
  /**
   * Jede volle Sekunde. `ticking` ist true in den letzten fuenf — dort gehoert der
   * Tick-Sound hin (Art Direction §4.3). Die uebrigen Sekunden meldet der Ring
   * trotzdem: Die Verhandlungsmusik zieht ueber die letzten zehn an (GDD §6), und
   * dafuer braucht sie den Stand, bevor es hektisch wird.
   */
  onTick?: (secondsLeft: number, ticking: boolean) => void;
}

export interface CountdownRing {
  el: HTMLElement;
  start(): void;
  stop(): void;
  readonly secondsLeft: number;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function createCountdownRing(options: CountdownRingOptions): CountdownRing {
  const el = document.createElement('div');
  el.className = 'ring';
  el.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ring__track" cx="50" cy="50" r="${RADIUS}" />
      <circle class="ring__progress" cx="50" cy="50" r="${RADIUS}"
        stroke-dasharray="${CIRCUMFERENCE.toFixed(2)}" stroke-dashoffset="0" />
    </svg>
    <span class="ring__value"></span>`;

  const progress = el.querySelector<SVGCircleElement>('.ring__progress')!;
  const value = el.querySelector<HTMLElement>('.ring__value')!;

  const total = Math.max(1, options.seconds);
  let left = total;
  let raf = 0;
  let startedAt = 0;
  let lastWhole = total;
  let running = false;

  const render = (secondsLeft: number): void => {
    const shown = Math.max(0, Math.ceil(secondsLeft));
    const fraction = Math.max(0, Math.min(1, secondsLeft / total));
    progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction));

    el.classList.toggle('is-warning', secondsLeft <= COUNTDOWN_WARN_SEC);
    el.classList.toggle('is-ticking', secondsLeft <= COUNTDOWN_TICK_SEC);

    if (value.textContent === String(shown)) return;
    value.textContent = String(shown);
    // Die Zahl bekommt in der Tick-Phase einen Punch — auch ohne Ton sieht man den Takt.
    if (shown <= COUNTDOWN_TICK_SEC && shown > 0 && !prefersReducedMotion()) {
      value.animate([{ transform: 'scale(1.28)' }, { transform: 'scale(1)' }], {
        duration: 220,
        easing: 'cubic-bezier(.34,1.56,.64,1)',
      });
    }
  };

  const frame = (now: number): void => {
    if (!running) return;
    if (startedAt === 0) startedAt = now;
    left = total - (now - startedAt) / 1000;
    render(left);

    const whole = Math.ceil(left);
    if (whole !== lastWhole && whole >= 0) {
      lastWhole = whole;
      options.onTick?.(whole, whole <= COUNTDOWN_TICK_SEC);
    }

    if (left <= 0) {
      running = false;
      options.onDone();
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  render(total);

  return {
    el,
    start() {
      if (running) return;
      running = true;
      startedAt = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get secondsLeft() {
      return Math.max(0, left);
    },
  };
}
