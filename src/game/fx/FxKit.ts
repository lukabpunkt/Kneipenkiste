/**
 * Die Effekt-Bausteine der Halle (Art Direction §4.5, §8).
 *
 * Ein Kit statt vieler Einzelmodule: Die Sequenzen brauchen immer dieselben fünf Dinge —
 * Tropfen, Federn, Schweiß, Item-Fontäne, Stempel —, und ein gemeinsamer Ort erzwingt,
 * dass alle dasselbe Partikel-Budget teilen (≤ 200 aktive Sprites).
 */

import gsap from 'gsap';
import { Container, Graphics, Text, type Spritesheet, type Texture } from 'pixi.js';
import { FONTS, PARTICLE_BUDGET, STAGE, STAMP, UI_COLORS } from '@/config/theme';
import { prefersReducedMotion } from '@/ui/motion';
import type { ItemSet } from '@/core/types';
import { ParticlePool } from './ParticlePool';

export type StampKind = 'ok' | 'busted' | 'harassment' | 'through';

const STAMP_COLORS: Record<StampKind, number> = {
  ok: UI_COLORS.ok,
  busted: UI_COLORS.alarm,
  harassment: UI_COLORS.busted,
  through: UI_COLORS.customs,
};

export class FxKit {
  /** Alles, was über der Bühne liegt: Partikel und Stempel. */
  readonly view = new Container();

  private readonly items: ParticlePool;
  private readonly drops: ParticlePool;
  private readonly feathers: ParticlePool;
  private readonly confetti: ParticlePool;

  private readonly itemsSheet: Spritesheet;
  private readonly dropTexture: Texture;
  private readonly featherTexture: Texture;

  /** Das rote Alarmlicht — ein einziges Overlay, kein Partikel (Art Direction §8). */
  private readonly alarm: Graphics;
  /** Der rote Teppich für den Diplomaten. */
  private readonly carpet: Graphics;

  private lowEffects = false;

  constructor(itemsSheet: Spritesheet, dropTexture: Texture, featherTexture: Texture) {
    this.itemsSheet = itemsSheet;
    this.dropTexture = dropTexture;
    this.featherTexture = featherTexture;

    this.items = new ParticlePool(PARTICLE_BUDGET.itemFountain);
    this.drops = new ParticlePool(PARTICLE_BUDGET.sweat);
    this.feathers = new ParticlePool(PARTICLE_BUDGET.feathers);
    this.confetti = new ParticlePool(PARTICLE_BUDGET.confetti);

    /*
     * Das Alarmlicht liegt über der ganzen Bühne und ist im Ruhezustand unsichtbar. Ein
     * Overlay statt vieler Lichter: Es kostet einen Draw-Call, und der A2-Grenzwert von
     * drei ist knapp.
     */
    this.alarm = new Graphics()
      .rect(-STAGE.worldWidth, -STAGE.worldHeight, STAGE.worldWidth * 3, STAGE.worldHeight * 3)
      .fill(UI_COLORS.alarm);
    this.alarm.alpha = 0;
    this.alarm.eventMode = 'none';

    this.carpet = new Graphics();
    this.carpet.alpha = 0;
    this.carpet.eventMode = 'none';

    this.view.eventMode = 'none';
    this.view.addChild(
      this.carpet,
      this.items.view,
      this.drops.view,
      this.feathers.view,
      this.confetti.view,
      this.alarm
    );
  }

  setLowEffects(value: boolean): void {
    this.lowEffects = value;
    if (value) this.clear();
  }

  /** Summe aller lebenden Partikel — das A2-Budget liest das. */
  get activeParticles(): number {
    return this.items.active + this.drops.active + this.feathers.active + this.confetti.active;
  }

  update(deltaMs: number): void {
    this.items.update(deltaMs);
    this.drops.update(deltaMs);
    this.feathers.update(deltaMs);
    this.confetti.update(deltaMs);
  }

