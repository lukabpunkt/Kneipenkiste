/**
 * Spielt die Hinweise in der Zollhalle ab (Architektur §6).
 *
 * M2: die Koffer-Bewegung aus `Suitcase.playHint()` plus das Icon, das danach hängen
 * bleibt. Die sechs ausgearbeiteten Hinweis-Sequenzen — Tropfen, Feder, Waldi — kommen
 * in M3; das Timing steht schon jetzt in `choreo.ts`, damit der Rhythmus derselbe bleibt.
 *
 * Der Director **inszeniert nur**. Welcher Koffer welchen Hinweis bekommt, hat der
 * Regelkern längst entschieden, und ob der Hinweis stimmt, erfährt der Director nie.
 */

import gsap from 'gsap';
import { HALL, HINTS } from '@/config/choreo';
import type { PublicHint, PublicRound } from '@/core/publicView';
import type { HallView } from './HallView';

export class HintDirector {
  private readonly view: HallView;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView) {
    this.view = view;
  }

  /** Die Koffer rollen ein — einmal pro Runde, bevor der erste Hinweis läuft. */
  rollIn(view: PublicRound): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.view.hall.runBelt(true);

    view.suitcases.forEach((suitcase, index) => {
      const node = this.view.suitcaseOf(suitcase.playerId);
      if (!node) return;
      timeline.add(node.rollIn(node.view.x, HALL.suitcaseRollIn), index * HALL.suitcaseStagger);
    });

    timeline.call(() => this.view.hall.runBelt(false));
    return timeline;
  }

  /**
   * Spielt alle Hinweise nacheinander ab.
   *
   * `onHintShown` meldet jeden abgeschlossenen Hinweis nach oben — der Screen setzt dann
   * sein Icon. Erst danach, nie vorher: Vor der Animation weiß der Tisch nichts.
   */
  play(hints: readonly PublicHint[], onHintShown: (hint: PublicHint) => void): gsap.core.Timeline {
    this.stop();

    const timeline = gsap.timeline();
    timeline.to({}, { duration: HALL.beforeHints });

    for (const hint of hints) {
      const node = this.view.suitcaseOf(hint.suitcaseOf);
      if (!node) continue;

      timeline.add(node.playHint(hint.type, HINTS.duration));
      timeline.call(() => onHintShown(hint));
      timeline.to({}, { duration: HINTS.gap });
    }

    this.timeline = timeline;
    return timeline;
  }

  /** Waldis Auftritt im Spürhund-Modus: hinlaufen, schnüffeln, bellen oder nicht. */
  dogHint(suitcaseOf: string, barks: boolean): gsap.core.Timeline {
    const node = this.view.suitcaseOf(suitcaseOf);
    const timeline = gsap.timeline();
    if (!node) return timeline;

    timeline
      .add(this.view.waldi.runTo(node.view.x, 0.7))
      .add(this.view.waldi.sniff())
      .add(barks ? this.view.waldi.bark() : this.view.waldi.wag(2));

    return timeline;
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
  }
}
