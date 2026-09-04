/**
 * Installations-Hinweis (Roadmap M6.3).
 *
 * Das Spiel ist eine PWA. Auf dem Startbildschirm laeuft es im Vollbild, startet in
 * Millisekunden und funktioniert offline — genau das, was ein Trinkspiel braucht, das
 * jeden Freitag noch einmal herausgeholt wird.
 *
 * Gefragt wird **nach der zweiten Runde**, nicht beim Start. Wer beim ersten Oeffnen nach
 * einer Installation gefragt wird, sagt Nein, weil er noch nicht weiss, ob er das Ding
 * behalten will. Nach zwei Runden weiss er es.
 *
 * Chrome liefert dafuer `beforeinstallprompt` und erwartet, dass wir das Ereignis
 * aufheben und spaeter aus einer echten Nutzergeste heraus abfeuern. Safari kennt es
 * nicht — dort passiert schlicht nichts, und das ist in Ordnung: iOS-Nutzer installieren
 * ueber "Zum Home-Bildschirm", und eine Anleitung dafuer waere ein Absatz Text auf einem
 * Screen, der gerade ein Ergebnis zeigt.
 */

import { STORAGE_KEY_INSTALL } from '@/config/rules';

/** Chrome-eigenes Ereignis; nicht in der Standard-Typdefinition. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pending: InstallPromptEvent | undefined;

/** Muss frueh laufen — das Ereignis kommt einmal und wartet nicht. */
export function watchInstallPrompt(): void {
  globalThis.addEventListener('beforeinstallprompt', (event) => {
    // Ohne das zeigt Chrome sein eigenes Banner mitten im Spiel.
    event.preventDefault();
    pending = event as InstallPromptEvent;
  });

  // Danach nie wieder fragen.
  globalThis.addEventListener('appinstalled', () => {
    pending = undefined;
    remember();
  });
}

function asked(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY_INSTALL) === '1';
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY_INSTALL, '1');
  } catch {
    // Kein Speicher: Dann fragt es beim naechsten Mal noch einmal. Verkraftbar.
  }
}

/** Laeuft die App schon vom Startbildschirm? Dann ist die Frage erledigt. */
function installed(): boolean {
  try {
    return globalThis.matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

/** Ob jetzt gefragt werden darf: Angebot da, noch nie gefragt, nicht schon installiert. */
export function canOfferInstall(): boolean {
  return pending !== undefined && !asked() && !installed();
}

/**
 * Zeigt Chromes Installationsdialog. Muss aus einer Nutzergeste heraus laufen.
 *
 * Gibt zurueck, ob installiert wurde. Egal wie die Antwort ausfaellt: Gefragt wird genau
 * einmal — ein zweites Mal waere Betteln.
 */
export async function offerInstall(): Promise<boolean> {
  const event = pending;
  if (!event) return false;
  pending = undefined;
  remember();

  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
}

/** Nur fuer Tests. */
export function resetInstallPrompt(): void {
  pending = undefined;
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY_INSTALL);
  } catch {
    // egal
  }
}
