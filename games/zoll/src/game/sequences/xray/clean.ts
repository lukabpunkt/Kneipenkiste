/**
 * Die drei Röntgen-Sequenzen für „sauber" — und das Diplomaten-Overlay (GDD §4.1).
 *
 * Der Beamte hat danebengegriffen und trinkt dafür zwei. Das ist die Hälfte des Spiels,
 * die niemand erwartet: Wer zu viel kontrolliert, zahlt. Deshalb sind diese drei nicht
 * einfach „nichts passiert", sondern eigene Pointen — Teddy, Tasse, Ente mit Schleife.
 *
 * Dieselbe Reihenfolge wie bei den Fängen (Art Direction §7): erst das Gesicht des
 * Reisenden, dann der Stempel, dann das Banner. Nur ist das Gesicht hier empört statt
 * verschwitzt, und der Stempel landet auf dem Beamten.
 */

import gsap from 'gsap';
import { play } from '@/audio/AudioManager';
import { XRAY, XRAY_LABELS } from '@/config/choreo';
import { LAYOUT } from '@/config/theme';
import { t } from '@/core/i18n';
import type { Sequence, SequenceContext } from '../Sequence';

function reaction(timeline: gsap.core.Timeline, face: () => void): void {
  timeline.addLabel(XRAY_LABELS.face, 0);
  timeline.call(face);
  timeline.to({}, { duration: XRAY.faceReaction });
  timeline.addLabel(XRAY_LABELS.verdict);
}

/**
 * Der Stempel „BELÄSTIGUNG" landet auf dem **Beamten**, nicht auf dem Koffer.
 *
 * Das ist der ganze Punkt: Nicht der Reisende hat etwas falsch gemacht.
 */
function harassment(ctx: SequenceContext, timeline: gsap.core.Timeline): void {
  timeline.add(
    ctx.fx.stamp(
      LAYOUT.officer.x,
      LAYOUT.officer.y - 210,
      'harassment',
      t('gate.stampHarassment'),
      ctx.rng
    ),
    '<0.1'
  );
  timeline.addLabel(XRAY_LABELS.banner);
}

/* ------------------------------------------------------------------ */
/* clean_teddy                                                         */
/* ------------------------------------------------------------------ */

/**
 * Im Koffer liegt ein Teddy. Der Reisende drückt ihn an die Brust, der Beamte wird rot,
 * das Publikum macht „Aww".
 *
 * Die wärmste der drei — und die, die am meisten wehtut, wenn man sie ausgelöst hat.
 */
export const CleanTeddy: Sequence = {
  id: 'clean_teddy',
  kind: 'xrayClean',
  weight: 1.1,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.beOutraged();
      play('crowd_aww');
    });

    timeline.add(ctx.suitcase.openClean());
    timeline.call(() => {
      ctx.officer.setFace('blush');
      play('ui_tap');
    });

    /* Der Teddy an die Brust: beide Arme nach innen, kurzes Wiegen. */
    if (ctx.traveler) {
      const rig = ctx.traveler.rig;
      timeline.to(rig.armL, { rotation: -0.9, duration: 0.24, ease: 'back.out(2)' }, '<');
      timeline.to(rig.armR, { rotation: 0.9, duration: 0.24, ease: 'back.out(2)' }, '<');
      timeline.call(() => ctx.traveler?.setFace('happy'));
      timeline.to(rig.body, { rotation: 0.08, duration: 0.35, yoyo: true, repeat: 1, ease: 'sine.inOut' });
      timeline.to([rig.armL, rig.armR], { rotation: 0.2, duration: 0.3 }, '<0.3');
    }

    /* Der Beamte schrumpft ein bisschen — Scham als Squash. */
    timeline.to(ctx.officer.rig.body.scale, { y: 0.94, duration: 0.2, ease: 'power2.in' }, '<0.2');
    timeline.to(ctx.officer.rig.body.scale, { y: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' });
    timeline.add(ctx.officer.clipboardMark('cross'), '<');

    harassment(ctx, timeline);
    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* clean_mug                                                           */
/* ------------------------------------------------------------------ */

/**
 * Eine Tasse „Weltbester Zollbeamter". Er starrt sie an, zittert, trinkt.
 *
 * Der trockenste der drei Witze — und der einzige, in dem der Beamte selbst die Pointe
 * ausspricht, indem er sie schluckt.
 */
export const CleanMug: Sequence = {
  id: 'clean_mug',
  kind: 'xrayClean',
  weight: 1,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.beSmug();
      play('ui_confirm');
    });

    timeline.add(ctx.suitcase.openClean());

    /* Er starrt: Der Kopf neigt sich, sonst passiert erst mal nichts. Das ist die Pause. */
    timeline.call(() => ctx.officer.setFace('suspicious'));
    timeline.to(ctx.officer.rig.head, { rotation: 0.18, duration: 0.3, ease: 'power2.out' });
    timeline.to({}, { duration: 0.28 });

    /* Dann das Zittern — klein und schnell, wie unterdrückter Ärger. */
    timeline.call(() => {
      ctx.officer.setFace('blush');
      play('crowd_laugh');
    });
    timeline.to(ctx.officer.view, {
      x: `+=4`,
      duration: 0.045,
      yoyo: true,
      repeat: 7,
      ease: 'none',
    });

    /* Und er trinkt: einmal ansetzen, Kopf zurück. */
    timeline.to(ctx.officer.rig.head, { rotation: -0.42, duration: 0.28, ease: 'power2.inOut' });
    timeline.call(() => play('duck_squeak', 0, -6));
    timeline.to(ctx.officer.rig.head, { rotation: 0, duration: 0.32, ease: 'power2.inOut' });
    timeline.add(ctx.officer.clipboardMark('crumple'), '<');

    harassment(ctx, timeline);
    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* clean_duck_bow                                                      */
/* ------------------------------------------------------------------ */

/**
 * Eine einzige Gummiente mit Schleife — legal, weil es nur eine ist. „Das ist Rudi. Er
 * reist mit mir."
 *
 * Der Gag hängt an der Zahl: Sechs Enten wären Schmuggel, eine ist ein Haustier. Das ist
 * das ganze Spiel in einem Bild.
 */
export const CleanDuckBow: Sequence = {
  id: 'clean_duck_bow',
  kind: 'xrayClean',
  weight: 1,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.setFace('happy');
      play('duck_squeak');
    });

    timeline.add(ctx.suitcase.openClean());
    timeline.call(() => {
      ctx.officer.setFace('blush');
      play('crowd_aww');
    });

    /* Er drückt sich die Ente an die Stirn — Kopf nach unten, kurz halten. */
    timeline.to(ctx.officer.rig.head, { y: '+=10', rotation: -0.12, duration: 0.26, ease: 'power2.out' });
    timeline.call(() => play('duck_squeak', 0, 4));
    timeline.to({}, { duration: 0.3 });
    timeline.to(ctx.officer.rig.head, { y: '-=10', rotation: 0, duration: 0.3, ease: 'back.out(1.8)' });

    if (ctx.traveler) {
      timeline.add(ctx.traveler.wave(), '<0.1');
    }
    timeline.add(ctx.officer.clipboardMark('cross'), '<');

    harassment(ctx, timeline);
    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* diplomat_pass                                                       */
