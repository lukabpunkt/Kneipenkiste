/**
 * `safe_confident_stroll` (GDD §4.4).
 *
 * Der Hiker geht ohne Zögern über seinen Balken, pfeift, dreht sich zu den Fallenden um
 * und zuckt mit den Schultern. Die Sequenz für den, der genau wusste, was er tut — oder
 * so tut, als hätte er es gewusst.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const ConfidentStroll: Sequence = {
  id: 'safe_confident_stroll',
  kind: 'safe',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const hiker = ctx.hikers.get(ctx.players[0] ?? '');
    if (!hiker) return timeline;

    timeline.call(() => {
      hiker.setFace('whistle');
      ctx.play('whistle_fall');
    });

    /*
     * `() => hiker.x + 26`: Die Timeline entsteht, bevor der Hiker losgelaufen ist. Ein
     * fester Wert würde ihn zurück auf das Plateau ziehen.
     */
    timeline.to(hiker.view.position, { x: () => hiker.x + 26, duration: 0.7, ease: 'none' }, 0);
    timeline.to(
      hiker.view.position,
      { y: () => hiker.y - 4, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' },
      0
    );

    /* Umdrehen zu denen, die es nicht geschafft haben. */
    timeline.call(() => hiker.setFace('smug_shrug'));
    timeline.to(hiker.view.scale, { x: -hiker.view.scale.x, duration: 0.18, ease: 'power2.inOut' });

    /* Schulterzucken: zweimal hoch, einmal ausatmen. */
    timeline.to(
      hiker.view.position,
      { y: () => hiker.y - 8, duration: 0.14, yoyo: true, repeat: 1, ease: 'sine.inOut' }
    );
    timeline.to(hiker.view.scale, { x: hiker.view.scale.x, duration: 0.18, ease: 'power2.inOut' }, '+=0.2');

    return timeline;
  },
};

registerSequence(ConfidentStroll);
