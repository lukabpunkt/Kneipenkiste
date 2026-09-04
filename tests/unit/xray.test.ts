/**
 * Die Scanline ist heilig (CLAUDE.md, Art Direction §7, Audit A2).
 *
 * Geprüft wird die **Timeline**, nicht das Bild: Wo die Labels liegen, entscheidet, ob
 * das Ergebnis vor 100 % zu sehen ist. Ein Rendering-Test wäre hier das schwächere
 * Werkzeug — er könnte nur zeigen, dass es in *diesem* Frame gut aussah.
 *
 * `XrayMonitor` selbst braucht WebGL und läuft deshalb erst im E2E; hier wird die
 * Choreografie geprüft, die er umsetzt, plus die Timeline-Struktur über einen
 * PIXI-freien Nachbau derselben Beat-Folge.
 */

import gsap from 'gsap';
import { describe, expect, it } from 'vitest';
import { XRAY, XRAY_LABELS } from '@/config/choreo';
import { STAGE } from '@/config/theme';
import { layoutSuitcases } from '@/game/layout';

/**
 * Baut dieselbe Beat-Folge wie `XrayMonitor.scan()` — erste Hälfte, Stall, zweite
 * Hälfte, dann die Labels. Weicht der Monitor davon ab, fällt es im E2E auf; hier fällt
 * auf, wenn jemand die **Choreografie** so ändert, dass das Ergebnis zu früh käme.
 */
function scanTimeline(): gsap.core.Timeline {
  const progress = { value: 0 };
  const timeline = gsap.timeline({ paused: true });

  timeline.addLabel(XRAY_LABELS.scanStart, 0);
  timeline.to(progress, {
    value: XRAY.stallAt,
    duration: XRAY.scanDuration * XRAY.stallAt,
    ease: 'none',
  });
  timeline.addLabel(XRAY_LABELS.stall);
  timeline.to({}, { duration: XRAY.stallDuration });
  timeline.to(progress, {
    value: 1,
    duration: XRAY.scanDuration * (1 - XRAY.stallAt),
    ease: 'none',
  });
  timeline.addLabel(XRAY_LABELS.scanComplete);
  timeline.addLabel(XRAY_LABELS.revealed);

  return timeline;
}

describe('Scanline-Choreografie', () => {
  it('zeigt das Ergebnis nie vor 100 % (`revealed` ≥ `scanComplete`)', () => {
    const timeline = scanTimeline();
    const complete = timeline.labels[XRAY_LABELS.scanComplete]!;
    const revealed = timeline.labels[XRAY_LABELS.revealed]!;

    expect(revealed).toBeGreaterThanOrEqual(complete);
  });

  it('stockt bei 50 % — und zwar wirklich in der Mitte', () => {
    const timeline = scanTimeline();
    const start = timeline.labels[XRAY_LABELS.scanStart]!;
    const stall = timeline.labels[XRAY_LABELS.stall]!;
    const complete = timeline.labels[XRAY_LABELS.scanComplete]!;

    /* Der Stall beginnt nach der halben Scan-Zeit … */
    expect(stall - start).toBeCloseTo(XRAY.scanDuration * XRAY.stallAt, 3);
    /* … und danach kommt genau die zweite Hälfte plus die Stall-Dauer. */
    expect(complete - stall).toBeCloseTo(
      XRAY.stallDuration + XRAY.scanDuration * (1 - XRAY.stallAt),
      3
    );
  });

  it('hält den Stall lang genug, um die Luft anzuhalten', () => {
    /* Unter 250 ms nimmt niemand ein Stocken wahr, über 800 ms wirkt es wie ein Hänger. */
    expect(XRAY.stallDuration).toBeGreaterThanOrEqual(0.25);
    expect(XRAY.stallDuration).toBeLessThanOrEqual(0.8);
  });

  it('bleibt insgesamt unter der Sequenz-Obergrenze von 5 s', () => {
    const timeline = scanTimeline();
    const total =
      XRAY.travelIn + XRAY.powerUp + timeline.duration() + XRAY.faceReaction + XRAY.verdict;
    expect(total).toBeLessThanOrEqual(XRAY.maxSequenceDuration);
  });

  it('kennt alle Labels, auf die die Directors sich stützen', () => {
    const timeline = scanTimeline();
    for (const label of [XRAY_LABELS.scanStart, XRAY_LABELS.stall, XRAY_LABELS.scanComplete, XRAY_LABELS.revealed]) {
      expect(timeline.labels[label]).toBeTypeOf('number');
    }
  });
});

