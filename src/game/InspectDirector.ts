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
import { duckMusic, play, startBelt, stopBelt, unduckMusic } from '@/audio/AudioManager';
import { XRAY, XRAY_LABELS } from '@/config/choreo';
import { LAYOUT } from '@/config/theme';
import type { RandomSource } from '@/core/rng';
import type { InspectResult, ItemSet } from '@/core/types';
import type { HallView } from './HallView';
import { sequenceRegistry } from './sequences/registry';

/**
 * Welches peinliche Item die saubere Sequenz auspackt — und damit auch, welche Silhouette
 * im Röntgenbild liegt.
 */
function embarrassingFor(sequenceId: string): 'teddy' | 'mug' | 'duck_bow' {
  if (sequenceId === 'clean_mug') return 'mug';
  if (sequenceId === 'clean_duck_bow') return 'duck_bow';
  return 'teddy';
}

export class InspectDirector {
  private readonly view: HallView;
  private readonly rng: RandomSource;
  private timeline: gsap.core.Timeline | undefined;

  constructor(view: HallView, rng: RandomSource) {
    this.view = view;
    this.rng = rng;
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
    startBelt();
    duckMusic();
    this.view.highlight(result.suitcaseOf, true);

    timeline.add(this.view.camera.toXray(), 0);
    timeline.add(suitcase.travelIntoMachine(LAYOUT.machine.x - 40, XRAY.travelIn), 0.1);
    timeline.call(() => {
      this.view.hall.runBelt(false);
      stopBelt();
      play('xray_powerup');
    });

    /*
     * --- Die Sequenz wird **vor** dem Scan gewählt ---
     *
     * Nicht aus Ordnungsliebe: Bei einem sauberen Koffer zeigt der Monitor ein peinliches
     * Item, und danach packt die Sequenz genau dieses aus. Wählte man die Sequenz erst
     * nach dem Scan, zeigte das Röntgenbild einen Teddy und der Reisende drückte sich
     * eine Tasse an die Brust — das Bild hätte gelogen, und dieses Bild darf nie lügen.
     */
    const kind =
      result.kind === 'caught' ? 'xrayCaught' : result.kind === 'clean' ? 'xrayClean' : 'xrayOverlay';
    const sequence = sequenceRegistry().pick(kind, this.rng);

    /* --- Der Scan. Bis er durch ist, ist nichts zu erkennen. --- */
    const scan = this.view.xray.scan({
      amount: result.kind === 'clean' ? 0 : result.amount,
      itemSet,
      ...(result.kind === 'diplomat' ? { diplomat: true } : {}),
      ...(result.kind === 'clean' ? { embarrassing: embarrassingFor(sequence.id) } : {}),
    });
    timeline.add(scan, `>${XRAY.powerUp}`);
    timeline.call(() => play('scanline_loop'), undefined, `${XRAY_LABELS.scanStart}`);
    timeline.call(() => play('scan_stall'), undefined, `${XRAY_LABELS.stall}`);

    /*
     * Während des Scans steigt der Schweiß. Das ist die einzige Information, die die
     * Bühne vor dem Ergebnis preisgibt — und sie ist bewusst nutzlos: Ein Reisender
     * schwitzt, weil er kontrolliert wird, nicht weil er schuldig ist.
     */
    if (traveler) {
      timeline.call(() => traveler.sweat(1), undefined, `${XRAY_LABELS.scanStart}`);
      timeline.call(() => traveler.sweat(2), undefined, `${XRAY_LABELS.stall}`);
    }

    /*
     * --- Die Sequenz ---
     *
     * Sie beginnt bei `face` und hält damit die Regel "Reaktion vor Konsequenz" ein:
     * erst das Gesicht des Reisenden, dann Alarm oder Stempel, dann das Banner. Welche
     * Sequenz läuft, wählt die Registry — in M3 sind das noch Platzhalter, ab M4 die
     * sechs ausgearbeiteten.
     */
    timeline.addLabel(XRAY_LABELS.face);

    const ctx = this.view.sequenceContext(result.suitcaseOf, itemSet, result.amount, this.rng);
    if (ctx) {
      timeline.addLabel(XRAY_LABELS.verdict, `>${XRAY.faceReaction}`);
      timeline.add(sequence.build(ctx), XRAY_LABELS.face);
    }

    if (result.kind === 'caught') {
      timeline.add(this.view.camera.shake(), XRAY_LABELS.verdict);
    }

    /* --- Banner --- */
    timeline.addLabel(XRAY_LABELS.banner, `>${XRAY.verdict}`);

    /*
     * Die Kamera bleibt auf dem Monitor, solange das Banner steht. Fährt sie schon
     * währenddessen zurück, rutscht das Röntgenbild aus dem Bild, bevor jemand es gelesen
     * hat — und genau dieses Bild ist der Moment, für den das Spiel gebaut ist.
     */
    timeline.to({}, { duration: XRAY.bannerHold }, XRAY_LABELS.banner);

    timeline.call(() => {
      this.view.highlight(result.suitcaseOf, false);
      this.view.camera.reset();
      unduckMusic();
      officer.setFace('stern');
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
