/**
 * Herr Kassel, der Tresor-Wächter (Art Direction §5, GDD §7).
 *
 * Ein Crook-Rig im Bankier-Sakko, mit Monokel und Kassenbuch — nie getintet, immer
 * gleich. Er ist der einzige, der auf der Buehne spricht: Ohne Moderator waere die
 * Aufdeckung eine Reihe Bilder, mit ihm ist sie eine Show.
 *
 * Die Sprechblasen laufen ueber eine **Warteschlange**. Kassel wirft im Sekundentakt
 * Kommentare ein; ohne Queue wuerde jeder neue Satz den vorigen mitten im Wort abschneiden.
 */

import gsap from 'gsap';
import { Container, Sprite, type Spritesheet } from 'pixi.js';
import { STAGE } from '@/config/theme';
import { SpeechBubble } from './fx/SpeechBubble';

/** Rig-Layout wie beim Crook, aber ohne Maske und ohne Farbe. */
const RIG = {
  height: 276,
  foot: { x: 20, y: 0 },
  leg: { x: 20, y: -60 },
  torso: { y: -56 },
  arm: { x: 44, y: -146 },
  head: { y: -212 },
  face: { y: -210 },
  hat: { y: -268 },
  ledger: { x: 62, y: -110 },
} as const;

const ARM_REST = 0.2;
const BREATH = { periodMs: 4200, torsoScale: 0.018 } as const;

export interface KasselOptions {
  /**
   * Der `crooks`-Atlas. Kassel liegt bewusst dort und nicht bei der Kulisse: Er ist eine
   * Figur, und alle seine Teile — Rig wie Sakko — muessen aus **einer** Textur kommen,
   * sonst kostet er allein zwei zusaetzliche Draw-Calls (ADR-14).
   */
  sheet: Spritesheet;
  /** `front`-Atlas: Rahmen und Zipfel der Sprechblase. */
  frontSheet: Spritesheet;
  /** Spielhoehe in Welteinheiten. */
  height: number;
  lowEffects?: boolean;
}

export class Kassel {
  readonly view = new Container();
  readonly bubble: SpeechBubble;

  private readonly body = new Container();
  private readonly shadow: Sprite;
  private readonly torso: Sprite;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly head = new Container();

  private readonly baseScale: number;
  private elapsed = 0;

  /** Was noch gesagt werden will. Eine Blase nach der anderen. */
  private readonly queue: { text: string; holdMs: number }[] = [];
  private speaking = false;

  constructor(options: KasselOptions) {
    const { sheet } = options;
    this.bubble = new SpeechBubble({ sheet: options.frontSheet });
    // Bankier-Grau statt Spielerfarbe: Kassel gehoert keiner Seite an.
    const tint = 0xd8d3c4;

    const part = (frame: string, x: number, y: number, anchorY: number, t?: number): Sprite => {
      const texture = sheet.textures[frame];
      if (!texture) throw new Error(`Frame "${frame}" fehlt im Atlas.`);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, anchorY);
      sprite.position.set(x, y);
      if (t !== undefined) sprite.tint = t;
      return sprite;
    };
    const crook = (frame: string, x: number, y: number, anchorY: number, t?: number): Sprite =>
      part(`crooks/${frame}`, x, y, anchorY, t);
    const back = (frame: string, x: number, y: number, anchorY: number): Sprite =>
      part(`kassel/${frame}`, x, y, anchorY);

    this.shadow = crook('shadow', 0, 0, 0.5);
    this.shadow.alpha = 0.35;
    this.shadow.tint = 0x000000;
    this.shadow.visible = !(options.lowEffects ?? false);

    const footL = crook('foot', -RIG.foot.x, RIG.foot.y, 1);
    const footR = crook('foot', RIG.foot.x, RIG.foot.y, 1);
    const legL = crook('leg', -RIG.leg.x, RIG.leg.y, 0.08, 0x4a506a);
    const legR = crook('leg', RIG.leg.x, RIG.leg.y, 0.08, 0x4a506a);

    this.torso = crook('torso', 0, RIG.torso.y, 1, tint);
    const jacket = back('jacket', 0, RIG.torso.y, 1);

    this.armL = crook('arm', -RIG.arm.x, RIG.arm.y, 0.12, 0x4a506a);
    this.armR = crook('arm', RIG.arm.x, RIG.arm.y, 0.12, 0x4a506a);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    const ledger = back('ledger', RIG.ledger.x, RIG.ledger.y, 0.5);
    ledger.rotation = 0.2;

    const headShape = crook('head', 0, 0, 0.5, tint);
    const face = back('face', 0, RIG.face.y - RIG.head.y, 0.5);
    const hat = crook('hats/tophat', 0, RIG.hat.y - RIG.head.y, 1);

    this.head.position.set(0, RIG.head.y);
    this.head.addChild(headShape, face, hat);

    this.body.addChild(footL, footR, legL, legR, this.torso, jacket, this.armL, this.armR, ledger, this.head);

    this.view.addChild(this.shadow, this.body);
    this.baseScale = options.height / RIG.height;
    this.view.scale.set(this.baseScale);

    // Die Blase haengt ueber Kassels Kopf, im Weltmassstab — nicht am Rig-Massstab,
    // sonst waere der Text bei kleinen Figuren unlesbar.
    this.bubble.view.position.set(STAGE.worldSize * 0.02, -options.height * 1.15);
  }

  setPosition(x: number, y: number): void {
    this.view.position.set(x, y);
    /*
     * Die Blase haengt ueber Kassel, wird aber am rechten Weltrand gehalten: Er steht
     * weit rechts, und eine Blase, die zur Haelfte aus dem Bild ragt, ist keine Blase.
     */
    const bubbleX = Math.min(x + 40, STAGE.worldSize - 190);
    this.bubble.view.position.set(bubbleX, y - RIG.height * this.baseScale * 1.2);
  }

  setLowEffects(low: boolean): void {
    this.shadow.visible = !low;
  }

  /**
   * Stellt einen Satz in die Warteschlange. Laeuft gerade eine Blase, wartet der neue
   * Satz — Kassel faellt sich nicht selbst ins Wort.
   */
  say(text: string, holdMs = 2600): void {
    if (!text) return;
    this.queue.push({ text, holdMs });
    if (!this.speaking) this.next();
  }

  /** Bricht ab, was noch gesagt werden wollte. */
  silence(): void {
    this.queue.length = 0;
    this.speaking = false;
    this.bubble.hide();
  }

  private next(): void {
    const line = this.queue.shift();
    if (!line) {
      this.speaking = false;
      return;
    }
    this.speaking = true;
    this.bubble.show(line.text, line.holdMs).eventCallback('onComplete', () => this.next());
  }

  /** Atmen — dieselbe Ruhe wie bei den Crooks, nur langsamer. Er hat es nicht eilig. */
  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    const phase = (this.elapsed % BREATH.periodMs) / BREATH.periodMs;
    const breath = Math.sin(phase * Math.PI * 2);
    this.torso.scale.set(1 - breath * BREATH.torsoScale * 0.5, 1 + breath * BREATH.torsoScale);
  }

  reset(): void {
    this.silence();
    gsap.killTweensOf([this.view, this.view.scale, this.body]);
    this.view.rotation = 0;
    this.view.scale.set(this.baseScale);
    this.body.position.set(0, 0);
    this.body.rotation = 0;
    this.head.rotation = 0;
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;
  }

  destroy(): void {
    this.bubble.destroy();
    this.view.destroy({ children: true });
  }
}
