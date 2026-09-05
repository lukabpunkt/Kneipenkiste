/**
 * Sprite-Pool fuer die Effekte (Art Direction §8, CLAUDE.md "keine Allokationen im Loop").
 *
 * Ein Rauchpilz besteht aus zwoelf Sprites, eine Explosion aus Rauch, Erde und
 * Sternchen — und in einer Runde explodiert es oft. Wuerde jede Sequenz ihre Sprites
 * selbst erzeugen, liefe der Garbage Collector genau dann, wenn es am meisten zu
 * zeichnen gibt: mitten in der Explosion.
 *
 * Der Pool baut die Sprites **einmal** und gibt sie danach immer wieder heraus. Ist
 * keines mehr frei, wird das aelteste zurueckgeholt — das ist die Obergrenze aus dem
 * Partikel-Budget, und sie gilt hart: Lieber ein Klumpen Erde weniger als ein Ruckler.
 */

import { Sprite, type Container, type Spritesheet, type Texture } from 'pixi.js';

export interface ParticlePoolOptions {
  sheet: Spritesheet;
  /** Texturname im Board-Atlas, z. B. `fx/smoke_m`. */
  frame: string;
  /** Wieviele Sprites es hoechstens gleichzeitig gibt (`PARTICLE_BUDGET`). */
  max: number;
  /** Wohin die Sprites gehaengt werden. */
  layer: Container;
}

export class ParticlePool {
  readonly frame: string;
  private readonly texture: Texture;
  private readonly layer: Container;
  private readonly max: number;
  /** Alle Sprites, die es gibt — in der Reihenfolge ihrer Erzeugung. */
  private readonly sprites: Sprite[] = [];
  /** Naechster Kandidat beim Umlauf, wenn alles belegt ist. */
  private cursor = 0;

  constructor(options: ParticlePoolOptions) {
    const texture = options.sheet.textures[options.frame];
    if (!texture) throw new Error(`Frame "${options.frame}" fehlt im Board-Atlas.`);
    this.texture = texture;
    this.frame = options.frame;
    this.layer = options.layer;
    this.max = options.max;
  }

  /**
   * Holt ein Sprite heraus, sichtbar und auf Ausgangswerten.
   *
   * Es kommt **nicht** zurueck in eine Freiliste — wer es benutzt, blendet es am Ende
   * seiner Timeline aus (`release`). Solange das Budget reicht, entsteht ein neues; ist
   * es ausgeschoepft, wird reihum das aelteste wiederverwendet, auch wenn es noch
   * laeuft. Ein abgeschnittener Rauchfaden faellt niemandem auf, ein Ruckler schon.
   */
  acquire(): Sprite {
    let sprite = this.sprites.find((candidate) => !candidate.visible);

    if (!sprite) {
      if (this.sprites.length < this.max) {
        sprite = new Sprite(this.texture);
        sprite.anchor.set(0.5);
        this.sprites.push(sprite);
        this.layer.addChild(sprite);
      } else {
        sprite = this.sprites[this.cursor % this.sprites.length]!;
        this.cursor += 1;
      }
    }

    sprite.visible = true;
    sprite.alpha = 1;
    sprite.rotation = 0;
    sprite.scale.set(1);
    sprite.tint = 0xffffff;
    sprite.position.set(0, 0);
    return sprite;
  }

  /** Zurueck in den Pool: unsichtbar heisst frei. */
  release(sprite: Sprite): void {
    sprite.visible = false;
  }

  /** Alles einsammeln — Rundenstart, Screenwechsel. */
  releaseAll(): void {
    for (const sprite of this.sprites) sprite.visible = false;
  }

  /** Wieviele Sprites gerade laufen. Der Perf-Test liest das mit. */
  get active(): number {
    return this.sprites.reduce((count, sprite) => count + (sprite.visible ? 1 : 0), 0);
  }

  get size(): number {
    return this.sprites.length;
  }

  destroy(): void {
    for (const sprite of this.sprites) sprite.destroy();
    this.sprites.length = 0;
  }
}
