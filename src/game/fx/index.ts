/**
 * Das Effekt-Besteck, das jede Sequenz bekommt (Architektur §7).
 *
 * Eine Sequenz baut keine Pools und lädt keine Texturen — sie nimmt, was hier steht.
 * Dadurch teilen sich alle Sequenzen dieselben Vorräte und das Budget aus
 * Art Direction §8 gilt für die ganze Show, nicht pro Sequenz.
 */

import { Container, type Spritesheet } from 'pixi.js';
import { PARTICLE_BUDGET } from '@/config/theme';
import { poolFrom, type ParticlePool } from './ParticlePool';
import { Signs } from './Signs';
import { SpeechBubbles } from './SpeechBubble';

export { ParticlePool } from './ParticlePool';
export { Signs } from './Signs';
export { SpeechBubbles } from './SpeechBubble';
export { createStageText } from './text';

export class FxKit {
  readonly view = new Container();

  readonly splinters: ParticlePool;
  readonly splash: ParticlePool;
  readonly rings: ParticlePool;
  readonly stars: ParticlePool;
  readonly bubbles: SpeechBubbles;
  readonly signs: Signs;

  constructor(sheet: Spritesheet) {
    this.splinters = poolFrom(sheet, 'bridge/splinter', PARTICLE_BUDGET.splinters);
    this.splash = poolFrom(sheet, 'fx/droplet', PARTICLE_BUDGET.splash);
    this.rings = poolFrom(sheet, 'fx/ring', PARTICLE_BUDGET.waterRings);
    this.stars = poolFrom(sheet, 'fx/star', PARTICLE_BUDGET.stars);
    this.bubbles = new SpeechBubbles(sheet);
    this.signs = new Signs(sheet);

    this.view.addChild(
      this.splinters.view,
      this.splash.view,
      this.rings.view,
      this.stars.view,
      this.bubbles.view,
      this.signs.view
    );
  }

  /** Holz splittert dort, wo der Balken gerissen ist. */
  burstSplinters(x: number, y: number, count = 10): void {
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 120 + Math.random() * 180;
      this.splinters.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 14,
        scale: 0.6 + Math.random() * 0.6,
        lifeMs: 700 + Math.random() * 400,
        gravity: 900,
      });
    }
  }

  /** Der Platsch: Tropfen nach oben, Ringe nach aussen. */
  splashAt(x: number, y: number): void {
    for (let i = 0; i < PARTICLE_BUDGET.splash / 2; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const speed = 200 + Math.random() * 260;
      this.splash.spawn({
        x: x + (Math.random() - 0.5) * 40,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 6,
        scale: 0.5 + Math.random() * 0.7,
        lifeMs: 620 + Math.random() * 300,
        gravity: 1100,
      });
    }

    for (let i = 0; i < PARTICLE_BUDGET.waterRings; i += 1) {
      this.rings.spawn({
        x,
        y: y + 6,
        vx: 0,
        vy: 0,
        scale: 0.3,
        lifeMs: 800 + i * 220,
        grow: 2.4,
      });
    }
  }

  /** Sternchen beim Aufprall an der Felswand. */
  starsAt(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      this.stars.spawn({
        x,
        y,
        vx: Math.cos(angle) * 110,
        vy: Math.sin(angle) * 110 - 60,
        spin: (Math.random() - 0.5) * 8,
        scale: 0.5 + Math.random() * 0.4,
        lifeMs: 620,
        gravity: 420,
      });
    }
  }

  update(dtMs: number): void {
    this.splinters.update(dtMs);
    this.splash.update(dtMs);
    this.rings.update(dtMs);
    this.stars.update(dtMs);
  }

  /** Wie viele Partikel gerade fliegen — zusammen unter dem Budget (Art Direction §8). */
  activeParticles(): number {
    return (
      this.splinters.activeCount() +
      this.splash.activeCount() +
      this.rings.activeCount() +
      this.stars.activeCount()
    );
  }

  reset(): void {
    this.splinters.reset();
    this.splash.reset();
    this.rings.reset();
    this.stars.reset();
    this.bubbles.reset();
    this.signs.reset();
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
