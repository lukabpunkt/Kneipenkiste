/**
 * Haptik (GDD §5, Roadmap M5.4).
 *
 * `navigator.vibrate` gibt es auf iOS nicht — das ist kein Fehlerfall, sondern der
 * Normalfall. Deshalb still fehlschlagen und nie werfen (Audit A5).
 */

export const HAPTIC_PATTERNS = {
  tap: 12,
  confirm: [12, 40, 18],
  /** Koffer zu, Schnallen klicken. */
  suitcaseClose: [10, 30, 10],
  /** Der Scan stockt bei 50 % — ein kurzer Ruck, kein Dauerton (GDD §4.1). */
  scanStall: 18,
  /** Alarm: der Koffer springt auf. */
  alarm: [60, 40, 60],
  /** Stempel an der Schranke. */
  stamp: 40,
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
