/**
 * Der Crook (Art Direction §5) — ein Shotling mit Ganovenmaske.
 *
 * Rig und Proportionen sind identisch zu Drinkshot; die Maske liegt als getinteter
 * Sprite ueber dem Gesicht, das Ringelshirt ueber dem Torso. Anders als in Drinkshot
 * laeuft hier niemand: Die Crooks stehen im Halbkreis hinter ihren Karten und tun genau
 * drei Dinge — atmen, blinzeln und hinschauen.
 *
 * Genau das ist die **Blick-Regie** aus Art Direction §7: Alle schauen auf die Karte, die
 * gerade aufgedeckt wird; der Besitzer schaut zur Kamera. Ohne diese Regie wirkt der
 * Halbkreis wie eine Reihe Schaufensterpuppen.
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import { colorById, STAGE, type ColorId, type FaceId, type HatId } from '@/config/theme';
import type { SeededRng } from '@/core/rng';

/**
 * Rig-Layout in Textur-Pixeln (@1x), Ursprung zwischen den Fuessen, y negativ = oben.
 * Die Gesamthoehe von 276 px wird ueber `rigScaleFor()` auf die Spielhoehe gebracht.
 */
const RIG = {
  height: 276,
  shadow: { x: 0, y: 0, anchorY: 0.5 },
  foot: { x: 20, y: 0, anchorY: 1 },
  leg: { x: 20, y: -60, anchorY: 0.08 },
  torso: { x: 0, y: -56, anchorY: 1 },
  symbol: { x: 0, y: -110, anchorY: 0.5 },
  arm: { x: 44, y: -146, anchorY: 0.12 },
  head: { x: 0, y: -212, anchorY: 0.5 },
  face: { x: 0, y: -210, anchorY: 0.5 },
  /** Die Maske sitzt zwei Einheiten ueber dem Gesicht — auf den Augen. */
  mask: { x: 0, y: -214, anchorY: 0.5 },
  hat: { x: 0, y: -268, anchorY: 1 },
  /** Der Geldsack haengt am rechten Arm. */
  bag: { x: 68, y: -108, anchorY: 0.5 },
} as const;

/** Ruhewinkel der Arme in Radiant — leicht abgespreizt, sonst verschwinden sie im Torso. */
const ARM_REST = 0.2;
const SHADOW_ALPHA = 0.35;

/** Atmen: Der Torso hebt und senkt sich, der Kopf folgt verzoegert. */
const BREATH = { periodMs: 3400, torsoScale: 0.022, headLift: 3 } as const;

/** Wie weit sich der Kopf hoechstens dreht (Radiant). */
const LOOK_LIMIT = 0.26;

export function rigScaleFor(height: number): number {
  return height / RIG.height;
}

export interface CrookOptions {
  sheet: Spritesheet;
  colorId: ColorId;
  rng: SeededRng;
  hatId?: HatId;
  /** Ringelshirt (Art Direction §5: etwa die Haelfte traegt eins). */
  stripes?: boolean;
  /** Spielhoehe in Welteinheiten. */
  height: number;
  lowEffects?: boolean;
}

export class Crook {
  readonly view = new Container();
  readonly colorId: ColorId;

  private readonly sheet: Spritesheet;
  private readonly body = new Container();
  private readonly shadow: Sprite;
  private readonly torso: Sprite;
  private readonly stripes: Sprite;
  private readonly symbol: Sprite;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly head = new Container();
  private readonly face: Sprite;
  private readonly mask: Sprite;
  private readonly hat: Sprite;
  private readonly bag: Sprite;

  private readonly baseScale: number;
  private readonly rng: SeededRng;

  private faceId: FaceId = 'neutral';
  private hatId: HatId;
  /** Gesicht, zu dem nach einem Blinzeln zurueckgekehrt wird. */
  private restingFace: FaceId = 'neutral';
  private blinkIn: number;
  private blinkRemaining = 0;
  /** Phasenversatz, damit nicht alle acht im Gleichtakt atmen. */
  private readonly breathPhase: number;
  private elapsed = 0;
  private lowEffects: boolean;

