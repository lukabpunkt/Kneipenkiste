/**
 * `fall_seesaw` (GDD §4.3).
 *
 * Der Balken bricht in der Mitte wie eine Wippe: Der eine kippt hinunter und katapultiert
 * den anderen nach oben — der landet auf Gustav. Der trägt ihn ein Stück und lässt ihn
 * dann fallen.
 *
 * Die einzige Sequenz, in der Gustav mitspielt statt zu kommentieren. Sie braucht deshalb
 * mindestens zwei Beteiligte mit klaren Rollen: einer unten, einer oben.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, eyeContact, fallersOf, plankOf, RIVER_SURFACE, snap, splash } from './fallKit';

export const Seesaw: Sequence = {
  id: 'fall_seesaw',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length < 2) return timeline;

    /* Wer links steht, geht runter; wer rechts steht, fliegt. */
    const [heavy, light] = fallers;
    if (!heavy || !light) return timeline;

    eyeContact(timeline, ctx, fallers, plank);

    /* Kein sauberer Bruch: Die Wippe kippt, das Brett bleibt zunächst ganz. */
    const snapAt = snap(timeline, ctx, fallers, plank, { breakPlank: false });
    timeline.to(plank.view, { rotation: plank.view.rotation + 0.9, duration: 0.3, ease: 'power2.in' }, snapAt);
    timeline.call(() => ctx.play('rock_squash'), undefined, snapAt + 0.2);

    /* --- Der Schwere kippt hinunter --- */
    timeline.to(heavy.view.position, { y: RIVER_SURFACE, duration: 0.95, ease: 'power2.in' }, snapAt + 0.1);
    timeline.to(heavy.view, { rotation: 2.2, duration: 0.95, ease: 'none' }, snapAt + 0.1);
    timeline.call(() => heavy.setFace('help'), undefined, snapAt + 0.1);

    /* --- Der Leichte wird katapultiert: hoch, mit Überschwinger --- */
    const launchAt = snapAt + 0.22;
    timeline.call(
      () => {
        light.setFace('panic');
        ctx.play('balloon_deflate');
      },
      undefined,
      launchAt
    );
    timeline.to(
      light.view.position,
      { y: () => light.y - 260, duration: 0.5, ease: 'power2.out' },
      launchAt
    );
    timeline.to(light.view, { rotation: -3.2, duration: 0.7, ease: 'none' }, launchAt);

    /* --- Gustav fängt ihn ein und trägt ihn ein Stück --- */
    timeline.add(ctx.vulture.carry(light.view, 900), launchAt + 0.5);
    timeline.call(() => {
      light.setFace('smug_shrug');
      ctx.play('vulture_screech');
    });

    /* --- Und lässt ihn fallen. Gustav ist kein Rettungsdienst. --- */
    timeline.call(() => {
      light.setFace('help');
      ctx.play('vulture_laugh');
    });
    timeline.to(light.view.position, { y: RIVER_SURFACE, duration: 0.6, ease: 'power2.in' });
    timeline.to(light.view, { rotation: 1.4, duration: 0.6, ease: 'none' }, '<');
    timeline.to(light.view.position, { x: STAGE.worldWidth * 0.55, duration: 0.6, ease: 'sine.out' }, '<');

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(Seesaw);
