/**
 * Partikel-Pool (Art Direction §8).
 *
 * Sprites werden **einmal** angelegt und wiederverwendet. Der Grund steht in CLAUDE.md
 * unter "keine Allokationen im Loop": Ein `new Sprite()` mitten in einer Fontäne kostet
 * einen GC-Ruckler, und der fällt genau in dem Moment auf, für den das Spiel gebaut ist.
 *
 * Jeder Pool hat eine harte Obergrenze. Ist sie erreicht, wird das älteste Partikel
 * recycelt statt ein neues erzeugt — lieber ein Partikel weniger als ein Ruckler.
 */

import { Container, Sprite, type Texture } from 'pixi.js';

export interface Particle {
  sprite: Sprite;
  /** Restlebenszeit in ms; <= 0 heißt frei. */
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vr: number;
  /** Schwerkraft in Welteinheiten pro Sekunde². */
  gravity: number;
}

export interface EmitOptions {
  x: number;
  y: number;
  texture: Texture;
  lifeMs: number;
  vx?: number;
  vy?: number;
  vr?: number;
  gravity?: number;
  scale?: number;
  alpha?: number;
  tint?: number;
}

export class ParticlePool {
  readonly view = new Container();

  private readonly particles: Particle[] = [];
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
    /* Partikel sind Deko — sie dürfen niemals einen Tap abfangen. */
    this.view.eventMode = 'none';
  }

  /** Wie viele Partikel gerade leben — Perf-Budget und Tests lesen das. */
  get active(): number {
    return this.particles.reduce((n, p) => (p.life > 0 ? n + 1 : n), 0);
  }

  emit(options: EmitOptions): Particle {
    const particle = this.take();

    particle.sprite.texture = options.texture;
    particle.sprite.anchor.set(0.5);
    particle.sprite.position.set(options.x, options.y);
    particle.sprite.rotation = 0;
    particle.sprite.scale.set(options.scale ?? 1);
    particle.sprite.alpha = options.alpha ?? 1;
    particle.sprite.tint = options.tint ?? 0xffffff;
    particle.sprite.visible = true;

    particle.life = options.lifeMs;
    particle.maxLife = options.lifeMs;
    particle.vx = options.vx ?? 0;
    particle.vy = options.vy ?? 0;
    particle.vr = options.vr ?? 0;
    particle.gravity = options.gravity ?? 0;

    return particle;
  }

  /** Ein freies Partikel — oder das älteste, wenn das Budget voll ist. */
  private take(): Particle {
    for (const particle of this.particles) {
      if (particle.life <= 0) return particle;
    }

    if (this.particles.length < this.max) {
      const sprite = new Sprite();
      sprite.eventMode = 'none';
      this.view.addChild(sprite);
      const particle: Particle = { sprite, life: 0, maxLife: 1, vx: 0, vy: 0, vr: 0, gravity: 0 };
      this.particles.push(particle);
      return particle;
    }

    /* Budget voll: Das am weitesten fortgeschrittene Partikel muss weichen. */
    let oldest = this.particles[0]!;
    for (const particle of this.particles) {
      if (particle.life / particle.maxLife < oldest.life / oldest.maxLife) oldest = particle;
    }
    return oldest;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    for (const particle of this.particles) {
      if (particle.life <= 0) continue;

      particle.life -= deltaMs;
      if (particle.life <= 0) {
        particle.sprite.visible = false;
        continue;
      }

      particle.vy += particle.gravity * dt;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.rotation += particle.vr * dt;

      /* Die letzten 30 % blenden aus — ein hart verschwindendes Partikel blitzt. */
      const remaining = particle.life / particle.maxLife;
      if (remaining < 0.3) particle.sprite.alpha = remaining / 0.3;
    }
  }

  /** Räumt alles ab, ohne die Sprites freizugeben. */
  clear(): void {
    for (const particle of this.particles) {
      particle.life = 0;
      particle.sprite.visible = false;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.particles.length = 0;
  }
}
