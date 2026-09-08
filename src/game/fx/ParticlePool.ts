/**
 * Partikel-Pool (Art Direction §8, Architektur §8).
 *
 * Ein fester Vorrat an Sprites, der wiederverwendet wird. Im Loop wird nichts erzeugt und
 * nichts weggeworfen — ein `new Sprite()` mitten im Bruch ist genau der Ruckler, den man
 * an der Stelle am wenigsten gebrauchen kann.
 *
 * Der Pool wächst nie: Ist er leer, fällt der Partikel aus. Das ist Absicht. Das Budget
 * aus Art Direction §8 ist eine Obergrenze, keine Empfehlung.
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';

export interface ParticleSpawn {
  x: number;
  y: number;
  /** Startgeschwindigkeit in Welteinheiten pro Sekunde. */
  vx: number;
  vy: number;
  /** Umdrehungen pro Sekunde (Radiant). */
  spin?: number;
  scale?: number;
  lifeMs: number;
  /** Fall-Beschleunigung; 0 für Partikel, die schweben (Ringe). */
  gravity?: number;
  /** Am Ende ausblenden statt hart verschwinden. */
  fade?: boolean;
  /** Wächst über die Lebenszeit (Wasserringe). */
  grow?: number;
}

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  maxLife: number;
  gravity: number;
  fade: boolean;
  grow: number;
  baseScale: number;
}

export class ParticlePool {
  readonly view = new Container();

  private readonly free: Particle[] = [];
  private readonly active: Particle[] = [];

  constructor(texture: Texture, size: number) {
    for (let i = 0; i < size; i += 1) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.view.addChild(sprite);
      this.free.push({
        sprite,
        vx: 0,
        vy: 0,
        spin: 0,
        life: 0,
        maxLife: 1,
        gravity: 0,
        fade: true,
        grow: 0,
        baseScale: 1,
      });
    }
  }

  /** Ist der Vorrat leer, passiert nichts — das Budget ist eine Obergrenze. */
  spawn(options: ParticleSpawn): void {
    const particle = this.free.pop();
    if (!particle) return;

    particle.vx = options.vx;
    particle.vy = options.vy;
    particle.spin = options.spin ?? 0;
    particle.life = 0;
    particle.maxLife = options.lifeMs;
    particle.gravity = options.gravity ?? 0;
    particle.fade = options.fade ?? true;
    particle.grow = options.grow ?? 0;
    particle.baseScale = options.scale ?? 1;

    particle.sprite.position.set(options.x, options.y);
    particle.sprite.scale.set(particle.baseScale);
    particle.sprite.rotation = 0;
    particle.sprite.alpha = 1;
    particle.sprite.visible = true;

    this.active.push(particle);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;

    /* Rückwärts, damit `splice` die noch nicht besuchten Indizes nicht verschiebt. */
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const particle = this.active[i]!;
      particle.life += dtMs;

      if (particle.life >= particle.maxLife) {
        particle.sprite.visible = false;
        this.active.splice(i, 1);
        this.free.push(particle);
        continue;
      }

      particle.vy += particle.gravity * dt;
      particle.sprite.position.x += particle.vx * dt;
      particle.sprite.position.y += particle.vy * dt;
      particle.sprite.rotation += particle.spin * dt;

      const progress = particle.life / particle.maxLife;
      if (particle.fade) particle.sprite.alpha = 1 - progress * progress;
      if (particle.grow > 0) {
        particle.sprite.scale.set(particle.baseScale * (1 + progress * particle.grow));
      }
    }
  }

  /** Wie viele Partikel gerade fliegen — der Perf-Test schaut hier hin. */
  activeCount(): number {
    return this.active.length;
  }

  reset(): void {
    for (const particle of this.active) {
      particle.sprite.visible = false;
      this.free.push(particle);
    }
    this.active.length = 0;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}

/** Baut einen Pool aus einem Atlas-Frame; wirft, wenn der Frame fehlt. */
export function poolFrom(sheet: Spritesheet, frame: string, size: number): ParticlePool {
  const texture = sheet.textures[frame];
  if (!texture) throw new Error(`Frame "${frame}" fehlt im world-Atlas.`);
  return new ParticlePool(texture, size);
}
