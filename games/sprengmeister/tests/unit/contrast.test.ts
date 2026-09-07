/**
 * Kontrast (Audit A5, WCAG 2.1 AA).
 *
 * Das Spiel liegt auf einem Tisch, in einer Wohnung, abends, oft mit halb leerem Akku
 * und heruntergedrehter Helligkeit. Wenn eine Zeile dann nicht lesbar ist, hilft kein
 * Design-Argument. Deshalb wird der Kontrast **gerechnet**, nicht geschätzt: 4,5:1 für
 * Fließtext, 3:1 für große Schrift und für die Umrisse, an denen man Spielerfarben
 * auseinanderhält.
 *
 * Gerechnet wird auf den Tokens aus `styles/tokens.css` bzw. `config/theme.ts` — den
 * Werten, die auch im Bild landen. Ein Test auf Screenshots wäre genauer und zugleich
 * nutzlos: Er sagt nicht, welcher Wert geändert werden muss.
 */

import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, TEMP_BADGE, TEMP_COLORS, UI_COLORS } from '@/config/theme';

/** Relative Leuchtdichte nach WCAG 2.1 (sRGB → linear, gewichtete Summe). */
function luminance(hex: number): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel((hex >> 16) & 0xff);
  const g = channel((hex >> 8) & 0xff);
  const b = channel(hex & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben, 1:1 bis 21:1. */
function contrast(a: number, b: number): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Wahrnehmbarer Farbabstand (CIE76 ΔE über L\*a\*b\*).
 *
 * Für „sind diese beiden Spielerfarben auseinanderzuhalten?" ist das Kontrastverhältnis
 * das falsche Maß: Rot und Blau haben fast dieselbe Leuchtdichte (1,10:1) und sind
 * trotzdem für jeden sofort verschieden. Was zählt, ist der Abstand im Farbraum —
 * und den misst ΔE. Ab etwa 25 gilt ein Unterschied als deutlich sichtbar.
 */
function deltaE(a: number, b: number): number {
  const lab = (hex: number): [number, number, number] => {
    const srgb = [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];

    // sRGB → XYZ (D65), dann XYZ → Lab.
    const [r, g, bl] = srgb;
    const x = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + bl * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;

    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };

  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const AA_TEXT = 4.5;
const AA_LARGE = 3;
/** Ab hier sind zwei Farben für ein zufälliges Auge im Halbdunkel klar verschieden. */
const DISTINCT_DELTA_E = 25;

describe('Kontrast der UI-Farben (Audit A5)', () => {
  it('rechnet nachweislich richtig', () => {
    // Die beiden Extremfälle aus der Norm — ohne sie wäre der Rest nicht überprüfbar.
    expect(contrast(0xffffff, 0x000000)).toBeCloseTo(21, 1);
    expect(contrast(0x808080, 0x808080)).toBeCloseTo(1, 5);
  });

  it('hält Fließtext auf allen drei Untergründen über 4,5:1', () => {
    for (const background of [UI_COLORS.bgDeep, UI_COLORS.bgPanel, UI_COLORS.bgPanelRaised]) {
      expect(contrast(UI_COLORS.paper, background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('hält die Schrift auf dem Primary-Knopf über 4,5:1', () => {
    // Bauhelm-Gelb mit Tinte darauf: der meistgedrückte Knopf des Spiels.
    expect(contrast(UI_COLORS.ink, UI_COLORS.hazard)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('hält die Feld-Beschriftung über der Wiese über 4,5:1', () => {
    // "Puh"-Schilder und Zahlen liegen in Tinte auf Gras.
    expect(contrast(UI_COLORS.ink, UI_COLORS.grass)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(UI_COLORS.ink, UI_COLORS.grassDark)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('trennt jeden Farbring von jedem Untergrund — durch Kontur oder durch Farbe', () => {
    /*
     * **Was hier eigentlich gemessen wird**, und zwei Anläufe, bis es stimmte.
     *
     * Erster Anlauf: Spielerfarbe gegen Wiese. Fiel durch (Rot auf Gras: 1,9:1) — und
     * war die falsche Frage, denn jede Form trägt eine Ink-Kontur (`ring.svg`: 20 px Ink
     * unter 12 px Farbe). Die Farbe berührt den Untergrund nie.
     *
     * Zweiter Anlauf: Ink-Kontur gegen jeden Untergrund. Fiel ebenfalls durch — Ink auf
     * Krater sind 1,1:1, beides ist fast schwarz.
     *
     * Beides stimmt, und zusammen ergibt es die Regel, die das Bild tatsächlich trägt:
     * Auf hellem Grund trennt die **Kontur**, auf dunklem Grund die **Farbe**. Verlangt
     * wird deshalb, dass für jeden Untergrund mindestens einer der beiden Wege 3:1
     * schafft — und genau das ist der Grund, warum ein Krater dunkel und die Wiese hell
     * sein muss.
     */
    const grounds = [UI_COLORS.grass, UI_COLORS.grassDark, UI_COLORS.crater, UI_COLORS.paper];

    for (const ground of grounds) {
      for (const color of PLAYER_COLORS) {
        const viaOutline = contrast(UI_COLORS.ink, ground);
        const viaFill = contrast(color.hex, ground);
        expect(
          Math.max(viaOutline, viaFill),
          `${color.id} auf ${ground.toString(16)}`
        ).toBeGreaterThanOrEqual(AA_LARGE);
      }
    }
  });

  it('laesst jede Spielerfarbe in ihrer Kontur lesbar bleiben', () => {
    for (const color of PLAYER_COLORS) {
      expect(contrast(color.hex, UI_COLORS.ink), color.id).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('hebt jede Spielerfarbe vom Menue-Hintergrund ab', () => {
    for (const color of PLAYER_COLORS) {
      expect(contrast(color.hex, UI_COLORS.bgPanel), color.id).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('haelt die Temperatur-Icons auf ihrem hellen Kreis lesbar', () => {
    /*
     * Auch hier traegt die Form die Lesbarkeit, nicht die Farbe: Das Icon ist in Ink
     * gezeichnet und sitzt auf `paper` (Art Direction §2), die Temperatur-Farbe ist der
     * Akzent darin. Deshalb wird die Zeichnung gegen den Kreis geprueft — und die Farbe
     * gegen ihre eigene Kontur.
     */
    expect(contrast(UI_COLORS.ink, TEMP_BADGE.fill)).toBeGreaterThanOrEqual(AA_TEXT);
    for (const temp of [TEMP_COLORS.hot, TEMP_COLORS.warm, TEMP_COLORS.cold]) {
      expect(contrast(temp, TEMP_BADGE.outline)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('haelt die drei Temperaturen voneinander unterscheidbar', () => {
    const temps = [TEMP_COLORS.hot, TEMP_COLORS.warm, TEMP_COLORS.cold];
    for (let i = 0; i < temps.length; i++) {
      for (let j = i + 1; j < temps.length; j++) {
        expect(deltaE(temps[i]!, temps[j]!)).toBeGreaterThan(DISTINCT_DELTA_E);
      }
    }
  });

  it('unterscheidet je zwei Spielerfarben deutlich genug', () => {
    /*
     * Nicht WCAG, sondern Spielregel: Zwei Ringe ueber demselben Krater muessen
     * auseinanderzuhalten sein. Gemessen wird der **Farbabstand**, nicht der Kontrast —
     * Rot und Blau liegen bei 1,10:1 Kontrast und sind trotzdem grundverschieden.
     *
     * Die Farben allein tragen die Unterscheidung ohnehin nicht: Jeder Ring traegt sein
     * Symbol (Audit A2, Deuteranopie). Zwei fast gleiche Farben waeren aber trotzdem ein
     * Fehler — sie wuerden die Symbole zur einzigen Information machen.
     */
    for (let i = 0; i < PLAYER_COLORS.length; i++) {
      for (let j = i + 1; j < PLAYER_COLORS.length; j++) {
        const a = PLAYER_COLORS[i]!;
        const b = PLAYER_COLORS[j]!;
        expect(deltaE(a.hex, b.hex), `${a.id} vs. ${b.id}`).toBeGreaterThan(DISTINCT_DELTA_E);
      }
    }
  });

  it('gibt jeder Spielerfarbe ein eigenes Symbol (Deuteranopie, Audit A2)', () => {
    const symbols = PLAYER_COLORS.map((color) => color.symbol);
    expect(new Set(symbols).size).toBe(PLAYER_COLORS.length);
  });
});
