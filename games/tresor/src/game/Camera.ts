/**
 * Kamera (Art Direction §6).
 *
 * Sie verschiebt und skaliert den Welt-Container: Zoom auf die aktive Karte (1.15×),
 * Schwenk in 400 ms, Shake beim Alarm. Es gibt keine echte Kamera — es gibt eine Welt,
 * die sich bewegt.
 *
 * Wichtig fuer den Zoom: Ein Punkt der Welt soll unter dem Bildschirmmittelpunkt landen.
 * Deshalb wird nicht nur skaliert, sondern gegengerechnet verschoben — sonst zoomt die
 * Buehne auf ihre eigene Ecke.
 */

import gsap from 'gsap';
import type { Container } from 'pixi.js';
import { ANIM, MOTION, STAGE } from '@/config/theme';
import { CARD } from '@/config/choreo';

export class Camera {
  private readonly root: Container;
  /** Ruhelage, auf die `reset()` zurueckfaehrt. */
  private readonly home = { x: STAGE.worldSize / 2, y: STAGE.worldSize / 2, zoom: 1 };
  private target = { ...this.home };

  constructor(root: Container) {
    this.root = root;
    this.apply(this.home.x, this.home.y, this.home.zoom);
  }

  /** Setzt Position und Zoom sofort — ohne Animation. */
  private apply(x: number, y: number, zoom: number): void {
    const center = STAGE.worldSize / 2;
    this.root.scale.set(zoom);
    this.root.position.set(center - x * zoom, center - y * zoom);
    this.target = { x, y, zoom };
  }

  /** Faehrt auf einen Weltpunkt und zoomt dabei (Standard: der Karten-Zoom). */
  moveTo(x: number, y: number, zoom = STAGE.cardZoom, durationMs = CARD.panMs): gsap.core.Timeline {
    const center = STAGE.worldSize / 2;
    this.target = { x, y, zoom };
    return gsap
      .timeline()
      .to(this.root.scale, { x: zoom, y: zoom, duration: durationMs / 1000, ease: MOTION.easeSnappy }, 0)
      .to(
        this.root.position,
        {
          x: center - x * zoom,
          y: center - y * zoom,
          duration: durationMs / 1000,
          ease: MOTION.easeSnappy,
        },
        0
      );
  }

  /** Zurueck in die Totale — bei der Auszahlung sollen alle im Bild sein. */
  reset(durationMs = CARD.panMs): gsap.core.Timeline {
    return this.moveTo(this.home.x, this.home.y, this.home.zoom, durationMs);
  }

  /**
   * Screen-Shake.
   *
   * Nach dem Ruetteln wird die **Zielposition** wiederhergestellt, nicht die Ruhelage:
   * Ein Shake mitten im Zoom darf die Kamera nicht heimlich zuruecksetzen.
   */
  shake(amplitude = ANIM.shakeAmplitudePx, durationMs = ANIM.shakeMs): gsap.core.Timeline {
    const center = STAGE.worldSize / 2;
    const { x, y, zoom } = this.target;
    const baseX = center - x * zoom;
    const baseY = center - y * zoom;

    const timeline = gsap.timeline();
    const steps = Math.max(2, Math.round(durationMs / 45));
    for (let i = 0; i < steps; i++) {
      // Amplitude laeuft aus: der erste Schlag ist der haerteste.
      const falloff = 1 - i / steps;
      timeline.to(this.root.position, {
        x: baseX + (Math.random() - 0.5) * 2 * amplitude * falloff,
        y: baseY + (Math.random() - 0.5) * 2 * amplitude * falloff,
        duration: 0.045,
        ease: 'none',
      });
    }
    timeline.set(this.root.position, { x: baseX, y: baseY });
    return timeline;
  }

  /** Bricht laufende Fahrten ab und stellt die Totale her. */
  snapHome(): void {
    gsap.killTweensOf([this.root.position, this.root.scale]);
    this.apply(this.home.x, this.home.y, this.home.zoom);
  }
}
