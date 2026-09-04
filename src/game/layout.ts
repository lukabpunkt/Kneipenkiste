/**
 * Kofferaufstellung (ADR-13) — reine Geometrie, kein PIXI.
 *
 * Bewusst ein eigenes Modul: Ob sieben Tippflächen auf ein Handy passen, ist eine
 * Rechenfrage, und sie soll ohne Renderer prüfbar sein. `xray.test.ts` rechnet sie
 * für das schmalste Referenzgerät nach.
 */

import { LAYOUT } from '@/config/theme';



export interface SuitcaseSlot {
  x: number;
  y: number;
  /** Breite der Grafik. */
  width: number;
  /**
   * Abstand zum Nachbarn in derselben Reihe. Die Trefferflaeche darf nie breiter werden —
   * zwei ueberlappende Flaechen sind schlimmer als eine kleine, weil dann der falsche
   * Koffer aufgeht.
   */
  spacing: number;
  back: boolean;
}

/**
 * Verteilt `count` Koffer auf ein oder zwei Reihen.
 *
 * Der Grund für die zweite Reihe ist Arithmetik, nicht Geschmack: Sieben Tippflächen von
 * je 56 px brauchen 392 px nebeneinander — mehr, als ein iPhone 12 breit ist. Zwei Reihen
 * halbieren das Problem und kosten nichts, weil das Band ohnehin Tiefe hat.
 */
export function layoutSuitcases(count: number): SuitcaseSlot[] {
  const { left, right, rowFront, rowBack, maxWidth, twoRowsFrom, backScale } = LAYOUT.suitcases;
  const span = right - left;

  const twoRows = count >= twoRowsFrom;
  const frontCount = twoRows ? Math.ceil(count / 2) : count;

  const place = (
    index: number,
    inRow: number,
    y: number,
    scale: number,
    inset: number
  ): SuitcaseSlot => {
    const from = left + inset;
    const to = right - inset;
    const usable = to - from;
    const slot = inRow > 1 ? usable / (inRow - 1) : usable;
    const width = Math.min(maxWidth, (span / Math.max(1, inRow - 0.25)) * 0.9) * scale;
    return {
      x: inRow > 1 ? from + slot * index : (from + to) / 2,
      y,
      width,
      spacing: slot,
      back: scale !== 1,
    };
  };

  /*
   * Kein Versatz nötig: Die beiden Reihen liegen weit genug auseinander (Band und Boden
   * davor), sodass die hinteren Gepäckanhänger frei stehen.
   */
  const backInset = 0;

  return Array.from({ length: count }, (_, index) =>
    index < frontCount
      ? place(index, frontCount, rowFront, 1, 0)
      : place(index - frontCount, count - frontCount, rowBack, backScale, backInset)
  );
}
