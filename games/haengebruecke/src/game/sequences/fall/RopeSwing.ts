/**
 * `fall_rope_swing` (GDD §4.3).
 *
 * Die Hikers greifen im letzten Moment die Seile, die Brücke schwingt wie eine Schaukel,
 * sie klatschen gegen die Felswand (Squash) — und rutschen dann doch ab.
 *
 * Der Gag ist die Beinahe-Rettung: Sie tun genau das Richtige, und es hilft trotzdem
 * nichts. Deshalb muss das Greifen erkennbar gelingen, bevor es scheitert.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, dropToRiver, eyeContact, fallersOf, plankOf, snap, splash } from './fallKit';

export const RopeSwing: Sequence = {
  id: 'fall_rope_swing',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length === 0) return timeline;

    eyeContact(timeline, ctx, fallers, plank);
    const snapAt = snap(timeline, ctx, fallers, plank);

    /* --- Zugreifen: Arme hoch, sie hängen --- */
    timeline.call(
      () => {
        for (const hiker of fallers) {
          hiker.setFace('panic');
          gsap.to(hiker.rig.body, { y: 14, duration: 0.18, ease: 'power2.out' });
        }
        ctx.play('rope_strain');
      },
      undefined,
      snapAt
    );

    /*
     * --- Die Schaukel ---
     *
     * Zur Wand, die näher ist: Wer links hängt, fliegt nach links. Sonst kreuzen sich
     * zwei Hikers in der Luft und man sieht nicht mehr, wer wer war.
     */
    const swingAt = snapAt + 0.2;
    for (const [index, hiker] of fallers.entries()) {
      const toLeft = index === 0;
      const wallX = toLeft ? STAGE.plateauLeftEnd - 30 : STAGE.plateauRightStart + 30;

      timeline.to(
        hiker.view.position,
        { x: wallX, y: () => hiker.y + 40, duration: 0.42, ease: 'power2.in' },
        swingAt
      );
      timeline.to(hiker.view, { rotation: toLeft ? -0.9 : 0.9, duration: 0.42 }, swingAt);

      /* Der Aufprall: Squash gegen die Wand, dann zurückfedern. */
      timeline.call(
        () => {
          hiker.squash(0.62);
          ctx.fx.starsAt(hiker.x, hiker.y - hiker.height * 0.5, 4);
          ctx.play('rock_squash');
        },
        undefined,
        swingAt + 0.42
      );
      timeline.call(() => hiker.squash(1.08), undefined, swingAt + 0.54);
      timeline.call(() => hiker.squash(1), undefined, swingAt + 0.66);
    }

    /* --- Und abrutschen --- */
    const slipAt = swingAt + 0.75;
    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('help');
        ctx.play('whistle_fall');
      },
      undefined,
      slipAt
    );
    dropToRiver(timeline, fallers, slipAt, { durationMs: 700, drift: 0 });
    timeline.add(ctx.camera.followFall(700), slipAt);
    timeline.to({}, { duration: 0.7 }, slipAt);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(RopeSwing);
