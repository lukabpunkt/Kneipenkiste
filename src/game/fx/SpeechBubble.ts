/**
 * Sprechblase über einem Koffer (Art Direction §4.6).
 *
 * Sie trägt das Bestechungsangebot: „Ich gebe dir 2 zu verteilen, wenn du mich nicht
 * öffnest." Bewusst auf der Bühne und nicht im DOM — das Angebot gehört zum Reisenden,
 * nicht zum HUD des Beamten, und der Unterschied ist auf einem Handy in der Tischmitte
 * genau das, was man sehen muss.
 */

import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { FONTS, UI_COLORS } from '@/config/theme';

export interface SpeechBubbleOptions {
  text: string;
  /** Maximale Breite in Welteinheiten. */
  maxWidth?: number;
}

export class SpeechBubble {
  readonly view = new Container();

  constructor(options: SpeechBubbleOptions) {
    const label = new Text({
      text: options.text,
      style: {
        fontFamily: FONTS.body,
        fontSize: 22,
        fontWeight: '800',
        fill: UI_COLORS.ink,
        wordWrap: true,
        wordWrapWidth: options.maxWidth ?? 260,
        align: 'center',
      },
    });
    label.anchor.set(0.5);

    const padX = 18;
    const padY = 12;
    const width = label.width + padX * 2;
    const height = label.height + padY * 2;

    const bubble = new Graphics()
      .roundRect(-width / 2, -height, width, height, 14)
      .fill(UI_COLORS.paper)
      .stroke({ color: UI_COLORS.ink, width: 5 });

    /* Der Zipfel zeigt nach unten auf den Koffer. */
    bubble
      .moveTo(-12, 0)
      .lineTo(0, 16)
      .lineTo(12, 0)
      .fill(UI_COLORS.paper)
      .stroke({ color: UI_COLORS.ink, width: 5 });

    label.position.set(0, -height / 2);

    this.view.addChild(bubble, label);
    this.view.eventMode = 'none';
    this.view.scale.set(0);
  }

  position(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /** Pop-In mit Overshoot — eine Sprechblase, die einblendet, wirkt wie ein Gedanke. */
  show(): gsap.core.Timeline {
    return gsap.timeline().to(this.view.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.6)' });
  }

  hide(): gsap.core.Timeline {
    return gsap
      .timeline({ onComplete: () => this.destroy() })
      .to(this.view.scale, { x: 0, y: 0, duration: 0.18, ease: 'back.in(2)' });
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
