/**
 * Haptik (GDD §5, Roadmap M5.4).
 *
 * `navigator.vibrate` gibt es auf iOS nicht — das ist kein Fehlerfall, sondern der
 * Normalfall. Deshalb still fehlschlagen und nie werfen (Audit A5).
 */

export const HAPTIC_PATTERNS = {
  tap: 12,
  confirm: [12, 40, 18],
  /** Die Wahl ist versiegelt — kein Zurueck (GDD §3.4). */
  seal: [10, 30, 10],
  /** Der gemeinsame Schritt: ein harter Schlag im Hit-Stop. */
  step: 30,
  /** Der Balken bricht. Das ist der Moment, den man im Handgelenk spuert (Roadmap M3.6). */
  snap: [60, 40, 60],
  /** Ein Balken fault ab — leiser als ein Bruch, aber zu spueren. */
  rot: 24,
  /** Stempel "FAHNENFLUCHT". */
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
