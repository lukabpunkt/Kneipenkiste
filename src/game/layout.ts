/**
 * Halbkreis-Layout der Karten und Crooks (Art Direction §6).
 *
 * Die Karten liegen auf dem Samttisch in einem Halbkreis, die Crooks stehen dahinter.
 * Der Radius bleibt fest; bei sieben und acht Spielern werden die **Karten** kleiner,
 * nicht der Kreis — sonst wandern die Aussenplaetze aus dem Bild.
 *
 * Der Bogen ist bewusst flach (kein halber Kreis): Auf einem 9:16-Display braucht man die
 * Hoehe fuer den Tresor, und ein zu tiefer Bogen schiebt die Randkarten in die Ecken.
 */

import { cardScaleFor, crookHeightFor, STAGE } from '@/config/theme';

/** Wo die Mitte des Bogens sitzt (Welteinheiten). */
export const ARC_CENTER = { x: STAGE.worldSize / 2, y: STAGE.worldSize * 0.5 } as const;

/**
 * Wie flach der Bogen ist: 1 = Halbkreis, kleiner = flacher.
 *
 * Die vier Werte hier haengen zusammen und sind gemeinsam gewaehlt worden: Sie sind das
 * kompakteste Bogenprofil, bei dem sich auch bei **acht** Spielern keine zwei Karten
 * beruehren und trotzdem jede Karte breit genug bleibt, um "TEILEN" zu lesen.
 *
 * Massgeblich ist dabei die Karten**hoehe**, nicht die Breite: An den Bogenenden liegen
 * zwei Nachbarn fast uebereinander, und dort entscheidet die lange Kartenseite darueber,
 * ob sich etwas ueberlappt. Wer einen Wert aendert, bringt `layout.test.ts` zu Fall —
 * das ist Absicht.
 */
const ARC_FLATTEN = 1;

/** Der Bogen spannt sich ueber diesen Winkelbereich (Radiant), symmetrisch nach unten. */
const ARC_SPREAD = Math.PI * 0.95;

/** Nennbreite einer Karte in Welteinheiten bei drei bis sechs Spielern. */
const CARD_WIDTH = 140;

/** Seitenverhaeltnis der Karten-Sprites (256 x 340, Art Direction §5.1). */
export const CARD_ASPECT = 340 / 256;

/** Wie weit die Crooks hinter ihren Karten stehen (Welteinheiten). */
const CROOK_OFFSET = 210;

export interface SeatLayout {
  /** Position der Karte auf dem Tisch. */
  card: { x: number; y: number; rotation: number };
  /** Standpunkt des Crooks — der Ursprung liegt zwischen seinen Fuessen. */
  crook: { x: number; y: number };
}

export interface StageLayoutResult {
  seats: SeatLayout[];
  cardWidth: number;
  /** Abgeleitet aus `cardWidth` — die Groesse, die ueber Ueberlappung entscheidet. */
  cardHeight: number;
  crookHeight: number;
  /** Wo der Tresor steht. */
  vault: { x: number; y: number; size: number };
  /** Wo Herr Kassel steht. */
  kassel: { x: number; y: number; height: number };
}

/**
 * Rechnet das komplette Buehnenbild fuer `playerCount` Spieler aus.
 *
 * Reine Funktion: Sie laesst sich ohne PIXI testen — und der A2-Check "kein Ueberlappen
 * bei 3 und bei 8 Spielern" ist damit ein Unit-Test statt eines Blicks auf einen Screenshot.
 */
export function layoutStage(playerCount: number): StageLayoutResult {
  const count = Math.max(1, playerCount);
  const cardWidth = CARD_WIDTH * cardScaleFor(count);
  const crookHeight = crookHeightFor(count);
  const radius = STAGE.arcRadius;

  const seats: SeatLayout[] = [];
  for (let i = 0; i < count; i++) {
    /*
     * Ein einzelner Spieler sitzt mittig; ab zwei wird der Bogen gleichmaessig aufgeteilt.
     * `angle` laeuft von links (-) nach rechts (+), 0 zeigt nach unten zur Kamera.
     */
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = (t - 0.5) * ARC_SPREAD;

    const x = ARC_CENTER.x + Math.sin(angle) * radius;
    const y = ARC_CENTER.y + Math.cos(angle) * radius * ARC_FLATTEN;

    seats.push({
      /*
       * Leicht gedreht — ein Halbkreis, kein Lineal. Aber nur leicht: Eine stark
       * gedrehte Karte hat eine viel groessere Huellflaeche und schiebt sich damit
       * ueber ihre Nachbarn, obwohl die Mittelpunkte weit genug auseinanderliegen.
       */
      card: { x, y, rotation: angle * 0.16 },
      crook: { x: x + Math.sin(angle) * 20, y: y - CROOK_OFFSET },
    });
  }

  return {
    seats,
    cardWidth,
    cardHeight: cardWidth * CARD_ASPECT,
    crookHeight,
    vault: { x: STAGE.worldSize / 2, y: STAGE.worldSize * 0.2, size: STAGE.worldSize * 0.34 },
    kassel: {
      /*
       * Rechts neben dem Tresor und deutlich weiter hinten als der Halbkreis: Bei acht
       * Spielern reicht der Bogen bis an den Bildrand, und Kassel wuerde sonst mit dem
       * aeussersten Crook verschmelzen. Die Tiefensortierung stellt ihn hinter alle.
       */
      x: STAGE.worldSize * 0.72,
      y: STAGE.worldSize * 0.32,
      height: crookHeightFor(5),
    },
  };
}

/**
 * Kleinster Abstand zwischen zwei benachbarten Karten-Mittelpunkten.
 * Der A2-Check will wissen, ob sich bei acht Spielern noch etwas ueberlappt.
 */
export function minSeatDistance(layout: StageLayoutResult): number {
  if (layout.seats.length < 2) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < layout.seats.length; i++) {
    const a = layout.seats[i - 1]!.card;
    const b = layout.seats[i]!.card;
    min = Math.min(min, Math.hypot(b.x - a.x, b.y - a.y));
  }
  return min;
}
