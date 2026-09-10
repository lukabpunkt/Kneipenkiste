/**
 * Text auf der Bühne (Sprechblasen, Schilder, Stempel).
 *
 * Die eine Stelle, an der PIXI-Text entsteht — und das aus einem Grund: In M2 blieben
 * die Balkennummern leer, weil `fontFamily` als CSS-Stack-String (`'"Luckiest Guy", …'`)
 * eine ungültige Font-Deklaration ergibt. PIXI meldet das nicht, es rendert einfach nichts.
 *
 * Zwei Regeln, die hier eingebaut sind und deshalb nirgends sonst vergessen werden können:
 * 1. `fontFamily` als **Liste**, nie als Stack-String.
 * 2. Erst rastern, wenn die Schrift geladen ist (`mountStage` wartet auf `document.fonts`).
 *
 * Und ein Kostenhinweis: Jedes `Text`-Objekt bringt seine eigene Textur mit, also einen
 * zusätzlichen Draw-Batch, solange es sichtbar ist. Was nicht übersetzt werden muss,
 * gehört in den Atlas (ADR-14) — Sprechblasen müssen.
 */

import { Text, type TextStyleFontWeight } from 'pixi.js';
import { UI_COLORS } from '@/config/theme';

/** Dieselbe Kaskade wie in `FONTS.display`, aber in der Form, die PIXI versteht. */
const DISPLAY_STACK = ['Luckiest Guy', 'Comic Sans MS', 'system-ui', 'sans-serif'];

export interface StageTextOptions {
  text: string;
  fontSize: number;
  fill?: number;
  /** Outline in `ink` — macht Text auf jedem Untergrund lesbar (Art Direction §3). */
  strokeWidth?: number;
  strokeColor?: number;
  weight?: TextStyleFontWeight;
  align?: 'left' | 'center' | 'right';
}

export function createStageText(options: StageTextOptions): Text {
  const text = new Text({
    text: options.text,
    style: {
      fontFamily: [...DISPLAY_STACK],
      fontSize: options.fontSize,
      fontWeight: options.weight ?? '400',
      fill: options.fill ?? UI_COLORS.ink,
      align: options.align ?? 'center',
      ...(options.strokeWidth
        ? { stroke: { color: options.strokeColor ?? UI_COLORS.ink, width: options.strokeWidth } }
        : {}),
    },
    /* Die Bühne wird kleiner skaliert als 1:1 — ohne höhere Auflösung wird Text matschig. */
    resolution: 3,
  });
  text.anchor.set(0.5);
  return text;
}