  clear(): void {
    this.items.clear();
    this.drops.clear();
    this.feathers.clear();
    this.confetti.clear();
    this.alarm.alpha = 0;
    this.carpet.alpha = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Alarm (erwischt)                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Das rote Blinklicht.
   *
   * Bewusst als Alpha-Puls und nicht als harter Wechsel: Ein hart blinkendes Rotlicht
   * auf einem Handy in der Tischmitte ist unangenehm, ein pulsierendes liest sich als
   * Alarm. Bei „weniger Effekte" bleibt es aus — die Information steht im Banner.
   */
  alarmLight(pulses = 3, durationSec = 0.9): gsap.core.Timeline {
    if (this.lowEffects) return gsap.timeline();

    this.alarm.alpha = 0;

    /*
     * Bei „Bewegung reduzieren" nicht blinken, sondern einmal ruhig aufleuchten und
     * wieder ausgehen: Die Information „Alarm" bleibt, das Flackern geht.
     */
    if (prefersReducedMotion()) {
      return gsap
        .timeline()
        .to(this.alarm, { alpha: 0.18, duration: durationSec * 0.35, ease: 'none' })
        .to(this.alarm, { alpha: 0, duration: durationSec * 0.65, ease: 'none' });
    }

    return gsap
      .timeline()
      .to(this.alarm, {
        /*
         * 0.22, nicht 0.34: Bei einem Drittel Deckkraft ertrinkt die ganze Halle in Rosa,
         * und man sieht weder die fliegende Ware noch das Gesicht des Reisenden. Der
         * Alarm soll die Szene färben, nicht ersetzen.
         */
        alpha: 0.22,
        duration: durationSec / (pulses * 2),
        yoyo: true,
        repeat: pulses * 2 - 1,
        ease: 'sine.inOut',
      })
      .set(this.alarm, { alpha: 0 });
  }

  /* ------------------------------------------------------------------ */
  /* Pfütze (caught_sweat_flood)                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Eine Pfütze wächst unter dem Reisenden — bis er darauf ausrutscht.
   *
   * Sie liegt hinter den Partikeln, damit die Schweißtropfen sichtbar hineinfallen.
   */
  puddle(x: number, y: number, growSec: number): { view: Graphics; timeline: gsap.core.Timeline } {
    const view = new Graphics().ellipse(0, 0, 90, 20).fill({ color: 0x8fd3ff, alpha: 0.65 });
    view.position.set(x, y);
    view.scale.set(0);
    view.eventMode = 'none';
    this.view.addChildAt(view, 1);

    const timeline = gsap.timeline().to(view.scale, {
      x: 1,
      y: 1,
      duration: growSec,
      ease: 'power2.out',
    });

    return { view, timeline };
  }

  /* ------------------------------------------------------------------ */
  /* Roter Teppich (diplomat_pass)                                       */
  /* ------------------------------------------------------------------ */

  /** Der Teppich rollt aus. Er ist der ganze Witz: Aus dem Alarm wird ein Empfang. */
  rollOutCarpet(fromX: number, toX: number, y: number, durationSec: number): gsap.core.Timeline {
    const width = Math.abs(toX - fromX);
    this.carpet
      .clear()
      .rect(Math.min(fromX, toX), y - 14, width, 28)
      .fill(UI_COLORS.carpet);
    this.carpet.alpha = 1;
    this.carpet.scale.set(0, 1);
    this.carpet.pivot.set(fromX, 0);
    this.carpet.position.set(fromX, 0);

    return gsap
      .timeline()
      .to(this.carpet.scale, { x: 1, duration: durationSec, ease: 'power2.out' });
  }

  /** Räumt den Teppich weg. */
  rollUpCarpet(durationSec = 0.3): gsap.core.Timeline {
    return gsap.timeline().to(this.carpet, { alpha: 0, duration: durationSec });
  }

  /* ------------------------------------------------------------------ */
  /* Tropfen (Hinweis `drip`, Schweiß)                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Ein Tropfen wächst, fällt und zerplatzt.
   *
   * Bewusst **ein** Tropfen und keine Kaskade: Der Hinweis soll auffallen, nicht das
   * Bild fluten — und danach muss der Koffer aussehen wie jeder andere.
   */
  drip(x: number, y: number, durationSec: number): gsap.core.Timeline {
    if (this.lowEffects) return gsap.timeline();

    const drop = this.drops.emit({
      x,
      y,
      texture: this.dropTexture,
      lifeMs: durationSec * 1000,
      gravity: 900,
      scale: 0.1,
      tint: UI_COLORS.xrayGlow,
    });

    const timeline = gsap.timeline();
    /* Erst anschwellen — ohne das fällt ein Tropfen aus dem Nichts. */
    timeline.to(drop.sprite.scale, { x: 0.6, y: 0.7, duration: durationSec * 0.45, ease: 'power2.in' });
    timeline.call(() => {
      drop.vy = 40;
    });
    timeline.to({}, { duration: durationSec * 0.35 });
    /* Die Pfütze bleibt kurz stehen und ist dann weg. */
    timeline.call(() => {
      drop.vy = 0;
      drop.gravity = 0;
      drop.sprite.scale.set(0.9, 0.18);
    });

    return timeline;
  }

  /** Schweiß am Kopf: mehrere kleine Tropfen, die wegfliegen. */
  sweat(x: number, y: number, count: number, rng: { range(a: number, b: number): number }): void {
    if (this.lowEffects) return;
    for (let i = 0; i < count; i++) {
      this.drops.emit({
        x: x + rng.range(-18, 18),
        y,
        texture: this.dropTexture,
        lifeMs: 620,
        vx: rng.range(-90, 90),
        vy: rng.range(-160, -60),
        gravity: 700,
        scale: 0.4,
        tint: 0x8fd3ff,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Federn (Hinweis `feather`)                                          */
  /* ------------------------------------------------------------------ */

  /** Eine Feder quillt heraus und schwebt. Sie fällt langsam — das ist der Witz. */
  feather(x: number, y: number, rng: { range(a: number, b: number): number }): void {
    if (this.lowEffects) return;
    this.feathers.emit({
      x,
      y,
      texture: this.featherTexture,
      lifeMs: 1400,
      vx: rng.range(-30, 30),
      vy: rng.range(-70, -30),
      vr: rng.range(-1.4, 1.4),
      gravity: 40,
      scale: 0.7,
      tint: UI_COLORS.paper,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Item-Fontäne (erwischt)                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Die Ware fliegt aus dem Koffer.
   *
   * Höchstens `PARTICLE_BUDGET.itemFountain` Stück, auch wenn zehn drin waren: Zwölf
   * fliegende Gartenzwerge sind lustig, dreißig sind Konfetti.
   */
  itemFountain(x: number, y: number, itemSet: ItemSet, amount: number, rng: { range(a: number, b: number): number }): void {
    if (this.lowEffects) return;
    const texture = this.itemsSheet.textures[itemSet];
    if (!texture) return;

    const count = Math.min(amount, PARTICLE_BUDGET.itemFountain);
    for (let i = 0; i < count; i++) {
      this.items.emit({
        x,
        y,
        texture,
        lifeMs: 1100,
        vx: rng.range(-260, 260),
        vy: rng.range(-620, -380),
        vr: rng.range(-6, 6),
        gravity: 1400,
        scale: 0.5,
      });
    }
  }

  /** Konfetti für den dreisten Durchgang an der Schranke. */
  confettiBurst(x: number, y: number, rng: { range(a: number, b: number): number }): void {
    if (this.lowEffects) return;
    const texture = this.dropTexture;
    const colors = [UI_COLORS.customs, UI_COLORS.ok, UI_COLORS.alarm, UI_COLORS.paper];

    for (let i = 0; i < 40; i++) {
      this.confetti.emit({
        x: x + rng.range(-40, 40),
        y,
        texture,
        lifeMs: 1600,
        vx: rng.range(-320, 320),
        vy: rng.range(-700, -300),
        vr: rng.range(-9, 9),
        gravity: 1100,
        scale: 0.5,
        tint: colors[Math.floor(rng.range(0, colors.length))] ?? UI_COLORS.customs,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Stempel (Art Direction §3)                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Ein Stempel knallt ins Bild: leicht gedreht, mit Overshoot und kurzem Nachwippen.
   *
   * Die Rotation kommt aus dem seeded RNG statt aus `Math.random`, damit eine Runde bei
   * gleichem Seed gleich aussieht — das Dev-Panel braucht das für Vergleiche.
   */
  stamp(
    x: number,
    y: number,
    kind: StampKind,
    label: string,
    rng: { range(a: number, b: number): number }
  ): gsap.core.Timeline {
    const group = new Container();
    const color = STAMP_COLORS[kind];

    const text = new Text({
      text: label.toUpperCase(),
      style: {
        fontFamily: FONTS.display,
        fontSize: 44,
        fill: color,
        letterSpacing: 2,
      },
    });
    text.anchor.set(0.5);

    const frame = new Graphics()
      .roundRect(
        -text.width / 2 - 18,
        -text.height / 2 - 10,
        text.width + 36,
        text.height + 20,
        STAMP.cornerRadiusPx
      )
      .stroke({ color, width: 6 });

    group.addChild(frame, text);
    group.position.set(x, y);
    group.rotation = (rng.range(STAMP.rotationDeg.min, STAMP.rotationDeg.max) * Math.PI) / 180;
    group.alpha = 0;
    group.scale.set(2.4);
    this.view.addChild(group);

    return gsap
      .timeline({
        onComplete: () => group.destroy({ children: true }),
      })
      .to(group, { alpha: 1, duration: 0.06 }, 0)
      .to(group.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(3)' }, 0)
      .to(group, { rotation: group.rotation * 0.7, duration: 0.16, ease: 'elastic.out(1,0.5)' })
      .to({}, { duration: 0.9 })
      .to(group, { alpha: 0, duration: 0.24 });
  }

  destroy(): void {
    this.alarm.destroy();
    this.carpet.destroy();
    this.items.destroy();
    this.drops.destroy();
    this.feathers.destroy();
    this.confetti.destroy();
    this.view.destroy({ children: true });
  }
}
