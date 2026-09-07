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
import { play, startBelt, stopBelt } from '@/audio/AudioManager';
import { HALL, HINTS } from '@/config/choreo';
import type { PublicHint, PublicRound } from '@/core/publicView';
import type { RandomSource } from '@/core/rng';
import type { ItemSet } from '@/core/types';
import type { HallView } from './HallView';
import { hintSequenceFor } from './sequences/hints';

export class HintDirector {
  private readonly view: HallView;
  private readonly rng: RandomSource;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView, rng: RandomSource) {
    this.view = view;
    this.rng = rng;
  }

  /** Die Koffer rollen ein — einmal pro Runde, bevor der erste Hinweis läuft. */
  rollIn(view: PublicRound): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.view.hall.runBelt(true);
    startBelt();

    view.suitcases.forEach((suitcase, index) => {
      const node = this.view.suitcaseOf(suitcase.playerId);
      if (!node) return;
      timeline.add(node.rollIn(node.view.x, HALL.suitcaseRollIn), index * HALL.suitcaseStagger);
      /* Der Anhänger klickt an, wenn der Koffer steht. */
      timeline.call(() => play('tag_clip'), undefined, index * HALL.suitcaseStagger + HALL.suitcaseRollIn);
    });

    timeline.call(() => {
      this.view.hall.runBelt(false);
      stopBelt();
    });
    return timeline;
  }

  /**
   * Spielt alle Hinweise nacheinander ab.
   *
   * `onHintShown` meldet jeden abgeschlossenen Hinweis nach oben — der Screen setzt dann
   * sein Icon. Erst danach, nie vorher: Vor der Animation weiß der Tisch nichts.
   */
  play(
    hints: readonly PublicHint[],
    itemSet: ItemSet,
    onHintShown: (hint: PublicHint) => void
  ): gsap.core.Timeline {
    this.stop();

    const timeline = gsap.timeline();
    timeline.to({}, { duration: HALL.beforeHints });

    for (const hint of hints) {
      /*
       * Der Kontext bekommt `amount: 0`. Eine Hinweis-Sequenz darf die Menge nicht
       * kennen — sie könnte sie sonst zeigen, und Hinweise sagen nichts über die Menge
       * (GDD §3.3, Design-Pfeiler 2).
       */
      const ctx = this.view.sequenceContext(hint.suitcaseOf, itemSet, 0, this.rng);
      if (!ctx) continue;

      timeline.add(hintSequenceFor(hint.type).build(ctx));
      timeline.call(() => onHintShown(hint));
      timeline.to({}, { duration: HINTS.gap });
    }

    this.timeline = timeline;
    return timeline;
  }

  /**
   * Waldis Auftritt im Spürhund-Modus: hinlaufen, schnüffeln — und bellen oder nicht.
   *
   * Das Bellen ist der einzige Hinweis im Spiel, der **nie lügt** (GDD §3.7). Deshalb
   * klingt es auch anders als alles andere: kurz, laut, zweimal.
   */
  dogHint(suitcaseOf: string, barks: boolean): gsap.core.Timeline {
    const node = this.view.suitcaseOf(suitcaseOf);
    const timeline = gsap.timeline();
    if (!node) return timeline;

    const home = this.view.waldi.view.x;

    timeline
      .add(this.view.waldi.runTo(node.view.x, HINTS.barkDuration * 0.6))
      .call(() => play('dog_sniff'))
      .add(this.view.waldi.sniff())
      .call(() => play(barks ? 'dog_bark' : 'ui_tap'))
      .add(barks ? this.view.waldi.bark() : this.view.waldi.wag(2))
      .add(this.view.waldi.runTo(home, HINTS.barkDuration * 0.6));

    return timeline;
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
  }
}
