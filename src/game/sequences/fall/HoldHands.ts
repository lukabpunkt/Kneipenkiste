/**
 * `fall_hold_hands` (GDD §4.3) — das Bild, das das Spiel verkauft.
 *
 * Die beiden greifen sich reflexartig an den Händen, schauen sich an, der Balken bricht,
 * und sie fallen händchenhaltend: synchron rotierend wie Eiskunstläufer. Platsch. Sie
 * tauchen mit Fischen auf dem Kopf wieder auf.
 *
 * Warum die höchste Gewichtung im Katalog: Aus einer Sekunde dieser Sequenz liest man
 * alles — wer fällt, mit wem, und dass es niemandem wehtut.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, eyeContact, fallersOf, plankOf, RIVER_SURFACE, snap, splash } from './fallKit';

export const HoldHands: Sequence = {
  id: 'fall_hold_hands',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length < 2) return timeline;

    eyeContact(timeline, ctx, fallers, plank);

    /*
     * Anticipation: Sie rücken zusammen und greifen zu, **bevor** der Balken bricht.
     * Ohne diesen Moment sähe das Händchenhalten im Fall wie Zufall aus.
     */
    const reachAt = Math.max(0.12, ctx.timing.snapMs / 1000 - 0.3);
    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('oh');
      },
      undefined,
      reachAt
    );
    fallers.forEach((hiker, index) => {
      const inward = index === 0 ? 9 : -9;
      timeline.to(
        hiker.view.position,
        { x: () => hiker.x + inward, duration: 0.26, ease: 'power2.out' },
        reachAt
      );
    });

    const snapAt = snap(timeline, ctx, fallers, plank);

    /*
     * Der Fall als Paar. Sie drehen sich um **ihren gemeinsamen Mittelpunkt**, nicht um
     * sich selbst — das ist der Unterschied zwischen zwei Stürzen und einer Pirouette.
     */
    timeline.call(
      () => {
        const centerX = fallers.reduce((sum, hiker) => sum + hiker.x, 0) / fallers.length;
        for (const [index, hiker] of fallers.entries()) {
          const radius = hiker.x - centerX;
          const phase = index * Math.PI;
          const spin = { angle: 0 };

          gsap.to(spin, {
            angle: Math.PI * 3.2,
            duration: 1.05,
            ease: 'power1.in',
            onUpdate: () => {
              hiker.view.position.x = centerX + Math.cos(spin.angle + phase) * radius;
              hiker.view.rotation = spin.angle * 0.5;
            },
          });
          gsap.to(hiker.view.position, { y: RIVER_SURFACE, duration: 1.05, ease: 'power2.in' });
        }
        ctx.play('whistle_fall');
      },
      undefined,
      snapAt + 0.05
    );

    timeline.add(ctx.camera.followFall(), snapAt + 0.05);
    timeline.to({}, { duration: 1.05 }, snapAt + 0.05);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(HoldHands);
