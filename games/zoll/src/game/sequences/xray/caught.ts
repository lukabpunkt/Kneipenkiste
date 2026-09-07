/**
 * Die drei Röntgen-Sequenzen für „erwischt" (GDD §4.1).
 *
 * Sie laufen **nach** dem Scan — der Monitor hat sein Bild fertig aufgebaut, und erst
 * dann passiert hier etwas. Die Reihenfolge ist in allen dreien dieselbe und nicht
 * verhandelbar (Art Direction §7):
 *
 *   1. `face`    — das Gesicht des Reisenden, 200 ms allein
 *   2. `verdict` — Alarm, Koffer auf, Ware fliegt
 *   3. `banner`  — der Text, den der Tisch liest
 *
 * Wer die Reihenfolge dreht, nimmt der Sequenz ihre Pointe: Man sieht das Ergebnis,
 * bevor man den Menschen sieht, den es trifft.
 *
 * Jede bleibt unter 5 s (Audit A4) und ist in einer Sekunde lesbar: Wer trinkt, wie viel,
 * und dass es schiefging.
 */

import gsap from 'gsap';
import { play } from '@/audio/AudioManager';
import { XRAY, XRAY_LABELS } from '@/config/choreo';
import { t } from '@/core/i18n';
import type { Sequence, SequenceContext } from '../Sequence';

/** Der gemeinsame Kopf: erst das Gesicht, dann alles andere. */
function reaction(timeline: gsap.core.Timeline, face: () => void): void {
  timeline.addLabel(XRAY_LABELS.face, 0);
  timeline.call(face);
  timeline.to({}, { duration: XRAY.faceReaction });
  timeline.addLabel(XRAY_LABELS.verdict);
}

/** Der gemeinsame Abschluss: Der Stempel knallt, dann steht das Banner. */
function busted(ctx: SequenceContext, timeline: gsap.core.Timeline): void {
  timeline.add(
    ctx.fx.stamp(
      ctx.suitcase.view.x,
      ctx.suitcase.view.y - 170,
      'busted',
      t('gate.stampBusted'),
      ctx.rng
    ),
    '<0.1'
  );
  timeline.addLabel(XRAY_LABELS.banner);
}

/* ------------------------------------------------------------------ */
/* caught_alarm_burst                                                  */
/* ------------------------------------------------------------------ */

/**
 * Sirene, Rotlicht, der Koffer springt auf, die Ware fliegt in einer Fontäne heraus —
 * und eine Ente trifft den Reisenden am Kopf.
 *
 * Die lauteste der drei. Sie ist der Standard, an dem sich die anderen beiden messen.
 */
export const AlarmBurst: Sequence = {
  id: 'caught_alarm_burst',
  kind: 'xrayCaught',
  weight: 1.2,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.sweat(3);
      play('crowd_gasp');
    });

    /* Alarm: Licht, Sirene, Pfeife — alles auf denselben Schlag. */
    timeline.call(() => {
      play('alarm_burst');
      play('siren_short', 0.12);
      ctx.officer.setFace('triumph');
    });
    timeline.add(ctx.fx.alarmLight(3, 0.9), '<');
    timeline.add(ctx.officer.blowWhistle(), '<0.15');

    /* Anticipation: Der Koffer duckt sich, bevor er aufspringt. */
    timeline.to(ctx.suitcase.view.scale, { y: '-=0.08', duration: 0.09, ease: 'power2.in' }, '<');
    timeline.add(ctx.suitcase.openCaught(), '>');

    timeline.call(() => {
      ctx.fx.itemFountain(
        ctx.suitcase.view.x,
        ctx.suitcase.view.y - 70,
        ctx.itemSet,
        ctx.amount,
        ctx.rng
      );
      play('items_fountain');
      play('duck_squeak', 0.22);
    });

    /*
     * Follow-Through: Der Reisende versucht zu fangen und wird getroffen. Der Kopf
     * ruckt später als der Körper — sonst sieht es aus, als hätte er es erwartet.
     */
    if (ctx.traveler) {
      const rig = ctx.traveler.rig;
      timeline.to(rig.armL, { rotation: -1.4, duration: 0.16, ease: 'back.out(3)' }, '<');
      timeline.to(rig.armR, { rotation: 1.4, duration: 0.16, ease: 'back.out(3)' }, '<0.04');
      timeline.call(() => ctx.traveler?.setFace('x_eyes'), undefined, '>0.18');
      timeline.to(rig.head, { rotation: 0.4, duration: 0.08, ease: 'power3.out' }, '<');
      timeline.to(rig.head, { rotation: 0, duration: 0.5, ease: 'elastic.out(1,0.35)' });
      timeline.to([rig.armL, rig.armR], { rotation: 0.2, duration: 0.3 }, '<');
    }

    timeline.call(() => play('crowd_laugh'), undefined, '<0.1');
    busted(ctx, timeline);

    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* caught_sweat_flood                                                  */
/* ------------------------------------------------------------------ */

/**
 * Der Reisende schwitzt immer stärker, eine Pfütze wächst, er rutscht aus — und der
 * Koffer fällt auf.
 *
 * Die leiseste der drei: kein Alarm, kein Rotlicht. Hier verrät sich jemand selbst,
 * und das ist ein anderer Witz als „erwischt".
 */
