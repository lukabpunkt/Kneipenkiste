/**
 * `deserter_stamp` (GDD §4.3, Modus "Fahne").
 *
 * Die Fahne des Wortbrechers fällt um, ein roter Stempel "FAHNENFLUCHT" knallt aufs Bild.
 * Und wenn jemand einen fremden Fahnen-Balken gekapert hat: Der Dieb tippt dem Gestürzten
 * von hinten auf die Schulter, während dieser fällt, und winkt.
 *
 * Beide Teile machen dasselbe sichtbar: Versprechen sind wertlos, aber sie werden
 * mitgeschrieben (Design-Pfeiler 2).
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const DeserterStamp: Sequence = {
  id: 'deserter_stamp',
  kind: 'overlay',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const deserterId = ctx.players[0];
    if (deserterId === undefined) return timeline;

    const deserter = ctx.hikers.get(deserterId);

    /*
     * Der Stempel kommt schief, laut und ohne Vorwarnung — und dort, wo der Wortbrecher
     * gerade **steht**, nicht wo er beim Bauen der Timeline stand.
     */
    timeline.call(() => {
      ctx.play('stamp');
      ctx.fx.signs.stamp(
        ctx.t('banner.desertion'),
        deserter ? deserter.x : STAGE.worldWidth / 2,
        STAGE.bridgeY - 210
      );
    });
    timeline.to({}, { duration: 1.4 });

    /*
     * Der Balkendieb: Er fällt mit, klopft dem Bestohlenen aber noch auf die Schulter.
     * Ein Bild für "ich wusste, was ich tue" — mitten im eigenen Sturz.
     */
    const theft = ctx.reveal.plankThieves.find((entry) => entry.thief === deserterId);
    const victim = theft ? ctx.hikers.get(theft.victim) : undefined;

    if (deserter && victim) {
      timeline.to(deserter.view, { rotation: 0.2, duration: 0.16, ease: 'power2.out' }, 0.3);
      timeline.to(deserter.view, { rotation: 0, duration: 0.2, ease: 'power2.inOut' });
      timeline.call(
        () =>
          void ctx.fx.bubbles.show(
            {
              text: ctx.t('step.youSaidThree', { plank: ctx.plank ?? '' }),
              x: victim.x,
              y: victim.y - 200,
            },
            1000
          ),
        undefined,
        '<'
      );
    }

    return timeline;
  },
};

registerSequence(DeserterStamp);
