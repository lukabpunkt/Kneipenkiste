/**
 * Der Tresor auf der Buehne (Art Direction §4.2).
 *
 * Rahmen, Tuerblatt, Zahlenkranz, Griffrad und ein Muenzstapel in fuenf Stufen. Das
 * Tuerblatt schwingt um seine linke Kante auf — deshalb liegt es in einem eigenen
 * Container, dessen Ursprung am Scharnier sitzt und nicht in der Mitte.
 *
 * Alle Bewegungen geben eine GSAP-Timeline zurueck, damit der RevealDirector (M3) sie in
 * seine eigene einhaengen kann, statt sie nur anzustossen. Die Sound-Hooks sind schon da;
 * gefuellt werden sie in M3.
 */

import gsap from 'gsap';
import { Container, Sprite, type Spritesheet } from 'pixi.js';
import { MOTION } from '@/config/theme';

/** Die fuenf Stufen des Muenzstapels (Art Direction §4.2). */
const COIN_STAGES = 5;

export type VaultSound = 'vault_dial' | 'vault_open' | 'vault_close' | 'coin_shimmer' | 'cash_register';

export interface VaultOptions {
  sheet: Spritesheet;
  /** Durchmesser in Welteinheiten. */
  size: number;
  /** Wird bei jedem Sound-Cue gerufen; der AudioManager haengt sich in M3 ein. */
  onSound?: (id: VaultSound) => void;
}

export class Vault {
  readonly view = new Container();

  private readonly sheet: Spritesheet;
  private readonly onSound: (id: VaultSound) => void;

  private readonly frame: Sprite;
  private readonly coins: Sprite;
  /** Ursprung am Scharnier (linke Kante), damit die Tuer aufgeht wie eine Tuer. */
  private readonly hinge = new Container();
  private readonly leaf: Sprite;
  private readonly dial: Sprite;
  private readonly wheel: Sprite;

  private readonly size: number;
  private open = false;
  /** 0 = leer, 1 = randvoll. Steuert, welche Muenzstufe sichtbar ist. */
  private fill = 0;

  constructor(options: VaultOptions) {
    this.sheet = options.sheet;
    this.size = options.size;
    this.onSound = options.onSound ?? (() => undefined);

    const scale = options.size / 240; // `vault/frame` ist 240 px breit.

    this.frame = this.sprite('vault/frame');
    this.frame.scale.set(scale);

    this.coins = this.sprite('vault/coins1');
    this.coins.anchor.set(0.5, 1);
    this.coins.scale.set(scale * 0.9);
    this.coins.position.set(0, options.size * 0.3);
    this.coins.visible = false;

    /*
     * Die Tuer schwingt um ihre **linke Kante** auf. In 2D geht das nicht ueber eine
     * Drehung — die wuerde das Blatt aus der Ebene kippen und ist ohne Perspektive nur
     * schief. Stattdessen sitzt das Scharnier links, und das Oeffnen staucht den ganzen
     * Container auf `scale.x`. Genau so, wie eine Tuer aussieht, die sich vom Betrachter
     * wegdreht.
     *
     * Zahlenkranz und Griffrad haengen mit im Scharnier: Sie stauchen sich mit, was den
     * Perspektiveneindruck traegt.
     */
    this.leaf = this.sprite('vault/leaf');
    this.leaf.scale.set(scale);
    this.leaf.anchor.set(0, 0.5);
    this.leaf.position.set(0, 0);

    this.dial = this.sprite('vault/dial');
    this.dial.scale.set(scale);
    this.dial.position.set(options.size / 2, 0);

    this.wheel = this.sprite('vault/wheel');
    this.wheel.scale.set(scale);
    this.wheel.position.set(options.size / 2, 0);

    this.hinge.position.set(-options.size / 2, 0);
    this.hinge.addChild(this.leaf, this.dial, this.wheel);

    this.view.addChild(this.frame, this.coins, this.hinge);
  }

