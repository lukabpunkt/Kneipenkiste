/**
 * Einmal-Hinweise für den ersten Abend (Roadmap M5.4).
 *
 * Die Screens erklären sich weitgehend selbst — was ihnen fehlt, ist der Satz **davor**:
 * warum das Reden nichts wert ist und warum die Brücke jede Runde kleiner wird. Beides
 * steht genau einmal da und danach nie wieder; ein Hinweis, den man zum dritten Mal
 * wegtippt, ist kein Hinweis, sondern ein Hindernis.
 *
 * Bewusst **im Fluss** des Screens, nicht als Overlay: Ein Kasten über der Brücke würde
 * genau die Knöpfe verdecken, um die es geht.
 *
 * Gemerkt wird in einem eigenen Storage-Schlüssel, nicht in der Session: Eine "Session
 * zurücksetzen" soll die Runde löschen, nicht so tun, als hätte man das Spiel noch nie
 * gesehen. Ist der Storage gesperrt (Privat-Modus), erscheint der Hinweis eben jedes Mal
 * — er ist eine Hilfe, kein Zustand, an dem etwas hängt.
 */

import { t } from '@/core/i18n';

const STORAGE_KEY = 'haengebruecke.coach.v1';

export type CoachId = 'negotiation' | 'result';

function seen(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function remember(id: CoachId): void {
  try {
    const all = seen();
    all.add(id);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...all]));
  } catch {
    /* Kein Storage — dann eben jedes Mal. */
  }
}

/** Nur für Tests und den Einstellungen-Reset. */
export function forgetCoachMarks(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* egal */
  }
}

export function hasSeenCoachMark(id: CoachId): boolean {
  return seen().has(id);
}

/**
 * Baut den Hinweis — oder `null`, wenn er schon dran war.
 *
 * Der Aufrufer hängt ihn dorthin, wo er im Lesefluss steht. Er merkt sich sofort als
 * gesehen, nicht erst beim Wegtippen: Wer ihn liest und weiterspielt, hat ihn gesehen.
 */
export function createCoachMark(id: CoachId): HTMLElement | null {
  if (hasSeenCoachMark(id)) return null;
  remember(id);

  const el = document.createElement('aside');
  el.className = 'coach';
  el.dataset.coach = id;
  el.setAttribute('role', 'note');

  const text = document.createElement('p');
  text.className = 'coach__text';
  text.textContent = t(`coach.${id}`);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'coach__close';
  close.textContent = t('coach.gotIt');
  close.addEventListener('click', () => el.remove());

  el.append(text, close);
  return el;
}
