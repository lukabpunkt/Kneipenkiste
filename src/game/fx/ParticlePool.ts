/**
 * Partikel-Pool (Art Direction §8, CLAUDE.md: keine Allokationen im Loop).
 *
 * Ein Vorrat an Sprites, der einmal angelegt und danach nur noch durchgereicht wird.
 * Waehrend einer Inszenierung fliegen bis zu hundert Konfetti-Schnipsel — jeden davon
 * neu zu bauen hiesse, mitten in der Show den Garbage Collector einzuladen.
 *
 * Das Budget aus Art Direction §8 ist eine **harte** Grenze: Ist der Vorrat leer, kommt
 * kein Partikel mehr. Lieber ein Effekt, der etwas duenner ausfaellt, als ein Frame-Drop
 * in dem Moment, auf den alle warten.
 */

import gsap from 'gsap';
import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';

export interface ParticlePoolOptions {
  sheet: Spritesheet;
  /** Frame-Name im Atlas, z. B. `props/coin`. */
  frame: string;
  /** Harte Obergrenze gleichzeitig sichtbarer Partikel. */
  max: number;
}

export class ParticlePool {
  readonly view = new Container();

  private readonly texture: Texture;
  private readonly free: Sprite[] = [];
  private readonly busy = new Set<Sprite>();
  private readonly max: number;

  constructor(options: ParticlePoolOptions) {
    const texture = options.sheet.textures[options.frame];
    if (!texture) throw new Error(`Frame "${options.frame}" fehlt im Atlas.`);
    this.texture = texture;
    this.max = options.max;
  }

  /** Wieviele Partikel gerade fliegen — das Budget aus Art Direction §8 ist pruefbar. */
  get active(): number {
    return this.busy.size;
  }

  /**
   * Holt einen Sprite aus dem Vorrat. `undefined`, wenn das Budget erschoepft ist —
   * der Aufrufer laesst den Partikel dann einfach weg.
   */
  take(): Sprite | undefined {
    if (this.busy.size >= this.max) return undefined;
    const reused = this.free.pop();
    if (reused) {
      reused.visible = true;
      reused.alpha = 1;
      reused.rotation = 0;
      reused.scale.set(1);
      reused.tint = 0xffffff;
      this.busy.add(reused);
      return reused;
    }
    const sprite = new Sprite(this.texture);
    sprite.anchor.set(0.5);
    this.view.addChild(sprite);
    this.busy.add(sprite);
    return sprite;
  }

  /** Gibt einen Sprite zurueck in den Vorrat. */
  release(sprite: Sprite): void {
    if (!this.busy.delete(sprite)) return;
    gsap.killTweensOf([sprite, sprite.scale]);
    sprite.visible = false;
    this.free.push(sprite);
  }

  /** Alles einsammeln — Rundenwechsel, Abbruch. */
  reset(): void {
    for (const sprite of [...this.busy]) this.release(sprite);
  }

  destroy(): void {
    this.reset();
    this.view.destroy({ children: true });
  }
}
