/**
 * Geometrie und Timing der Buehne (Roadmap M2.3/M2.4, Audit A2).
 *
 * Was hier geprueft wird, ist bewusst **rechenbar**: Ob das Feld gut aussieht, sagt der
 * Look-Check; ob die Platten gross genug sind und der Farbring rechtzeitig kommt, sagen
 * Zahlen. PIXI selbst laeuft in jsdom nicht — der Rest steht im E2E- und Perf-Test.
 */

import { describe, expect, it } from 'vitest';
import { EXPLOSION, ANTICIPATION, ANTICIPATION_TOTAL_MS, REPLAY } from '@/config/choreo';
import { boardSizeFor, cellCount } from '@/config/rules';
import { ANIM, FIELD_LAYOUT, STAGE, TOUCH, diggerHeightFor } from '@/config/theme';
import { chebyshev } from '@/core/board';

/** Referenzgeraet aus CLAUDE.md: iPhone 11/12 und Pixel 4a/5 liegen bei 390–393 px. */
const DEVICE_WIDTH_PX = 390;
/**
 * Was davon beim Canvas ankommt: 12 px Screen-Padding je Seite, davon holt sich
 * `.stage-host` 10 px per negativem Margin zurueck — bleiben 2 px Rand
 * (`styles/components.css`). Der E2E-Test misst denselben Wert am echten Geraet nach.
 */
const CANVAS_WIDTH_PX = DEVICE_WIDTH_PX - 2 * 2;

/** Wieviele Bildschirm-Pixel eine Welteinheit auf dem Referenzgeraet bekommt. */
const PX_PER_UNIT = CANVAS_WIDTH_PX / STAGE.worldSize;

describe('Feld-Geometrie (ADR-12)', () => {
  it('haelt die Platten auf beiden Feldgroessen ueber 56 px (GDD §5, Audit A1/A2)', () => {
    /*
     * Der enge Fall ist 6 x 6. Waere er nicht erfuellt, muesste man auf dem Handy zielen
     * statt zu tippen — und das Feld liegt beim Spielen auf dem Tisch.
     */
    for (const size of [5, 6] as const) {
      const platePx = FIELD_LAYOUT[size].plate * PX_PER_UNIT;
      expect(platePx, `${size} × ${size}`).toBeGreaterThanOrEqual(TOUCH.minTargetPx);
    }
  });

  it('haelt den Abstand zwischen zwei Platten ueber 6 px', () => {
    for (const size of [5, 6] as const) {
      const gapPx = FIELD_LAYOUT[size].gap * PX_PER_UNIT;
      expect(gapPx, `${size} × ${size}`).toBeGreaterThanOrEqual(TOUCH.minGapPx);
    }
  });

  it('laesst das Feld in die Weltbreite passen', () => {
    for (const size of [5, 6] as const) {
      const layout = FIELD_LAYOUT[size];
      const extent = size * layout.plate + (size - 1) * layout.gap;
      expect(extent).toBeLessThanOrEqual(STAGE.worldSize);
      // ... und nutzt sie fast aus: Jeder ungenutzte Streifen fehlt der Tippflaeche.
      expect(extent / STAGE.worldSize).toBeGreaterThan(0.95);
    }
  });

  it('laesst Feld und Digger-Baenke gemeinsam in die Welthoehe passen', () => {
    /*
     * Genau daran ist die quadratische Welt gescheitert (ADR-12): Entweder die Platten
     * fielen unter 56 px, oder die Diggers standen auf dem Feld.
     */
    for (const playerCount of [3, 5, 6, 8]) {
      const size = boardSizeFor(playerCount);
      const layout = FIELD_LAYOUT[size];
      const extent = size * layout.plate + (size - 1) * layout.gap;
      const twoBenches = playerCount >= STAGE.twoBenchesFrom;
      const top = twoBenches ? STAGE.fieldTop.double : STAGE.fieldTop.single;
      const digger = diggerHeightFor(playerCount);

      // Feld plus vordere Bank plus ein Digger, der davor steht.
      const needed = top + extent + digger;
      expect(needed, `${playerCount} Spieler`).toBeLessThanOrEqual(STAGE.worldHeight);

      // Bei zwei Baenken muss der Streifen ueber dem Feld einen Digger tragen.
      if (twoBenches) expect(top).toBeGreaterThanOrEqual(digger * 0.9);
    }
  });

  it('haelt die Welt im Hochformat — sonst passt die Bank nicht (ADR-12)', () => {
    expect(STAGE.worldHeight).toBeGreaterThan(STAGE.worldSize);
  });
});

describe('Choreografie (Art Direction §6/§7)', () => {
  it('summiert die Anticipation auf die Jenga-Sekunde', () => {
    const sum =
      ANTICIPATION.walkMs + ANTICIPATION.shovelStrokes * ANTICIPATION.shovelStrokeMs + ANTICIPATION.holdMs;
    expect(ANTICIPATION_TOTAL_MS).toBe(sum);
    // "~900 ms" aus der Art Direction — nah genug, um sich richtig anzufuehlen.
    expect(ANTICIPATION_TOTAL_MS).toBeGreaterThan(700);
    expect(ANTICIPATION_TOTAL_MS).toBeLessThan(1000);
  });

  it('haelt den Farbring unter 300 ms nach dem Explosions-Frame (Design-Prioritaet 2)', () => {
    /*
     * Die wichtigste Zahl der Inszenierung: Wer schuld ist, darf nie hinter dem Gag
     * warten (CLAUDE.md). `DigDirector` setzt das Ring-Label auf genau diesen Versatz.
     */
    expect(EXPLOSION.ringDelayMs).toBeLessThanOrEqual(ANIM.colorRingMaxDelayMs);
    expect(EXPLOSION.ringDelayMs).toBeGreaterThan(0);
  });

  it('haelt die Replay-Welle unter zwei Sekunden (GDD §4.4)', () => {
    // Der laengste Weg auf 6 × 6: von einer Ecke zur anderen, fuenf Chebyshev-Ringe.
    const longest = chebyshev(0, cellCount(6) - 1, 6);
    expect(longest * REPLAY.ringStepMs).toBeLessThanOrEqual(REPLAY.maxTotalMs);
  });

  it('bleibt bei der Sequenz-Obergrenze aus Audit A3/A4', () => {
    expect(ANIM.sequenceMaxMs).toBe(3500);
    expect(ANIM.treasureMaxMs).toBe(5000);
  });
});

describe('Digger-Groesse', () => {
  it('schrumpft mit der Spielerzahl, damit die Bank nicht zugestopft wirkt', () => {
    expect(diggerHeightFor(3)).toBe(STAGE.diggerHeight.max);
    expect(diggerHeightFor(8)).toBe(STAGE.diggerHeight.min);
    expect(diggerHeightFor(5)).toBeLessThan(diggerHeightFor(3));
    expect(diggerHeightFor(5)).toBeGreaterThan(diggerHeightFor(8));
  });

  it('haelt auch acht Diggers nebeneinander auf der Bank', () => {
    // Vier vorn, vier hinten (Art Direction §5) — plus Rand.
    const perBench = 4;
    const width = diggerHeightFor(8) * 0.55;
    expect(perBench * width).toBeLessThan(STAGE.worldSize * 0.8);
  });
});
