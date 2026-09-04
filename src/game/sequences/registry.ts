/**
 * Die Registry der laufenden Session.
 *
 * Eine Instanz für das ganze Spiel: Nur so kann sie sich merken, was zuletzt lief, und
 * Wiederholungen über Rundengrenzen hinweg vermeiden (Architektur §6).
 *
 * Die Röntgen-Sequenzen kommen in M4; bis dahin registriert `basicXray` zwei
 * Platzhalter, damit `InspectDirector` schon jetzt über die Registry geht und der
 * Wechsel später keine Aufruferseite anfasst.
 */

import gsap from 'gsap';
import { play } from '@/audio/AudioManager';
import { XRAY } from '@/config/choreo';
import { GATE_SEQUENCES } from './gate';
import { HINT_SEQUENCES } from './hints';
import { SequenceRegistry, type Sequence } from './Sequence';

/** Platzhalter, bis M4 die sechs Röntgen-Sequenzen liefert (Roadmap M3). */
const BasicCaught: Sequence = {
  id: 'basic_caught',
  kind: 'xrayCaught',
  weight: 1,
  build(ctx) {
    return gsap
      .timeline()
      .call(() => {
        ctx.traveler?.sweat(3);
        play('alarm_burst');
      })
      .to({}, { duration: XRAY.faceReaction })
      .add(ctx.suitcase.openCaught())
      .call(() => {
        ctx.fx.itemFountain(ctx.suitcase.view.x, ctx.suitcase.view.y - 60, ctx.itemSet, ctx.amount, ctx.rng);
        ctx.officer.setFace('triumph');
        play('items_fountain');
      })
      .add(ctx.officer.blowWhistle(), '<');
  },
};

const BasicClean: Sequence = {
  id: 'basic_clean',
  kind: 'xrayClean',
  weight: 1,
  build(ctx) {
    return gsap
      .timeline()
      .call(() => {
        ctx.traveler?.beOutraged();
        play('crowd_aww');
      })
      .to({}, { duration: XRAY.faceReaction })
      .add(ctx.suitcase.openClean())
      .call(() => ctx.officer.setFace('blush'))
      .add(ctx.officer.clipboardMark('cross'), '<');
  },
};

const DiplomatPass: Sequence = {
  id: 'diplomat_pass',
  kind: 'xrayOverlay',
  weight: 1,
  build(ctx) {
    return gsap
      .timeline()
      .call(() => {
        ctx.traveler?.beSmug();
        /* Die Sirene setzt an und bricht ab — der Plattenspieler-Stopp (GDD §4.1). */
        play('siren_short');
        play('record_scratch', 0.18);
      })
      .to({}, { duration: XRAY.faceReaction })
      .call(() => {
        ctx.officer.setFace('facepalm');
        play('red_carpet', 0.1);
      })
      .add(ctx.officer.clipboardMark('crumple'), '<');
  },
};

let instance: SequenceRegistry | undefined;

/** Die Registry der Session. */
export function sequenceRegistry(): SequenceRegistry {
  instance ??= new SequenceRegistry().register(
    ...HINT_SEQUENCES,
    ...GATE_SEQUENCES,
    BasicCaught,
    BasicClean,
    DiplomatPass
  );
  return instance;
}

/** Nur für Tests: frische Registry ohne Historie. */
export function resetSequenceRegistry(): void {
  instance = undefined;
}

export { BasicCaught, BasicClean, DiplomatPass };