/* ------------------------------------------------------------------ */

/**
 * Das Diplomaten-Overlay (GDD §3.7 / §4.1).
 *
 * Der Alarm **setzt an und bricht ab** — genau dieser Bruch ist der Witz. Danach rollt
 * der rote Teppich aus, der Reisende geht mit seiner Ware durch, und der Beamte salutiert
 * unfreiwillig.
 *
 * Es ist ein `xrayOverlay` und kein `xrayCaught`: Es **ersetzt** die Fang-Sequenz
 * vollständig, statt sie zu ergänzen. Ein Diplomat wird nie erwischt (Regelkern-Invariante).
 */
export const DiplomatPass: Sequence = {
  id: 'diplomat_pass',
  kind: 'xrayOverlay',
  weight: 1,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.sweat(1);
      /* Die Sirene beginnt … */
      play('siren_short');
      play('alarm_burst', 0.02);
    });

    timeline.add(ctx.fx.alarmLight(1, 0.26), '<');

    /* … und bricht ab. Plattenspieler-Stopp. */
    timeline.call(() => {
      play('record_scratch');
      ctx.traveler?.beSmug();
      ctx.officer.setFace('facepalm');
    });
    timeline.to({}, { duration: 0.32 });

    /* Der rote Teppich rollt aus. */
    timeline.call(() => play('red_carpet'));
    timeline.add(
      ctx.fx.rollOutCarpet(
        ctx.suitcase.view.x,
        LAYOUT.gate.x,
        LAYOUT.travelers.row + 6,
        0.55
      ),
      '<'
    );

    /* Der Diplomat geht — mit seiner Ware unterm Arm. */
    if (ctx.traveler) {
      timeline.add(ctx.traveler.walkThroughGate(LAYOUT.gate.x - 60, 0.7), '<0.2');
    }

    /*
     * Und der Beamte salutiert. Unfreiwillig: Der Arm geht hoch, bevor er es merkt,
     * und bleibt eine Spur zu lange oben.
     */
    timeline.to(ctx.officer.rig.armR, { rotation: -2.2, duration: 0.16, ease: 'back.out(3)' }, '<0.3');
    timeline.to({}, { duration: 0.32 });
    timeline.to(ctx.officer.rig.armR, { rotation: -0.2, duration: 0.3, ease: 'power2.inOut' });
    timeline.call(() => play('crowd_laugh'), undefined, '<');

    timeline.add(ctx.fx.rollUpCarpet(), '<0.2');
    timeline.addLabel(XRAY_LABELS.banner);

    return timeline;
  },
};

export const CLEAN_SEQUENCES: readonly Sequence[] = [CleanTeddy, CleanMug, CleanDuckBow];
export const OVERLAY_SEQUENCES: readonly Sequence[] = [DiplomatPass];
