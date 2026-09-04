/**
 * Onboarding-Hinweise (Roadmap M5.5).
 *
 * Genau zwei Saetze im ganzen Spiel, jeder genau einmal pro Geraet: In der Verhandlung
 * "Redet. Schwoert. Luegt." und bei der geheimen Wahl "Niemand sieht das. Wirklich."
 *
 * Beide beantworten eine Frage, die man sich beim ersten Mal wirklich stellt — und die
 * das Spiel kaputt macht, wenn sie offen bleibt: Darf ich hier luegen? Und: Sieht der
 * naechste Spieler, was ich getippt habe? Alles andere lernt man beim Spielen (GDD
 * Pfeiler 4: Zero Friction).
 *
 * Der Merker liegt im `localStorage`. Faellt er aus (Private Mode), sieht man den Hinweis
 * eben jedes Mal — das ist unschoen, aber nicht kaputt.
 */

import { STORAGE_KEY_ONBOARDING } from '@/config/rules';
import { t } from '@/core/i18n';
import { safeAnimate } from '@/ui/animate';

/** Die Stellen, an denen ein Hinweis erscheinen darf. */
export type OnboardingHint = 'negotiation' | 'choice';

function seen(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY_ONBOARDING);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function markSeen(hint: OnboardingHint): void {
  try {
    const all = seen();
    all.add(hint);
    globalThis.localStorage?.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify([...all]));
  } catch {
    // Kein Speicher — dann eben jedes Mal.
  }
}

export function hasSeenHint(hint: OnboardingHint): boolean {
  return seen().has(hint);
}

/** Nur fuer Tests und den Einstellungs-Reset. */
export function forgetHints(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY_ONBOARDING);
  } catch {
    // egal
  }
}

/**
 * Haengt den Hinweis an den Screen — einmalig, selbstloeschend, ohne Bestaetigungsknopf.
 *
 * Kein Dialog: Ein Hinweis, den man wegtippen muss, ist eine Huerde vor dem Spiel. Er
 * steht da, wird gelesen und geht von selbst wieder.
 */
export function showHint(host: HTMLElement, hint: OnboardingHint, holdMs = 5200): void {
  if (hasSeenHint(hint)) return;
  markSeen(hint);

  const el = document.createElement('p');
  el.className = `onboarding onboarding--${hint}`;
  // `status` statt `alert`: Der Satz ist eine Information, kein Notfall (Audit A5).
  el.setAttribute('role', 'status');
  el.textContent = t(`onboarding.${hint}`);
  host.append(el);

  void safeAnimate(
    el,
    [
      { transform: 'translateY(12px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }
  );

  globalThis.setTimeout(() => {
    void safeAnimate(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      fill: 'forwards',
    }).then(() => el.remove());
  }, holdMs);
}
