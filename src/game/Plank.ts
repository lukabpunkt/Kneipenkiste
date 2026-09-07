/**
 * Ein Balken (Art Direction §4.1, GDD §4.2).
 *
 * Er kann genau vier Dinge, und drei davon sind die Show: knarren, brechen, zerbröseln.
 * Das Knarren ist dabei das wichtigste — **jeder** besetzte Balken knarrt, auch der
 * sichere, nur leiser (ADR-3). Ohne dieses Fake wüsste im Moment des Schritts jeder
 * sofort, wer fällt, und die zwei Sekunden Spannung wären tot.
 *
 * Texturwechsel statt eigener Sprites: normal, morsch und die zwei Bruchhälften liegen
 * im selben Atlas, also kostet der Wechsel keinen Batch.
 */

import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import type { PlankId } from '@/core/types';

/** Wie weit sich ein Balken bei voller Amplitude durchbiegt (Welteinheiten). */
const CREAK_SAG = 9;
/** Wie schnell er dabei schwingt. */
const CREAK_PERIOD_S = 0.46;

export interface PlankOptions {
  sheet: Spritesheet;
  id: PlankId;
  /** Mitte des Balkens in Welteinheiten. */
  x: number;
  y: number;
  width: number;
  /** Neigung, damit der Balken der Durchhang-Kurve folgt (Radiant). */
  rotation: number;
}

export class Plank {
  readonly view = new Container();
  readonly id: PlankId;
  readonly width: number;
  /** Ruhelage — `reset()` und die Knarr-Animation rechnen daraus. */
  readonly baseX: number;
  readonly baseY: number;

  private readonly board: Sprite;
  private readonly halfLeft: Sprite;
  private readonly halfRight: Sprite;
  private readonly normal: Texture;
  private readonly rotten: Texture;

  private creakTween: gsap.core.Tween | undefined;
  private broken = false;

  constructor(options: PlankOptions) {
    this.id = options.id;
    this.width = options.width;
    this.baseX = options.x;
    this.baseY = options.y;

    this.normal = options.sheet.textures['bridge/plank']!;
    this.rotten = options.sheet.textures['bridge/plank_rotten']!;

    this.board = new Sprite(this.normal);
    this.board.anchor.set(0.5);
    this.board.width = options.width;
    this.board.height = STAGE.plankHeight;

    /* Die zwei Bruchhälften warten unsichtbar — kein Nachladen mitten im Bruch. */
    this.halfLeft = new Sprite(options.sheet.textures['bridge/plank_half_left']);
    this.halfLeft.anchor.set(1, 0.5);
    this.halfLeft.width = options.width / 2;
    this.halfLeft.height = STAGE.plankHeight;
    this.halfLeft.visible = false;

    this.halfRight = new Sprite(options.sheet.textures['bridge/plank_half_right']);
    this.halfRight.anchor.set(0, 0.5);
    this.halfRight.width = options.width / 2;
    this.halfRight.height = STAGE.plankHeight;
    this.halfRight.visible = false;

    this.view.addChild(this.board, this.halfLeft, this.halfRight);
    this.view.position.set(options.x, options.y);
    this.view.rotation = options.rotation;
  }

  /** Wo ein Hiker auf diesem Balken steht (Welteinheiten, Oberkante). */
  standY(): number {
    return this.view.position.y - STAGE.plankHeight / 2;
  }

  /**
   * Knarren mit einer Amplitude aus dem Skript: 0.7 sicher, 1.0 Kollision,
   * 0.4 → 1.0 beim morschen Balken (ADR-3, `config/choreo.ts`).
   */
  creak(amplitude: number): void {
    this.stopCreak();
    this.creakTween = gsap.to(this.view, {
      y: this.baseY + CREAK_SAG * amplitude,
      duration: CREAK_PERIOD_S,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Die Amplitude mitten im Knarren ändern — der morsche Balken fällt so aus der Tarnung. */
  setCreakAmplitude(amplitude: number): void {
    if (this.creakTween) this.creak(amplitude);
  }

  stopCreak(): void {
    this.creakTween?.kill();
    this.creakTween = undefined;
    this.view.y = this.baseY;
  }

  /** Der Bruch: Der Balken reisst in der Mitte und die Hälften kippen weg. */
  snap(): gsap.core.Timeline {
    this.stopCreak();
    this.broken = true;
    this.board.visible = false;
    this.halfLeft.visible = true;
    this.halfRight.visible = true;

    const timeline = gsap.timeline();
    timeline
      .to(this.halfLeft, { rotation: 0.9, x: -8, y: 60, duration: 0.5, ease: 'power2.in' }, 0)
      .to(this.halfRight, { rotation: -0.9, x: 8, y: 60, duration: 0.5, ease: 'power2.in' }, 0)
      .to([this.halfLeft, this.halfRight], { alpha: 0, duration: 0.2 }, 0.35);
    return timeline;
  }

  /** Der morsche Balken zerbröselt, statt zu brechen — wie Keks (GDD §4.3). */
  crumble(): gsap.core.Timeline {
    this.stopCreak();
    this.broken = true;

    const timeline = gsap.timeline();
    timeline
      .to(this.board.scale, { y: 0.3, duration: 0.4, ease: 'power2.in' }, 0)
      .to(this.view, { y: this.baseY + 26, duration: 0.5, ease: 'power2.in' }, 0)
      .to(this.board, { alpha: 0, duration: 0.25 }, 0.3);
    return timeline;
  }

  /** Umschalten auf morsches Holz — erst im Reveal, vorher sieht man ihm nichts an. */
  showRotten(rotten: boolean): void {
    this.board.texture = rotten ? this.rotten : this.normal;
  }

  /** Ein Balken fault ab und fällt in die Schlucht (`all_safe_rot`). */
  rot(): gsap.core.Timeline {
    this.showRotten(true);
    const timeline = gsap.timeline();
    timeline
      .to(this.view, { rotation: this.view.rotation + 0.5, duration: 0.3, ease: 'power1.in' })
      .to(this.view, { y: STAGE.riverY, duration: 0.9, ease: 'power2.in' }, '<')
      .to(this.view, { alpha: 0, duration: 0.4 }, '-=0.4');
    return timeline;
  }

  isBroken(): boolean {
    return this.broken;
  }

  /** Zurück in die Ruhelage — die nächste Runde erbt keinen halb gebrochenen Balken. */
  reset(): void {
    this.stopCreak();
    this.broken = false;

    this.view.position.set(this.baseX, this.baseY);
    this.view.alpha = 1;

    this.board.visible = true;
    this.board.alpha = 1;
    this.board.scale.y = 1;
    this.board.texture = this.normal;

    for (const half of [this.halfLeft, this.halfRight]) {
      half.visible = false;
      half.alpha = 1;
      half.rotation = 0;
      half.position.set(0, 0);
    }
  }

  destroy(): void {
    this.stopCreak();
    this.view.destroy({ children: true });
  }
}
