/**
 * Eine Entscheidungskarte auf dem Samttisch (Art Direction §5.1).
 *
 * Der Flip laeuft prozedural ueber `scale.x` (1 → 0 → 1 mit Textur-Tausch bei 0), mit
 * leichtem `skew` fuer Perspektive. Das **Stocken** ist der Kern der Dramaturgie: Die
 * Karte haelt bei 60 % der Drehung kurz an, die letzte Karte zusaetzlich bei 85 %
 * (Art Direction §7). Ohne dieses Zoegern ist eine Aufdeckung nur ein Umdrehen.
 *
 * Die Karte entscheidet nichts — sie bekommt gesagt, was auf ihr steht.
 */

import gsap from 'gsap';
import { Container, Sprite, type Spritesheet } from 'pixi.js';
import { CARD, STALL_MS } from '@/config/choreo';
import { colorById, textColorOn, type ColorId } from '@/config/theme';
import type { Choice } from '@/core/types';

/** Nennbreite der Karten-Sprites in Textur-Pixeln. */
const CARD_WIDTH = 256;

export interface DecisionCardOptions {
  sheet: Spritesheet;
  colorId: ColorId;
  choice: Choice;
  /** Breite in Welteinheiten. */
  width: number;
  /** Eid-Modus: Wachssiegel auf der Rueckseite. */
  sealed?: boolean;
}

export class DecisionCard {
  readonly view = new Container();
  readonly choice: Choice;

  private readonly sheet: Spritesheet;
  private readonly card: Sprite;
  private readonly symbol: Sprite;
  private readonly seal: Sprite;
  private readonly helmet: Sprite;

  private readonly colorId: ColorId;
  private readonly baseScale: number;
  private flipped = false;

  constructor(options: DecisionCardOptions) {
    this.sheet = options.sheet;
    this.choice = options.choice;
    this.colorId = options.colorId;
    this.baseScale = options.width / CARD_WIDTH;

    const color = colorById(options.colorId);

    this.card = this.sprite('cards/back');
    this.card.tint = color.hex;

    // Das Symbol ist der Farbenblind-Fallback und liegt auf der Rueckseite (GDD §3.1).
    this.symbol = this.sprite(`cards/symbols/${color.symbol}`);
    this.symbol.tint = textColorOn(options.colorId);
    this.symbol.scale.set(1.6);

    this.seal = this.sprite('cards/seal');
    this.seal.position.set(CARD_WIDTH * 0.3, CARD_WIDTH * 0.42);
    this.seal.rotation = -0.18;
    this.seal.visible = options.sealed ?? false;

    this.helmet = this.sprite('cards/helmet');
    this.helmet.position.set(0, -CARD_WIDTH * 0.62);
    this.helmet.visible = false;

    this.view.addChild(this.card, this.symbol, this.seal, this.helmet);
    this.view.scale.set(this.baseScale);
  }

