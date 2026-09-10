/**
 * `safe_tiptoe` (GDD §4.4).
 *
 * Auf Zehenspitzen, Luft anhalten, Backen aufgeblasen, Schweiss — und drüben lässt er die
 * Luft mit einem Ballon-Geräusch raus. Die Sequenz für den, der weiss, dass er Glück hatte.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const Tiptoe: Sequence = {
  id: 'safe_tiptoe',
  kind: 'safe',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const hiker = ctx.hikers.get(ctx.players[0] ?? '');
    if (!hiker) return timeline;

    /*
     * Alle Ziele als Funktionen: Die Timeline wird gebaut, bevor der Hiker seinen Balken
     * erreicht hat. Feste Werte würden ihn dorthin zurückziehen, wo er angetreten ist.
     */
    const restScale = hiker.view.scale.y;
    let standY = 0;

    timeline.call(() => {
      hiker.setFace('held_breath');
      standY = hiker.y;
    });

    /* Auf die Zehenspitzen: kleiner werden geht nicht, also nach oben. */
    timeline.to(hiker.view.position, { y: () => standY - 7, duration: 0.24, ease: 'power2.out' });
    timeline.to(hiker.view.scale, { y: restScale * 1.05, duration: 0.24 }, '<');

    /* Drei winzige Schritte — jeder einzeln, keiner beherzt. */
    for (let i = 0; i < 3; i += 1) {
      timeline.to(hiker.view.position, { x: () => hiker.x + 9, duration: 0.2, ease: 'power1.inOut' });
      timeline.to(hiker.view, { rotation: i % 2 === 0 ? 0.05 : -0.05, duration: 0.2 }, '<');
    }

    /* Und ausatmen. */
    timeline.to(hiker.view, { rotation: 0, duration: 0.14 });
    timeline.call(() => {
      hiker.setFace('happy');
      ctx.play('balloon_deflate');
    });
    timeline.to(hiker.view.position, { y: () => standY, duration: 0.3, ease: 'bounce.out' });
    timeline.to(hiker.view.scale, { y: restScale, duration: 0.3 }, '<');

    return timeline;
  },
};

registerSequence(Tiptoe);
