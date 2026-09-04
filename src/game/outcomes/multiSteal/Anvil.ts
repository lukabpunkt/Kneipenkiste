/**
 * `steal_multi_anvil` — "Zu viele Köche", zweite Variante (GDD §4.4).
 *
 * Der erste Dieb feiert mit Konfetti. Ein Amboss mit dem Symbol des zweiten fällt auf
 * ihn. Der zweite feiert. Ein Amboss mit dem Symbol des ersten fällt auf ihn. Beide
 * liegen platt, Herr Kassel verteilt die Schlücke per Trichter.
 *
 * Die Symmetrie ist der Witz — und der Grund, warum der zweite Amboss länger braucht als
 * der erste: Man muss Zeit haben, ihn kommen zu sehen.
 */

import gsap from 'gsap';
import { colorById, STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';
import type { Crook } from '../../Crook';

export const anvil: OutcomeSequence = {
  id: 'steal_multi_anvil',
  outcome: 'multiSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const [first, second] = ctx.thieves;
    if (!first || !second) return timeline;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of ctx.sharers) crook.setFace('happy');

    /** Ein Amboss faellt auf einen Crook — getintet in der Farbe des Gegenspielers. */
    const drop = (victim: Crook, blame: Crook, at: number): void => {
      const at0 = victim.position;
      const block = room.spawnProp('props/anvil', at0.x, at0.y - 900, 1.4);
      block.tint = colorById(blame.colorId).hex;

      // Anticipation: Er haengt kurz oben, bevor er faellt.
      timeline.to(block, { y: at0.y - 820, duration: 0.22, ease: 'power1.out' }, at);
      timeline.to(block, { y: at0.y - victim.headOffset * 0.55, duration: 0.24, ease: 'power3.in' }, at + 0.24);

      // Aufprall: Hit-Stop, Squash, Sternchen, Screen-Shake.
      timeline.call(
        () => {
          ctx.play('anvil');
          ctx.play('crowd_gasp', 0.08);
        },
        undefined,
        at + 0.48
      );
      timeline.add(victim.flatten(), at + 0.48);
      const afterHit = hitStop(timeline, at + 0.48);
      timeline.add(ctx.camera.shake(14, 260), at + 0.48);
      timeline.add(fx.starsAbove(at0.x, at0.y - victim.headOffset, 5), at + 0.52);
      // Follow-Through: Der Amboss sackt noch ein Stueck nach.
      timeline.to(block, { y: at0.y - victim.headOffset * 0.4, duration: 0.3, ease: 'bounce.out' }, afterHit);
    };

    // Erster feiert, erster wird getroffen.
    timeline.add(first.celebrate(1), 0.1);
    timeline.add(fx.confettiBurst(first.position.x, first.position.y - first.headOffset, 20), 0.2);
    drop(first, second, 0.7);

    // Zweiter feiert — laenger, damit man den Amboss kommen sieht.
    timeline.add(second.celebrate(1), 1.5);
    timeline.add(fx.confettiBurst(second.position.x, second.position.y - second.headOffset, 20), 1.6);
    drop(second, first, 2.2);

    // Kassel verteilt per Trichter.
    const funnel = room.spawnProp('props/funnel', STAGE.worldSize / 2, STAGE.worldSize * 0.5, 1.2);
    funnel.alpha = 0;
    timeline.to(funnel, { alpha: 1, y: funnel.y + 40, duration: 0.3 }, 3.0);
    timeline.call(() => ctx.say('multiSteal', 2200), undefined, 3.0);
    timeline.to(funnel, { alpha: 0, duration: 0.3 }, 3.9);

    timeline.add(buildSipCounters(ctx, 120), 3.2);
    timeline.to({}, { duration: 0.9 });
    return timeline;
  },
};
