/**
 * Kurze Meldung am oberen Rand (z. B. "Zeit um — Balken 4 fuer dich gewaehlt").
 *
 * `role="status"`, damit Screenreader sie mitbekommen, ohne den Fokus zu klauen.
 */

import { MOTION } from '@/config/theme';
import { safeAnimate } from '../animate';

const TOAST_MS = 2600;

export function showToast(host: HTMLElement, message: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  host.append(el);

  void safeAnimate(el, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], {
    duration: MOTION.base,
    easing: 'cubic-bezier(.2,.9,.3,1.2)',
    fill: 'both',
  });

  globalThis.setTimeout(() => {
    void safeAnimate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: MOTION.fast,
      fill: 'forwards',
    }).then(() => el.remove());
  }, TOAST_MS);
}
