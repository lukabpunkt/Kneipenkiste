/**
 * Der Trinker-Zaehler (Roadmap M4.3): eine Zahl, die ueber dem Kopf aufploppt.
 *
 * **Jede** Ergebnis-Inszenierung endet damit (Architektur §7). Das ist der Moment, in dem
 * aus einer Animation eine Ansage wird: Wer trinkt, und wieviel. Wer den weglaesst, hat
 * eine huebsche Show gebaut, aus der niemand ablesen kann, was jetzt passiert.
 *
 * Die Zaehler leben in einem **Pool**: Waehrend einer Session laufen dutzende davon, und
 * jeden neu zu bauen hiesse, im Loop zu allokieren (CLAUDE.md).
 */

import gsap from 'gsap';
import { Container, Text, TextStyle } from 'pixi.js';
import { FONTS, UI_COLORS } from '@/config/theme';

const STYLE = new TextStyle({
  fontFamily: FONTS.display,
  fontSize: 64,
  fill: UI_COLORS.paper,
  stroke: { color: UI_COLORS.ink, width: 10, join: 'round' },
  dropShadow: { color: UI_COLORS.ink, blur: 0, angle: Math.PI / 2, distance: 6, alpha: 1 },
});

export class SipCounterPool {
  readonly view = new Container();
  private readonly free: Text[] = [];
  private readonly busy = new Set<Text>();

  /**
   * Laesst `sips` ueber einem Punkt aufploppen.
   *
   * Overshoot beim Erscheinen, dann steigt die Zahl langsam und fadet — sie soll
   * **gelesen** werden, nicht nur blinken.
   */
  pop(x: number, y: number, sips: number, delayMs = 0): gsap.core.Timeline {
    const label = this.take();
    label.text = `${sips}`;
    label.position.set(x, y);
    label.alpha = 0;
    label.scale.set(0.4);
    label.visible = true;

    return gsap
      .timeline({ delay: delayMs / 1000, onComplete: () => this.release(label) })
      .to(label, { alpha: 1, duration: 0.12 })
      .to(label.scale, { x: 1.15, y: 1.15, duration: 0.26, ease: 'back.out(3)' }, '<')
      .to(label.scale, { x: 1, y: 1, duration: 0.12 })
      .to(label, { y: y - 46, duration: 1.1, ease: 'power1.out' }, '<')
      .to(label, { alpha: 0, duration: 0.3 }, '-=0.3');
  }

  private take(): Text {
    const reused = this.free.pop();
    if (reused) {
      this.busy.add(reused);
      return reused;
    }
    const label = new Text({ text: '', style: STYLE });
    label.anchor.set(0.5);
    this.view.addChild(label);
    this.busy.add(label);
    return label;
  }

  private release(label: Text): void {
    label.visible = false;
    this.busy.delete(label);
    this.free.push(label);
  }

  /** Alle laufenden Zaehler sofort abraeumen (Rundenwechsel, Abbruch). */
  reset(): void {
    for (const label of this.busy) {
      gsap.killTweensOf([label, label.scale]);
      label.visible = false;
      this.free.push(label);
    }
    this.busy.clear();
  }

  destroy(): void {
    this.reset();
    this.view.destroy({ children: true });
  }
}
