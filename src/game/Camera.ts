/**
 * Die Kamera (Art Direction §6).
 *
 * Sie bewegt den Welt-Container: Intro-Fahrt über die Schlucht, Zoom auf den
 * Kollisionsbalken beim Knarren, Shake im Moment des Bruchs, Pan hinunter zum Fluss,
 * wenn jemand fällt.
 *
 * Alles läuft über **einen** Zustand (`x`, `y`, `zoom`), aus dem jeder Frame die
 * Transformation berechnet wird. Zwei GSAP-Tweens direkt auf `world.position` und
 * `world.scale` würden sich beim gleichzeitigen Zoom und Shake gegenseitig überschreiben —
 * und genau das passiert im Bruch.
 */

import type { Container } from 'pixi.js';
import gsap from 'gsap';
import { CAMERA } from '@/config/choreo';
import { STAGE } from '@/config/theme';

/**
 * Ruhelage der Kamera: Bruecke im oberen Drittel, Schlucht und Fluss darunter.
 *
 * Ein Hochkant-Handy zeigt rund 2200 Welteinheiten Hoehe. Genau auf die Bruecke zu
 * schauen hiesse, die Haelfte davon an Himmel zu verschenken — und der Sturz geht nach
 * unten, nicht nach oben.
 */
const RESTING_Y = STAGE.bridgeY + 430;

/**
 * Wie weit die Kamera seitlich aus der Mitte darf.
 *
 * Der Zoom beim Blickkontakt zielt auf einen bestimmten Balken. Liegt der ganz aussen,
 * schoebe eine ungebremste Kamera die halbe Bruecke aus dem Bild — und der Sturz faende
 * am Rand statt in der Mitte statt.
 */
const MAX_PAN_X = STAGE.worldWidth * 0.16;

export class Camera {
  /**
   * Der Punkt, auf den die Kamera schaut (Welteinheiten).
   *
   * Etwas unterhalb der Bruecke: Oben soll Himmel stehen, unten die Schlucht mit dem
   * Fluss — sonst faellt der Sturz aus dem Bild, und der Sturz ist die halbe Show.
   */
  private readonly focus = { x: STAGE.worldWidth / 2, y: RESTING_Y, zoom: 1 };
  /** Shake wird getrennt gehalten und aufaddiert — sonst zieht er den Fokus mit. */
  private readonly shakeOffset = { x: 0, y: 0 };
  private baseScale = 1;

  /**
   * „Bewegung reduzieren" (Audit A5).
   *
   * Ausgeschaltet wird genau eine Sache: das Rütteln. Es trägt keine Information — wer
   * es nicht sieht, verpasst nichts am Spiel, und für Menschen mit vestibulärer Störung
   * ist es das Unangenehmste, was ein Bildschirm tun kann. Die Slow-Mo bleibt, weil sie
   * **Information** ist: Sie sagt "gleich passiert es".
   */
  private reducedMotion = false;

  constructor(private readonly world: Container) {}

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  /** Der Router meldet jede Layout-Änderung; daraus kommt die Grundskalierung. */
  setBaseScale(scale: number, viewWidth: number, viewHeight: number): void {
    this.baseScale = scale;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.apply();
  }

  private viewWidth = 1;
  private viewHeight = 1;

  /** Rechnet Fokus und Zoom in die Transformation des Welt-Containers um. */
  apply(): void {
    const scale = this.baseScale * this.focus.zoom;
    this.world.scale.set(scale);
    this.world.position.set(
      this.viewWidth / 2 - this.focus.x * scale + this.shakeOffset.x,
      this.viewHeight / 2 - this.focus.y * scale + this.shakeOffset.y
    );
  }

  /** Intro: von weit oben über die Schlucht heran (GDD §4.2). */
  intro(durationMs: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      /* Von tief unten aus der Schlucht herauf — die Tiefe zeigen, bevor die Bruecke kommt. */
      .set(this.focus, {
        x: STAGE.worldWidth / 2,
        y: STAGE.riverY - 120,
        zoom: CAMERA.introZoom,
      })
      .to(this.focus, {
        y: RESTING_Y,
        zoom: 1,
        duration: durationMs / 1000,
        ease: 'power2.inOut',
        onUpdate: () => this.apply(),
      });
    return timeline;
  }

  /** Näher ran an den Balken, auf dem es gleich kracht. */
  zoomTo(x: number, y: number, durationMs: number, zoom: number = CAMERA.creakZoom): gsap.core.Tween {
    const center = STAGE.worldWidth / 2;
    return gsap.to(this.focus, {
      x: Math.max(center - MAX_PAN_X, Math.min(center + MAX_PAN_X, x)),
      y,
      zoom,
      duration: durationMs / 1000,
      ease: 'power2.inOut',
      onUpdate: () => this.apply(),
    });
  }

  /** Der Schlag im Moment des Bruchs. */
  shake(strength: number = CAMERA.shakePx, durationMs: number = CAMERA.shakeMs): gsap.core.Timeline {
    /* Eine leere Timeline, keine ausgelassene: Die Sequenz rechnet mit einem Rückgabewert. */
    if (this.reducedMotion) return gsap.timeline();

    const timeline = gsap.timeline({
      onUpdate: () => this.apply(),
      onComplete: () => {
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
        this.apply();
      },
    });

    const steps = 6;
    for (let i = 0; i < steps; i += 1) {
      /* Abklingend: Der erste Schlag ist der härteste, danach beruhigt es sich. */
      const decay = strength * (1 - i / steps);
      timeline.to(this.shakeOffset, {
        x: (i % 2 === 0 ? 1 : -1) * decay,
        y: (i % 3 === 0 ? -1 : 1) * decay * 0.6,
        duration: durationMs / 1000 / steps,
        ease: 'none',
      });
    }
    return timeline;
  }

  /** Die Kamera folgt dem Sturz bis zum Fluss und kommt dann zurück. */
  followFall(durationMs: number = CAMERA.fallPanMs): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      .to(this.focus, {
        /* Auf dem Weg nach unten wieder in die Mitte — der Fluss ist überall gleich breit. */
        x: STAGE.worldWidth / 2,
        y: STAGE.riverY - 40,
        zoom: 0.9,
        duration: durationMs / 1000,
        ease: 'power2.inOut',
        onUpdate: () => this.apply(),
      })
      .to(this.focus, {
        y: RESTING_Y,
        zoom: 1,
        duration: durationMs / 1000,
        ease: 'power2.inOut',
        onUpdate: () => this.apply(),
      });
    return timeline;
  }

  reset(): void {
    gsap.killTweensOf([this.focus, this.shakeOffset]);
    this.focus.x = STAGE.worldWidth / 2;
    this.focus.y = RESTING_Y;
    this.focus.zoom = 1;
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;
    this.apply();
  }
}
