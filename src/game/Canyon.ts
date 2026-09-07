/**
 * Die Schlucht (Art Direction §6).
 *
 * Vier Ebenen von hinten nach vorn: Himmel, Schluchtwand, Fluss mit Glitzer, Nebelbänke.
 * Die Plateaus links und rechts liegen davor — sie tragen die Hikers und Gustavs Pfahl.
 *
 * Alles hier kommt aus **einem** Atlas (`world`). Das ist kein Zufall, sondern die halbe
 * Miete für das Draw-Batch-Budget aus Audit A2 (ADR-13): Solange die Schlucht keine
 * eigene Textur anfasst, kostet sie zusammen mit der Brücke genau einen Batch.
 *
 * Im Loop wird nichts allokiert.
 */

import { Container, Sprite, type Spritesheet } from 'pixi.js';
import { createNoise2D } from 'simplex-noise';
import { STAGE } from '@/config/theme';
import { PARTICLE_BUDGET } from '@/config/theme';
import type { SeededRng } from '@/core/rng';

/** Wie schnell der Wind über die Szene wandert. */
const WIND_SPEED = 0.00016;
/** Wie weit die Nebelbänke driften (Welteinheiten). */
const MIST_DRIFT = 90;
/** Wie stark der Glitzer pulsiert. */
const SPARKLE_PERIOD_MS = 1800;

export interface CanyonOptions {
  sheet: Spritesheet;
  rng: SeededRng;
  lowEffects?: boolean;
}

export class Canyon {
  readonly view = new Container();
  /** Hier hängen Brücke und Figuren ein — zwischen Schlucht und Nebel. */
  readonly midground = new Container();

  private readonly mist: Sprite[] = [];
  private readonly mistSpeed: number[] = [];
  private readonly sparkles: Sprite[] = [];
  private readonly sparklePhase: number[] = [];
  private readonly noise: (x: number, y: number) => number;

  private lowEffects: boolean;
  private elapsed = 0;
  /** Der globale Wind — Seile, Hüte und Nebel lesen ihn (Art Direction §6). */
  private wind = 0;

  constructor(options: CanyonOptions) {
    this.lowEffects = options.lowEffects ?? false;
    this.noise = createNoise2D(() => options.rng.next());

    const { sheet } = options;
    const back = new Container();
    const front = new Container();

    /*
     * Alles Unbewegte reicht von `skyTop` bis `floorY` — also über die 1000 × 1000 hinaus.
     * Auf einem Hochkant-Handy ist das sichtbare Band mehr als doppelt so hoch wie breit;
     * eine Kulisse, die nur die Weltbox füllt, hätte oben und unten Löcher.
     */
    const sky = new Sprite(sheet.textures['canyon/sky']);
    sky.width = STAGE.worldWidth;
    sky.height = STAGE.riverY - STAGE.skyTop;
    sky.position.set(0, STAGE.skyTop);
    back.addChild(sky);

    /* --- Schluchtwand: gekachelt über die volle Breite --- */
    const wall = new Sprite(sheet.textures['canyon/wall']);
    wall.width = STAGE.worldWidth;
    wall.height = STAGE.floorY - STAGE.wallY;
    wall.position.set(0, STAGE.wallY);
    back.addChild(wall);

    /* --- Der Fluss ganz unten --- */
    const river = new Sprite(sheet.textures['canyon/river']);
    river.width = STAGE.worldWidth;
    river.height = STAGE.floorY - STAGE.riverY;
    river.position.set(0, STAGE.riverY);
    back.addChild(river);

    /* --- Glitzer auf dem Fluss (Idle-Effekt, im Low-Modus aus) --- */
    for (let i = 0; i < PARTICLE_BUDGET.riverSparkle; i += 1) {
      const sparkle = new Sprite(sheet.textures['canyon/sparkle']);
      sparkle.anchor.set(0.5);
      sparkle.scale.set(options.rng.range(0.25, 0.6));
      sparkle.position.set(
        options.rng.range(20, STAGE.worldWidth - 20),
        options.rng.range(STAGE.riverY + 14, STAGE.riverY + 190)
      );
      this.sparkles.push(sparkle);
      this.sparklePhase.push(options.rng.range(0, Math.PI * 2));
      back.addChild(sparkle);
    }

    /* --- Plateaus: sie stehen VOR der Wand, aber HINTER den Figuren --- */
    /*
     * Die Lauffläche der Plateaus liegt im SVG ganz oben, also sitzt das Sprite direkt auf
     * `bridgeY`: Die Brücke hängt dann an der Kante, statt darüber zu schweben.
     */
    const plateauTop = STAGE.bridgeY;
    const left = new Sprite(sheet.textures['canyon/plateau_left']);
    left.width = STAGE.plateauLeftEnd + 40;
    left.height = STAGE.floorY - plateauTop;
    left.position.set(-40, plateauTop);

    const right = new Sprite(sheet.textures['canyon/plateau_right']);
    right.width = STAGE.worldWidth - STAGE.plateauRightStart + 40;
    right.height = STAGE.floorY - plateauTop;
    right.position.set(STAGE.plateauRightStart, plateauTop);

    back.addChild(left, right);

    /* --- Nebelbänke: driften mit unterschiedlichem Tempo (Parallax) --- */
    STAGE.mistY.forEach((y, index) => {
      const bank = new Sprite(sheet.textures['canyon/mist']);
      bank.anchor.set(0.5);
      bank.width = STAGE.worldWidth * 1.5;
      bank.height = 210 - index * 22;
      bank.position.set(STAGE.worldWidth / 2, y);
      /*
       * Deutlich zurueckhaltender, als es sich anfuehlt: Nebel, den man als Nebel
       * *erkennt*, ist kein Nebel mehr, sondern ein Balken quer durch die Schlucht.
       */
      bank.alpha = 0.2 - index * 0.035;
      this.mist.push(bank);
      /* Die hinteren Bänke sind langsamer — daraus entsteht die Tiefe. */
      this.mistSpeed.push(0.25 + index * 0.25);
      front.addChild(bank);
    });

    this.view.addChild(back, this.midground, front);
    this.setLowEffects(this.lowEffects);
  }

  /** Der aktuelle Windwert in [-1, 1]. Seile und Hüte hängen sich daran. */
  windAt(offset = 0): number {
    return this.noise(this.wind + offset, 0);
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
    /* Nebel und Glitzer sind reine Atmosphäre — sie gehen als Erstes (Architektur §8). */
    for (const bank of this.mist) bank.visible = !low;
    for (const sparkle of this.sparkles) sparkle.visible = !low;
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    this.wind += dtMs * WIND_SPEED;
    if (this.lowEffects) return;

    for (let i = 0; i < this.mist.length; i += 1) {
      const bank = this.mist[i]!;
      const drift = this.noise(this.wind * this.mistSpeed[i]!, i * 3.1);
      bank.position.x = STAGE.worldWidth / 2 + drift * MIST_DRIFT;
    }

    for (let i = 0; i < this.sparkles.length; i += 1) {
      const sparkle = this.sparkles[i]!;
      const phase = (this.elapsed / SPARKLE_PERIOD_MS) * Math.PI * 2 + this.sparklePhase[i]!;
      sparkle.alpha = 0.25 + (Math.sin(phase) + 1) * 0.35;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