  private sprite(frame: string): Sprite {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im Atlas.`);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  setPosition(x: number, y: number, rotation = 0): void {
    this.view.position.set(x, y);
    this.view.rotation = rotation;
  }

  get isFlipped(): boolean {
    return this.flipped;
  }

  /**
   * Anticipation: Die Karte hebt sich vom Tisch, bevor sie sich dreht.
   *
   * Animiert wird `view.scale` direkt — bewusst ohne GSAPs PixiPlugin: Das Plugin ist
   * ein weiteres Stueck Bundle fuer etwas, das PIXI-Objekte auch so koennen.
   */
  lift(): gsap.core.Timeline {
    const big = this.baseScale * 1.12;
    return gsap.timeline().to(this.view.scale, {
      x: big,
      y: big,
      duration: CARD.liftMs / 1000,
      ease: 'back.out(2)',
    });
  }

  /**
   * Dreht die Karte um.
   *
   * `stalls` sind Fortschritte zwischen 0 und 1, bei denen die Drehung kurz anhaelt —
   * `[0.6]` fuer jede Karte, `[0.6, 0.85]` fuer die letzte (Art Direction §7).
   * Bei der Haelfte wird die Textur getauscht: Von da an sieht man die Vorderseite.
   */
  flip(stalls: readonly number[] = [], timeScale = 1): gsap.core.Timeline {
    const timeline = gsap.timeline({ onComplete: () => (this.flipped = true) });
    const half = CARD.flipMs / 2000;

    /*
     * Der Flip ist zweigeteilt: erst auf `scale.x = 0` zusammenziehen, dann wieder
     * auseinander. Die Stalls werden auf die beiden Haelften verteilt, damit ein Stall
     * bei 0.85 tatsaechlich nach dem Texturwechsel liegt — sonst stockte die Karte,
     * bevor irgendetwas zu sehen ist.
     */
    const before = stalls.filter((s) => s < 0.5).sort((a, b) => a - b);
    const after = stalls.filter((s) => s >= 0.5).sort((a, b) => a - b);

    const skew = 0.16;

    let last = 0;
    for (const stall of before) {
      const at = stall * 2; // 0..0.5 → 0..1 der ersten Haelfte
      timeline.to(this.view.scale, {
        x: this.baseScale * (1 - at),
        duration: half * (at - last),
        ease: 'none',
      });
      timeline.set(this.view.skew, { y: skew * at });
      timeline.to({}, { duration: STALL_MS / 1000 });
      last = at;
    }
    timeline.to(this.view.scale, { x: 0, duration: half * (1 - last), ease: 'power1.in' });

    timeline.call(() => this.showFront());

    last = 0;
    for (const stall of after) {
      const at = (stall - 0.5) * 2;
      timeline.to(this.view.scale, {
        x: this.baseScale * at,
        duration: half * (at - last),
        ease: 'none',
      });
      timeline.to({}, { duration: STALL_MS / 1000 });
      last = at;
    }
    timeline.to(this.view.scale, {
      x: this.baseScale,
      duration: half * (1 - last),
      ease: 'power1.out',
    });
    timeline.to(this.view.skew, { y: 0, duration: 0.12 }, '<');

    timeline.timeScale(timeScale);
    return timeline;
  }

  /** Tauscht auf die Vorderseite — die Rueckseiten-Deko verschwindet mit. */
  private showFront(): void {
    const texture = this.sheet.textures[`cards/front_${this.choice}`];
    if (texture) this.card.texture = texture;
    this.card.tint = 0xffffff;
    this.symbol.visible = false;
    this.seal.visible = false;
  }

  /** Wachssiegel setzen oder abnehmen (Eid-Modus). */
  setSealed(sealed: boolean): void {
    this.seal.visible = sealed && !this.flipped;
  }

  /** Der Maulwurf-Helm ploppt auf die Karte (GDD §4.4, mole_reveal). */
  dropHelmet(): gsap.core.Timeline {
    this.helmet.visible = true;
    return gsap
      .timeline()
      .fromTo(
        this.helmet,
        { y: -CARD_WIDTH * 1.4, alpha: 0 },
        { y: -CARD_WIDTH * 0.62, alpha: 1, duration: 0.35, ease: 'bounce.out' }
      );
  }

  /** Ausgangszustand: verdeckt, ungedreht, in Ruhegroesse. */
  reset(sealed = false): void {
    gsap.killTweensOf([this.view, this.view.scale, this.helmet]);
    this.flipped = false;
    const texture = this.sheet.textures['cards/back'];
    if (texture) this.card.texture = texture;
    this.card.tint = colorById(this.colorId).hex;
    this.symbol.visible = true;
    this.seal.visible = sealed;
    this.helmet.visible = false;
    this.view.scale.set(this.baseScale);
    this.view.skew.set(0, 0);
    this.view.alpha = 1;
  }

  destroy(): void {
    gsap.killTweensOf([this.view, this.view.scale, this.helmet]);
    this.view.destroy({ children: true });
  }
}
