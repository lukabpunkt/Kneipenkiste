/**
 * Ein Hiker (Art Direction §5.1) — der Shotling aus Drinkshot, mit Wanderausrüstung.
 *
 * Rig aus Einzelsprites: Schatten, Beine, Füsse, Torso mit Rucksack und Symbol, Arme mit
 * Stock, Kopf mit Gesicht und Krempenhut. Körperteile sind weiss gezeichnet und werden
 * getintet; Hut ebenfalls — er ist auf der Brücke das Erkennungszeichen. Gesicht,
 * Rucksack, Füsse und Symbol bleiben ungetintet.
 *
 * Der Walk-Cycle ist prozedural über die zurückgelegte Strecke, nicht über die Zeit —
 * dadurch passt die Schrittfrequenz automatisch zum Tempo. Und das Tempo ist hier keine
 * Kleinigkeit: `runTo()` bekommt eine **Ankunftszeit**, keine Geschwindigkeit, weil alle
 * Hikers im selben Frame ankommen müssen (CLAUDE.md, nicht verhandelbar).
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { colorById, hikerHeightFor, type ColorId } from '@/config/theme';
import type { Weight } from '@/config/rules';
import type { PlayerId } from '@/core/types';

export const HIKER_FACES = [
  'neutral',
  'blink',
  'scared',
  'happy',
  'panic',
  'oh',
  'held_breath',
  'whistle',
  'wet',
  'smug_shrug',
  'help',
] as const;
export type HikerFace = (typeof HIKER_FACES)[number];

/**
 * Rig-Layout in Texturpixeln (@1x), Ursprung zwischen den Füssen, y negativ = oben.
 * Die Gesamthöhe von 276 wird über die Skalierung auf die Spielhöhe gebracht.
 */
const RIG = {
  height: 276,
  shadow: { x: 0, y: 0, anchorY: 0.5 },
  foot: { x: 20, y: 0, anchorY: 1 },
  leg: { x: 20, y: -60, anchorY: 0.08 },
  torso: { x: 0, y: -56, anchorY: 1 },
  backpack: { x: -34, y: -104, anchorY: 0.5 },
  symbol: { x: 6, y: -110, anchorY: 0.5 },
  arm: { x: 44, y: -146, anchorY: 0.12 },
  stick: { x: 52, y: -150, anchorY: 0.06 },
  head: { x: 0, y: -212, anchorY: 0.5 },
  face: { x: 0, y: -210, anchorY: 0.5 },
  hat: { x: 0, y: -272, anchorY: 1 },
  harness: { x: 0, y: -120, anchorY: 0.5 },
  fish: { x: 0, y: -284, anchorY: 0.5 },
} as const;

const LEG_SWING = 26;
const ARM_SWING = 18;
const ARM_REST = 0.2;
/** Welteinheiten pro voller Schrittfolge — bestimmt die Schrittfrequenz. */
const STRIDE = 62;
const SHADOW_ALPHA = 0.32;
/** Wie weit der Kopf sich zum Nachbarn dreht (Radiant) — der Blickkontakt. */
const LOOK_ROTATION = 0.3;

export interface HikerOptions {
  sheet: Spritesheet;
  playerId: PlayerId;
  colorId: ColorId;
  playerCount: number;
  weight?: Weight;
  lowEffects?: boolean;
}

export class Hiker {
  readonly view = new Container();
  readonly playerId: PlayerId;
  readonly colorId: ColorId;

  private readonly sheet: Spritesheet;
  private readonly body = new Container();
  private readonly shadow: Sprite;
  private readonly legL: Sprite;
  private readonly legR: Sprite;
  private readonly footL: Sprite;
  private readonly footR: Sprite;
  private readonly torso: Sprite;
  private readonly backpack: Sprite;
  private readonly symbol: Sprite;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly stick: Sprite;
  private readonly harness: Sprite;
  private readonly head = new Container();
  private readonly headShape: Sprite;
  private readonly face: Sprite;
  private readonly hat: Sprite;
  private readonly fish: Sprite;

