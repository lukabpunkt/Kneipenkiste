/**
 * Inszeniert die Bestechung (GDD §3.7, Art Direction §4.6).
 *
 * Der Reisende macht sein Angebot **öffentlich** — das ist der Punkt des Modus: Wer
 * besticht, wirkt schuldig, oder tut nur so. Deshalb steht das Angebot als Sprechblase
 * auf der Bühne, wo alle es sehen, und nicht als stille Zahl im HUD.
 *
 * Nimmt der Beamte an, klickt ein Vorhängeschloss auf den Koffer und die Tokens fliegen
 * zu ihm. Ab da ist der Koffer nicht mehr tippbar — sichtbar, nicht nur logisch.
 */

import gsap from 'gsap';
import { Sprite } from 'pixi.js';
import { play } from '@/audio/AudioManager';
import { LAYOUT, STAGE, colorById } from '@/config/theme';
import type { BribeAmount, PlayerId } from '@/core/types';
import { SpeechBubble } from './fx/SpeechBubble';
import type { HallView } from './HallView';

export class BribeDirector {
  private readonly view: HallView;
  private readonly bubbles = new Map<PlayerId, SpeechBubble>();

  constructor(view: HallView) {
    this.view = view;
  }

  /** Das Angebot erscheint über dem Koffer. */
  offer(from: PlayerId, amount: BribeAmount, text: string): gsap.core.Timeline {
    this.clearBubble(from);

    const suitcase = this.view.suitcaseOf(from);
    const timeline = gsap.timeline();
    if (!suitcase) return timeline;

    const bubble = new SpeechBubble({ text, maxWidth: 300 });

    /*
     * In die Bühne klemmen. Der erste und der letzte Koffer stehen nah am Rand — eine
     * Blase, die dort halb abgeschnitten wird, ist als Angebot nicht mehr zu lesen, und
     * ein öffentliches Angebot, das niemand lesen kann, ist keins (GDD §3.7).
     */
    const half = bubble.view.getLocalBounds().width / 2 + 12;
    const x = Math.min(STAGE.worldWidth - half, Math.max(half, suitcase.view.x));
    bubble.position(x, suitcase.view.y - suitcase.bounds.height - 30);
    this.view.fx.view.addChild(bubble.view);
    this.bubbles.set(from, bubble);

    timeline.call(() => play('ui_tap'));
    timeline.add(bubble.show());
    void amount;
    return timeline;
  }

  /**
   * Der Beamte nimmt an: Schloss klickt zu, die Tokens fliegen zu ihm.
   *
   * Die Münzen fliegen wirklich — eine Zahl, die sich irgendwo ändert, sieht am Tisch
   * niemand. Eine Bewegung von A nach B sehen alle.
   */
  accept(from: PlayerId, amount: BribeAmount): gsap.core.Timeline {
    const suitcase = this.view.suitcaseOf(from);
    const timeline = gsap.timeline();
    if (!suitcase) return timeline;

    timeline.add(this.hideBubble(from), 0);
    timeline.call(() => play('tag_clip'));
    timeline.add(suitcase.setBribed(), '<');

    const color = colorById(this.view.officerColorId);
    for (let i = 0; i < amount; i++) {
      const coin = new Sprite(suitcase.tagTexture);
      coin.anchor.set(0.5);
      coin.tint = color.hex;
      coin.scale.set(0.35);
      coin.position.set(suitcase.view.x, suitcase.view.y - 60);
      coin.eventMode = 'none';
      this.view.fx.view.addChild(coin);

      timeline.to(
        coin,
        {
          x: LAYOUT.officer.x,
          y: LAYOUT.officer.y - 120,
          duration: 0.5,
          ease: 'power2.in',
          onComplete: () => coin.destroy(),
        },
        0.1 + i * 0.09
      );
      timeline.to(coin.scale, { x: 0.1, y: 0.1, duration: 0.5 }, 0.1 + i * 0.09);
    }

    timeline.call(() => play('ui_confirm'), undefined, 0.45);
    return timeline;
  }

  /** Der Beamte lehnt ab: Die Blase platzt, sonst passiert nichts. */
  decline(from: PlayerId): gsap.core.Timeline {
    return gsap.timeline().add(this.hideBubble(from)).call(() => play('ui_tap'));
  }

  private hideBubble(from: PlayerId): gsap.core.Timeline {
    const bubble = this.bubbles.get(from);
    if (!bubble) return gsap.timeline();
    this.bubbles.delete(from);
    return bubble.hide();
  }

  private clearBubble(from: PlayerId): void {
    this.bubbles.get(from)?.destroy();
    this.bubbles.delete(from);
  }

  stop(): void {
    for (const bubble of this.bubbles.values()) bubble.destroy();
    this.bubbles.clear();
  }
}
