/**
 * Kamera-Ruck (Playtest-Finding 01, ADR-24).
 *
 * Der Ausschlag steht in der Art Direction als **Bildschirmgröße** — 12 px. Die Kamera
 * bewegt aber die Welt, und die wird auf das Gerät skaliert. Auf einem 390er-Handy liegt
 * dieser Faktor bei etwa 0,39; die 12 kamen deshalb als knapp 5 Pixel an, und der Ruck bei
 * der Explosion war praktisch unsichtbar. Genau das hat ein Playtester als „es explodiert
 * nichts" beschrieben.
 *
 * `shakeUnits` ist rein und exportiert, damit sich die Zahl nachrechnen lässt, ohne eine
 * PIXI-Bühne zu bauen — `Camera` importiert `Container` nur als Typ.
 */

import { describe, expect, it } from 'vitest';
import { ANIM, STAGE } from '@/config/theme';
import { shakeUnits } from '@/game/Camera';

/** Der Referenzfall aus CLAUDE.md: iPhone 11/12, 390 px breit, 2 px Rand je Seite. */
const PHONE_SCALE = (390 - 4) / STAGE.worldSize;

describe('shakeUnits', () => {
  it('laesst den Wert unveraendert, wenn die Welt 1:1 steht', () => {
    expect(shakeUnits(12, 1)).toBe(12);
  });

  it('rechnet den Ausschlag auf dem Referenzgeraet hoch', () => {
    /*
     * Die Probe aufs Exempel: Was hier herauskommt, muss nach der Rueckrechnung wieder
     * die angeforderten Bildschirmpixel ergeben.
     */
    const units = shakeUnits(ANIM.shakeAmplitudePx, PHONE_SCALE);
    expect(units * PHONE_SCALE).toBeCloseTo(ANIM.shakeAmplitudePx, 6);
    // Und der Wert liegt deutlich ueber dem, was frueher ankam.
    expect(units).toBeGreaterThan(ANIM.shakeAmplitudePx * 2);
  });

  it('deckelt den Ausschlag auf einem stark gestauchten Host', () => {
    /*
     * Ohne Deckel wuerde ein sehr kleines Fenster die halbe Buehne verschieben — die
     * Division waechst ins Unendliche, je kleiner die Skalierung wird.
     */
    expect(shakeUnits(12, 0.001)).toBe(ANIM.shakeMaxUnits);
    expect(shakeUnits(12, 0)).toBe(ANIM.shakeMaxUnits);
  });

  it('bleibt bei negativer oder unsinniger Skalierung endlich', () => {
    expect(Number.isFinite(shakeUnits(12, -1))).toBe(true);
  });

  it('haelt den Deckel unter einer halben Platte', () => {
    /*
     * Ein Ruck, der groesser ist als eine Platte, liest sich nicht mehr als Erschuetterung,
     * sondern als Fehler. Die kleinere der beiden Feldgroessen ist der enge Fall.
     */
    expect(ANIM.shakeMaxUnits).toBeLessThan(153 / 2);
  });
});
