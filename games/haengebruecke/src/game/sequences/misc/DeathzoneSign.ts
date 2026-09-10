/**
 * `deathzone_sign` (GDD §4.4).
 *
 * Ein rot-weiss gestreiftes Schild schwingt ins Bild, eine Trommel, und Gustav setzt sich
 * darauf. Es kündigt an, was gleich sowieso passiert: Es gibt weniger Balken als Leute,
 * also fällt mindestens einer. Garantiert.
 *
 * Die Ansage kommt **vor** dem Anlauf, nicht danach — sonst wäre sie eine Erklärung
 * statt einer Drohung.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const DeathzoneSign: Sequence = {
  id: 'deathzone_sign',
  kind: 'deathzone',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const count = ctx.reveal.planks.length;
    const x = STAGE.worldWidth / 2;
    const y = STAGE.bridgeY - 40;

    timeline.call(() => ctx.play('drum_deathzone'));
    timeline.add(ctx.fx.signs.deathZone(ctx.t('step.deathZoneSign', { count }), x, y), 0);

    /* Gustav setzt sich auf das Schild und wartet ab — er weiss, dass es gleich losgeht. */
    timeline.add(ctx.vulture.landOnSign(x + 150, y - 190), 0.5);
    timeline.call(() => ctx.play('vulture_screech'), undefined, 0.8);
    timeline.add(ctx.vulture.screech(), '<');

    return timeline;
  },
};

registerSequence(DeathzoneSign);
