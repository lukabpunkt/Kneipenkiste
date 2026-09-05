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
  /**
   * Welche Sprites gerade vergeben sind.
   *
   * **Reserviert ist nicht dasselbe wie sichtbar** — und genau daran hing ein Fehler,
   * der im Spiel jeden Knall gekostet hat: Eine Sequenz wird gebaut, waehrend die
   * Anticipation noch laeuft, abgespielt wird sie fast eine Sekunde spaeter. Wer beim
   * Herausgeben sofort `visible = true` setzt, hat neun Rauchwolken bewegungslos auf
   * einer geschlossenen Platte liegen: Die Mine ist verraten, und beim Knall erscheint
   * nichts mehr, es faengt nur an sich zu bewegen (Playtest-Finding 01, ADR-23).
   *
   * Deshalb zwei getrennte Zustaende. Ohne dieses Set wuerde die Freiliste ein gerade
   * vergebenes, aber noch unsichtbares Sprite ein zweites Mal herausgeben.
   */
  private readonly reserved = new Set<Sprite>();
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
   * Holt ein Sprite heraus — reserviert und auf Ausgangswerten, aber **unsichtbar**.
   *
   * Sichtbar macht es der Aufrufer erst, wenn seine Bewegung tatsaechlich losgeht
   * (`FxLayer` tut das im `onStart` des ersten Tweens). Zwischen Herausgeben und
   * Loslaufen liegt eine knappe Sekunde Anticipation — in der darf auf der Platte nichts
   * zu sehen sein.
   *
   * Zurueck kommt es ueber `release()`. Solange das Budget reicht, entsteht ein neues;
   * ist es ausgeschoepft, wird reihum das aelteste wiederverwendet, auch wenn es noch
   * laeuft. Ein abgeschnittener Rauchfaden faellt niemandem auf, ein Ruckler schon.
   */
  acquire(): Sprite {
    let sprite = this.sprites.find((candidate) => !this.reserved.has(candidate));

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

    this.reserved.add(sprite);
    sprite.visible = false;
    sprite.alpha = 1;
    sprite.rotation = 0;
    sprite.scale.set(1);
    sprite.tint = 0xffffff;
    sprite.position.set(0, 0);
    return sprite;
  }

  /** Zurueck in den Pool: nicht mehr reserviert, nicht mehr sichtbar. */
  release(sprite: Sprite): void {
    this.reserved.delete(sprite);
    sprite.visible = false;
  }

  /** Alles einsammeln — Rundenstart, Screenwechsel, abgebrochene Sequenz. */
  releaseAll(): void {
    this.reserved.clear();
    for (const sprite of this.sprites) sprite.visible = false;
  }

  /**
   * Wieviele Sprites gerade vergeben sind — reserviert **oder** laufend.
   *
   * Das ist die Groesse, die das Partikel-Budget begrenzt: Ein reserviertes Sprite ist
   * belegt, auch wenn man es noch nicht sieht.
   */
  get active(): number {
    return this.reserved.size;
  }

  get size(): number {
    return this.sprites.length;
  }

  destroy(): void {
    for (const sprite of this.sprites) sprite.destroy();
    this.sprites.length = 0;
  }
}
