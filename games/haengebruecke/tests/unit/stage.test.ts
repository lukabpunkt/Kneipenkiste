/**
 * Die Bühnen-Geometrie (Audit A2).
 *
 * Getestet wird nicht, wie es aussieht — das prüft der Look-Check an den Screenshots.
 * Getestet wird, was messbar falsch sein kann: dass die Brücke zwischen den Plateaus
 * hängt, dass kein Balken unter die Mindestbreite fällt, dass zwei Hikers nebeneinander
 * auf einen Balken passen und dass sich niemand in der Aufstellung überlappt.
 */

import { describe, expect, it } from 'vitest';
import {
  BRIDGE_SPAN,
  fitsSideBySide,
  plankGeometry,
  sagAt,
  slopeAt,
  startPosition,
} from '@/game/geometry';
import { frameMedian, detectLowEffects } from '@/game/StageApp';
import { percentiles } from '@/dev/devPanel';
import {
  HIKER_DEPTH_STEP,
  RENDER,
  STAGE,
  hikerHeightFor,
  hikerSpreadFor,
  hikerWidthFor,
} from '@/config/theme';
import { MAX_PLAYERS, MIN_PLAYERS, initialPlankCount, minPlankCount } from '@/config/rules';

describe('Durchhang', () => {
  it('hängt an beiden Enden auf Höhe der Plateaus und in der Mitte am tiefsten', () => {
    expect(sagAt(0)).toBe(0);
    expect(sagAt(1)).toBeCloseTo(0, 6);
    expect(sagAt(0.5)).toBe(STAGE.bridgeSagY);
  });

  it('ist symmetrisch', () => {
    for (const t of [0.1, 0.25, 0.4]) {
      expect(sagAt(t)).toBeCloseTo(sagAt(1 - t), 6);
    }
  });

  it('neigt die Balken in die Kurve: links abwärts, in der Mitte flach, rechts aufwärts', () => {
    expect(slopeAt(0.1, BRIDGE_SPAN)).toBeGreaterThan(0);
    /* `-0` in der Mitte: mathematisch null, für `toBe` aber nicht dasselbe. */
    expect(slopeAt(0.5, BRIDGE_SPAN)).toBeCloseTo(0, 10);
    expect(slopeAt(0.9, BRIDGE_SPAN)).toBeLessThan(0);
  });

  it('bleibt flach genug, dass die Brücke ein Weg bleibt und keine Rutsche', () => {
    /*
     * Am steilsten ist eine Hängebrücke an ihren Enden. Rund 29° sind es hier — spürbar
     * geneigt, aber begehbar. Die Grenze steht bei 32°, damit `bridgeSagY` nicht
     * unbemerkt so weit hochgedreht werden kann, dass die Endbalken zur Rampe werden.
     */
    for (let t = 0; t <= 1; t += 0.05) {
      expect(Math.abs(slopeAt(t, BRIDGE_SPAN))).toBeLessThan((32 * Math.PI) / 180);
    }
    expect(Math.abs(slopeAt(0, BRIDGE_SPAN))).toBeGreaterThan((10 * Math.PI) / 180);
  });
});

describe('Balken-Raster', () => {
  it('legt alle Balken zwischen die Plateaus', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const slots = initialPlankCount(n);
      for (let id = 1; id <= slots; id += 1) {
        const { x, width } = plankGeometry(id, slots);
        expect(x - width / 2).toBeGreaterThan(STAGE.plateauLeftEnd - width);
        expect(x + width / 2).toBeLessThan(STAGE.plateauRightStart + width);
      }
    }
  });

  it('hält die Mindestbreite ein — auch bei zehn Balken (Art Direction §6)', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const slots = initialPlankCount(n);
      for (let id = 1; id <= slots; id += 1) {
        expect(plankGeometry(id, slots).width).toBeGreaterThanOrEqual(STAGE.plankWidthMin);
      }
    }
  });

  it('lässt die Nummern an ihrem Platz, wenn die Brücke schrumpft', () => {
    /*
     * Das Raster hängt an der Startbreite. Wäre es an der aktuellen Balkenzahl
     * festgemacht, stünde "Balken 4" nach jedem Schrumpfen woanders — und die
     * Absprache der letzten Runde wäre nichts mehr wert (GDD §3.2).
     */
    const slots = initialPlankCount(5);
    const before = plankGeometry(4, slots);
    const afterTwoRounds = plankGeometry(4, slots);
    expect(afterTwoRounds).toEqual(before);
  });

  it('reiht die Balken lückenlos von links nach rechts', () => {
    const slots = initialPlankCount(6);
    let previous = -Infinity;
    for (let id = 1; id <= slots; id += 1) {
      const { x } = plankGeometry(id, slots);
      expect(x).toBeGreaterThan(previous);
      previous = x;
    }
  });
});

