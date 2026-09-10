/**
 * Die Geometrie der Bühne — reine Funktionen, kein PIXI (Architektur §8).
 *
 * Alles hier wird **einmal beim Aufbau** gerechnet, nie im Loop: Durchhang, Neigung,
 * Balkenraster, Aufstellung. Getrennt von `Bridge.ts`, weil es sich so ohne Renderer
 * prüfen lässt — und weil genau diese Zahlen den A2-Check "Layout ohne Überlappung"
 * entscheiden.
 */

import { STAGE, hikerWidthFor } from '@/config/theme';

/**
 * Der Durchhang als Parabel über der Brückenspanne, `t` in [0, 1].
 *
 * Eine echte Kettenlinie (cosh) sähe auf dieser Spannweite identisch aus und kostet einen
 * Logarithmus pro Balken — die Parabel ist hier nicht die Abkürzung, sondern die
 * ehrlichere Wahl.
 */
export function sagAt(t: number): number {
  const centered = t * 2 - 1;
  return (1 - centered * centered) * STAGE.bridgeSagY;
}

/** Die Steigung der Kurve an derselben Stelle — daraus kommt die Neigung des Balkens. */
export function slopeAt(t: number, span: number): number {
  const centered = t * 2 - 1;
  return Math.atan2(-4 * centered * STAGE.bridgeSagY, span);
}

/** Die Spannweite der Brücke zwischen den Plateaus. */
export const BRIDGE_SPAN = STAGE.plateauRightStart - STAGE.plateauLeftEnd;

export interface PlankGeometry {
  x: number;
  y: number;
  width: number;
  rotation: number;
}

/**
 * Wo Balken `id` liegt, wenn die Brücke `slots` Plätze hat.
 *
 * Das Raster hängt an der **Startbreite**, nicht an der aktuellen Balkenzahl: Sonst
 * rückten die übrigen Balken beim Schrumpfen zusammen und "Balken 4" stünde plötzlich
 * woanders. Die Lücke gehört zum Spiel (GDD §3.2).
 */
export function plankGeometry(id: number, slots: number): PlankGeometry {
  const width = BRIDGE_SPAN / slots - STAGE.plankGap;
  const t = (id - 0.5) / slots;
  return {
    x: STAGE.plateauLeftEnd + t * BRIDGE_SPAN,
    y: STAGE.bridgeY + sagAt(t),
    width: Math.max(STAGE.plankWidthMin, width),
    rotation: slopeAt(t, BRIDGE_SPAN),
  };
}

/**
 * Wo ein Hiker vor dem Start steht.
 *
 * Ab sieben Leuten wird es auf dem Plateau eng, also zweite Reihe (Art Direction §6).
 * Die hintere Reihe steht versetzt, damit niemand vollständig verdeckt ist.
 *
 * Der Abstand wird aus der Plateaubreite **gerechnet**, nicht gesetzt: Ein fester Wert
 * hat den fünften Hiker neben die Kante gestellt — und in einer Seitenansicht sieht man
 * einem Männchen nicht an, dass es eigentlich schon fällt.
 */
export function startPosition(index: number, total: number): { x: number; y: number } {
  const perRow = total >= 7 ? Math.ceil(total / 2) : total;
  const row = Math.floor(index / perRow);
  const column = index % perRow;

  const usable = STAGE.startEndX - STAGE.startX;
  const spacing = perRow > 1 ? Math.min(usable / (perRow - 1), STAGE.startSpacingMax) : 0;

  return {
    x: STAGE.startX + column * spacing + row * STAGE.startRowOffset.x,
    y: STAGE.startY + row * STAGE.startRowOffset.y,
  };
}

/**
 * Stehen zwei Hikers auf einem Balken nebeneinander, ohne sich zu verdecken?
 *
 * Der A2-Check in einer Funktion: Die Mitten müssen mindestens eine Hikerbreite
 * auseinanderliegen, sonst ist einer hinter dem anderen — und das Bild, das das Spiel
 * verkauft, ist weg (GDD §1).
 */
export function fitsSideBySide(playerCount: number, spread: number): boolean {
  return spread >= hikerWidthFor(playerCount);
}
