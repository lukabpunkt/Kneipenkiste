/**
 * Teilen (Roadmap M5.3).
 *
 * Über die Web Share API — kein Umweg über die Zwischenablage, kein „Text kopiert"-Toast.
 * Gibt es sie nicht, wird der Knopf gar nicht erst angezeigt: Ein Knopf, der beim Tippen
 * nichts tut, ist schlechter als keiner.
 *
 * Geteilt wird ausschließlich Text, den das Spiel selbst formuliert hat. Kein Bild, keine
 * URL mit Daten darin, nichts über die Mitspieler außer dem Namen, den sie selbst
 * eingetippt haben — CLAUDE.md: kein Backend, keine Analytics.
 */

/*
 * `navigator.share` steht in den DOM-Typen als vorhanden — zur Laufzeit ist es das auf
 * dem Desktop meistens nicht. Deshalb hier bewusst als optional getippt.
 */
type MaybeShare = { share?: (data: { title?: string; text?: string }) => Promise<void> };

export function canShare(): boolean {
  return typeof (navigator as unknown as MaybeShare).share === 'function';
}

/**
 * Teilt den Rundentext. Bricht der Nutzer ab, wirft die API — das ist kein Fehler,
 * sondern eine Entscheidung, und wird still geschluckt.
 */
export async function shareResult(text: string): Promise<void> {
  const share = (navigator as unknown as MaybeShare).share;
  if (!share) return;

  try {
    await share({ text });
  } catch {
    /* Abgebrochen oder nicht erlaubt — beides ist in Ordnung. */
  }
}
