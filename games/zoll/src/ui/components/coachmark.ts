/**
 * Onboarding-Hinweise (Roadmap M5.4).
 *
 * Zwei Sätze, einmal pro Gerät: „0 = sauber und sicher" beim ersten Packen und
 * „Hinweise stimmen nur meistens" in der ersten Halle. Mehr nicht — das Spiel erklärt
 * sich sonst selbst kaputt, und Erfolgskriterium 1 aus dem GDD ist, dass man es nach
 * *einer* Runde ohne Erklärung versteht.
 *
 * Sie merken sich ihren Zustand im `localStorage`, nicht in der Session: Wer das Spiel
 * schon kennt, soll den Hinweis auch nach „Spieler ändern" nicht wiedersehen.
 */

import { COACHMARK_MS, STORAGE_KEY_ONBOARDING } from '@/config/rules';
import { MOTION } from '@/config/theme';
import { safeAnimate } from '../animate';

export type CoachmarkId = 'pack' | 'hall';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    /* Privater Modus — dann eben jedes Mal. Besser als gar kein Hinweis. */
    return null;
  }
}

export function wasSeen(id: CoachmarkId): boolean {
  try {
    return storage()?.getItem(`${STORAGE_KEY_ONBOARDING}.${id}`) === '1';
  } catch {
    return false;
  }
}

function markSeen(id: CoachmarkId): void {
  try {
    storage()?.setItem(`${STORAGE_KEY_ONBOARDING}.${id}`, '1');
  } catch {
    /* Quota oder gesperrt — irrelevant. */
  }
}

/** Nur für Tests und das Dev-Panel. */
export function resetCoachmarks(): void {
  for (const id of ['pack', 'hall'] as CoachmarkId[]) {
    try {
      storage()?.removeItem(`${STORAGE_KEY_ONBOARDING}.${id}`);
    } catch {
      /* egal */
    }
  }
}

/**
 * Zeigt den Hinweis, falls er noch nie gezeigt wurde.
 *
 * `role="status"`: Ein Screenreader liest ihn mit, ohne dass der Fokus wegspringt — der
 * Hinweis ist eine Beobachtung, keine Aufforderung.
 */
export function showCoachmark(host: HTMLElement, id: CoachmarkId, text: string): void {
  if (wasSeen(id)) return;
  markSeen(id);

  const el = document.createElement('p');
  el.className = 'coachmark';
  el.dataset.coachmark = id;
  el.setAttribute('role', 'status');
  el.textContent = text;
  host.append(el);

  const dismiss = (): void => {
    void safeAnimate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: MOTION.fast,
      fill: 'forwards',
    }).then(() => el.remove());
  };

  el.addEventListener('click', dismiss);
  globalThis.setTimeout(dismiss, COACHMARK_MS);

  void safeAnimate(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
    duration: MOTION.base,
    easing: 'cubic-bezier(.2,.9,.3,1.2)',
    fill: 'both',
  });
}
