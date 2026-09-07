/**
 * Haptik (GDD §5, Roadmap M1.6 als Stub, M5.4 final).
 *
 * `navigator.vibrate` gibt es auf iOS nicht — das ist kein Fehlerfall, sondern der
 * Normalfall. Deshalb still fehlschlagen und nie werfen (Audit A5).
 */

export const HAPTIC_PATTERNS = {
  tap: 12,
  /** Eine Mine wird in die Erde geschoben, die Platte stampft sich fest. */
  bury: [12, 40, 18],
  /** Eine Flasche fliegt in ein Badge (Verteil-UI). */
  bottle: 8,
  /**
   * **Die Explosion** (Art Direction §4.3: 60 ms). Kurz und hart: Der Moment gehoert
   * den Augen, die Hand bekommt nur den Anstoss.
   */
  boom: 60,
  /** Gestapelte Minen — zwei Schlaege, damit man die zweite Explosion auch spuert. */
  boomDouble: [60, 80, 60],
  /** Blindgaenger: ein Zucken, mehr nicht. Das ist der ganze Witz. */
  dud: 20,
  /** Die Kiste springt aus dem Loch. */
  treasure: [30, 50, 30, 50, 60],
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