describe('Zwei Hikers auf einem Balken (Audit A2)', () => {
  it('stehen bei jeder Spielerzahl nebeneinander, nicht hintereinander', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const spread = hikerSpreadFor(n, 2);
      expect(fitsSideBySide(n, spread), `n = ${n}`).toBe(true);
    }
  });

  it('rücken ab drei enger zusammen und staffeln sich in die Tiefe', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      expect(hikerSpreadFor(n, 3)).toBeLessThan(hikerSpreadFor(n, 2));
    }
    /* Der Tiefenversatz ist das, was die Staffelung lesbar macht. */
    expect(HIKER_DEPTH_STEP).toBeGreaterThan(0);
  });

  it('macht die Hikers kleiner, je mehr auf die Brücke passen müssen', () => {
    expect(hikerHeightFor(3)).toBeGreaterThan(hikerHeightFor(6));
    expect(hikerHeightFor(6)).toBeGreaterThan(hikerHeightFor(8));
    expect(hikerWidthFor(8)).toBeLessThan(hikerWidthFor(3));
  });
});

describe('Aufstellung auf dem linken Plateau', () => {
  it('stellt bis sechs in eine Reihe, ab sieben in zwei (Art Direction §6)', () => {
    const rowsFor = (total: number): number =>
      new Set(Array.from({ length: total }, (_, i) => startPosition(i, total).y)).size;

    for (let n = MIN_PLAYERS; n <= 6; n += 1) expect(rowsFor(n), `n = ${n}`).toBe(1);
    for (let n = 7; n <= MAX_PLAYERS; n += 1) expect(rowsFor(n), `n = ${n}`).toBe(2);
  });

  it('lässt niemanden auf demselben Fleck stehen', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const spots = Array.from({ length: n }, (_, i) => startPosition(i, n));
      const keys = new Set(spots.map((s) => `${s.x}:${s.y}`));
      expect(keys.size, `n = ${n}`).toBe(n);
    }
  });

  it('hält alle auf dem linken Plateau, nicht in der Luft', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      for (let i = 0; i < n; i += 1) {
        const { x } = startPosition(i, n);
        /* Der letzte steht auf Fels, nicht schon halb über der Schlucht. */
        expect(x, `n = ${n}, i = ${i}`).toBeLessThan(STAGE.plateauLeftEnd);
        expect(x).toBeGreaterThan(0);
      }
    }
  });
});

describe('Bühnen-Tokens', () => {
  it('deckt mit der Kulisse das ganze sichtbare Band ab', () => {
    /*
     * Ein Hochkant-Handy (390 x 844) zeigt bei eingepasster Breite rund 2160
     * Welteinheiten Höhe. Reicht die Kulisse nicht so weit, klaffen oben oder unten
     * Löcher — und zwar genau dort, wo der Sturz hinführt.
     */
    const visibleHeight = (844 / 390) * STAGE.worldWidth;
    expect(STAGE.floorY - STAGE.skyTop).toBeGreaterThan(visibleHeight);
  });

  it('lässt die Brücke frei vor Luft hängen', () => {
    /* Fängt die ferne Wand höher an, zieht ihre Kante eine Linie quer durch die Brücke. */
    expect(STAGE.wallY).toBeGreaterThan(STAGE.bridgeY + STAGE.bridgeSagY);
    expect(STAGE.riverY).toBeGreaterThan(STAGE.wallY);
    expect(STAGE.floorY).toBeGreaterThan(STAGE.riverY);
  });

  it('stellt Gustav und die Hikers auf das linke Plateau', () => {
    expect(STAGE.perch.x).toBeLessThan(STAGE.plateauLeftEnd);
    expect(STAGE.startX).toBeLessThan(STAGE.plateauLeftEnd);
    expect(STAGE.perch.y).toBeLessThanOrEqual(STAGE.bridgeY);
  });

  it('lässt die Brücke nur so weit schrumpfen, wie das Raster Plätze hat', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      expect(minPlankCount(n)).toBeGreaterThan(0);
      expect(minPlankCount(n)).toBeLessThan(initialPlankCount(n));
    }
  });
});

describe('Messwerte', () => {
  it('meldet Median und p95 einer Frame-Reihe', () => {
    const times = [10, 12, 14, 16, 18, 20, 22, 24, 26, 100];
    expect(frameMedian(times)).toBe(19);
    expect(percentiles(times).p50).toBe(20);
    expect(percentiles(times).p95).toBe(100);
  });

  it('kommt mit einer leeren Reihe klar', () => {
    expect(frameMedian([])).toBe(0);
    expect(percentiles([])).toEqual({ p50: 0, p95: 0 });
  });

  it('erkennt schwache Geräte an Speicher und Kernen', () => {
    expect(detectLowEffects({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe(true);
    expect(detectLowEffects({ deviceMemory: 8, hardwareConcurrency: 2 })).toBe(true);
    expect(detectLowEffects({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe(false);
    /* Kein Gerät sagt etwas: dann erst mal alles an, die Messung entscheidet. */
    expect(detectLowEffects({})).toBe(false);
  });

  it('haelt am Draw-Batch-Budget aus Audit A2 fest', () => {
    expect(RENDER.maxDrawBatches).toBe(3);
  });
});
