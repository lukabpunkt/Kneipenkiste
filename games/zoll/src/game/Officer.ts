/**
 * Der Zollbeamte (Art Direction §5.2) — Shotling in Uniform.
 *
 * Schirmmütze in Spielerfarbe, grau-blaue Jacke mit Epauletten, Klemmbrett in der Hand,
 * bei Bedarf Trillerpfeife und Schnurrbart. Er steht rechts neben dem Röntgengerät.
 *
 * Sein Auftritt trägt eine Regel aus CLAUDE.md: Auf den öffentlichen Screens muss ohne
 * Erklärung klar sein, wer tippen darf. Die Mütze in seiner Farbe ist der Teil davon,
 * der auf der Bühne passiert.
 */

import gsap from 'gsap';
import { LAYOUT, MUSTACHE_CHANCE, type ColorId, type OfficerFace } from '@/config/theme';
import type { RandomSource } from '@/core/rng';
import { Shotling, type ShotlingOptions } from './Shotling';
import type { Sprite } from 'pixi.js';

export interface OfficerOptions {
  sheet: ShotlingOptions['sheet'];
  colorId: ColorId;
  rng: RandomSource;
  lowEffects?: boolean;
  height?: number;
}

export type ClipboardMark = 'check' | 'cross' | 'crumple';

export class Officer extends Shotling {
  private readonly clipboard: Sprite;
  private readonly whistle: Sprite;

  constructor(options: OfficerOptions) {
    super({
      sheet: options.sheet,
      colorId: options.colorId,
      rng: options.rng,
      height: options.height ?? LAYOUT.officerHeight,
      /* Die Mütze wird getintet — sie trägt seine Spielerfarbe. */
      hat: 'hats/cap_customs',
      face: 'stern',
      ...(options.lowEffects === undefined ? {} : { lowEffects: options.lowEffects }),
    });

    this.setHatTint();
    this.attach('torso', 'accessories/jacket', { anchorY: 1 });
    this.clipboard = this.attach('hand', 'accessories/clipboard');

    this.whistle = this.attach('neck', 'accessories/whistle');
    this.whistle.visible = false;

    if (options.rng.chance(MUSTACHE_CHANCE)) {
      const mustache = this.attach('neck', 'accessories/mustache');
      /* Der Bart sitzt im Gesicht, nicht am Hals — der Hals-Slot ist nur der Anker. */
      mustache.position.set(0, -66);
    }
  }

  /** Die Mütze ist weiß gezeichnet und bekommt die Spielerfarbe. */
  private setHatTint(): void {
    const hat = this.head.children.at(-1);
    if (hat && 'tint' in hat) {
      (hat as Sprite).tint = 0xffffff;
    }
  }

  override setFace(face: OfficerFace | string): void {
    super.setFace(face);
  }

  /** Hakt ab, streicht durch oder zerknüllt das Blatt (Art Direction §4.5). */
  clipboardMark(kind: ClipboardMark): gsap.core.Timeline {
    const timeline = gsap.timeline();
    switch (kind) {
      case 'check':
        timeline.to(this.clipboard, { rotation: -0.2, duration: 0.12, yoyo: true, repeat: 1 });
        break;
      case 'cross':
        timeline.to(this.clipboard, { x: 6, duration: 0.06, yoyo: true, repeat: 5 });
        break;
      case 'crumple':
        timeline
          .to(this.clipboard.scale, { x: 0.7, y: 0.7, duration: 0.18, ease: 'power2.in' })
          .to(this.clipboard.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' });
        break;
    }
    return timeline;
  }

  /** Pfeift: Pfeife erscheint, Kopf ruckt. */
  blowWhistle(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.whistle.visible = true;
    timeline
      .to(this.head, { rotation: -0.12, duration: 0.08, ease: 'back.out(3)' })
      .to(this.head, { rotation: 0, duration: 0.2, ease: 'elastic.out(1,0.5)' })
      .call(() => {
        this.whistle.visible = false;
      });
    return timeline;
  }
}
