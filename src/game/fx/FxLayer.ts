/**
 * Die gemeinsamen Effekte der Sequenzen (Art Direction §8, Roadmap M4.4).
 *
 * Acht Hit-Sequenzen brauchen dieselben vier Dinge — Rauch, Erde, Sternchen, Blaetter.
 * Wenn jede ihre eigene Wolke baut, hat jede ein eigenes Timing, ein eigenes Aussehen
 * und ein eigenes Budget; nach der dritten weiss niemand mehr, warum die zweite anders
 * aussieht. Hier liegt das Rezept **einmal**, und die Sequenzen sagen nur noch, wo und
 * wie gross.
 *
 * Alle Sprites kommen aus Pools (`ParticlePool`): waehrend einer Explosion wird nichts
 * allokiert (CLAUDE.md), und die Obergrenzen aus dem Partikel-Budget gelten hart.
 *
 * Die Ebene haengt **im Feld-Layer**, also im selben Koordinatensystem wie Platten und
 * Diggers. Eine Sequenz kann deshalb `fx.smoke(tile.view.x, tile.view.y)` schreiben,
 * ohne irgendetwas umzurechnen.
 */

import gsap from 'gsap';
import { Container, type Spritesheet } from 'pixi.js';
import { PARTICLE_BUDGET, UI_COLORS } from '@/config/theme';
import type { SeededRng } from '@/core/rng';
import type { FxKit } from '../sequences/Sequence';
import { ParticlePool } from './ParticlePool';

/** Wieviele Wolken ein Rauchpilz hat. Zwoelf ist das Budget — neun sehen besser aus. */
const SMOKE_PUFFS = 9;

export class FxLayer implements FxKit {
  readonly view = new Container();

  private readonly smokeS: ParticlePool;
  private readonly smokeM: ParticlePool;
  private readonly dirtPool: ParticlePool;
  private readonly starPool: ParticlePool;
  private readonly leafPool: ParticlePool;
  private readonly confettiPool: ParticlePool;
  private readonly rng: SeededRng;
  private lowEffects: boolean;

  constructor(options: { sheet: Spritesheet; rng: SeededRng; lowEffects?: boolean }) {
    const { sheet, rng } = options;
    this.rng = rng;
    this.lowEffects = options.lowEffects ?? false;

    const pool = (frame: string, max: number): ParticlePool =>
      new ParticlePool({ sheet, frame, max, layer: this.view });

    /*
     * Zwei Rauchgroessen teilen sich das Budget: die kleinen Woelkchen tragen den Pilz,
     * die mittleren sitzen in seinem Kopf. Zusammen bleiben sie unter den zwoelf aus
     * Art Direction §8.
     */
    this.smokeS = pool('fx/smoke_s', Math.ceil(PARTICLE_BUDGET.smoke.max * 0.6));
    this.smokeM = pool('fx/smoke_m', Math.floor(PARTICLE_BUDGET.smoke.max * 0.4));
    this.dirtPool = pool('fx/dirt', PARTICLE_BUDGET.dirt.max);
    this.starPool = pool('fx/star', PARTICLE_BUDGET.stars.max);
    this.leafPool = pool('fx/leaf', PARTICLE_BUDGET.leaves.max);
    this.confettiPool = pool('fx/confetti', PARTICLE_BUDGET.confetti.max);
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
  }

  /**
   * Wieviele Partikel eine Sequenz bekommt.
   *
   * Bei Low-Effects wird **die Zahl** gekuerzt, nicht der Effekt gestrichen: Ein Krater
   * ohne jeden Rauch liest sich anders als einer mit wenig Rauch, und die Lesbarkeit des
   * Feldes ist Design-Prioritaet 4. Ein Drittel reicht dafuer.
   */
  private budget(count: number): number {
    return this.lowEffects ? Math.max(1, Math.round(count / 3)) : count;
  }

  /* ---------------------------------------------------------------- */

  /**
   * Der Rauchpilz: ein Stiel aus kleinen Wolken, oben ein Kopf aus zwei grossen.
   * Sie steigen, drehen sich langsam und werden dabei durchsichtig.
   */
  smoke(x: number, y: number, scale = 1): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const puffs = this.budget(SMOKE_PUFFS);

