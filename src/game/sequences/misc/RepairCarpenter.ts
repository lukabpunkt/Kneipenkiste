/**
 * `repair_carpenter` (GDD §4.4).
 *
 * Balthasar kommt mit der Leiter von unten, hämmert im Rhythmus, und die Bretter springen
 * an ihren Platz. Danach ist die Brücke wieder vollständig.
 *
 * Ein NPC macht die Reparatur lesbar, ohne Textwände (GDD §7): Man sieht, dass die Brücke
 * wieder ganz ist, statt es zu lesen — und man sieht, dass es Arbeit war.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const RepairCarpenter: Sequence = {
  id: 'repair_carpenter',
  kind: 'repair',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const broken = [...ctx.bridge.planks.values()].filter((plank) => plank.isBroken());
    if (broken.length === 0) return gsap.timeline();

    const timeline = gsap.timeline();

    /* Die Gestürzten sind vorher wieder oben — Balthasar repariert keine besetzte Lücke. */
    timeline.call(() => ctx.play('hammer_rhythm'));
    timeline.add(
      ctx.carpenter.repair(broken, (plank) => plank.reset()),
      0
    );

    return timeline;
  },
};

registerSequence(RepairCarpenter);
