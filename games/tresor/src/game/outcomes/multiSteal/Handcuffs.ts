/**
 * `steal_multi_handcuffs` — "Aneinandergekettet" (Backlog nach 1.0).
 *
 * Beide greifen im selben Moment in den Tresor — und als sie die Hände zurückziehen,
 * hängen sie in denselben Handschellen. Jeder zieht in seine Richtung, die Kette hält,
 * beide fallen. Kassel notiert.
 *
 * Die fünfte Inszenierung für mehrere Diebe. Das Tauziehen streitet um einen Sack, der
 * Amboss bestraft von außen, das Duell gegenseitig, die Bananenschale niemand — hier ist
 * die Strafe, dass sie **aneinander hängen**. Das ist das Bild für „ihr teilt euch die
 * Rechnung", und es braucht keinen einzigen Text dazu.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const handcuffs: OutcomeSequence = {
  id: 'steal_multi_handcuffs',
  outcome: 'multiSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const [first, second] = ctx.thieves;
    if (!first || !second) return timeline;

    const world = STAGE.worldSize;
    /*
     * Sie treffen sich **vor** dem Tisch, nicht in der Mitte des Halbkreises: Dort sitzen
     * die Teiler, und die Schellen haengen sonst quer ueber einem fremden Kopf.
     */
    const middle = { x: world / 2, y: world * 0.74 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of ctx.sharers) {
      timeline.call(() => crook.setFace('happy'), undefined, 0.1);
      timeline.call(() => crook.lookAt(middle.x, middle.y), undefined, 0.1);
    }

    // Beide treten an — gleichzeitig, von beiden Seiten, ohne einander zu bemerken.
    timeline.call(
      () => {
        first.setFace('smug');
        second.setFace('smug');
      },
      undefined,
      0
    );
    timeline.add(first.moveTo(middle.x - 80, middle.y, 480), 0.1);
    timeline.add(second.moveTo(middle.x + 80, middle.y, 480), 0.1);

    // Zugreifen: beide Arme nach innen, in dieselbe Stelle.
    const grabAt = 0.7;
    ctx.play('coin_shimmer', grabAt);
    timeline.to(first.rig.armR, { rotation: -first.armRest - 1.3, duration: 0.18, ease: 'power3.in' }, grabAt);
    timeline.to(second.rig.armL, { rotation: second.armRest + 1.3, duration: 0.18, ease: 'power3.in' }, grabAt);

    /*
     * Klick. Der Hit-Stop sitzt genau hier: Beide halten still, die Schellen sind zu,
     * und erst danach begreifen sie es.
     */
    const clickAt = grabAt + 0.18;
    ctx.play('card_seal', clickAt);
    const cuffs = room.spawnProp('props/handcuffs', middle.x, middle.y - first.headOffset * 0.5, 0.85);
    cuffs.alpha = 0;
    timeline.to(cuffs, { alpha: 1, duration: 0.1 }, clickAt);
    timeline.fromTo(cuffs.scale, { x: 1.6, y: 1.6 }, { x: 0.85, y: 0.85, duration: 0.16, ease: 'back.out(3)' }, clickAt);
    timeline.add(ctx.camera.shake(7, 180), clickAt);

    const afterClick = hitStop(timeline, clickAt + 0.16);

    // Der Groschen faellt.
    timeline.call(
      () => {
        first.setFace('jaw_drop');
        second.setFace('jaw_drop');
        ctx.play('crowd_gasp');
      },
      undefined,
      afterClick
    );

    /*
     * Dreimal ziehen, jedes Mal haerter — und jedes Mal reisst es den anderen mit. Die
     * Kette bleibt in der Mitte: Sie ist der einzige Punkt, der sich nicht bewegt.
     */
    for (let i = 0; i < 3; i++) {
      const pullAt = afterClick + 0.2 + i * 0.28;
      const pull = 30 + i * 14;
      timeline
        .to(first.view, { x: middle.x - 80 - pull, duration: 0.14, ease: 'power2.out' }, pullAt)
        .to(second.view, { x: middle.x + 80 - pull * 0.6, duration: 0.14, ease: 'power2.out' }, pullAt)
        .to(first.view, { x: middle.x - 80 + pull * 0.6, duration: 0.14, ease: 'power2.out' }, pullAt + 0.14)
        .to(second.view, { x: middle.x + 80 + pull, duration: 0.14, ease: 'power2.out' }, pullAt + 0.14);
      ctx.play('card_stall', pullAt, i * 2);
    }

    // Und beide auf den Rücken.
    const fallAt = afterClick + 1.1;
    ctx.play('anvil', fallAt);
    ctx.play('crowd_laugh', fallAt + 0.15);
    for (const thief of [first, second]) {
      timeline.call(() => thief.setFace('x_eyes'), undefined, fallAt);
      timeline.add(thief.flatten(), fallAt);
    }
    timeline.add(ctx.camera.shake(12, 260), fallAt);
    timeline.add(fx.starsAbove(middle.x, middle.y - first.headOffset, 6), fallAt + 0.1);
    // Die Schellen sacken mit den Armen nach unten — Follow-Through.
    timeline.to(cuffs, { y: middle.y - 20, rotation: 0.3, duration: 0.4, ease: 'bounce.out' }, fallAt);
    timeline.call(() => ctx.say('multiSteal', 2200), undefined, fallAt + 0.3);

    timeline.add(buildSipCounters(ctx, 140), fallAt + 0.5);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
