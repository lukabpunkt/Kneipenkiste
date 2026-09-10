/**
 * `all_safe_rot` (GDD §4.4) — Design-Pfeiler 3 in einem Bild.
 *
 * Alle stehen, alle atmen auf, alle jubeln. Und dann knackt es, ein Balken fault vor
 * ihren Augen ab und fällt in die Schlucht. Gustav lacht.
 *
 * Das ist der Moment, der die nächste Runde antreibt: Frieden ist nie stabil. Er darf
 * deshalb nicht nebenbei passieren — erst der Jubel, dann der Bruch, in dieser Reihenfolge.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const AllSafeRot: Sequence = {
  id: 'all_safe_rot',
  kind: 'allSafe',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const removed = ctx.reveal.removedPlank;

    /* --- Erst der Jubel: alle winken, alle sind durch --- */
    timeline.call(() => {
      for (const hiker of ctx.hikers.values()) {
        hiker.stopWobble();
        hiker.resetHead();
        hiker.safeWave();
      }
      ctx.play('crowd_laugh');
    });

    if (removed === undefined) return timeline;

    const plank = ctx.bridge.planks.get(removed);
    if (!plank) return timeline;

    /* --- Dann das Knacken. Erst hinschauen, dann fallen --- */
    timeline.call(() => ctx.play('wood_rot'), undefined, '+=0.5');
    timeline.call(() => ctx.bridge.revealRotten(removed));
    timeline.to(plank.view, { y: plank.baseY + 8, duration: 0.3, ease: 'power1.in' });
    timeline.call(() => ctx.fx.burstSplinters(plank.baseX, plank.baseY, 6));

    /* Die Kamera folgt dem Balken nach unten — das ist die Tiefe, um die es geht. */
    timeline.add(ctx.camera.zoomTo(plank.baseX, plank.baseY + 120, 700, 1.05), '<');
    timeline.add(ctx.bridge.rot(removed) ?? gsap.timeline(), '<');

    timeline.call(() => {
      ctx.fx.splashAt(plank.baseX, STAGE.riverY);
      ctx.play('splash');
    }, undefined, '+=0.55');

    /* Gustav kommentiert — er ist der Einzige, der sich freut. */
    timeline.add(ctx.vulture.laugh(), '<');
    timeline.add(
      ctx.fx.signs.note(ctx.t('step.rotSign', { plank: removed }), STAGE.worldWidth / 2, STAGE.bridgeY - 150),
      '<'
    );

    return timeline;
  },
};

registerSequence(AllSafeRot);
