/**
 * Hit-Stop — das siebte Animationsprinzip (Art Direction §7).
 *
 * Ein Treffer wirkt erst hart, wenn danach kurz **nichts** passiert. 80 Millisekunden
 * Stillstand zwischen Aufprall und Erholung sind der Unterschied zwischen "der Amboss
 * ist gefallen" und "der Amboss hat wehgetan".
 *
 * Technisch ist der Hit-Stop hier eine **Luecke im Zeitplan**, keine Pause der Timeline:
 * Die Inszenierungen haengen als verschachtelte Timelines im Drehbuch des
 * `RevealDirector`, und wer eine Kind-Timeline anhaelt, haengt sich von der Uhr des
 * Vaters ab (CLAUDE.md: eine Uhr). Stattdessen bleibt die Figur in ihrer extremen Pose
 * stehen, weil erst nach dem Hit-Stop wieder ein Tween auf sie zeigt.
 *
 * `hitStop(timeline, at)` reserviert diese Luecke — sichtbar im Code und in der
 * Gesamtdauer — und gibt den Zeitpunkt zurueck, ab dem die Erholung laufen darf.
 */

import { ANIM } from '@/config/theme';

/**
 * Haelt die Zeit nach einem Treffer an.
 *
 * @param timeline Die Timeline der Inszenierung.
 * @param at Sekunde des Aufpralls.
 * @returns Sekunde, ab der die Erholung einsetzen darf.
 */
export function hitStop(timeline: gsap.core.Timeline, at: number): number {
  const seconds = ANIM.hitStopMs / 1000;
  /*
   * Der Platzhalter-Tween haelt nichts auf — er sorgt dafuer, dass die Luecke in der
   * Gesamtdauer auftaucht, auch wenn der Treffer am Ende der Sequenz sitzt. Ohne ihn
   * schnitte GSAP die Stille weg.
   */
  timeline.to({}, { duration: seconds }, at);
  return at + seconds;
}
