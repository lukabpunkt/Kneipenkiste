/**
 * Split-Flap-Zaehler (Art Direction §3).
 *
 * Ziffern auf dunklen Klappen wie an einem Bahnhof. Jede Aenderung klappt um — 120 ms,
 * `back.out`. Der Effekt ist der Punkt: Der Tresorstand soll sich *bewegen*, wenn er
 * waechst, sonst merkt niemand, dass der Einsatz gestiegen ist.
 */

import { FLIP_COUNTER } from '@/config/theme';
import { prefersReducedMotion } from '@/ui/animate';

export interface FlipCounter {
  el: HTMLElement;
  /** Setzt den Wert; nur geaenderte Ziffern klappen. */
  set(value: number): void;
  readonly value: number;
}

export interface FlipCounterOptions {
  value: number;
  /** Text unter den Klappen, z. B. "SCHLÜCKE". */
  label?: string;
  /** Mindestanzahl Stellen — verhindert, dass die Anzeige beim Wechsel springt. */
  minDigits?: number;
}

export function createFlipCounter(options: FlipCounterOptions): FlipCounter {
  const minDigits = options.minDigits ?? 1;

  const el = document.createElement('div');
  el.className = 'flip';

  const digits = document.createElement('div');
  digits.className = 'flip__digits';
  el.append(digits);

  if (options.label !== undefined) {
    const label = document.createElement('span');
    label.className = 'flip__label';
    label.textContent = options.label;
    el.append(label);
  }

  let value = options.value;

  const render = (next: number, animate: boolean): void => {
    const text = String(Math.max(0, Math.round(next))).padStart(minDigits, '0');
    // Die Zahl als Ganzes fuer Screenreader — nicht Ziffer fuer Ziffer.
    digits.setAttribute('aria-label', String(next));
    digits.setAttribute('role', 'status');

    // Stellenzahl anpassen, ohne bestehende Klappen zu verlieren.
    while (digits.children.length > text.length) digits.lastElementChild?.remove();
    while (digits.children.length < text.length) {
      const flap = document.createElement('span');
      flap.className = 'flip__flap';
      flap.setAttribute('aria-hidden', 'true');
      digits.append(flap);
    }

    text.split('').forEach((digit, i) => {
      const flap = digits.children[i] as HTMLElement;
      if (flap.textContent === digit) return;
      flap.textContent = digit;
      if (!animate || prefersReducedMotion() || typeof flap.animate !== 'function') return;
      flap.animate(
        [
          { transform: 'perspective(200px) rotateX(-90deg)', opacity: 0.3 },
          { transform: 'perspective(200px) rotateX(0deg)', opacity: 1 },
        ],
        { duration: FLIP_COUNTER.flapMs, easing: 'cubic-bezier(.34,1.56,.64,1)' }
      );
    });
  };

  render(value, false);

  return {
    el,
    set(next) {
      if (next === value) return;
      value = next;
      render(next, true);
    },
    get value() {
      return value;
    },
  };
}
