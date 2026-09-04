/**
 * Waldi, der Spürhund (Art Direction §5.3).
 *
 * Ein Cartoon-Dackel, der links unten liegt. Im Spürhund-Modus läuft er einmal zu einem
 * Koffer, schnüffelt und bellt — oder eben nicht. Sein Bellen ist der einzige Hinweis im
 * Spiel, der nie lügt (GDD §3.7); umso wichtiger, dass er auch anders aussieht als die
 * anderen Hinweise.
 */

import gsap from 'gsap';
import { Container, Sprite, type Spritesheet } from 'pixi.js';

export class Waldi {
  readonly view = new Container();

  private readonly head = new Container();
  private readonly earL: Sprite;
  private readonly earR: Sprite;
  private readonly tail: Sprite;
  private readonly legs: Sprite[] = [];

  constructor(sheet: Spritesheet, scale = 0.55) {
    const texture = (frame: string): Sprite => {
      const t = sheet.textures[frame];
      if (!t) throw new Error(`Frame "${frame}" fehlt im Waldi-Atlas.`);
      return new Sprite(t);
    };

    /* Beine zuerst, damit der Körper sie überdeckt. */
    for (const x of [-38, -12, 14, 40]) {
      const leg = texture('leg');
      leg.anchor.set(0.5, 0.1);
      leg.position.set(x, -14);
      this.legs.push(leg);
      this.view.addChild(leg);
    }

    this.tail = texture('tail');
    this.tail.anchor.set(0.1, 0.9);
    this.tail.position.set(-58, -34);
    this.view.addChild(this.tail);

    const body = texture('body');
    body.anchor.set(0.5, 1);
    body.position.set(0, -8);
    this.view.addChild(body);

    const headShape = texture('head');
    headShape.anchor.set(0.4, 1);
    this.head.addChild(headShape);

    this.earL = texture('ear');
    this.earL.anchor.set(0.5, 0.05);
    this.earL.position.set(-16, -48);
    this.earR = texture('ear');
    this.earR.anchor.set(0.5, 0.05);
    this.earR.position.set(10, -46);
    this.head.addChild(this.earL, this.earR);

    this.head.position.set(52, -30);
    this.view.addChild(this.head);

    this.view.scale.set(scale);
  }

  position(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /** Läuft zu einer x-Position; die Ohren schwingen nach (Follow-Through). */
  runTo(x: number, durationSec: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline.to(this.view, { x, duration: durationSec, ease: 'power1.inOut' }, 0);

    for (const [i, leg] of this.legs.entries()) {
      timeline.to(
        leg,
        {
          rotation: i % 2 === 0 ? 0.5 : -0.5,
          duration: 0.12,
          yoyo: true,
          repeat: Math.max(1, Math.round(durationSec / 0.24)),
          ease: 'sine.inOut',
        },
        0
      );
    }

    /* Die Ohren kommen später an als der Kopf — das ist der ganze Witz an Follow-Through. */
    timeline.to(this.earL, { rotation: -0.35, duration: 0.2, yoyo: true, repeat: 3 }, 0.06);
    timeline.to(this.earR, { rotation: -0.3, duration: 0.2, yoyo: true, repeat: 3 }, 0.09);
    timeline.to([this.earL, this.earR], { rotation: 0, duration: 0.25 }, durationSec);

    return timeline;
  }

  /** Schnüffelt: Kopf runter, Nase zuckt. */
  sniff(): gsap.core.Timeline {
    return gsap
      .timeline()
      .to(this.head, { y: -16, rotation: 0.18, duration: 0.22, ease: 'power2.out' })
      .to(this.head, { rotation: 0.24, duration: 0.07, yoyo: true, repeat: 3 })
      .to(this.head, { y: -30, rotation: 0, duration: 0.22, ease: 'power2.inOut' });
  }

  /** Bellt — nur wenn wirklich etwas drin ist. */
  bark(): gsap.core.Timeline {
    return gsap
      .timeline()
      .to(this.view.scale, { x: '+=0.06', y: '+=0.06', duration: 0.07, ease: 'back.out(3)' })
      .to(this.head, { rotation: -0.3, duration: 0.07 }, 0)
      .to(this.head, { rotation: 0, duration: 0.18, ease: 'elastic.out(1,0.4)' })
      .to(this.view.scale, { x: '-=0.06', y: '-=0.06', duration: 0.18 }, '<');
  }

  /** Wedelt zufrieden. */
  wag(times = 4): gsap.core.Timeline {
    return gsap.timeline().to(this.tail, {
      rotation: -0.6,
      duration: 0.14,
      yoyo: true,
      repeat: times * 2 - 1,
      ease: 'sine.inOut',
    });
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