    for (let i = 0; i < puffs; i++) {
      // Die letzten beiden sind der Kopf des Pilzes und kommen aus dem groesseren Pool.
      const head = i >= puffs - 2;
      const pool = head ? this.smokeM : this.smokeS;
      const sprite = pool.acquire();

      const spread = this.rng.range(-0.35, 0.35) * 90 * scale;
      const rise = (head ? 1 : this.rng.range(0.35, 0.85)) * 210 * scale;
      const size = (head ? this.rng.range(0.9, 1.2) : this.rng.range(0.4, 0.8)) * scale;

      sprite.position.set(x, y);
      sprite.scale.set(size * 0.3);
      sprite.tint = UI_COLORS.smoke;
      sprite.alpha = 0.9;

      const delay = i * 0.035;
      timeline.to(
        sprite,
        {
          x: x + spread,
          y: y - rise,
          rotation: this.rng.range(-0.6, 0.6),
          alpha: 0,
          duration: PARTICLE_BUDGET.smoke.lifeMs / 1000,
          ease: 'power1.out',
          onComplete: () => pool.release(sprite),
        },
        delay
      );
      timeline.to(
        sprite.scale,
        { x: size, y: size, duration: PARTICLE_BUDGET.smoke.lifeMs / 1000, ease: 'power1.out' },
        delay
      );
    }
    return timeline;
  }

  /**
   * Erdklumpen: nach oben weg, dann faellt jeder in seinem eigenen Bogen zurueck.
   * Zwei Tweens statt einer Parabel — das reicht, um wie Schwerkraft auszusehen.
   */
  dirt(x: number, y: number, count = 12): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const clumps = this.budget(Math.min(count, PARTICLE_BUDGET.dirt.max));
    const life = PARTICLE_BUDGET.dirt.lifeMs / 1000;

    for (let i = 0; i < clumps; i++) {
      const sprite = this.dirtPool.acquire();
      const angle = (i / clumps) * Math.PI * 2 + this.rng.range(-0.2, 0.2);
      const distance = this.rng.range(70, 190);
      const peak = this.rng.range(90, 200);

      sprite.position.set(x, y);
      sprite.scale.set(this.rng.range(0.3, 0.7));

      timeline.to(
        sprite,
        {
          x: x + Math.cos(angle) * distance,
          rotation: this.rng.range(-4, 4),
          duration: life,
          ease: 'none',
        },
        0
      );
      timeline.to(sprite, { y: y - peak, duration: life * 0.4, ease: 'power2.out' }, 0);
      timeline.to(
        sprite,
        {
          y: y + this.rng.range(0, 40),
          duration: life * 0.6,
          ease: 'power2.in',
          onComplete: () => this.dirtPool.release(sprite),
        },
        life * 0.4
      );
    }
    return timeline;
  }

  /** Sternchen kreisen ueber einem Punkt — der Cartoon-Schwindel. */
  stars(x: number, y: number, count = 5): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const total = this.budget(Math.min(count, PARTICLE_BUDGET.stars.max));
    const life = PARTICLE_BUDGET.stars.lifeMs / 1000;
    const radius = 46;

    for (let i = 0; i < total; i++) {
      const sprite = this.starPool.acquire();
      const phase = (i / total) * Math.PI * 2;
      const orbit = { t: 0 };

      sprite.position.set(x + Math.cos(phase) * radius, y);
      sprite.scale.set(0.5);

      timeline.to(
        orbit,
        {
          t: 1,
          duration: life,
          ease: 'none',
          onUpdate: () => {
            const angle = phase + orbit.t * Math.PI * 2.5;
            sprite.x = x + Math.cos(angle) * radius;
            // Halbe Hoehe: Die Bahn liegt schraeg im Bild, nicht flach auf dem Tisch.
            sprite.y = y + Math.sin(angle) * radius * 0.4;
            sprite.rotation = angle;
          },
          onComplete: () => this.starPool.release(sprite),
        },
        0
      );
      timeline.to(sprite, { alpha: 0, duration: life * 0.3 }, life * 0.7);
    }
    return timeline;
  }

  /** Blaetter rieseln vom Baum — langsam, im Zickzack. */
  leaves(x: number, y: number, count = 8): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const total = this.budget(Math.min(count, PARTICLE_BUDGET.leaves.max));
    const life = PARTICLE_BUDGET.leaves.lifeMs / 1000;

    for (let i = 0; i < total; i++) {
      const sprite = this.leafPool.acquire();
      const drift = this.rng.range(-70, 70);

      sprite.position.set(x + this.rng.range(-40, 40), y);
      sprite.scale.set(this.rng.range(0.4, 0.7));

      const delay = i * 0.08;
      timeline.to(
        sprite,
        {
          y: y + this.rng.range(180, 280),
          duration: life,
          ease: 'sine.in',
          onComplete: () => this.leafPool.release(sprite),
        },
        delay
      );
      // Das Pendeln macht aus einem fallenden Punkt ein fallendes Blatt.
      timeline.to(
        sprite,
        {
          x: `+=${drift}`,
          rotation: this.rng.range(-3, 3),
          duration: life / 2,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
        delay
      );
    }
    return timeline;
  }

  /** Konfetti. `tint` faerbt es grau — beim Preis der Gier ist auch der Jubel angesengt. */
  confetti(x: number, y: number, tint?: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const total = this.budget(Math.min(40, PARTICLE_BUDGET.confetti.max));
    const life = PARTICLE_BUDGET.confetti.lifeMs / 1000;

    for (let i = 0; i < total; i++) {
      const sprite = this.confettiPool.acquire();
      if (tint !== undefined) sprite.tint = tint;

      sprite.position.set(x + this.rng.range(-60, 60), y - this.rng.range(0, 60));
      sprite.scale.set(this.rng.range(0.3, 0.6));

      const delay = this.rng.range(0, 0.35);
      timeline.to(
        sprite,
        {
          x: `+=${this.rng.range(-160, 160)}`,
          y: y + this.rng.range(260, 420),
          rotation: this.rng.range(-8, 8),
          duration: life,
          ease: 'sine.in',
          onComplete: () => this.confettiPool.release(sprite),
        },
        delay
      );
      timeline.to(sprite, { alpha: 0, duration: life * 0.25 }, delay + life * 0.75);
    }
    return timeline;
  }

  /* ---------------------------------------------------------------- */

  /** Alles einsammeln — Rundenstart oder abgebrochene Sequenz. */
  clear(): void {
    for (const pool of this.pools) pool.releaseAll();
  }

  /** Wieviele Partikel gerade laufen. Der Perf-Test liest das ueber die Testbruecke. */
  get active(): number {
    return this.pools.reduce((sum, pool) => sum + pool.active, 0);
  }

  private get pools(): readonly ParticlePool[] {
    return [this.smokeS, this.smokeM, this.dirtPool, this.starPool, this.leafPool, this.confettiPool];
  }

  destroy(): void {
    for (const pool of this.pools) pool.destroy();
    this.view.destroy({ children: true });
  }
}
