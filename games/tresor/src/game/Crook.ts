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

import gsap from 'gsap';
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
  /** Die Luegennase sitzt auf Gesichtshoehe und waechst nach rechts aus dem Kopf. */
  nose: { x: 16, y: -208 },
  /** Kassels Stempel landet quer auf der Brust. */
  stamp: { x: 0, y: -130 },
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
  /** Was gerade in der Hand haengt — `reset()` raeumt es ab. */
  private readonly props: Sprite[] = [];
  /** Die Luegennase haengt am Kopf, nicht am Koerper — sie muss jeden Blick mitdrehen. */
  private nose: Sprite | undefined;

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
    /*
     * Frames mit Schraegstrich am Anfang des Namens kommen aus einem anderen Ordner
     * desselben Atlas — Kassels Stempel liegt unter `kassel/`. Ein zweiter Atlas kaeme
     * einen Draw-Call teuer (ADR-14), deshalb greift der Crook hier direkt zu.
     */
    const name = frame.includes('/') && !frame.startsWith('faces/')
      && !frame.startsWith('hats/') && !frame.startsWith('symbols/') ? frame : `crooks/${frame}`;
    const texture = this.sheet.textures[name];
    if (!texture) throw new Error(`Frame "${name}" fehlt im Atlas.`);
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

  /**
   * Schulterzucken: Beide Arme kurz hoch, Kopf leicht schief.
   *
   * Die einzige Geste, die der Crook von sich aus kann — sie traegt den Maulwurf-Reveal
   * (GDD §4.4). "Befehl ist Befehl" liest man daran ab, nicht an einer Sprechblase.
   */
  shrug(): gsap.core.Timeline {
    return gsap
      .timeline()
      .to(this.armL, { rotation: ARM_REST + 0.9, duration: 0.18, ease: 'back.out(2)' }, 0)
      .to(this.armR, { rotation: -ARM_REST - 0.9, duration: 0.18, ease: 'back.out(2)' }, 0)
      .to(this.head, { rotation: 0.16, duration: 0.18 }, 0)
      .to({}, { duration: 0.5 })
      .to(this.armL, { rotation: ARM_REST, duration: 0.28, ease: 'power2.inOut' })
      .to(this.armR, { rotation: -ARM_REST, duration: 0.28, ease: 'power2.inOut' }, '<')
      .to(this.head, { rotation: 0, duration: 0.28 }, '<');
  }

  /** Geldsack in die Hand geben (Alleingang, GDD §4.4). */
  showBag(visible: boolean): void {
    this.bag.visible = visible;
  }

  /**
   * Faehrt den Crook an eine Stelle. Beim Gehen wippt der Koerper leicht — ohne das
   * gleitet eine Chibi-Figur wie auf Schienen.
   */
  moveTo(x: number, y: number, durationMs: number, ease = 'power2.inOut'): gsap.core.Timeline {
    const steps = Math.max(2, Math.round(durationMs / 140));
    const timeline = gsap.timeline();
    timeline.to(this.view, { x, y, duration: durationMs / 1000, ease }, 0);
    for (let i = 0; i < steps; i++) {
      timeline.to(
        this.body,
        { y: i % 2 === 0 ? -8 : 0, duration: durationMs / 1000 / steps, ease: 'sine.inOut' },
        (i * durationMs) / 1000 / steps
      );
    }
    timeline.set(this.body, { y: 0 });
    return timeline;
  }

  /** Jubeln: Huepfer mit Armen hoch. Anticipation, Overshoot, Follow-Through. */
  celebrate(times = 2): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.setFace('happy');
    timeline
      .to(this.armL, { rotation: ARM_REST + 2.2, duration: 0.16, ease: 'back.out(2)' }, 0)
      .to(this.armR, { rotation: -ARM_REST - 2.2, duration: 0.16, ease: 'back.out(2)' }, 0);

    for (let i = 0; i < times; i++) {
      timeline
        // Anticipation: erst in die Knie.
        .to(this.body.scale, { x: 1.12, y: 0.88, duration: 0.09 })
        .to(this.body, { y: -60, duration: 0.22, ease: 'power2.out' })
        .to(this.body.scale, { x: 0.94, y: 1.08, duration: 0.12 }, '<')
        .to(this.body, { y: 0, duration: 0.2, ease: 'power2.in' })
        .to(this.body.scale, { x: 1.14, y: 0.86, duration: 0.07 }, '<90%')
        .to(this.body.scale, { x: 1, y: 1, duration: 0.22, ease: 'elastic.out(1, 0.4)' });
    }
    return timeline;
  }

  /**
   * Plattgedrueckt (GDD §4.4, steal_multi_anvil). Squash bis zum Anschlag, X-Augen,
   * und die Arme fallen zur Seite — Follow-Through.
   */
  flatten(): gsap.core.Timeline {
    return gsap
      .timeline()
      .call(() => this.setFace('x_eyes'))
      .to(this.body.scale, { x: 1.7, y: 0.22, duration: 0.09, ease: 'power3.in' })
      .to(this.armL, { rotation: ARM_REST + 1.4, duration: 0.16 }, '<')
      .to(this.armR, { rotation: -ARM_REST - 1.4, duration: 0.16 }, '<')
      .to(this.body.scale, { x: 1.5, y: 0.3, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }

  /**
   * Die Kinnlade faellt zu Boden (Art Direction §5).
   *
   * Der Sprite wird an den Kopf gehaengt und faellt dann heraus — deshalb ein eigener
   * Sprite und kein Gesicht: Ein Gesicht kann nicht auf den Boden fallen.
   */
  jawDrop(): gsap.core.Timeline {
    this.setFace('jaw_drop');
    const jaw = new Sprite(this.texture('jaw'));
    jaw.anchor.set(0.5, 0);
    jaw.tint = colorById(this.colorId).hex;
    jaw.position.set(0, RIG.face.y - RIG.head.y + 18);
    this.head.addChild(jaw);

    return gsap
      .timeline()
      .to(this.body.scale, { x: 0.94, y: 1.06, duration: 0.12, ease: 'back.out(2)' })
      .to(
        jaw,
        {
          y: 180,
          rotation: 0.5,
          duration: 0.55,
          ease: 'bounce.out',
          onComplete: () => jaw.destroy(),
        },
        '<'
      );
  }

  /**
   * Die Luegennase waechst (GDD §4.4, perjury_seal_break).
   *
   * Sie kommt in **drei Schueben** statt in einem gleichmaessigen Zug: Jeder Schub ist
   * eine Luege, und drei Rucke lesen sich als Anklage, ein sanftes Wachsen nur als
   * Effekt. Zwischen den Schueben federt der Kopf zurueck (Follow-Through,
   * Art Direction §7).
   */
  growNose(steps = 3): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (!this.nose) {
      const nose = new Sprite(this.texture('nose'));
      // Anker links: Die Nase waechst aus dem Gesicht heraus, sie wandert nicht weg.
      nose.anchor.set(0, 0.5);
      nose.position.set(RIG.nose.x, RIG.nose.y - RIG.head.y);
      nose.scale.set(0, 1);
      this.head.addChild(nose);
      this.nose = nose;
    }
    const nose = this.nose;

    for (let i = 0; i < steps; i++) {
      const to = (i + 1) / steps;
      timeline
        .to(nose.scale, { x: to, duration: 0.14, ease: 'back.out(3)' })
        .to(this.head, { rotation: -0.06, duration: 0.07 }, '<')
        .to(this.head, { rotation: 0, duration: 0.18, ease: 'elastic.out(1, 0.4)' })
        .to({}, { duration: 0.12 });
    }
    return timeline;
  }

  /**
   * Kassels MEINEID-Stempel knallt auf die Brust (GDD §4.4).
   *
   * Der Stempel kommt gross und schraeg von vorn und wird beim Aufschlag kurz
   * ueberdrueckt — ohne diesen Overshoot wirkt er aufgeklebt statt gestempelt.
   */
  stamp(): gsap.core.Timeline {
    const stamp = new Sprite(this.texture('kassel/stamp'));
    stamp.anchor.set(0.5);
    stamp.position.set(RIG.stamp.x, RIG.stamp.y);
    stamp.rotation = -0.22;
    stamp.alpha = 0;
    stamp.scale.set(3.2);
    this.body.addChild(stamp);
    this.props.push(stamp);

    return gsap
      .timeline()
      .to(stamp, { alpha: 1, duration: 0.06 }, 0)
      .to(stamp.scale, { x: 1, y: 1, duration: 0.14, ease: 'power4.in' }, 0)
      .to(stamp.scale, { x: 1.18, y: 0.86, duration: 0.06 })
      .to(stamp.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.45)' })
      .to(this.body, { rotation: 0.05, duration: 0.06 }, '<')
      .to(this.body, { rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' }, '<');
  }

  /** Haengt eine Requisite in die Hand — Glas, Sack, Wasserpistole, Schild. */
  attachProp(sprite: Sprite, x: number = RIG.bag.x, y: number = RIG.bag.y): void {
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    this.body.addChild(sprite);
    this.props.push(sprite);
  }

  /** Nimmt alle Requisiten wieder ab. */
  clearProps(): void {
    for (const prop of this.props) prop.destroy();
    this.props.length = 0;
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
    gsap.killTweensOf([this.view, this.body, this.body.scale, this.head, this.armL, this.armR]);
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
    if (this.nose) {
      gsap.killTweensOf([this.nose, this.nose.scale]);
      this.nose.destroy();
      this.nose = undefined;
    }
    this.clearProps();
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.scale.set(1);
    this.shadow.visible = !this.lowEffects;

    this.blinkRemaining = 0;
    this.applyFace('neutral');
    this.restingFace = 'neutral';
  }

  /**
   * Die Teile, die eine Inszenierung bewegen darf (Architektur §7).
   *
   * Bewusst ein eigener Zugriff statt `public`-Feldern: Sequenzen sollen **animieren**,
   * nicht am Zustand des Crooks schrauben. Was hier nicht steht — Gesicht, Maske, Hut,
   * Blinzel-Timer — gehoert dem Crook, und wer es trotzdem anfasst, ueberlebt `reset()`
   * nicht (Audit A4).
   */
  get rig(): {
    readonly body: Container;
    readonly head: Container;
    readonly torso: Sprite;
    readonly armL: Sprite;
    readonly armR: Sprite;
  } {
    return {
      body: this.body,
      head: this.head,
      torso: this.torso,
      armL: this.armL,
      armR: this.armR,
    };
  }

  /** Ruhewinkel der Arme — Sequenzen brauchen ihn, um sauber zurueckzufahren. */
  get armRest(): number {
    return ARM_REST;
  }

  /** Position in Weltkoordinaten — Inszenierungen rechnen damit. */
  get position(): { x: number; y: number } {
    return { x: this.view.position.x, y: this.view.position.y };
  }

  /** Ungefaehre Kopfhoehe ueber dem Boden — dorthin fliegen Zaehler und Sternchen. */
  get headOffset(): number {
    return RIG.height * this.baseScale * 0.82;
  }

  destroy(): void {
    gsap.killTweensOf([this.view, this.body, this.body.scale, this.head, this.armL, this.armR]);
    this.view.destroy({ children: true });
  }
}
