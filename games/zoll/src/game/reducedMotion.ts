/**
 * „Bewegung reduzieren" für die Bühne.
 *
 * Der Schalter selbst steht in `ui/motion.ts` und ist frei von Abhängigkeiten — er wird
 * schon auf dem Titel gebraucht. **Dieser** Teil greift auf GSAP zu und liegt deshalb
 * unter `src/game/`: Sonst zöge der Einstiegs-Chunk die ganze Animationsbibliothek nach
 * sich, und der Titel wartete auf 33 KB, die er nie braucht (Architektur §1).
 */

import gsap from 'gsap';
import { prefersReducedMotion, watchReducedMotion } from '@/ui/motion';

/**
 * Ersetzt die Eases durch harte Stufen.
 *
 * `gsap.globalTimeline.timeScale()` wäre der einfache Weg — aber ein beschleunigtes
 * Schütteln ist immer noch ein Schütteln. `steps(1)` springt stattdessen am Ende auf den
 * Zielwert: Die Dauer bleibt, damit die Reihenfolge der Beats erhalten bleibt. Was die
 * Timeline erzählt, erzählt sie weiterhin — nur ohne Bewegung dazwischen.
 */
export function applyReducedMotionToGsap(reduced: boolean): void {
  gsap.defaults({ ease: reduced ? 'steps(1)' : 'power1.out' });
}

/** Setzt die Einstellung und folgt ihr, wenn sie sich mitten im Spiel ändert. */
export function syncReducedMotion(): () => void {
  applyReducedMotionToGsap(prefersReducedMotion());
  return watchReducedMotion(applyReducedMotionToGsap);
}
