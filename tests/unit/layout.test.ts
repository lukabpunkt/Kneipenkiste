/**
 * Halbkreis-Layout der Buehne (Art Direction §6, Audit A2).
 *
 * Der A2-Check "Halbkreis-Layout bei 3 und bei 8 Spielern ohne Ueberlappung" ist hier ein
 * Test und kein Blick auf einen Screenshot: `layoutStage()` ist eine reine Funktion, also
 * laesst sich die Frage rechnen statt schauen.
 */

import { describe, expect, it } from 'vitest';
import { cardScaleFor, STAGE } from '@/config/theme';
import { layoutStage, minSeatDistance, ARC_CENTER } from '@/game/layout';

describe('layoutStage', () => {
  it('setzt so viele Plaetze wie Spieler', () => {
    for (let n = 3; n <= 8; n++) {
      expect(layoutStage(n).seats).toHaveLength(n);
    }
  });

  it('legt die Karten auf einem Bogen um die Tischmitte', () => {
    const layout = layoutStage(6);
    for (const seat of layout.seats) {
      const dx = seat.card.x - ARC_CENTER.x;
      const dy = seat.card.y - ARC_CENTER.y;
      // Der Bogen ist gestaucht, deshalb kein Kreis — aber die Breite steht fest.
      expect(Math.abs(dx)).toBeLessThanOrEqual(STAGE.arcRadius + 1);
      expect(dy).toBeGreaterThan(0);
    }
  });

  it('ordnet die Plaetze von links nach rechts', () => {
    const layout = layoutStage(8);
    const xs = layout.seats.map((seat) => seat.card.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it('haelt alles im Bild — auch bei acht Spielern', () => {
    for (let n = 3; n <= 8; n++) {
      const layout = layoutStage(n);
      for (const seat of layout.seats) {
        expect(seat.card.x - layout.cardWidth / 2).toBeGreaterThan(0);
        expect(seat.card.x + layout.cardWidth / 2).toBeLessThan(STAGE.worldSize);
        expect(seat.card.y).toBeGreaterThan(0);
        expect(seat.card.y).toBeLessThan(STAGE.worldSize);
        // Die Crooks stehen hinter ihren Karten, nie davor.
        expect(seat.crook.y).toBeLessThan(seat.card.y);
      }
    }
  });

  it('laesst benachbarte Karten nicht ueberlappen (Audit A2)', () => {
    /*
     * Gemessen wird gegen die Karten**hoehe**, nicht die Breite: An den Bogenenden liegen
     * zwei Nachbarn fast uebereinander. Ein Test gegen die Breite haette hier gruenes
     * Licht gegeben, obwohl sich die Karten auf dem Schirm sichtbar geschnitten haben.
     */
    for (let n = 3; n <= 8; n++) {
      const layout = layoutStage(n);
      expect(minSeatDistance(layout)).toBeGreaterThan(layout.cardHeight);
    }
  });

  it('leitet die Kartenhoehe aus dem Sprite-Seitenverhaeltnis ab', () => {
    const layout = layoutStage(5);
    expect(layout.cardHeight).toBeCloseTo(layout.cardWidth * (340 / 256), 5);
  });

  it('verkleinert die Karten ab sieben Spielern, nicht den Bogen', () => {
    const six = layoutStage(6);
    const eight = layoutStage(8);
    expect(eight.cardWidth).toBeLessThan(six.cardWidth);
    expect(eight.cardWidth / six.cardWidth).toBeCloseTo(cardScaleFor(8), 5);
    // Die aeusseren Plaetze liegen bei beiden gleich weit aussen.
    expect(eight.seats[0]!.card.x).toBeCloseTo(six.seats[0]!.card.x, 5);
  });

  it('macht die Crooks bei mehr Spielern kleiner', () => {
    expect(layoutStage(8).crookHeight).toBeLessThan(layoutStage(3).crookHeight);
  });

  it('stellt einen einzelnen Spieler mittig', () => {
    const layout = layoutStage(1);
    expect(layout.seats[0]!.card.x).toBeCloseTo(ARC_CENTER.x, 5);
    expect(minSeatDistance(layout)).toBe(Number.POSITIVE_INFINITY);
  });

  it('stellt Tresor und Kassel an feste Plaetze', () => {
    const layout = layoutStage(5);
    expect(layout.vault.x).toBe(STAGE.worldSize / 2);
    // Der Tresor steht hinten, die Karten liegen vorn.
    expect(layout.vault.y).toBeLessThan(layout.seats[0]!.card.y);
    // Kassel steht rechts neben dem Tresor (Art Direction §6).
    expect(layout.kassel.x).toBeGreaterThan(layout.vault.x);
  });

  it('kommt mit null Spielern klar', () => {
    expect(() => layoutStage(0)).not.toThrow();
    expect(layoutStage(0).seats).toHaveLength(1);
  });
});