  constructor(options: CrookOptions) {
    this.sheet = options.sheet;
    this.rng = options.rng;
    this.colorId = options.colorId;
    this.lowEffects = options.lowEffects ?? false;

    const color = colorById(options.colorId);
    const tint = color.hex;

    this.shadow = this.sprite('shadow', RIG.shadow.x, RIG.shadow.y, RIG.shadow.anchorY);
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.tint = 0x000000;
    this.shadow.visible = !this.lowEffects;

    const footL = this.sprite('foot', -RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    const footR = this.sprite('foot', RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    const legL = this.sprite('leg', -RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    const legR = this.sprite('leg', RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);

    this.torso = this.sprite('torso', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY, tint);
    this.stripes = this.sprite('shirt_stripes', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY);
    this.stripes.visible = options.stripes ?? false;
    this.stripes.alpha = 0.85;

    this.symbol = this.sprite(`symbols/${color.symbol}`, RIG.symbol.x, RIG.symbol.y, RIG.symbol.anchorY);

    this.armL = this.sprite('arm', -RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armR = this.sprite('arm', RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    this.bag = this.sprite('bag', RIG.bag.x, RIG.bag.y, RIG.bag.anchorY);
    this.bag.visible = false;

    const headShape = this.sprite('head', 0, 0, 0.5, tint);
    this.face = this.sprite('faces/neutral', 0, RIG.face.y - RIG.head.y, RIG.face.anchorY);
    // Die Maske traegt die Spielerfarbe — sie ist das Erkennungszeichen im Halbkreis.
    this.mask = this.sprite('mask', 0, RIG.mask.y - RIG.head.y, RIG.mask.anchorY, tint);

    this.hatId = options.hatId ?? 'none';
    this.hat = this.sprite(this.hatFrame(), 0, RIG.hat.y - RIG.head.y, RIG.hat.anchorY);
    this.hat.visible = this.hatId !== 'none';

    this.head.position.set(RIG.head.x, RIG.head.y);
    this.head.addChild(headShape, this.face, this.mask, this.hat);

    // Zeichenreihenfolge = Tiefenstaffelung (Art Direction §5).
    this.body.addChild(
      footL,
      footR,
      legL,
      legR,
      this.torso,
      this.stripes,
      this.symbol,
      this.armL,
      this.armR,
      this.bag,
      this.head
    );

    this.view.addChild(this.shadow, this.body);
    this.baseScale = rigScaleFor(options.height);
    this.view.scale.set(this.baseScale);

    this.breathPhase = this.rng.range(0, BREATH.periodMs);
    this.blinkIn = this.rng.intBetween(STAGE.blinkIntervalMs[0], STAGE.blinkIntervalMs[1]);
  }

  /* ---------------------------------------------------------------- */

  private texture(frame: string): Texture {
    const texture = this.sheet.textures[`crooks/${frame}`];
    if (!texture) throw new Error(`Frame "crooks/${frame}" fehlt im Atlas.`);
    return texture;
  }

  private sprite(frame: string, x: number, y: number, anchorY: number, tint?: number): Sprite {
    const sprite = new Sprite(this.texture(frame));
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    if (tint !== undefined) sprite.tint = tint;
    return sprite;
  }

  private hatFrame(): string {
    return `hats/${this.hatId === 'none' ? 'cap' : this.hatId}`;
  }

  /* ---------------------------------------------------------------- */
  /* Steuerung                                                         */
  /* ---------------------------------------------------------------- */

  setPosition(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /**
   * Setzt das Gesicht. Wird waehrend eines Blinzelns gesetzt, gilt es als neue Ruhepose —
   * sonst blinzelt der Crook den frischen Ausdruck sofort wieder weg.
   */
  setFace(face: FaceId): void {
    this.restingFace = face;
    if (this.blinkRemaining > 0) return;
    this.applyFace(face);
  }

  getFace(): FaceId {
    return this.faceId;
  }

  private applyFace(face: FaceId): void {
    if (this.faceId === face) return;
    this.faceId = face;
    this.face.texture = this.texture(`faces/${face}`);
  }

  setHat(hat: HatId): void {
    this.hatId = hat;
    this.hat.visible = hat !== 'none';
    if (hat !== 'none') this.hat.texture = this.texture(`hats/${hat}`);
  }

  /** Geldsack in die Hand geben (Alleingang, GDD §4.4). */
  showBag(visible: boolean): void {
    this.bag.visible = visible;
  }

  /**
   * Dreht den Kopf zu einem Punkt in Weltkoordinaten.
   *
   * Nur die Drehung, keine Verschiebung: Ein Chibi-Kopf, der sich zu weit dreht, sieht
   * aus wie abgerissen. `LOOK_LIMIT` haelt ihn im lesbaren Bereich.
   */
  lookAt(worldX: number, worldY: number): void {
    const dx = worldX - this.view.position.x;
    const dy = worldY - this.view.position.y;
    const angle = Math.atan2(dy, dx);
    this.head.rotation = Math.max(-LOOK_LIMIT, Math.min(LOOK_LIMIT, Math.cos(angle) * LOOK_LIMIT));
  }

  lookAhead(): void {
    this.head.rotation = 0;
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
    this.shadow.visible = !low;
  }

  /**
   * Atmen und Blinzeln. Laeuft ueber die verstrichene Zeit, nicht ueber Frames —
   * bei 30 fps atmet der Crook genauso ruhig wie bei 60.
   */
  update(deltaMs: number): void {
    this.elapsed += deltaMs;

    const phase = ((this.elapsed + this.breathPhase) % BREATH.periodMs) / BREATH.periodMs;
    const breath = Math.sin(phase * Math.PI * 2);
    this.torso.scale.set(1 - breath * BREATH.torsoScale * 0.5, 1 + breath * BREATH.torsoScale);
    this.head.position.y = RIG.head.y - breath * BREATH.headLift;

    if (this.blinkRemaining > 0) {
      this.blinkRemaining -= deltaMs;
      if (this.blinkRemaining <= 0) this.applyFace(this.restingFace);
      return;
    }

    this.blinkIn -= deltaMs;
    if (this.blinkIn > 0) return;
    this.blinkIn = this.rng.intBetween(STAGE.blinkIntervalMs[0], STAGE.blinkIntervalMs[1]);
    // Nur Gesichter mit offenen Augen blinzeln — ein x_eyes-Crook zwinkert nicht.
    if (this.restingFace === 'x_eyes' || this.restingFace === 'jaw_drop') return;
    this.applyFace('blink');
    this.blinkRemaining = STAGE.blinkDurationMs;
  }

  /**
   * Ausgangspose. Nach jeder Inszenierung Pflicht (Audit A4) — sonst schleppt die
   * naechste Runde einen halb umgekippten Crook mit.
   */
  reset(): void {
    this.view.rotation = 0;
    this.view.alpha = 1;
    this.view.scale.set(this.baseScale);

    this.body.position.set(0, 0);
    this.body.rotation = 0;
    this.body.scale.set(1);
    this.body.alpha = 1;

    this.torso.scale.set(1);
    this.torso.rotation = 0;

    this.head.rotation = 0;
    this.head.scale.set(1);
    this.head.position.set(RIG.head.x, RIG.head.y);

    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    this.bag.visible = false;
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.scale.set(1);
    this.shadow.visible = !this.lowEffects;

    this.blinkRemaining = 0;
    this.applyFace('neutral');
    this.restingFace = 'neutral';
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
