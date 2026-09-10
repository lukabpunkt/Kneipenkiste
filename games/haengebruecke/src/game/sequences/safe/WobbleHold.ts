/**
 * `safe_wobble_hold` (GDD §4.4).
 *
 * Der Balken biegt sich stark durch, der Hiker rudert mit den Armen, ein Splitter fällt —
 * und dann hält er doch. Das ist die Sicher-Sequenz, die am längsten offenlässt, ob sie
 * eine ist: Bis zum letzten Moment sieht sie aus wie ein Sturz.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const WobbleHold: Sequence = {
  id: 'safe_wobble_hold',
  kind: 'safe',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const hiker = ctx.hikers.get(ctx.players[0] ?? '');
    const plank = ctx.plank !== undefined ? ctx.bridge.planks.get(ctx.plank) : undefined;
    if (!hiker) return timeline;

    hiker.setFace('scared');

    /* Erst durchhängen, als würde er gleich brechen. */
    if (plank) {
      timeline.to(plank.view, { y: plank.baseY + 16, duration: 0.28, ease: 'power2.in' }, 0);
      timeline.call(() => ctx.fx.burstSplinters(plank.baseX, plank.baseY, 3), undefined, 0.26);
      timeline.call(() => ctx.play('plank_snap'), undefined, 0.26);
    }

    /* Arme rudern — die eine Bewegung, die "gleich falle ich" heisst. */
    timeline.to(hiker.view, { rotation: -0.14, duration: 0.14, ease: 'sine.inOut' }, 0.1);
    timeline.to(hiker.view, { rotation: 0.12, duration: 0.16, ease: 'sine.inOut' });
    timeline.to(hiker.view, { rotation: -0.06, duration: 0.14, ease: 'sine.inOut' });
    timeline.to(hiker.view, { rotation: 0, duration: 0.2, ease: 'back.out(3)' });

    /* Und dann hält er. Erleichterung als Ausatmen, nicht als Jubel. */
    if (plank) timeline.to(plank.view, { y: plank.baseY, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, '<');
    timeline.call(() => {
      hiker.setFace('happy');
      ctx.play('relief_exhale');
    });
    timeline.to(hiker.view.scale, { y: hiker.view.scale.y * 0.94, duration: 0.18, yoyo: true, repeat: 1 });

    return timeline;
  },
};

registerSequence(WobbleHold);
