/**
 * Der Title-Loop (Roadmap M5.1, Audit A5).
 *
 * Audit A5 verlangt „Title-Loop 10 min ohne Leak". Das ist keine Stilfrage: Die Schleife
 * läuft über einen Timer, der sich selbst neu setzt — vergisst jemand `stop()`, dreht sie
 * sich stundenlang hinter einem längst gewechselten Screen weiter und weckt das Handy
 * alle paar Sekunden auf.
 *
 * Geprüft wird mit falscher Zeit statt mit echter: `vi.useFakeTimers()` spult zehn
 * Minuten in Millisekunden vor, und danach steht die Frage nur noch, ob überhaupt noch
 * ein Timer läuft.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTitleLoop } from '@/ui/components/titleLoop';

const TEN_MINUTES_MS = 10 * 60 * 1000;

describe('Title-Loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('durchlaeuft alle vier Phasen und faengt wieder von vorn an', () => {
    const loop = createTitleLoop();
    loop.start();

    /*
     * In kleinen Schritten abtasten, nicht in grossen: Die Phasen sind unterschiedlich
     * lang (900 bis 2400 ms), und wer im Sekundenraster misst, springt ueber die kurzen
     * hinweg. Der erste Anlauf dieses Tests hat genau das getan und `gone` nie gesehen.
     */
    const seen: string[] = [];
    for (let elapsed = 0; elapsed < 12_000; elapsed += 100) {
      const phase = loop.el.dataset['phase'] ?? '';
      if (seen[seen.length - 1] !== phase) seen.push(phase);
      vi.advanceTimersByTime(100);
    }
    loop.stop();

    expect(seen.slice(0, 5)).toEqual(['dig', 'boom', 'gone', 'back', 'dig']);
  });

  it('haelt nach `stop()` keinen Timer mehr offen — auch nach zehn Minuten', () => {
    const loop = createTitleLoop();
    loop.start();
    vi.advanceTimersByTime(TEN_MINUTES_MS);

    // Waehrend sie laeuft, steht immer genau ein Timer aus: der naechste Phasenwechsel.
    expect(vi.getTimerCount()).toBe(1);

    loop.stop();
    expect(vi.getTimerCount()).toBe(0);

    // Und es kommt auch nichts nach.
    vi.advanceTimersByTime(TEN_MINUTES_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sammelt ueber zehn Minuten keine Timer an', () => {
    /*
     * Der Fehler, gegen den das steht: ein `setInterval` je Phase statt einer Kette.
     * Nach zehn Minuten waeren das hunderte, und jeder einzelne weckt das Geraet.
     */
    const loop = createTitleLoop();
    loop.start();

    for (let minute = 0; minute < 10; minute++) {
      vi.advanceTimersByTime(60_000);
      expect(vi.getTimerCount(), `Minute ${minute + 1}`).toBe(1);
    }
    loop.stop();
  });

  it('steht still, wenn "Bewegung reduzieren" gesetzt ist', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);

    const loop = createTitleLoop();
    loop.start();

    // Ein Standbild, kein Timer: Die Schleife traegt keine Information (Audit A5).
    expect(loop.el.dataset['phase']).toBe('dig');
    expect(vi.getTimerCount()).toBe(0);

    loop.stop();
    vi.unstubAllGlobals();
  });

  it('ist fuer Screenreader Dekoration', () => {
    // Ein Element, das alle fuenf Sekunden seinen Inhalt wechselt, waere sonst Stoerfeuer.
    expect(createTitleLoop().el.getAttribute('aria-hidden')).toBe('true');
  });
});
