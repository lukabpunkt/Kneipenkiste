/**
 * `rotten_crack` (GDD §4.3, Modus "Morscher Balken").
 *
 * Ein einzelner Hiker steht allein und sicher da — und der Balken zerbröselt unter ihm wie
 * Keks. Er sinkt langsam durch, mit einer "Ernsthaft?"-Sprechblase.
 *
 * Das Langsame ist der Witz: Ein Kollisionsbalken bricht, dieser hier gibt nach. Wer
 * allein steht, hat alles richtig gemacht und fällt trotzdem — reiner Glücks-Spice
 * (GDD §3.6).
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const RottenCrack: Sequence = {
  id: 'rotten_crack',
  kind: 'overlay',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const hiker = ctx.hikers.get(ctx.players[0] ?? '');
    const plank = ctx.plank !== undefined ? ctx.bridge.planks.get(ctx.plank) : undefined;
    if (!hiker || !plank || ctx.plank === undefined) return timeline;

    const plankId = ctx.plank;

    timeline.call(() => {
      ctx.bridge.revealRotten(plankId);
      hiker.stopWobble();
      hiker.setFace('smug_shrug');
      ctx.play('plank_crumble');
    });

    /* Erst merkt er nichts. Dann schaut er nach unten. */
    timeline.add(
      ctx.fx.bubbles.show(
        { text: ctx.t('step.seriously'), x: plank.baseX, y: plank.baseY - 190 },
        1100
      ),
      0.2
    );

    /* Zerbröseln statt brechen: langsam absinken, während das Brett zerfällt. */
    timeline.call(() => ctx.fx.burstSplinters(plank.baseX, plank.baseY, 8), undefined, 0.3);
    timeline.add(plank.crumble(), 0.3);
    timeline.to(hiker.view.position, { y: plank.baseY + 30, duration: 0.55, ease: 'power1.in' }, 0.35);
    timeline.call(() => hiker.setFace('help'));

    /* Und dann fällt er doch — mit Anlauf zum Fluss. */
    timeline.add(ctx.camera.followFall(), '<');
    timeline.to(hiker.view.position, { y: STAGE.riverY - 10, duration: 0.75, ease: 'power2.in' });
    timeline.to(hiker.view, { rotation: 1.1, duration: 0.75, ease: 'none' }, '<');
    timeline.call(() => {
      ctx.fx.splashAt(hiker.x, STAGE.riverY);
      ctx.play('splash');
    });

    return timeline;
  },
};

registerSequence(RottenCrack);
