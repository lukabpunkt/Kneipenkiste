/**
 * Der Charakter (Art Direction §5).
 *
 * Das Shotling-Rig aus Drinkshot mit Bauhelm, Schaufel und optionaler Warnweste —
 * gleiche Formensprache, gleiche Familie (ADR-1). Koerperteile sind weiss gezeichnet und
 * werden getintet; Gesicht, Fuesse, Weste und Symbol bleiben ungetintet.
 *
 * **Der Helm traegt die Spielerfarbe.** Anders als in Drinkshot ist er kein Zufallshut,
 * sondern das Erkennungszeichen: Wenn der Digger nach einer Explosion durchs Bild
 * fliegt, ist der Helm oft das Einzige, was man noch zuordnen kann.
 *
 * **Russ bleibt** (Art Direction §7): Wer gesprengt wurde, ist bis Rundenende schwarz.
 * Das ist der sichtbare Score — man sieht der Bank an, wie die Runde lief.
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { ANTICIPATION } from '@/config/choreo';
import { colorById, diggerHeightFor, SOOT_ALPHA, type ColorId, type FaceId } from '@/config/theme';
import type { DiggerProp } from './sequences/Sequence';

/**
 * Rig-Layout in Textur-Pixeln (@1x), Ursprung zwischen den Fuessen, y negativ = oben.
 * Uebernommen aus dem Drinkshot-Shotling, damit beide Spiele dieselben Proportionen haben.
 */
const RIG = {
  height: 276,
  foot: { x: 20, y: 0, anchorY: 1 },
  leg: { x: 20, y: -60, anchorY: 0.08 },
  torso: { x: 0, y: -56, anchorY: 1 },
  symbol: { x: 0, y: -110, anchorY: 0.5 },
  arm: { x: 44, y: -146, anchorY: 0.12 },
  head: { x: 0, y: -212, anchorY: 0.5 },
  face: { y: -210 },
  /** Der Helm sitzt auf der Kopfoberkante. */
  helmet: { y: -268, anchorY: 1 },
  /** Die Schaufel haengt am rechten Arm. */
  shovel: { x: 62, y: -120 },
} as const;

const SHADOW_ALPHA = 0.35;
const LEG_SWING = 26;
const ARM_REST = 0.2;
/** Welteinheiten pro voller Schrittfolge — bestimmt die Schrittfrequenz beim Laufen. */
const STRIDE = 62;

export interface DiggerOptions {
  sheet: Spritesheet;
  colorId: ColorId;
  /** Warnweste: die Haelfte traegt eine (Art Direction §5). */
  vest?: boolean;
  /** Spielhoehe in Welteinheiten; ohne Angabe die Hoehe fuer 8 Spieler. */
  height?: number;
  lowEffects?: boolean;
}

export class Digger {
  readonly view = new Container();
  readonly colorId: ColorId;

  private readonly sheet: Spritesheet;
  /**
   * Alles ausser dem Schatten. Heisst `rig`, damit der oeffentliche Zugang `body` heissen
   * kann — so steht in den Sequenzen `digger.body`, und hier drin bleibt sichtbar, dass
   * es die Figur ohne ihren Schatten ist.
   */
  private readonly rig = new Container();
  private readonly shadow: Sprite;
  private readonly legL: Sprite;
  private readonly legR: Sprite;
  private readonly footL: Sprite;
  private readonly footR: Sprite;
  private readonly torso: Sprite;
  private readonly vestSprite: Sprite;
  private readonly symbol: Sprite;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly head = new Container();
  private readonly headShape: Sprite;
  private readonly face: Sprite;
  private readonly helmet: Sprite;
  private readonly shovel: Sprite;
  /** Russ ueber Kopf und Torso — bleibt bis `reset()`. */
  private readonly sootHead: Sprite;
  private readonly sootBody: Sprite;
  /**
   * Die Requisiten der Hit-Sequenzen (Art Direction §5): Haarfaecher nach der Explosion
   * ins Gesicht, weisse Fahne aus dem Krater. Sie haengen von Anfang an im Rig und sind
   * nur unsichtbar — ein Sprite, das erst im Moment der Explosion entsteht, kostet genau
   * dann Zeit, wenn am meisten los ist.
   */
  private readonly hairFan: Sprite;
  private readonly whiteFlag: Sprite;
  /** Laeuft gerade das Beinzappeln? */
  private kicking: gsap.core.Tween | undefined;

  private readonly baseScale: number;
  /** Koerperhoehe in Welteinheiten — der Director stellt ihn danach auf. */
  readonly height: number;
  /** Wo der Digger sitzt, wenn er nicht dran ist. */
  private homeX = 0;
  private homeY = 0;
  private faceId: FaceId = 'neutral';
  private sooty = false;

