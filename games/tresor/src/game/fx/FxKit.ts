/**
 * Die wiederverwendbaren Effekt-Bausteine (Art Direction §4.5, Roadmap M4.4).
 *
 * CLAUDE.md sagt: extrahieren, sobald ein Effekt zweimal gebraucht wird. Genau das ist
 * hier passiert — Muenzregen taucht in vier Inszenierungen auf, Sternchen in drei, der
 * Kinnlade-Gag in zwei.
 *
 * Alle Pools teilen sich das Budget aus Art Direction §8 und geben ihre Sprites nach der
 * Animation zurueck. Wer hier neu allokiert, ruiniert genau den Moment, auf den alle
 * warten (CLAUDE.md: keine Allokationen im Loop).
 */

import gsap from 'gsap';
import { Container } from 'pixi.js';
import { PARTICLE_BUDGET, STAGE, UI_COLORS } from '@/config/theme';
import type { SeededRng } from '@/core/rng';
import type { StageAssets } from '../StageApp';
import { ParticlePool } from './ParticlePool';

export interface FxKitOptions {
  assets: StageAssets;
  rng: SeededRng;
  lowEffects?: boolean;
}

export class FxKit {
  /** Haengt ueber den Figuren, unter dem Licht. */
  readonly view = new Container();

  private readonly coins: ParticlePool;
  private readonly confetti: ParticlePool;
  private readonly stars: ParticlePool;
  private readonly smoke: ParticlePool;
  private readonly hearts: ParticlePool;
  private readonly rng: SeededRng;
  private lowEffects: boolean;

  constructor(options: FxKitOptions) {
    const sheet = options.assets.front;
    this.rng = options.rng;
    this.lowEffects = options.lowEffects ?? false;

    this.coins = new ParticlePool({ sheet, frame: 'props/coin', max: PARTICLE_BUDGET.coinRain.max });
    this.confetti = new ParticlePool({
      sheet,
      frame: 'props/confetti',
      max: PARTICLE_BUDGET.confetti.max,
    });
    this.stars = new ParticlePool({ sheet, frame: 'props/star', max: PARTICLE_BUDGET.stars.max });
    this.smoke = new ParticlePool({
      sheet,
      frame: 'props/smoke',
      max: PARTICLE_BUDGET.tireSmoke.max,
    });
    this.hearts = new ParticlePool({ sheet, frame: 'props/heart', max: PARTICLE_BUDGET.stars.max });

    this.view.addChild(
      this.smoke.view,
      this.coins.view,
      this.confetti.view,
      this.stars.view,
      this.hearts.view
    );
  }

  /** Summe aller fliegenden Partikel — Audit A4 prueft das Budget. */
  get activeParticles(): number {
    return (
      this.coins.active +
      this.confetti.active +
      this.stars.active +
      this.smoke.active +
      this.hearts.active
    );
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
    if (low) this.reset();
  }

