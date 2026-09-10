/**
 * Balthasar, der Zimmermann (Art Direction §5.3).
 *
 * Er tritt an genau einer Stelle auf: nach einer Kollision, wenn die Brücke repariert
 * wird. Ein NPC macht das Schrumpfen und Reparieren lesbar, ohne Textwände (GDD §7) —
 * man sieht, dass die Brücke wieder ganz ist, statt es zu lesen.
 *
 * Er ist ein Hiker-Rig ohne Spielerfarbe: derselbe Körper, anderer Hut, Hammer statt
 * Wanderstock.
 */

import { Container, Sprite, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import type { Plank } from './Plank';

/** Balthasars Grautöne — er gehört keinem Spieler, also trägt er auch keine Farbe. */
const BODY_TINT = 0xd8cfc0;

export class Carpenter {
  readonly view = new Container();

  private readonly ladder: Sprite;
  private readonly figure = new Container();
  private readonly hammer: Sprite;
  private readonly arm: Sprite;

  constructor(sheet: Spritesheet) {
    this.ladder = new Sprite(sheet.textures['carpenter/ladder']);
    this.ladder.anchor.set(0.5, 0);
    this.ladder.scale.set(0.35);
    this.ladder.visible = false;

    const torso = new Sprite(sheet.textures['hikers/torso']);
    torso.anchor.set(0.5, 1);
    torso.tint = BODY_TINT;

    const head = new Sprite(sheet.textures['hikers/head']);
    head.anchor.set(0.5);
    head.position.set(0, -100);
    head.tint = BODY_TINT;

    const face = new Sprite(sheet.textures['hikers/faces/happy']);
    face.anchor.set(0.5);
    face.position.set(0, -98);

    const hat = new Sprite(sheet.textures['carpenter/hat']);
    hat.anchor.set(0.5, 1);
    hat.position.set(0, -130);

    this.arm = new Sprite(sheet.textures['hikers/arm']);
    this.arm.anchor.set(0.5, 0.12);
    this.arm.position.set(40, -60);
    this.arm.tint = BODY_TINT;

    this.hammer = new Sprite(sheet.textures['carpenter/hammer']);
    this.hammer.anchor.set(0.5, 0.92);
    this.hammer.position.set(48, -66);

    this.figure.addChild(torso, this.arm, this.hammer, head, face, hat);
    this.figure.scale.set(0.42);
    this.figure.visible = false;

    this.view.addChild(this.ladder, this.figure);
  }

  /**
   * Die Reparatur (GDD §4.4, `repair_carpenter`).
   *
   * Leiter von unten, dann für jeden gebrochenen Balken ein Hammerschlag im Rhythmus —
   * und das Brett springt an seinen Platz zurück.
   */
  repair(planks: readonly Plank[], onPlank: (plank: Plank) => void): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (planks.length === 0) return timeline;

    const first = planks[0]!;
    this.ladder.position.set(first.baseX, first.baseY);
    this.figure.position.set(first.baseX - 30, first.baseY + 4);

    timeline
      .set([this.ladder, this.figure], { visible: true })
      .fromTo(this.ladder, { alpha: 0, y: first.baseY + 120 }, { alpha: 1, y: first.baseY, duration: 0.35 })
      .fromTo(this.figure, { alpha: 0 }, { alpha: 1, duration: 0.2 }, '-=0.15');

    for (const plank of planks) {
      timeline
        .to(this.figure.position, { x: plank.baseX - 30, y: plank.baseY + 4, duration: 0.22 })
        /* Hammer-Rhythmus: hoch, Schlag, und das Brett ist wieder da. */
        .to(this.arm, { rotation: -1.2, duration: 0.12, ease: 'power2.out' })
        .to(this.hammer, { rotation: -1.2, duration: 0.12, ease: 'power2.out' }, '<')
        .to(this.arm, { rotation: 0, duration: 0.09, ease: 'power2.in' })
        .to(this.hammer, { rotation: 0, duration: 0.09, ease: 'power2.in' }, '<')
        .call(() => onPlank(plank))
        .fromTo(plank.view.scale, { y: 0.4 }, { y: 1, duration: 0.25, ease: 'back.out(2.4)' });
    }

    timeline
      .to([this.figure, this.ladder], { alpha: 0, duration: 0.3 })
      .set([this.figure, this.ladder], { visible: false });
    return timeline;
  }

  reset(): void {
    gsap.killTweensOf([this.figure, this.ladder, this.arm, this.hammer, this.figure.position]);
    this.figure.visible = false;
    this.ladder.visible = false;
    this.figure.alpha = 1;
    this.ladder.alpha = 1;
    this.arm.rotation = 0;
    this.hammer.rotation = 0;
    this.ladder.position.set(0, STAGE.bridgeY);
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
