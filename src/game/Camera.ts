/**
 * Kamera (Art Direction §6).
 *
 * Sie verschiebt und skaliert die Welt — beim Öffnen schwenkt sie auf den Monitor, an
 * der Schranke nach rechts, und bei Alarm wackelt sie. Mehr braucht die Halle nicht: Ein
 * Handy in der Tischmitte verträgt keine Kamerafahrten, es soll lesbar bleiben.
 */

import gsap from 'gsap';
import type { Container } from 'pixi.js';
import { CAMERA } from '@/config/choreo';
import { LAYOUT, STAGE } from '@/config/theme';
import { prefersReducedMotion } from '@/ui/motion';
import type { HallLayout } from './HallApp';

export class Camera {
  private readonly world: Container;
  private readonly layout: HallLayout;
  /** Ruhelage, auf die `reset()` zurückfährt. */
  private readonly home = { x: 0, y: 0, scale: 1 };
  private shakeTween: gsap.core.Tween | undefined;

  constructor(world: Container, layout: HallLayout) {
    this.world = world;
    this.layout = layout;
  }

  /** Übernimmt die aktuelle Layout-Transformation als Ruhelage (nach jedem Resize). */
  syncHome(): void {
    this.home.x = this.world.position.x;
    this.home.y = this.world.position.y;
    this.home.scale = this.world.scale.x;
  }

  /**
   * Fährt auf einen Weltpunkt und zoomt.
   *
   * Position und Zoom laufen über **einen** Tween auf einem Zustandsobjekt statt über
   * zwei getrennte auf `world` und `world.scale`: Zwei Tweens mit derselben Dauer driften
   * schon bei einem ausgelassenen Frame auseinander, und dann rutscht das Bildzentrum.
   */
  private tweenTo(x: number, y: number, scale: number, durationSec: number): gsap.core.Tween {
    const state = { x: this.world.position.x, y: this.world.position.y, scale: this.world.scale.x };
    return gsap.to(state, {
      x,
      y,
      scale,
      duration: durationSec,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.world.position.set(state.x, state.y);
        this.world.scale.set(state.scale);
      },
    });
  }

  /**
   * Nimmt einen Weltpunkt in die **Mitte** des Bildes und zoomt darauf.
   *
   * Nicht "der Punkt bleibt, wo er war": Beim Schwenk auf den Röntgenmonitor soll der
   * Monitor mittig stehen, sonst hängt er halb außerhalb — und der wichtigste Moment des
   * Spiels läuft am Bildrand ab.
   */
  focus(worldX: number, worldY: number, zoom: number, durationSec: number): gsap.core.Tween {
    const scale = this.home.scale * zoom;
    const x = this.layout.width / 2 - worldX * scale;
    const y = this.layout.height / 2 - worldY * scale;
    return this.tweenTo(x, y, scale, durationSec);
  }

  /** Zurück in die Ruhelage. */
  reset(durationSec = CAMERA.backFromXray): gsap.core.Tween {
    return this.tweenTo(this.home.x, this.home.y, this.home.scale, durationSec);
  }

  /**
   * Schwenkt zum Röntgenmonitor.
   *
   * Der Blickpunkt liegt etwas unter dem Monitor: So bleibt der Koffer, der gerade ins
   * Gerät fährt, mit im Bild — sonst sieht man nur einen Bildschirm ohne Zusammenhang.
   */
  toXray(): gsap.core.Tween {
    return this.focus(LAYOUT.monitor.x, LAYOUT.monitor.y + 120, STAGE.inspectZoom, CAMERA.toXray);
  }

  /**
   * Schwenkt zur Schranke.
   *
   * Ohne Zoom: An der Schranke zählt, dass **Koffer und Reisender zusammen** im Bild
   * sind — der eine klappt auf, der andere grinst dazu. Ein enger Ausschnitt zeigt
   * entweder das eine oder das andere.
   */
  toGate(): gsap.core.Tween {
    return this.focus(LAYOUT.gate.x - 140, LAYOUT.gate.y - 150, 1, CAMERA.toGate);
  }

  /**
   * Screen-Shake bei Alarm. Läuft immer auf die Ruhelage zurück — ein Shake, der die
   * Kamera versetzt zurücklässt, verschiebt die Trefferflächen der Koffer.
   */
  shake(amplitude = STAGE.alarmShakePx, durationSec = CAMERA.shake): gsap.core.Tween {
    /*
     * Kein Schütteln, wenn der Nutzer Bewegung reduziert hat. Es ist der eine Effekt im
     * Spiel, der Menschen wirklich schlecht machen kann — und er trägt keine Information,
     * die nicht auch im Banner steht.
     */
    if (prefersReducedMotion()) return gsap.to({}, { duration: 0 });

    this.shakeTween?.kill();
    const baseX = this.world.position.x;
    const baseY = this.world.position.y;
    const state = { t: 0 };

    this.shakeTween = gsap.to(state, {
      t: 1,
      duration: durationSec,
      ease: 'none',
      onUpdate: () => {
        const decay = 1 - state.t;
        this.world.position.set(
          baseX + (Math.random() - 0.5) * amplitude * decay * 2,
          baseY + (Math.random() - 0.5) * amplitude * decay * 2
        );
      },
      onComplete: () => {
        this.world.position.set(baseX, baseY);
      },
    });

    return this.shakeTween;
  }
}