  /**
   * Muenzregen. Faellt von oben in einen Bereich — der Tresor spuckt aus, der Sack
   * platzt, der Jackpot geht hoch.
   */
  coinRain(x: number, width: number, count: number, durationMs = 1400): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects) return timeline;

    for (let i = 0; i < count; i++) {
      const coin = this.coins.take();
      if (!coin) break;
      const startX = x + this.rng.range(-width / 2, width / 2);
      const endY = STAGE.worldSize * this.rng.range(0.62, 0.86);
      coin.position.set(startX, -40);
      coin.scale.set(this.rng.range(0.7, 1.15));

      timeline.to(
        coin,
        {
          y: endY,
          x: startX + this.rng.range(-40, 40),
          rotation: this.rng.range(-4, 4),
          duration: durationMs / 1000,
          ease: 'power1.in',
          onComplete: () => this.coins.release(coin),
        },
        this.rng.range(0, 0.5)
      );
    }
    return timeline;
  }

  /**
   * Muenzen fliegen von einem Punkt in die Muender der Diebe (GDD §4.4, tugofwar).
   * Der Bogen ist der Punkt: Eine gerade Linie sieht aus wie ein Fehler.
   */
  coinsTo(
    from: { x: number; y: number },
    targets: readonly { x: number; y: number }[],
    perTarget = 4
  ): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects || targets.length === 0) return timeline;

    targets.forEach((target, index) => {
      for (let i = 0; i < perTarget; i++) {
        const coin = this.coins.take();
        if (!coin) return;
        coin.position.set(from.x, from.y);
        const at = index * 0.06 + i * 0.09;
        const peak = Math.min(from.y, target.y) - 120;

        timeline
          .to(coin, { x: (from.x + target.x) / 2, y: peak, duration: 0.22, ease: 'power2.out' }, at)
          .to(
            coin,
            {
              x: target.x,
              y: target.y,
              rotation: this.rng.range(-3, 3),
              duration: 0.24,
              ease: 'power2.in',
              onComplete: () => this.coins.release(coin),
            },
            at + 0.22
          );
      }
    });
    return timeline;
  }

  /** Goldkonfetti — der Jackpot und der feiernde Dieb. */
  confettiBurst(x: number, y: number, count: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects) return timeline;

    const colors = [UI_COLORS.gold, UI_COLORS.paper, UI_COLORS.share, UI_COLORS.steal];
    for (let i = 0; i < count; i++) {
      const piece = this.confetti.take();
      if (!piece) break;
      piece.position.set(x, y);
      piece.tint = colors[i % colors.length]!;
      piece.scale.set(this.rng.range(0.6, 1.2));

      const angle = this.rng.range(-Math.PI, 0);
      const distance = this.rng.range(160, 420);

      timeline.to(
        piece,
        {
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance * 0.6 + this.rng.range(180, 380),
          rotation: this.rng.range(-8, 8),
          alpha: 0,
          duration: this.rng.range(1.1, 1.9),
          ease: 'power1.out',
          onComplete: () => this.confetti.release(piece),
        },
        this.rng.range(0, 0.25)
      );
    }
    return timeline;
  }

  /** Sternchen ueber dem Kopf — Amboss, Pruegelwolke, Treffer. */
  starsAbove(x: number, y: number, count = 5, durationMs = 1200): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects) return timeline;

    for (let i = 0; i < count; i++) {
      const star = this.stars.take();
      if (!star) break;
      const angle = (i / count) * Math.PI * 2;
      star.position.set(x, y);
      star.scale.set(0.5);

      timeline.to(
        star,
        {
          x: x + Math.cos(angle) * 60,
          y: y + Math.sin(angle) * 26 - 20,
          rotation: this.rng.range(-2, 2),
          alpha: 0,
          duration: durationMs / 1000,
          ease: 'power1.out',
          onComplete: () => this.stars.release(star),
        },
        i * 0.05
      );
      timeline.to(star.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(3)' }, i * 0.05);
    }
    return timeline;
  }

  /** Herzchen — die Gruppenumarmung. */
  heartsAbove(x: number, y: number, count = 5): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects) return timeline;

    for (let i = 0; i < count; i++) {
      const heart = this.hearts.take();
      if (!heart) break;
      heart.position.set(x + this.rng.range(-70, 70), y);
      heart.scale.set(0.3);

      timeline.to(
        heart,
        {
          y: y - this.rng.range(120, 220),
          x: heart.position.x + this.rng.range(-30, 30),
          alpha: 0,
          duration: this.rng.range(1.2, 1.8),
          ease: 'power1.out',
          onComplete: () => this.hearts.release(heart),
        },
        i * 0.12
      );
      timeline.to(heart.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' }, i * 0.12);
    }
    return timeline;
  }

  /** Rauch — Reifenqualm, Kampfstaub, ein verschwindender Zauberer. */
  smokePuff(x: number, y: number, count = 5, tint: number = UI_COLORS.steel): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.lowEffects) return timeline;

    for (let i = 0; i < count; i++) {
      const puff = this.smoke.take();
      if (!puff) break;
      puff.position.set(x + this.rng.range(-30, 30), y);
      puff.tint = tint;
      puff.alpha = 0.8;
      puff.scale.set(0.4);

      timeline.to(
        puff,
        {
          x: puff.position.x + this.rng.range(-120, 120),
          y: y - this.rng.range(30, 110),
          alpha: 0,
          duration: this.rng.range(0.5, 0.9),
          ease: 'power1.out',
          onComplete: () => this.smoke.release(puff),
        },
        i * 0.06
      );
      timeline.to(puff.scale, { x: 1.6, y: 1.6, duration: 0.7 }, i * 0.06);
    }
    return timeline;
  }

  reset(): void {
    this.coins.reset();
    this.confetti.reset();
    this.stars.reset();
    this.smoke.reset();
    this.hearts.reset();
  }

  destroy(): void {
    this.coins.destroy();
    this.confetti.destroy();
    this.stars.destroy();
    this.smoke.destroy();
    this.hearts.destroy();
    this.view.destroy({ children: true });
  }
}
