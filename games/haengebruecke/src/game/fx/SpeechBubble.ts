/**
 * Sprechblasen (GDD §4.5, Art Direction §9).
 *
 * "Oh." ist die wichtigste davon: Sie steht über zwei Hikers, die gerade gemerkt haben,
 * dass sie auf demselben Balken stehen — und sie erscheint **immer** vor dem Bruch
 * (ADR-3). Der Rest ("Warum ich?!", "Ernsthaft?", "Puh.") kommentiert.
 *
 * Der Text kommt aus i18n, also durch PIXI-Text. Das kostet einen Draw-Batch, solange
 * eine Blase steht — vertretbar, weil nie mehr als eine gleichzeitig sichtbar ist und
 * eine Blase mit gebackenem Text nicht übersetzbar wäre.
 */

import { Container, NineSliceSprite, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { createStageText } from './text';

/** Innenabstand der Blase um den Text (Welteinheiten). */
const PADDING = { x: 26, y: 18 };
/** Der Zipfel unten braucht Platz, sonst sitzt der Text darauf. */
const TAIL = 22;

export interface BubbleOptions {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
}

export class SpeechBubbles {
  readonly view = new Container();

  constructor(private readonly sheet: Spritesheet) {}

  /**
   * Zeigt eine Blase und räumt sie selbst wieder ab.
   *
   * Die Timeline wird zurückgegeben, damit eine Sequenz sie einhängen kann — dann läuft
   * die Blase in Slow-Mo mit, statt daneben in Echtzeit zu blinken.
   */
  show(options: BubbleOptions, durationMs: number): gsap.core.Timeline {
    const bubble = new Container();

    const label = createStageText({
      text: options.text,
      fontSize: options.fontSize ?? 34,
      strokeWidth: 0,
    });

    /*
     * Neun-Scheiben statt Skalierung: Ein gestreckter Rahmen hat verzerrte Ecken, und die
     * Outline ist bei diesem Stil das halbe Bild (Art Direction §1).
     */
    const frame = new NineSliceSprite({
      texture: this.sheet.textures['fx/bubble']!,
      leftWidth: 30,
      topHeight: 30,
      rightWidth: 30,
      bottomHeight: 46,
    });
    frame.width = label.width + PADDING.x * 2;
    frame.height = label.height + PADDING.y * 2 + TAIL;
    frame.position.set(-frame.width / 2, -frame.height / 2);

    label.position.set(0, -TAIL / 2);

    bubble.addChild(frame, label);
    bubble.position.set(options.x, options.y);
    this.view.addChild(bubble);

    const timeline = gsap.timeline({
      onComplete: () => bubble.destroy({ children: true }),
    });
    timeline
      .fromTo(
        bubble.scale,
        { x: 0.3, y: 0.3 },
        { x: 1, y: 1, duration: 0.24, ease: 'back.out(2.6)' }
      )
      .to(bubble, { alpha: 1, duration: Math.max(0.05, durationMs / 1000 - 0.4) })
      .to(bubble, { alpha: 0, duration: 0.16 })
      .to(bubble.scale, { x: 0.85, y: 0.85, duration: 0.16 }, '<');
    return timeline;
  }

  reset(): void {
    this.view.removeChildren().forEach((child) => child.destroy({ children: true }));
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
