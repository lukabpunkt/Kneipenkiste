/**
 * Was in M5 an den Screens dazugekommen ist (Audit A5).
 *
 * Drei Zusicherungen, die man sonst erst auf einem fremden Handy bemerkt: dass der
 * Titel-Loop keine Uhr braucht, dass ein Einmal-Hinweis wirklich einmal kommt, und dass
 * "Bewegung reduzieren" das Rütteln abschaltet, ohne die Slow-Mo mitzunehmen.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import gsap from 'gsap';
import { Container } from 'pixi.js';
import { createTitleScreen } from '@/ui/screens/TitleScreen';
import { createCoachMark, forgetCoachMarks, hasSeenCoachMark } from '@/ui/components/coach';
import { Camera } from '@/game/Camera';
import { setLocale } from '@/core/i18n';
import type { ScreenContext } from '@/ui/router';

beforeEach(() => {
  setLocale('de');
  forgetCoachMarks();
});

describe('Titel-Loop (Roadmap M5.1)', () => {
  /*
   * Der Titel steht auf einer Party auch mal zehn Minuten offen. Läuft die Animation in
   * JavaScript, sammelt sich in der Zeit etwas an — und niemand merkt es, weil niemand
   * hinsieht. Läuft sie in CSS, kann sich nichts ansammeln. Genau das hält dieser Test
   * fest: kein Intervall, kein Timeout, kein Frame-Callback.
   */
  it('startet keine einzige Uhr — die Bewegung ist CSS', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const frame = vi.spyOn(globalThis, 'requestAnimationFrame');

    const ctx = { fsm: { send: vi.fn() }, host: document.createElement('div') } as unknown as ScreenContext;
    const screen = createTitleScreen(ctx);
    screen.activate?.();

    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    expect(frame).not.toHaveBeenCalled();

    interval.mockRestore();
    timeout.mockRestore();
    frame.mockRestore();
  });

  it('zeigt den Wanderer, den Balken und den Spritzer', () => {
    const ctx = { fsm: { send: vi.fn() }, host: document.createElement('div') } as unknown as ScreenContext;
    const el = createTitleScreen(ctx).el;

    expect(el.querySelector('.title__hiker')).not.toBeNull();
    expect(el.querySelector('.title__plank-doomed')).not.toBeNull();
    expect(el.querySelector('.title__splash')).not.toBeNull();
    /* Die Grafik ist Grafik: Ein Screenreader soll sie nicht buchstabieren. */
    expect(el.querySelector('.title__art')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Einmal-Hinweise (Roadmap M5.4)', () => {
  it('kommt genau einmal und merkt sich das', () => {
    expect(hasSeenCoachMark('negotiation')).toBe(false);

    const first = createCoachMark('negotiation');
    expect(first).not.toBeNull();
    expect(first!.textContent).toContain('Verstanden');

    expect(hasSeenCoachMark('negotiation')).toBe(true);
    expect(createCoachMark('negotiation')).toBeNull();
  });

  it('hält die beiden Hinweise auseinander', () => {
    createCoachMark('negotiation');
    expect(createCoachMark('result')).not.toBeNull();
  });

  it('lässt sich wegtippen', () => {
    const host = document.createElement('div');
    const mark = createCoachMark('result')!;
    host.append(mark);

    mark.querySelector<HTMLButtonElement>('.coach__close')!.click();
    expect(host.children).toHaveLength(0);
  });

  it('überlebt einen gesperrten Storage (Privat-Modus)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });

    /* Ohne Gedächtnis erscheint der Hinweis eben jedes Mal — aber nichts fliegt. */
    expect(() => createCoachMark('negotiation')).not.toThrow();
    expect(hasSeenCoachMark('negotiation')).toBe(false);

    if (original) Object.defineProperty(globalThis, 'localStorage', original);
  });
});

describe('Bewegung reduzieren auf der Bühne (Audit A5)', () => {
  afterEach(() => gsap.globalTimeline.clear());

  it('nimmt dem Bruch das Rütteln, nicht die Zeit', () => {
    const world = new Container();
    const camera = new Camera(world);
    camera.setBaseScale(1, 390, 844);

    const normal = camera.shake();
    expect(normal.duration()).toBeGreaterThan(0);

    camera.setReducedMotion(true);
    const reduced = camera.shake();
    expect(reduced.duration()).toBe(0);

    /*
     * Und die Kamera steht danach wieder gerade — ein abgeschaltetes Rütteln darf keinen
     * Versatz hinterlassen. Vorher/nachher vergleichen genügt: Wo genau sie steht, ist
     * Sache der Kamera, dass sie sich nicht bewegt hat, Sache dieses Tests.
     */
    const before = world.position.x;
    reduced.progress(1);
    camera.apply();
    expect(world.position.x).toBe(before);
  });
});