  private readonly baseScale: number;
  private faceId: HikerFace = 'neutral';
  private lowEffects: boolean;

  /** Strecke seit dem Start — treibt den Walk-Cycle. */
  private walked = 0;
  private speed = 0;
  private facing: 1 | -1 = 1;
  /** Solange eine Sequenz das Rig führt, hält sich der Walk-Cycle heraus. */
  private driven = false;

  constructor(options: HikerOptions) {
    this.sheet = options.sheet;
    this.playerId = options.playerId;
    this.colorId = options.colorId;
    this.lowEffects = options.lowEffects ?? false;

    const color = colorById(options.colorId);
    const tint = color.hex;

    this.shadow = this.sprite('hikers/shadow', RIG.shadow.x, RIG.shadow.y, RIG.shadow.anchorY);
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.tint = 0x000000;

    this.legL = this.sprite('hikers/leg', -RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    this.legR = this.sprite('hikers/leg', RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    this.footL = this.sprite('hikers/foot', -RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    this.footR = this.sprite('hikers/foot', RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);

    this.torso = this.sprite('hikers/torso', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY, tint);

    /* Der Rucksack sitzt hinter dem Torso und trägt das Symbol — Farbe allein reicht
       bei Deuteranopie nicht (Audit A2). */
    this.backpack = this.sprite(
      `hikers/backpack_${options.weight ?? 1}`,
      RIG.backpack.x,
      RIG.backpack.y,
      RIG.backpack.anchorY
    );
    this.symbol = this.sprite(
      `hikers/symbols/${color.symbol}`,
      RIG.symbol.x,
      RIG.symbol.y,
      RIG.symbol.anchorY
    );

    this.armL = this.sprite('hikers/arm', -RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armR = this.sprite('hikers/arm', RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    this.stick = this.sprite('hikers/stick', RIG.stick.x, RIG.stick.y, RIG.stick.anchorY);
    this.harness = this.sprite('hikers/rope_harness', RIG.harness.x, RIG.harness.y, RIG.harness.anchorY);
    this.harness.visible = false;

    this.headShape = this.sprite('hikers/head', 0, 0, 0.5, tint);
    this.face = this.sprite('hikers/faces/neutral', 0, RIG.face.y - RIG.head.y, RIG.face.anchorY);
    this.hat = this.sprite('hikers/hat_hiker', 0, RIG.hat.y - RIG.head.y, RIG.hat.anchorY, tint);
    this.fish = this.sprite('hikers/fish', 0, RIG.fish.y - RIG.head.y, RIG.fish.anchorY);
    this.fish.visible = false;

    this.head.position.set(RIG.head.x, RIG.head.y);
    this.head.addChild(this.headShape, this.face, this.hat, this.fish);

    /* Zeichenreihenfolge = Tiefenstaffelung (Art Direction §5.1). */
    this.body.addChild(
      this.backpack,
      this.footL,
      this.footR,
      this.legL,
      this.legR,
      this.torso,
      this.symbol,
      this.harness,
      this.armL,
      this.stick,
      this.armR,
      this.head
    );

    this.view.addChild(this.shadow, this.body);
    this.baseScale = hikerHeightFor(options.playerCount) / RIG.height;
    this.view.scale.set(this.baseScale);
    this.setLowEffects(this.lowEffects);
  }

  private texture(frame: string): Texture {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im chars-Atlas.`);
    return texture;
  }

  private sprite(frame: string, x: number, y: number, anchorY: number, tint?: number): Sprite {
    const sprite = new Sprite(this.texture(frame));
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    if (tint !== undefined) sprite.tint = tint;
    return sprite;
  }

  /* ------------------------------------------------------------------ */
  /* Steuerung                                                           */
  /* ------------------------------------------------------------------ */

  setFace(face: HikerFace): void {
    if (this.faceId === face) return;
    this.faceId = face;
    this.face.texture = this.texture(`hikers/faces/${face}`);
  }

  getFace(): HikerFace {
    return this.faceId;
  }

  setWeight(weight: Weight): void {
    this.backpack.texture = this.texture(`hikers/backpack_${weight}`);
  }

  /** Modus "Seil": Gurt an, Stock weg — er hangelt sich durch, er läuft nicht. */
  setRope(onRope: boolean): void {
    this.harness.visible = onRope;
    this.stick.visible = !onRope;
  }

  position(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  get x(): number {
    return this.view.position.x;
  }

  get y(): number {
    return this.view.position.y;
  }

  /** Höhe in Welteinheiten — Sequenzen rechnen Flughöhen daraus. */
  get height(): number {
    return RIG.height * this.baseScale;
  }

  /**
   * Läuft zu einem Punkt und ist **zu einer bestimmten Zeit** dort.
   *
   * Das ist die Signatur des Spiels: Acht Hikers mit acht verschiedenen Distanzen kommen
   * im selben Frame an (CLAUDE.md). Deshalb nimmt die Methode eine Dauer und rechnet die
   * Geschwindigkeit aus — nicht umgekehrt.
   */
  runTo(x: number, y: number, durationMs: number): gsap.core.Timeline {
    const from = { x: this.view.position.x, y: this.view.position.y };
    const distance = Math.hypot(x - from.x, y - from.y);
    const seconds = Math.max(0.001, durationMs / 1000);

    this.facing = x >= from.x ? 1 : -1;
    this.speed = distance / seconds;

    const timeline = gsap.timeline();
    timeline.to(this.view.position, {
      x,
      y,
      duration: seconds,
      /*
       * Linear, nicht `power2`: Ein Ease würde die Ankunft weich machen, und weich ist
       * das Gegenteil von "alle im selben Frame". Der gemeinsame Schritt braucht eine
       * harte Kante.
       */
      ease: 'none',
      onUpdate: () => {
        this.walked += (this.speed * (gsap.ticker.deltaRatio() * 16.667)) / 1000;
      },
      onComplete: () => {
        this.speed = 0;
      },
    });
    return timeline;
  }

  /** Arme rudern, Knie weich — der Moment, in dem der Balken unter einem nachgibt. */
  wobble(intensity = 1): gsap.core.Tween {
    return gsap.to(this.body, {
      rotation: 0.06 * intensity,
      duration: 0.22,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  stopWobble(): void {
    gsap.killTweensOf(this.body);
    this.body.rotation = 0;
  }

  /**
   * Der Blickkontakt (ADR-3) — die Signatur.
   *
   * Der Kopf dreht sich zum anderen, das Gesicht wird `oh`. Beides gehört zusammen: Ein
   * gedrehter Kopf ohne Gesicht ist eine Bewegung, ein `oh` ohne Drehung ein Zufall.
   */
  lookAt(other: Hiker): gsap.core.Tween {
    const direction = other.x >= this.x ? 1 : -1;
    this.setFace('oh');
    return gsap.to(this.head, {
      rotation: LOOK_ROTATION * direction * this.facing,
      duration: 0.35,
      ease: 'power2.out',
    });
  }

  resetHead(): void {
    gsap.killTweensOf(this.head);
    this.head.rotation = 0;
  }

  /** Nass am Seil wieder hochklettern — jede Fall-Sequenz endet damit (Art Direction §7). */
  wetClimb(toX: number, toY: number): gsap.core.Timeline {
    this.setFace('wet');
    this.fish.visible = true;
    this.view.alpha = 1;

    const timeline = gsap.timeline();
    timeline
      .set(this.view.position, { x: toX, y: toY + 220 })
      .set(this.view, { rotation: 0 })
      .to(this.view.position, { y: toY, duration: 1.1, ease: 'power1.out' })
      .to(this.body, { rotation: 0.08, duration: 0.16, yoyo: true, repeat: 3 }, '<');
    return timeline;
  }

  /** Sicher drüben: winken, als wäre nie etwas gewesen. */
  safeWave(): gsap.core.Timeline {
    this.setFace('happy');
    const timeline = gsap.timeline();
    timeline.to(this.armR, {
      rotation: -1.5,
      duration: 0.3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 3,
    });
    return timeline;
  }

  setDriven(driven: boolean): void {
    this.driven = driven;
  }

  isDriven(): boolean {
    return this.driven;
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
    this.shadow.visible = !low;
  }

  /**
   * Zurück auf die Ausgangspose.
   *
   * Audit A4 prüft genau das: Nach einer Sequenz plus `reset()` steht der Hiker wieder
   * trocken und aufrecht da. Deshalb wird hier jedes Teil angefasst, nicht nur die, die
   * die letzte Sequenz bewegt hat.
   */
  reset(): void {
    this.driven = false;
    this.walked = 0;
    this.speed = 0;
    this.facing = 1;

    gsap.killTweensOf([this.view, this.view.position, this.body, this.head, this.armL, this.armR]);

    this.view.rotation = 0;
    this.view.alpha = 1;
    this.view.scale.set(this.baseScale);

    this.body.position.set(0, 0);
    this.body.rotation = 0;
    this.body.scale.set(1);
    this.body.alpha = 1;

    this.head.rotation = 0;
    this.head.scale.set(1);
    this.head.position.set(RIG.head.x, RIG.head.y);

    this.torso.scale.set(1);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;
    this.legL.rotation = 0;
    this.legR.rotation = 0;
    this.footL.position.set(-RIG.foot.x, RIG.foot.y);
    this.footR.position.set(RIG.foot.x, RIG.foot.y);

    this.hat.position.set(0, RIG.hat.y - RIG.head.y);
    this.hat.rotation = 0;
    this.hat.alpha = 1;
    this.hat.visible = true;

    this.fish.visible = false;
    this.harness.visible = false;
    this.stick.visible = true;

    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.scale.set(1);
    this.shadow.visible = !this.lowEffects;

    this.setFace('neutral');
  }

  /* ------------------------------------------------------------------ */
  /* Frame-Update — hier wird nichts allokiert                           */
  /* ------------------------------------------------------------------ */

  update(): void {
    if (this.driven) return;

    this.body.scale.x = this.facing;
    /* Tiefenstaffelung: wer weiter unten steht, wird später gezeichnet. */
    this.view.zIndex = this.view.position.y;

    const intensity = Math.min(1, this.speed / 90);
    if (intensity === 0) {
      this.legL.rotation = 0;
      this.legR.rotation = 0;
      return;
    }

    const phase = (this.walked / STRIDE) * Math.PI * 2;
    const swing = Math.sin(phase) * intensity;
    const legRadians = (LEG_SWING * Math.PI) / 180;

    this.legL.rotation = swing * legRadians;
    this.legR.rotation = -swing * legRadians;
    this.footL.position.y = RIG.foot.y - Math.max(0, swing) * 9 * intensity;
    this.footR.position.y = RIG.foot.y - Math.max(0, -swing) * 9 * intensity;
    this.footL.position.x = -RIG.foot.x + swing * 12 * intensity;
    this.footR.position.x = RIG.foot.x - swing * 12 * intensity;

    const armRadians = (ARM_SWING * Math.PI) / 180;
    this.armL.rotation = ARM_REST - swing * armRadians;
    this.armR.rotation = -ARM_REST + swing * armRadians;
    this.stick.rotation = this.armR.rotation;

    /* Squash & Stretch: zweimal pro Schrittfolge, weil beide Füsse aufsetzen. */
    const bounce = Math.abs(Math.cos(phase)) * intensity;
    this.torso.scale.y = 1 + bounce * 0.06 - 0.03 * intensity;
    this.torso.scale.x = 1 - bounce * 0.05 + 0.025 * intensity;
    this.head.position.y = RIG.head.y - bounce * 4 * intensity;
  }

  destroy(): void {
    gsap.killTweensOf([this.view, this.view.position, this.body, this.head]);
    this.view.destroy({ children: true });
  }
}

export { RIG as HIKER_RIG };