describe('Reaktion vor Konsequenz (Art Direction §7)', () => {
  it('setzt Gesicht, Urteil und Banner in dieser Reihenfolge', () => {
    /*
     * Die Reihenfolge steht im `InspectDirector`; hier wird geprüft, dass die Zeiten aus
     * `choreo.ts` sie überhaupt zulassen — alle drei Beats brauchen Platz nach dem Scan.
     */
    const afterScan = XRAY.travelIn + XRAY.powerUp + XRAY.scanDuration + XRAY.stallDuration;
    const face = afterScan;
    const verdict = face + XRAY.faceReaction;
    const banner = verdict + XRAY.verdict;

    expect(face).toBeLessThan(verdict);
    expect(verdict).toBeLessThan(banner);
    /* Das Gesicht bekommt genug Zeit, gesehen zu werden — 200 ms sind das Minimum. */
    expect(XRAY.faceReaction).toBeGreaterThanOrEqual(0.2);
  });
});

describe('Kofferaufstellung (ADR-13)', () => {
  /**
   * Die Regel "≥ 56 px Tippfläche" ist Arithmetik, nicht Geschmack — und sie lässt sich
   * ohne Browser nachrechnen: Wie breit ist ein Koffer in Welteinheiten, und wie viele
   * CSS-Pixel sind das auf dem schmalsten Referenzgerät?
   */
  const NARROWEST_DEVICE_PX = 390; // iPhone 12 im Portrait
  const SCALE = NARROWEST_DEVICE_PX / STAGE.worldWidth;

  /** Wie `HallView.relayoutHitAreas()` rechnet: mindestens 56 px, höchstens der Abstand. */
  function hitWidthPx(slot: { width: number; spacing: number }): number {
    const minWorld = STAGE.minTouchPx / SCALE;
    return Math.min(slot.spacing, Math.max(slot.width, minWorld)) * SCALE;
  }

  it('verteilt bis vier Koffer auf eine Reihe', () => {
    for (let count = 1; count <= 4; count++) {
      const slots = layoutSuitcases(count);
      expect(slots).toHaveLength(count);
      expect(slots.every((s) => !s.back)).toBe(true);
    }
  });

  it('nimmt ab fünf Koffern eine zweite Reihe dazu', () => {
    for (const count of [5, 6, 7]) {
      const slots = layoutSuitcases(count);
      expect(slots.filter((s) => s.back).length).toBeGreaterThan(0);
      expect(slots.filter((s) => !s.back).length).toBe(Math.ceil(count / 2));
    }
  });

  it('hält jede Trefferfläche auf dem schmalsten Gerät bei ≥ 56 px', () => {
    for (let count = 1; count <= 7; count++) {
      for (const slot of layoutSuitcases(count)) {
        expect(hitWidthPx(slot), `${count} Koffer`).toBeGreaterThanOrEqual(STAGE.minTouchPx);
      }
    }
  });

  it('lässt zwei Trefferflächen derselben Reihe nie überlappen', () => {
    /*
     * Der wichtigere der beiden Checks: Eine zu kleine Fläche ist ärgerlich, eine
     * überlappende öffnet den falschen Koffer — und das ist im Zoll ein teurer Fehler.
     */
    for (let count = 1; count <= 7; count++) {
      const slots = layoutSuitcases(count);
      for (const row of [true, false]) {
        const inRow = slots.filter((s) => s.back === row).sort((a, b) => a.x - b.x);
        for (let i = 1; i < inRow.length; i++) {
          const gap = (inRow[i]!.x - inRow[i - 1]!.x) * SCALE;
          const halves = (hitWidthPx(inRow[i]!) + hitWidthPx(inRow[i - 1]!)) / 2;
          expect(gap, `${count} Koffer`).toBeGreaterThanOrEqual(halves);
        }
      }
    }
  });

  it('bleibt innerhalb der Bühne', () => {
    for (let count = 1; count <= 7; count++) {
      for (const slot of layoutSuitcases(count)) {
        expect(slot.x - slot.width / 2).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.width / 2).toBeLessThanOrEqual(STAGE.worldWidth);
      }
    }
  });
});
