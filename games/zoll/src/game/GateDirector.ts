/**
 * Inszeniert die Schranke (Architektur §6, ADR-4).
 *
 * Saubere Koffer zuerst, Schmuggler zuletzt — der zweite Spannungsbogen nach der
 * Kontrolle. Schmuggler-Koffer bekommen vor dem Aufklappen einen Stall von 600 ms, in
 * dem die Ampel gelb bleibt: die halbe Sekunde, in der alle noch glauben, es sei nichts.
 *
 * Die vier ausgearbeiteten Schranken-Sequenzen kommen in M3.
 */

import gsap from 'gsap';
import type { GateResult, ItemSet } from '@/core/types';
import type { RandomSource } from '@/core/rng';
import type { HallView } from './HallView';
import { sequenceRegistry } from './sequences/registry';

export class GateDirector {
  private readonly view: HallView;
  private readonly rng: RandomSource;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView, rng: RandomSource) {
    this.view = view;
    this.rng = rng;
  }

  /**
   * Spielt einen Durchgang.
   *
   * Welche der beiden Varianten läuft, wählt die Registry gewichtet und ohne
   * Wiederholung — bei sieben Koffern hintereinander fiele zweimal derselbe Gag sofort
   * auf. `onShown` meldet, wenn das Ergebnis steht; der Screen setzt dann sein Banner.
   */
  play(entry: GateResult, itemSet: ItemSet, onShown: () => void): gsap.core.Timeline {
    const ctx = this.view.sequenceContext(entry.suitcaseOf, itemSet, entry.amount, this.rng);
    const timeline = gsap.timeline();
    if (!ctx) return timeline;

    const sequence = sequenceRegistry().pick(
      entry.kind === 'smuggler' ? 'gateSmuggler' : 'gateClean',
      this.rng
    );

    timeline.add(sequence.build(ctx));
    timeline.call(onShown);

    this.timeline = timeline;
    return timeline;
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
  }
}
