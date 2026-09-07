/**
 * Das Shotling-Rig (Art Direction §5) — die gemeinsame Basis von Reisenden und Beamtem.
 *
 * Ein Container aus Einzel-Sprites: Schatten, Beine, Füße, Torso mit Symbol, Arme, Kopf
 * mit Gesicht und Hut. Körperteile sind weiß gezeichnet und werden per `tint` eingefärbt;
 * Gesicht, Hut, Füße und Symbol bleiben ungetintet.
 *
 * Anders als in Drinkshot laufen die Figuren hier nicht frei herum — sie stehen hinter
 * der gelben Linie und reagieren. Deshalb kein Brain, nur Atmen, Blinzeln und Posen.
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import { BLINK_DURATION_MS, BLINK_INTERVAL_MS, colorById, type ColorId } from '@/config/theme';
import type { RandomSource } from '@/core/rng';

/**
 * Rig-Layout in Textur-Pixeln (@1x), Ursprung zwischen den Füßen, y negativ = oben.
 * Die Gesamthöhe von 276 px wird über `rigScaleFor` auf die Spielhöhe gebracht.
 */
const RIG = {
  height: 276,
  foot: { x: 20, y: 0, anchorY: 1 },
  leg: { x: 20, y: -60, anchorY: 0.08 },
  torso: { x: 0, y: -56, anchorY: 1 },
  symbol: { x: 0, y: -110, anchorY: 0.5 },
  arm: { x: 44, y: -146, anchorY: 0.12 },
  head: { x: 0, y: -212 },
  face: { y: -210 },
  /** Der Hut sitzt knapp unter der Kopfoberkante, sonst schwebt er. */
  hat: { y: -268, anchorY: 1 },
  /** Hals-Slot für Kamera und Klemmbrett. */
  neck: { y: -150 },
  /** Hand-Slot rechts. */
  hand: { x: 62, y: -110 },
} as const;

export function rigScaleFor(height: number): number {
  return height / RIG.height;
}

const SHADOW_ALPHA = 0.3;
const ARM_REST = 0.2;

export interface ShotlingOptions {
  sheet: Spritesheet;
  colorId: ColorId;
  rng: RandomSource;
  /** Spielhöhe in Welteinheiten. */
  height: number;
  /** Gesicht beim Aufbau. */
  face?: string;
  /** Hut-Frame (`hats/…`) oder `null` für ohne. */
  hat?: string | null;
  lowEffects?: boolean;
}

/** Was Sequenzen bewegen dürfen. Alles andere gehört dem Shotling. */
export interface ShotlingRig {
  readonly body: Container;
  readonly head: Container;
  readonly torso: Sprite;
  readonly armL: Sprite;
  readonly armR: Sprite;
  readonly legL: Sprite;
  readonly legR: Sprite;
  readonly shadow: Sprite;
}

export class Shotling {
  readonly view = new Container();
  readonly colorId: ColorId;

  protected readonly sheet: Spritesheet;
  protected readonly rng: RandomSource;

  protected readonly body = new Container();
  protected readonly head = new Container();
  /** Slots für Zubehör — Reisende und Beamter hängen hier ihre Teile ein. */
  protected readonly neckSlot = new Container();
  protected readonly handSlot = new Container();
  protected readonly torsoOverlay = new Container();

  private readonly shadow: Sprite;
  private readonly legL: Sprite;
  private readonly legR: Sprite;
  private readonly footL: Sprite;
  private readonly footR: Sprite;
  private readonly torso: Sprite;
  private readonly symbol: Sprite;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly headShape: Sprite;
  private readonly face: Sprite;
  private readonly hat: Sprite;

  private faceId: string;
  private blinkIn: number;
  private blinkRemaining = 0;
  private breathe = 0;
  protected lowEffects: boolean;

  /** Die Ruhe-Skalierung; Sequenzen stellen sie über `reset()` wieder her. */
  private readonly baseScale: number;