  constructor(options: DiggerOptions) {
    const { sheet, colorId } = options;
    this.sheet = sheet;
    this.colorId = colorId;

    const color = colorById(colorId);
    const tint = color.hex;

    this.shadow = this.sprite('shadow', 0, 0, 0.5);
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.tint = 0x000000;
    this.shadow.visible = !(options.lowEffects ?? false);

    this.footL = this.sprite('foot', -RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    this.footR = this.sprite('foot', RIG.foot.x, RIG.foot.y, RIG.foot.anchorY);
    this.legL = this.sprite('leg', -RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);
    this.legR = this.sprite('leg', RIG.leg.x, RIG.leg.y, RIG.leg.anchorY, tint);

    this.torso = this.sprite('torso', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY, tint);
    // Die Weste wird **nicht** getintet — sonst waere sie nicht als Warnweste lesbar.
    this.vestSprite = this.sprite('gear/vest', RIG.torso.x, RIG.torso.y, RIG.torso.anchorY);
    this.vestSprite.visible = options.vest ?? false;
    this.symbol = this.sprite(`symbols/${color.symbol}`, RIG.symbol.x, RIG.symbol.y, 0.5);

    this.armL = this.sprite('arm', -RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armR = this.sprite('arm', RIG.arm.x, RIG.arm.y, RIG.arm.anchorY, tint);
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;

    this.shovel = this.sprite('gear/shovel', RIG.shovel.x, RIG.shovel.y, 0.1);
    this.shovel.rotation = 0.25;

    this.headShape = this.sprite('head', 0, 0, 0.5, tint);
    this.face = this.sprite('faces/neutral', 0, RIG.face.y - RIG.head.y, 0.5);
    // Der Helm traegt die Spielerfarbe — deshalb getintet, anders als bei Drinkshot.
    this.helmet = this.sprite('gear/helmet', 0, RIG.helmet.y - RIG.head.y, RIG.helmet.anchorY, tint);

    /*
     * Der Haarfaecher sitzt hinter dem Kopf und schaut oben heraus — deshalb wird er
     * vor dem Kopf gezeichnet und der Helm bleibt darueber liegen.
     */
    this.hairFan = this.sprite('gear/hair_fan', 0, RIG.helmet.y - RIG.head.y, 1, tint);
    this.hairFan.visible = false;

    this.whiteFlag = this.sprite('gear/flag_white', RIG.arm.x, RIG.arm.y, 1);
    this.whiteFlag.visible = false;

    this.sootHead = this.sprite('gear/soot_overlay', 0, 0, 0.5);
    this.sootHead.alpha = SOOT_ALPHA;
    this.sootHead.visible = false;
    this.sootBody = this.sprite('gear/soot_overlay', RIG.torso.x, RIG.torso.y - 40, 0.5);
    this.sootBody.alpha = SOOT_ALPHA * 0.8;
    this.sootBody.scale.set(0.8);
    this.sootBody.visible = false;

    this.head.position.set(RIG.head.x, RIG.head.y);
    this.head.addChild(this.hairFan, this.headShape, this.face, this.sootHead, this.helmet);

    // Zeichenreihenfolge = Tiefenstaffelung.
    this.rig.addChild(
      this.footL,
      this.footR,
      this.legL,
      this.legR,
      this.torso,
      this.vestSprite,
      this.symbol,
      this.sootBody,
      this.armL,
      this.shovel,
      this.whiteFlag,
      this.armR,
      this.head
    );

    this.view.addChild(this.shadow, this.rig);
    this.height = options.height ?? diggerHeightFor(8);
    this.baseScale = this.height / RIG.height;
    this.view.scale.set(this.baseScale);
  }

  private texture(frame: string): Texture {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im Digger-Atlas.`);
    return texture;
  }

  private sprite(frame: string, x: number, y: number, anchorY: number, tint?: number): Sprite {
    const sprite = new Sprite(this.texture(frame));
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    if (tint !== undefined) sprite.tint = tint;
    return sprite;
  }

  /* ---------------------------------------------------------------- */
  /* Position                                                          */
  /* ---------------------------------------------------------------- */

  /** Setzt den Platz auf der Bank — dorthin kehrt der Digger nach jeder Grabung zurueck. */
  setHome(x: number, y: number, back = false): void {
    this.homeX = x;
    this.homeY = y;
    this.view.position.set(x, y);
    // Wer hinten sitzt, wird kleiner gezeichnet — sonst steht die Bank flach im Bild.
    this.view.scale.set(back ? this.baseScale * 0.82 : this.baseScale);
  }

  get home(): { x: number; y: number } {
    return { x: this.homeX, y: this.homeY };
  }

  setFace(face: FaceId): void {
    if (this.faceId === face) return;
    this.faceId = face;
    this.face.texture = this.texture(`faces/${face}`);
  }

  getFace(): FaceId {
    return this.faceId;
  }

  setLowEffects(low: boolean): void {
    this.shadow.visible = !low;
  }

  /* ---------------------------------------------------------------- */
  /* Bewegung                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Laeuft zur Platte. Das Bein-Pendel haengt an der **zurueckgelegten Strecke**, nicht
   * an der Zeit — so passt die Schrittfrequenz automatisch zum Tempo, egal wie weit es ist.
   */
  walkTo(x: number, y: number, durationMs = ANTICIPATION.walkMs): gsap.core.Timeline {
    const startX = this.view.x;
    const startY = this.view.y;
    const distance = Math.hypot(x - startX, y - startY);
    const progress = { t: 0 };

    return gsap
      .timeline()
      .to(progress, {
        t: 1,
        duration: durationMs / 1000,
        ease: 'power1.inOut',
        onUpdate: () => {
          this.view.x = startX + (x - startX) * progress.t;
          this.view.y = startY + (y - startY) * progress.t;
          this.stepAt(distance * progress.t);
        },
      })
      .add(() => this.standStill());
  }

  /** Zurueck auf die Bank. Der Russ bleibt (Art Direction §7). */
  walkHome(durationMs = ANTICIPATION.walkMs): gsap.core.Timeline {
    return this.walkTo(this.homeX, this.homeY, durationMs);
  }

  /** Bein- und Armschwung fuer eine zurueckgelegte Strecke. */
  private stepAt(travelled: number): void {
    const phase = (travelled / STRIDE) * Math.PI * 2;
    const swing = (Math.sin(phase) * LEG_SWING * Math.PI) / 180;
    this.legL.rotation = swing;
    this.legR.rotation = -swing;
    this.footL.y = RIG.foot.y - Math.max(0, Math.sin(phase)) * 8;
    this.footR.y = RIG.foot.y - Math.max(0, -Math.sin(phase)) * 8;
    this.armL.rotation = ARM_REST - swing * 0.5;
    this.armR.rotation = -ARM_REST - swing * 0.5;
  }

  private standStill(): void {
    this.legL.rotation = 0;
    this.legR.rotation = 0;
    this.footL.y = RIG.foot.y;
    this.footR.y = RIG.foot.y;
    this.armL.rotation = ARM_REST;
    this.armR.rotation = -ARM_REST;
  }

  /**
   * Drei Schaufelstoesse mit Squash (Art Direction §6) — der mittlere Teil der
   * Jenga-Sekunde. Die Schaufel geht hoch, der Koerper duckt sich, dann der Stoss.
   */
  digAnimation(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const stroke = ANTICIPATION.shovelStrokeMs / 1000;

    for (let i = 0; i < ANTICIPATION.shovelStrokes; i++) {
      timeline
        .to(this.shovel, { rotation: -0.5, duration: stroke * 0.45, ease: 'power2.out' })
        .to(this.rig.scale, { x: 1.06, y: 0.94, duration: stroke * 0.45, ease: 'power2.out' }, '<')
        .to(this.shovel, { rotation: 0.7, duration: stroke * 0.55, ease: 'power3.in' })
        .to(this.rig.scale, { x: 0.96, y: 1.04, duration: stroke * 0.3, ease: 'power3.in' }, '<')
        .to(this.rig.scale, { x: 1, y: 1, duration: stroke * 0.25, ease: 'back.out(2)' });
    }
    return timeline.to(this.shovel, { rotation: 0.25, duration: 0.08 });
  }

  /* ---------------------------------------------------------------- */
  /* Zustand                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Russ auflegen. Bleibt bis zum Rundenstart — ein gesprengter Digger sitzt schwarz auf
   * der Bank, und man sieht der Runde an, wie sie lief (Art Direction §7).
   */
  soot(): void {
    this.sooty = true;
    this.sootHead.visible = true;
    this.sootBody.visible = true;
    this.setFace('soot_blink');
  }

  get isSooty(): boolean {
    return this.sooty;
  }

  /** Der Koerper ohne Schatten — hier setzen die Sequenzen Squash & Stretch an. */
  get body(): Container {
    return this.rig;
  }

  /* ---------------------------------------------------------------- */
  /* Requisiten der Hit-Sequenzen (Art Direction §5)                   */
  /* ---------------------------------------------------------------- */

  /**
   * Loest den Helm vom Kopf, damit er eigenstaendig durchs Bild fliegen kann.
   *
   * Er wechselt in die Ebene, in der auch der Digger haengt, und behaelt dabei seine
   * Position und Groesse auf dem Bildschirm — sonst springt er im Moment des Abloesens,
   * und genau dieser Moment ist die Pointe von `hit_helmet_rocket`.
   */
  detachHelmet(): void {
    const parent = this.view.parent;
    if (!parent || this.helmet.parent === parent) return;

    const global = this.helmet.getGlobalPosition();
    parent.addChild(this.helmet);
    this.helmet.position.copyFrom(parent.toLocal(global));
    // Der Digger ist skaliert, die Feld-Ebene nicht — die Differenz muss mit.
    this.helmet.scale.set(this.baseScale);
    this.helmet.rotation = 0;
  }

  /** Der Helm als Tween-Ziel, ohne ihn anzufassen (siehe `detachHelmet`). */
  get helmetView(): Container {
    return this.helmet;
  }

  /** Helm zurueck auf den Kopf, in seiner Ruhelage. */
  attachHelmet(): void {
    this.head.addChild(this.helmet);
    this.helmet.position.set(0, RIG.helmet.y - RIG.head.y);
    this.helmet.scale.set(1);
    this.helmet.rotation = 0;
    this.helmet.alpha = 1;
    this.helmet.visible = true;
  }

  /** Haarfaecher, Brezel-Schaufel, weisse Fahne. */
  setProp(prop: DiggerProp, on: boolean): void {
    switch (prop) {
      case 'hairFan':
        this.hairFan.visible = on;
        return;
      case 'whiteFlag':
        this.whiteFlag.visible = on;
        return;
      case 'pretzelShovel':
        this.shovel.texture = this.texture(on ? 'gear/shovel_pretzel' : 'gear/shovel');
    }
  }

  /**
   * Strampeln: die Beine zappeln gegenlaeufig weiter, ohne dass die Sequenz jeden
   * Ausschlag selbst schreiben muss. Ein Tween statt eines Frame-Callbacks — so haengt
   * das Zappeln an derselben Uhr wie alles andere (CLAUDE.md: eine Uhr).
   */
  kickLegs(active: boolean): void {
    this.kicking?.kill();
    this.kicking = undefined;
    if (!active) {
      this.legL.rotation = 0;
      this.legR.rotation = 0;
      return;
    }
    const swing = (LEG_SWING * Math.PI) / 180;
    this.legL.rotation = swing;
    this.legR.rotation = -swing;
    this.kicking = gsap.to([this.legL, this.legR], {
      rotation: (index: number) => (index === 0 ? -swing : swing),
      duration: 0.12,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  /**
   * Die Reaktion auf den Temperatur-Hinweis (GDD §4.3): HEISS → schwitzen, WARM →
   * Augenbraue, KALT → zittern. Kleine Geste, aber sie macht aus einer Zahl ein Gefuehl.
   */
  reactToHint(hint: 'hot' | 'warm' | 'cold' | 'none'): void {
    if (this.sooty) return;
    switch (hint) {
      case 'hot':
        this.setFace('sweat');
        return;
      case 'warm':
        this.setFace('brow');
        return;
      case 'cold':
        this.setFace('shiver');
        return;
      case 'none':
        this.setFace('neutral');
    }
  }

  /**
   * Setzt das Rig auf die Ausgangspose zurueck — inklusive Russ.
   *
   * Wird zum **Rundenstart** gerufen, nicht nach jeder Grabung: Der Russ ist der Score
   * der laufenden Runde. Jedes Teil wird angefasst, nicht nur die, die eine Sequenz
   * bewegt hat — sonst schleppt die naechste Runde einen halb umgekippten Koerper mit.
   */
  reset(): void {
    gsap.killTweensOf([this.view, this.rig, this.rig.scale, this.head, this.shovel]);
    this.kickLegs(false);
    this.attachHelmet();
    for (const prop of ['hairFan', 'pretzelShovel', 'whiteFlag'] as const) this.setProp(prop, false);

    this.sooty = false;
    this.sootHead.visible = false;
    this.sootBody.visible = false;
    this.setFace('neutral');

    this.view.position.set(this.homeX, this.homeY);
    this.view.rotation = 0;
    this.view.alpha = 1;
    this.rig.position.set(0, 0);
    this.rig.rotation = 0;
    this.rig.scale.set(1);
    this.head.rotation = 0;
    this.shovel.rotation = 0.25;
    this.shovel.position.set(RIG.shovel.x, RIG.shovel.y);
    this.shovel.texture = this.texture('gear/shovel');
    this.standStill();
  }

  destroy(): void {
    gsap.killTweensOf([this.view, this.rig, this.rig.scale, this.head, this.shovel]);
    this.view.destroy({ children: true });
  }
}
