/**
 * Haptik (GDD §5, Roadmap M1.6 als Stub, M5.5 final).
 *
 * `navigator.vibrate` gibt es auf iOS nicht — das ist kein Fehlerfall, sondern der
 * Normalfall. Deshalb still fehlschlagen und nie werfen (Audit A5).
 */

export const HAPTIC_PATTERNS = {
  tap: 12,
  /** Karte versiegelt — der Stempel. */
  seal: [12, 40, 18],
  /** Eine Münze fliegt in ein Badge (Verteil-UI). */
  coin: 8,
  /**
   * Die letzte Karte dreht sich (GDD §5). Kurz und hart: Der Moment gehört den Augen,
   * die Hand bekommt nur den Anstoß.
   */
  lastCard: [40, 60, 40],
  /** Ein Dieb liegt offen. */
  alarm: 60,
  /**
   * Der Tresor platzt. Das laengste Muster im Spiel — dreimal so lang wie alles andere,
   * weil der Jackpot dreimal so selten ist.
   */
  jackpot: [30, 40, 30, 40, 90, 60, 140],
  /** Der Stempel bei Meineid: zwei harte Schlaege, dazwischen nichts. */
  perjury: [70, 90, 110],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function vibrate(pattern: HapticPattern): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(HAPTIC_PATTERNS[pattern] as number | number[]);
  } catch {
    // Geraet kann nicht vibrieren — irrelevant fuer das Spiel.
  }
}
