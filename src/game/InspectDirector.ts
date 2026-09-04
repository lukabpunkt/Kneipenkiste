/**
 * Inszeniert eine Kontrolle (Architektur §6).
 *
 * Ablauf: Tap → Board sperren → Koffer fährt ins Gerät → Scan mit Stall bei 50 % →
 * Ergebnis → Banner → Board wieder frei.
 *
 * **Reaktion vor Konsequenz** (Art Direction §7): Zuerst das Gesicht des Reisenden, dann
 * der Alarm bzw. der Stempel, dann das Banner. Wer die Reihenfolge dreht, nimmt der
 * Sequenz ihre Pointe — man sieht das Ergebnis, bevor man den Menschen sieht, der es
 * abbekommt.
 *
 * M2 spielt einen einfachen Ausgang; die sechs Röntgen-Sequenzen kommen in M4.
 */

import gsap from 'gsap';
import { XRAY, XRAY_LABELS } from '@/config/choreo';
import { LAYOUT } from '@/config/theme';
import type { InspectResult, ItemSet } from '@/core/types';
import type { HallView } from './HallView';

export class InspectDirector {
  private readonly view: HallView;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView) {
    this.view = view;
  }

  /**
   * Spielt eine Kontrolle. Die Promise löst auf, wenn das Banner stand — der Screen
   * schickt dann `resultShown` an die FSM.
   */
  play(result: InspectResult, itemSet: ItemSet): gsap.core.Timeline {
    this.stop();
    this.view.lock(true);

    const suitcase = this.view.suitcaseOf(result.suitcaseOf);
    const traveler = this.view.travelerOf(result.suitcaseOf);
    const officer = this.view.officer;
    const timeline = gsap.timeline({
      onComplete: () => {
        this.view.lock(false);
      },
    });

    if (!suitcase) return timeline;
    const homeX = suitcase.view.x;

    /* --- Der Koffer fährt ins Gerät --- */
    this.view.hall.runBelt(true);
    this.view.highlight(result.suitcaseOf, true);
    timeline.add(this.view.camera.toXray(), 0);
    timeline.add(suitcase.travelIntoMachine(LAYOUT.machine.x - 40, XRAY.travelIn), 0.1);
    timeline.call(() => this.view.hall.runBelt(false));

    /* --- Der Scan. Bis er durch ist, ist nichts zu erkennen. --- */
    const scan = this.view.xray.scan({
      amount: result.kind === 'clean' ? 0 : result.amount,
      itemSet,
      ...(result.kind === 'diplomat' ? { diplomat: true } : {}),
    });
    timeline.add(scan, `>${XRAY.powerUp}`);

    /*
     * Während des Scans steigt der Schweiß. Das ist die einzige Information, die die
     * Bühne vor dem Ergebnis preisgibt — und sie ist bewusst nutzlos: Ein Reisender
     * schwitzt, weil er kontrolliert wird, nicht weil er schuldig ist.
     */
    if (traveler) {
      timeline.call(() => traveler.sweat(1), undefined, `${XRAY_LABELS.scanStart}`);
      timeline.call(() => traveler.sweat(2), undefined, `${XRAY_LABELS.stall}`);
    }

    /* --- Reaktion vor Konsequenz --- */
    timeline.addLabel(XRAY_LABELS.face);
    if (traveler) {
      timeline.call(() => {
        if (result.kind === 'caught') traveler.sweat(3);
        else if (result.kind === 'clean') traveler.beOutraged();
        else traveler.beSmug();
      });
    }
    timeline.to({}, { duration: XRAY.faceReaction });

    /* --- Konsequenz --- */
    timeline.addLabel(XRAY_LABELS.verdict);
    timeline.call(() => {
      switch (result.kind) {
        case 'caught':
          officer.setFace('triumph');
          break;
        case 'clean':
          officer.setFace('blush');
          break;
        case 'diplomat':
          officer.setFace('facepalm');
          break;
      }
    });

    if (result.kind === 'caught') {
      timeline.add(this.view.camera.shake(), '<');
      timeline.add(officer.blowWhistle(), '<');
      timeline.add(suitcase.openCaught(), '<');
    } else if (result.kind === 'clean') {
      timeline.add(officer.clipboardMark('cross'), '<');
      timeline.add(suitcase.openClean(), '<');
    } else {
      timeline.add(officer.clipboardMark('crumple'), '<');
    }

    timeline.to({}, { duration: XRAY.verdict });

    /* --- Banner --- */
    timeline.addLabel(XRAY_LABELS.banner);

    /*
     * Die Kamera bleibt auf dem Monitor, solange das Banner steht. Fährt sie schon
     * währenddessen zurück, rutscht das Röntgenbild aus dem Bild, bevor jemand es gelesen
     * hat — und genau dieses Bild ist der Moment, für den das Spiel gebaut ist.
     */
    timeline.to({}, { duration: XRAY.bannerHold });

    timeline.call(() => {
      this.view.highlight(result.suitcaseOf, false);
      this.view.camera.reset();
    });
    timeline.add(suitcase.returnFromMachine(homeX, XRAY.travelIn * 0.8));

    this.timeline = timeline;
    return timeline;
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
    this.view.lock(false);
  }
}
