/**
 * Kamera (Art Direction §6).
 *
 * Zwei Bewegungen, mehr braucht das Feld nicht:
 *
 * - **Zoom auf die aktive Platte** (1.12×) waehrend der Grabung. Er macht aus einer
 *   Platte unter fuenfundzwanzig *diese* Platte — der Nervenmoment braucht ein Zentrum.
 * - **Shake bei der Explosion** (12 px, 250 ms).
 *
 * Kein Slow-Mo: Explosionen sind knackig, das Suspense-Halten passiert vorher in der
 * Anticipation.
 */

import type { Container } from 'pixi.js';
import gsap from 'gsap';
import { CAMERA } from '@/config/choreo';
import { ANIM, STAGE } from '@/config/theme';
import { prefersReducedMotion } from '@/ui/animate';

/** Weltmitte — Pivot und Ruhelage der Kamera. */
const CENTRE = { x: STAGE.worldSize / 2, y: STAGE.worldHeight / 2 } as const;

export class Camera {
  /** Der Container, den die Kamera bewegt — die Welt der `BoardApp`. */
  private readonly target: Container;
  /** Ruhelage: unskaliert, zentriert. */
  private readonly restScale: number;
  private shakeTween: gsap.core.Tween | undefined;

  constructor(target: Container, restScale = 1) {
    this.target = target;
    this.restScale = restScale;
    this.target.pivot.set(CENTRE.x, CENTRE.y);
    this.target.position.set(CENTRE.x, CENTRE.y);
  }

  /**
   * Faehrt auf eine Weltposition. Der Pivot wandert zur Platte, die Position bleibt in
   * der Bildmitte — so bleibt die Platte zentriert, egal wie stark gezoomt wird.
   */
  zoomTo(x: number, y: number, scale = STAGE.plateZoom): gsap.core.Timeline {
    /*
     * Bei starkem Zoom wandert die Platte an den Rand des Sichtfelds. Deshalb nur zur
     * Haelfte auf sie zufahren: Das Feld drumherum bleibt sichtbar, und man sieht
     * weiterhin, wo die Platte im Feld liegt.
     */
    const pivotX = CENTRE.x + (x - CENTRE.x) * 0.5;
    const pivotY = CENTRE.y + (y - CENTRE.y) * 0.5;
    const duration = CAMERA.zoomInMs / 1000;

    return gsap
      .timeline()
      .to(this.target.pivot, { x: pivotX, y: pivotY, duration, ease: CAMERA.ease }, 0)
      .to(
        this.target.scale,
        { x: this.restScale * scale, y: this.restScale * scale, duration, ease: CAMERA.ease },
        0
      );
  }

  /** Zurueck in die Ruhelage. */
  reset(): gsap.core.Timeline {
    const duration = CAMERA.zoomOutMs / 1000;

    return gsap
      .timeline()
      .to(this.target.pivot, { x: CENTRE.x, y: CENTRE.y, duration, ease: CAMERA.ease }, 0)
      .to(this.target.scale, { x: this.restScale, y: this.restScale, duration, ease: CAMERA.ease }, 0);
  }

  /**
   * Screen-Shake. Bei `prefers-reduced-motion` faellt er ersatzlos aus — die
   * Information steckt im Farbring und im Banner, nicht im Wackeln (Audit A5).
   */
  shake(amplitude = ANIM.shakeAmplitudePx, durationMs = ANIM.shakeMs): void {
    if (prefersReducedMotion()) return;

    const baseX = this.target.position.x;
    const baseY = this.target.position.y;
    this.shakeTween?.kill();

    const state = { t: 0 };
    this.shakeTween = gsap.to(state, {
      t: 1,
      duration: durationMs / 1000,
      ease: 'none',
      onUpdate: () => {
        // Abklingend: der erste Schlag ist der harte, danach wird es ruhiger.
        const decay = 1 - state.t;
        this.target.position.set(
          baseX + (Math.random() - 0.5) * 2 * amplitude * decay,
          baseY + (Math.random() - 0.5) * 2 * amplitude * decay
        );
      },
      onComplete: () => {
        this.target.position.set(baseX, baseY);
        this.shakeTween = undefined;
      },
    });
  }

  /** Alles anhalten und in die Ruhelage — Rundenwechsel, Screenwechsel. */
  stop(): void {
    this.shakeTween?.kill();
    this.shakeTween = undefined;
    gsap.killTweensOf([this.target.pivot, this.target.scale, this.target]);
    this.target.pivot.set(CENTRE.x, CENTRE.y);
    this.target.position.set(CENTRE.x, CENTRE.y);
    this.target.scale.set(this.restScale);
  }
}