export const SweatFlood: Sequence = {
  id: 'caught_sweat_flood',
  kind: 'xrayCaught',
  weight: 1,

  build(ctx) {
    const timeline = gsap.timeline();
    const feetY = ctx.traveler ? ctx.traveler.view.y : ctx.suitcase.view.y;
    const headY = feetY - 150;
    const x = ctx.traveler ? ctx.traveler.view.x : ctx.suitcase.view.x;

    reaction(timeline, () => {
      ctx.traveler?.sweat(3);
      play('hint_drip');
    });

    /* Die Pfütze wächst, während der Schweiß hineinfällt. */
    const puddle = ctx.fx.puddle(x, feetY, 0.8);
    timeline.add(puddle.timeline, '<');
    for (let i = 0; i < 3; i++) {
      timeline.call(() => ctx.fx.sweat(x, headY, 3, ctx.rng), undefined, `<${i * 0.18}`);
    }

    timeline.call(() => {
      play('crowd_gasp');
      ctx.officer.setFace('suspicious');
    });

    /* Das Ausrutschen: Beine weg, kurzer Hit-Stop in der Luft, dann Aufprall. */
    if (ctx.traveler) {
      const rig = ctx.traveler.rig;
      timeline.to(rig.legL, { rotation: 1.5, duration: 0.14, ease: 'power3.out' });
      timeline.to(rig.legR, { rotation: 1.2, duration: 0.14, ease: 'power3.out' }, '<');
      timeline.to(rig.body, { rotation: -0.6, y: -26, duration: 0.14, ease: 'power2.out' }, '<');
      /* Hit-Stop: Einen Moment hängt er in der Luft. */
      timeline.to({}, { duration: 0.09 });
      timeline.call(() => {
        ctx.traveler?.setFace('ouch');
        play('stamp_busted');
      });
      timeline.to(rig.body, { rotation: -1.35, y: 34, duration: 0.16, ease: 'power3.in' });
      /* Squash beim Aufprall. */
      timeline.to(rig.body.scale, { x: 1.18, y: 0.82, duration: 0.07 }, '<0.09');
      timeline.to(rig.body.scale, { x: 1, y: 1, duration: 0.28, ease: 'elastic.out(1,0.4)' });
    }

    timeline.add(ctx.suitcase.openCaught(), '<0.1');
    timeline.call(() => {
      ctx.fx.itemFountain(
        ctx.suitcase.view.x,
        ctx.suitcase.view.y - 60,
        ctx.itemSet,
        ctx.amount,
        ctx.rng
      );
      play('items_fountain');
      ctx.officer.setFace('triumph');
      puddle.view.destroy();
    });
    timeline.add(ctx.officer.clipboardMark('check'), '<');
    timeline.call(() => play('crowd_laugh'), undefined, '<0.15');

    busted(ctx, timeline);
    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* caught_slow_zip                                                     */
/* ------------------------------------------------------------------ */

/**
 * Der Beamte öffnet den Reißverschluss quälend langsam. Der Reisende pfeift unschuldig,
 * immer schneller — bis die Ware wie ein Springteufel herausquillt.
 *
 * Die längste der drei, aber die einzige mit einem echten Spannungsbogen: Die
 * Verzögerung **ist** der Gag, nicht ein Hindernis davor.
 */
export const SlowZip: Sequence = {
  id: 'caught_slow_zip',
  kind: 'xrayCaught',
  weight: 0.9,

  build(ctx) {
    const timeline = gsap.timeline();

    reaction(timeline, () => {
      ctx.traveler?.whistleInnocently();
      play('hint_click');
    });

    timeline.call(() => {
      ctx.officer.setFace('suspicious');
      play('zipper_close');
    });

    /*
     * Der Reißverschluss in Zeitlupe: Der Koffer zittert in immer kürzeren Abständen,
     * der Reisende pfeift dazu. Drei Stufen, jede schneller als die vorige.
     */
    for (const [i, step] of [0.26, 0.18, 0.11].entries()) {
      timeline.to(ctx.suitcase.view, {
        x: `+=${3 + i}`,
        duration: step / 2,
        yoyo: true,
        repeat: 1,
        ease: 'none',
      });
      timeline.call(() => play('hint_click', 0, i * 2));
    }

    timeline.call(() => {
      ctx.traveler?.sweat(2);
      play('crowd_gasp');
    });

    /* Anticipation vor dem Springteufel: einmal tief ducken. */
    timeline.to(ctx.suitcase.view.scale, { y: '-=0.12', duration: 0.14, ease: 'power2.in' });
    timeline.add(ctx.suitcase.openCaught());
    timeline.call(() => {
      ctx.fx.itemFountain(
        ctx.suitcase.view.x,
        ctx.suitcase.view.y - 80,
        ctx.itemSet,
        ctx.amount,
        ctx.rng
      );
      play('items_fountain');
      play('duck_squeak', 0.1);
      ctx.traveler?.setFace('scared');
      ctx.officer.setFace('triumph');
    });
    timeline.add(ctx.fx.alarmLight(1, 0.3), '<');
    timeline.add(ctx.officer.clipboardMark('check'), '<');
    timeline.call(() => play('crowd_laugh'), undefined, '<0.2');

    busted(ctx, timeline);
    return timeline;
  },
};

export const CAUGHT_SEQUENCES: readonly Sequence[] = [AlarmBurst, SweatFlood, SlowZip];
