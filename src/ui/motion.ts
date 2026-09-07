/**
 * Bewegung reduzieren (Audit A5).
 *
 * `prefers-reduced-motion` ist keine Bitte um weniger Spaß, sondern eine medizinische
 * Einstellung — für Menschen, denen Bewegung übel wird. Deshalb wird hier nicht die
 * Hälfte weggelassen, sondern konsequent auf **Ergebnis statt Weg** umgestellt:
 * Sequenzen laufen zu Ende, aber ohne Schütteln, ohne Blinken, ohne Kamerafahrt.
 *
 * Was **bleibt**, weil es Spielregel ist und keine Deko:
 * - der zeilenweise Bildaufbau des Röntgenmonitors samt Stall (er hält das Ergebnis
 *   zurück — ohne ihn stünde es sofort da),
 * - die Reihenfolge Gesicht → Urteil → Banner,
 * - jede Zustandsänderung, die man lesen muss.
 */

let forced: boolean | undefined;

/** Nutzer hat „Bewegung reduzieren" gesetzt. */
export function prefersReducedMotion(): boolean {
  if (forced !== undefined) return forced;
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Nur für Tests und das Dev-Panel. */
export function forceReducedMotion(value: boolean | undefined): void {
  forced = value;
}

/**
 * Meldet Änderungen der Einstellung. Sie kann mitten im Spiel umgestellt werden, und
 * dann soll das Spiel folgen, statt einen Neustart zu verlangen.
 */
export function watchReducedMotion(listener: (reduced: boolean) => void): () => void {
  const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!query) return () => undefined;

  const handler = (event: MediaQueryListEvent): void => listener(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
