/**
 * Gustav (Art Direction §5.2).
 *
 * Ein Kommentator, kein Aasfresser: Er kreist im Intro, kreischt, lacht mit den Schultern,
 * schaut in den letzten Sekunden auf die Uhr, trägt bei `fall_seesaw` kurz einen Hiker und
 * setzt sich in der Todeszone aufs Schild.
 *
 * Sechs Animationen aus drei Teilen — Rumpf, Kopf, Flügel. Eine Sprite-Sequenz hätte
 * dieselben sechs Bewegungen als sechs Bilderreihen im Atlas gekostet.
 */

import { Container, Sprite, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { STAGE } from '@/config/theme';

export class Vulture {
  readonly view = new Container();

  private readonly perch: Sprite;
  private readonly bird = new Container();
  private readonly body: Sprite;
  private readonly head: Sprite;
  private readonly wingL: Sprite;
  private readonly wingR: Sprite;
  private readonly clock: Sprite;

  private flapping: gsap.core.Tween | undefined;

  constructor(sheet: Spritesheet) {
    this.perch = new Sprite(sheet.textures['vulture/perch']);
    this.perch.anchor.set(0.5, 0);
    this.perch.scale.set(0.4);
    this.perch.position.set(STAGE.perch.x, STAGE.perch.y);

    this.body = new Sprite(sheet.textures['vulture/body']);
    this.body.anchor.set(0.5, 0.9);

    this.head = new Sprite(sheet.textures['vulture/head']);
    /* Anker am Halsansatz: Der Kopf dreht sich, der Hals bleibt am Rumpf. */
    this.head.anchor.set(0.42, 0.96);
    this.head.position.set(6, -34);

    this.wingL = new Sprite(sheet.textures['vulture/wing']);
    this.wingL.anchor.set(0.08, 0.16);
    this.wingL.position.set(-14, -34);
    this.wingL.scale.x = -1;

    this.wingR = new Sprite(sheet.textures['vulture/wing']);
    this.wingR.anchor.set(0.08, 0.16);
    this.wingR.position.set(14, -34);

    this.clock = new Sprite(sheet.textures['vulture/clock']);
    this.clock.anchor.set(0.5, 0);
    this.clock.position.set(40, -20);
    this.clock.visible = false;

    this.bird.addChild(this.wingL, this.wingR, this.body, this.head, this.clock);
    this.bird.scale.set(0.34);
    this.bird.position.set(STAGE.perch.x, STAGE.perch.y + 4);

    this.view.addChild(this.perch, this.bird);
  }

  /** Kreist im Intro über der Schlucht und landet dann auf dem Pfahl. */
  circle(durationMs: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.startFlapping();

    timeline
      .set(this.bird.position, { x: STAGE.worldWidth * 0.7, y: 180 })
      .to(this.bird.position, {
        x: STAGE.worldWidth * 0.3,
        y: 130,
        duration: durationMs / 2000,
        ease: 'sine.inOut',
      })
      .to(this.bird.position, {
        x: STAGE.perch.x,
        y: STAGE.perch.y + 4,
        duration: durationMs / 2000,
        ease: 'power2.out',
        onComplete: () => this.stopFlapping(),
      });
    return timeline;
  }

  /** Kreischen: Kopf hoch, Schnabel auf. */
  screech(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      .to(this.head, { rotation: -0.5, duration: 0.14, ease: 'power2.out' })
      .to(this.head, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    return timeline;
  }

  /** Lachen: Schultern zucken. Kommt im Result, wenn wieder niemand gefallen ist. */
  laugh(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline.to(this.body, {
      y: -8,
      duration: 0.11,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 5,
    });
    return timeline;
  }

  /** Letzte Sekunden der Absprache: Gustav holt die Uhr raus (Art Direction §4.2). */
  watchClock(show: boolean): void {
    this.clock.visible = show;
    gsap.to(this.head, { rotation: show ? 0.35 : 0, duration: 0.3, ease: 'power2.out' });
  }

  /** `fall_seesaw`: Er trägt den Katapultierten ein Stück — und lässt ihn dann fallen. */
  carry(passenger: Container, durationMs: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.startFlapping();

    timeline
      .set(this.bird.position, { x: passenger.position.x, y: passenger.position.y - 70 })
      .to(
        this.bird.position,
        { x: STAGE.worldWidth * 0.6, y: 240, duration: durationMs / 1000, ease: 'sine.inOut' },
        0
      )
      .to(
        passenger.position,
        { x: STAGE.worldWidth * 0.6, y: 300, duration: durationMs / 1000, ease: 'sine.inOut' },
        0
      )
      .call(() => this.stopFlapping());
    return timeline;
  }

  /** Todeszone: Gustav setzt sich auf das Schild und wartet. */
  landOnSign(x: number, y: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.startFlapping();
    timeline
      .to(this.bird.position, { x, y, duration: 0.6, ease: 'power2.out' })
      .call(() => this.stopFlapping());
    return timeline;
  }

  private startFlapping(): void {
    this.flapping?.kill();
    this.flapping = gsap.to([this.wingL, this.wingR], {
      rotation: -0.55,
      duration: 0.19,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private stopFlapping(): void {
    this.flapping?.kill();
    this.flapping = undefined;
    gsap.to([this.wingL, this.wingR], { rotation: 0, duration: 0.2 });
  }

  reset(): void {
    this.stopFlapping();
    gsap.killTweensOf([this.bird.position, this.head, this.body]);
    this.bird.position.set(STAGE.perch.x, STAGE.perch.y + 4);
    this.head.rotation = 0;
    this.body.position.set(0, 0);
    this.clock.visible = false;
  }

  destroy(): void {
    this.stopFlapping();
    this.view.destroy({ children: true });
  }
}