  constructor(options: ShotlingOptions) {
    this.sheet = options.sheet;
    this.rng = options.rng;
    this.colorId = options.colorId;
    this.lowEffects = options.lowEffects ?? false;

    const color = colorById(options.colorId);
    const tint = color.hex;

    this.shadow = this.makeSprite('shadow', 0, 0, 0.5);
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.tint = 0x000000;

    this.legL = this.makeSprite('leg', -RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    this.legR = this.makeSprite('leg', RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    this.footL = this.makeSprite('foot', -RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    this.footR = this.makeSprite('foot', RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);

    this.torso = this.makeSprite('torso', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY, tint);
    this.torsoOverlay.position.set(RIG.torso.x, RIG.torso.y);
    this.symbol = this.makeSprite(`symbols/${color.symbol}`, RIG.symbol.x, RIG.symbol.y, 0.5);

    this.armL = this.makeSprite('arm', -RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armR = this.makeSprite('arm', RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    this.headShape = this.makeSprite('head', 0, 0, 0.5, tint);
    this.faceId = options.face ?? 'neutral';
    this.face = this.makeSprite(`faces/${this.faceId}`, 0, RIG.face.y - RIG.head.y, 0.5);

    const hatFrame = options.hat === undefined ? null : options.hat;
    this.hat = this.makeSprite(hatFrame ?? 'hats/none', 0, RIG.hat.y - RIG.head.y, RIG.hat.anchorY);
    this.hat.visible = hatFrame !== null;

    this.head.position.set(RIG.head.x, RIG.head.y);
    this.head.addChild(this.headShape, this.face, this.hat);

    this.neckSlot.position.set(0, RIG.neck.y);
    this.handSlot.position.set(RIG.hand.x, RIG.hand.y);

    /* Zeichenreihenfolge = Tiefenstaffelung. */
    this.body.addChild(
      this.footL,
      this.footR,
      this.legL,
      this.legR,
      this.torso,
      this.torsoOverlay,
      this.symbol,
      this.armL,
      this.armR,
      this.neckSlot,
      this.head,
      this.handSlot
    );

    this.view.addChild(this.shadow, this.body);
    this.baseScale = rigScaleFor(options.height);
    this.view.scale.set(this.baseScale);

    this.blinkIn = this.rng.intBetween(BLINK_INTERVAL_MS[0], BLINK_INTERVAL_MS[1]);
  }

  protected texture(frame: string): Texture {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im Atlas.`);
    return texture;
  }

  protected makeSprite(frame: string, x: number, y: number, anchorY: number, tint?: number): Sprite {
    const sprite = new Sprite(this.texture(frame));
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    if (tint !== undefined) sprite.tint = tint;
    return sprite;
  }

  /** Hängt ein Zubehör-Sprite in einen Slot (Hals, Hand, Torso). */
  protected attach(
    slot: 'neck' | 'hand' | 'torso',
    frame: string,
    options: { tint?: number; anchorY?: number } = {}
  ): Sprite {
    const sprite = this.makeSprite(frame, 0, 0, options.anchorY ?? 0.5, options.tint);
    const target =
      slot === 'neck' ? this.neckSlot : slot === 'hand' ? this.handSlot : this.torsoOverlay;
    target.addChild(sprite);
    return sprite;
  }

  /** Die Teile, die eine Sequenz anfassen darf. */
  get rig(): ShotlingRig {
    return {
      body: this.body,
      head: this.head,
      torso: this.torso,
      armL: this.armL,
      armR: this.armR,
      legL: this.legL,
      legR: this.legR,
      shadow: this.shadow,
    };
  }

  setFace(face: string): void {
    if (this.faceId === face) return;
    this.faceId = face;
    this.face.texture = this.texture(`faces/${face}`);
  }

  getFace(): string {
    return this.faceId;
  }

  setHat(frame: string | null): void {
    this.hat.visible = frame !== null;
    if (frame !== null) this.hat.texture = this.texture(frame);
  }

  position(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  setLowEffects(value: boolean): void {
    this.lowEffects = value;
  }

  /**
   * Idle: minimal atmen und blinzeln.
   *
   * Ohne das steht eine Reihe Reisender da wie ein Standbild — und ein Standbild lügt,
   * weil es aussieht, als sei das Spiel eingefroren. Bewusst winzig: Wer atmet, lenkt
   * nicht vom Verhör ab.
   */
  update(deltaMs: number): void {
    if (this.lowEffects) return;

    this.breathe += deltaMs / 1000;
    const lift = Math.sin(this.breathe * 1.6) * 0.012;
    this.body.scale.y = 1 + lift;
    this.head.position.y = RIG.head.y - lift * 40;

    if (this.blinkRemaining > 0) {
      this.blinkRemaining -= deltaMs;
      if (this.blinkRemaining <= 0) this.setFace(this.faceBeforeBlink);
      return;
    }

    this.blinkIn -= deltaMs;
    if (this.blinkIn <= 0) {
      this.blinkIn = this.rng.intBetween(BLINK_INTERVAL_MS[0], BLINK_INTERVAL_MS[1]);
      /* Nur aus einem ruhigen Gesicht heraus blinzeln — mitten im Schwitzen wäre es Unsinn. */
      if (this.faceId === 'neutral' || this.faceId === 'happy' || this.faceId === 'stern') {
        this.faceBeforeBlink = this.faceId;
        this.blinkRemaining = BLINK_DURATION_MS;
        this.setFace('blink');
      }
    }
  }

  private faceBeforeBlink = 'neutral';

  /** Stellt die Ruhepose wieder her (nach einer Sequenz). */
  reset(): void {
    this.view.scale.set(this.baseScale);
    this.view.rotation = 0;
    this.view.alpha = 1;
    this.body.position.set(0, 0);
    this.body.rotation = 0;
    this.body.scale.set(1, 1);
    this.head.position.set(RIG.head.x, RIG.head.y);
    this.head.rotation = 0;
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;
    this.legL.rotation = 0;
    this.legR.rotation = 0;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
