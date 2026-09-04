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
import { GATE } from '@/config/choreo';
import { LAYOUT } from '@/config/theme';
import type { GateResult } from '@/core/types';
import type { HallView } from './HallView';

export class GateDirector {
  private readonly view: HallView;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView) {
    this.view = view;
  }

  /**
   * Spielt einen Durchgang. `onShown` meldet, wenn das Ergebnis steht — der Screen
   * setzt dann sein Banner.
   */
  play(entry: GateResult, onShown: () => void): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const suitcase = this.view.suitcaseOf(entry.suitcaseOf);
    const traveler = this.view.travelerOf(entry.suitcaseOf);
    if (!suitcase) return timeline;

    this.view.hall.setLight('amber');

    /* Der Reisende geht zur Schranke, sein Koffer fährt mit. */
    if (traveler) timeline.add(traveler.walkThroughGate(LAYOUT.gate.x - 60, GATE.walkUp), 0);
    timeline.to(suitcase.view, { x: LAYOUT.gate.x - 120, duration: GATE.walkUp, ease: 'none' }, 0);

    if (entry.kind === 'smuggler') {
      /* Der Stall: Ampel bleibt gelb, niemand weiß es schon. */
      timeline.to({}, { duration: GATE.smugglerStall });
      timeline.call(() => {
        this.view.hall.setLight('amber');
        traveler?.beSmug();
      });
      timeline.add(suitcase.openCaught());
      timeline.call(() => this.view.officer.setFace('facepalm'));
      timeline.add(this.view.officer.clipboardMark('crumple'), '<');
    } else {
      timeline.call(() => {
        this.view.hall.setLight('green');
        traveler?.setFace('happy');
      });
      if (traveler) timeline.add(traveler.wave(), '<');
      timeline.add(this.view.officer.clipboardMark('check'), '<');
    }

    timeline.to({}, { duration: GATE.stamp });
    timeline.call(onShown);
    timeline.to({}, { duration: GATE.gap });

    this.timeline = timeline;
    return timeline;
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
  }
}