  private sprite(frame: string): Sprite {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im Atlas.`);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  setPosition(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /**
   * Fuellstand 0..1. Der Stapel springt in fuenf Stufen — ein stufenlos wachsender
   * Haufen waere auf einem Handy nicht als Unterschied lesbar.
   */
  setFill(fill: number): void {
    this.fill = Math.max(0, Math.min(1, fill));
    const stage = Math.ceil(this.fill * COIN_STAGES);
    if (stage === 0) {
      this.coins.visible = false;
      return;
    }
    this.coins.visible = this.open;
    const texture = this.sheet.textures[`vault/coins${stage}`];
    if (texture) this.coins.texture = texture;
  }

  getFill(): number {
    return this.fill;
  }

  /**
   * Oeffnet den Tresor: Das Zahlenrad dreht dreimal, dann schwingt die Tuer auf und gibt
   * den Muenzstapel frei (GDD §4.3, Intro).
   */
  openDoor(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.open) return timeline;
    this.open = true;

    timeline
      .call(() => this.onSound('vault_dial'))
      .to(this.dial, { rotation: Math.PI * 6, duration: 1.1, ease: 'power2.inOut' })
      .to(this.wheel, { rotation: Math.PI * 2, duration: 0.6, ease: 'back.in(1.4)' }, '-=0.3')
      .call(() => this.onSound('vault_open'))
      .to(this.hinge.scale, { x: 0.16, duration: 0.7, ease: MOTION.easeSnappy })
      .to(this.hinge, { rotation: -0.06, duration: 0.7, ease: MOTION.easeSnappy }, '<')
      .call(() => {
        this.coins.visible = this.fill > 0;
        this.onSound('coin_shimmer');
      })
      .fromTo(
        this.coins,
        { alpha: 0, y: this.size * 0.36 },
        { alpha: 1, y: this.size * 0.3, duration: 0.35, ease: 'back.out(2)' }
      );

    return timeline;
  }

  /** Schliesst die Tuer — der Knall am Ende der Show (GDD §4.3, Outro). */
  closeDoor(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (!this.open) return timeline;
    this.open = false;

    timeline
      .to(this.coins, { alpha: 0, duration: 0.2 })
      .call(() => {
        this.coins.visible = false;
      })
      .to(this.hinge.scale, { x: 1, duration: 0.4, ease: 'power3.in' })
      .to(this.hinge, { rotation: 0, duration: 0.4, ease: 'power3.in' }, '<')
      .call(() => this.onSound('vault_close'))
      .to(this.wheel, { rotation: 0, duration: 0.5, ease: 'back.out(2)' });

    return timeline;
  }

  /** Der Tresor waechst: Muenzen regnen rein, die Tuer wackelt kurz ("zu voll"). */
  grow(toFill: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      .call(() => {
        this.setFill(toFill);
        this.onSound('coin_shimmer');
      })
      .fromTo(
        this.coins,
        { y: this.size * 0.42, alpha: 0 },
        { y: this.size * 0.3, alpha: 1, duration: 0.4, ease: 'back.out(2.4)' }
      )
      .to(this.view, { rotation: 0.03, duration: 0.08, yoyo: true, repeat: 3 })
      .set(this.view, { rotation: 0 });
    return timeline;
  }

  /** Der Tresor wird geleert — der Reset nach jeder Runde mit Dieb. */
  drain(toFill: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      .to(this.coins, { y: this.size * 0.5, alpha: 0, duration: 0.35, ease: 'power2.in' })
      .call(() => {
        this.setFill(toFill);
        this.onSound('cash_register');
      })
      .fromTo(this.coins, { alpha: 0 }, { alpha: 1, duration: 0.25 })
      .set(this.coins, { y: this.size * 0.3 });
    return timeline;
  }

  /** Der Jackpot: Der Tresor blaeht sich auf und platzt (GDD §4.4, jackpot_burst). */
  burst(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    timeline
      .to(this.view.scale, { x: 1.18, y: 1.12, duration: 0.5, ease: 'power2.in' })
      .to(this.view.scale, { x: 0.94, y: 1.06, duration: 0.08 })
      .call(() => this.onSound('vault_open'))
      .to(this.view.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
    return timeline;
  }

  /** Ausgangszustand: Tuer zu, Rad und Kranz auf null. */
  reset(): void {
    gsap.killTweensOf([
      this.view,
      this.view.scale,
      this.hinge,
      this.hinge.scale,
      this.dial,
      this.wheel,
      this.coins,
    ]);
    this.open = false;
    this.view.rotation = 0;
    this.view.scale.set(1);
    this.hinge.rotation = 0;
    this.hinge.scale.set(1);
    this.dial.rotation = 0;
    this.wheel.rotation = 0;
    this.coins.alpha = 1;
    this.coins.position.set(0, this.size * 0.3);
    this.coins.visible = false;
  }

  destroy(): void {
    gsap.killTweensOf([
      this.view,
      this.view.scale,
      this.hinge,
      this.hinge.scale,
      this.dial,
      this.wheel,
      this.coins,
    ]);
    this.view.destroy({ children: true });
  }
}
