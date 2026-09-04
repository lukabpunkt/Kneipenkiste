/**
 * `steal_multi_banana` — "Die Bananenschale" (Backlog nach 1.0).
 *
 * Beide Diebe rennen gleichzeitig auf den Tresor zu. Zwischen ihnen liegt eine
 * Bananenschale, die niemand gesehen hat. Der erste rutscht aus, der zweite stolpert
 * über den ersten, und beide liegen mit Sternen über dem Kopf da.
 *
 * Die vierte Inszenierung für mehrere Diebe. Die drei bestehenden bestrafen von außen
 * (Amboss), von innen (Tauziehen) oder gegenseitig (Duell). Diese hier bestraft
 * **niemand** — sie sind einfach selbst schuld, und das ist die lustigste Variante.
 */

import gsap from 'gsap';
import { STAGE, ANIM } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const banana: OutcomeSequence = {
  id: 'steal_multi_banana',
  outcome: 'multiSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const [first, second] = ctx.thieves;
    if (!first || !second) return timeline;

    const world = STAGE.worldSize;
    const middle = { x: world / 2, y: world * 0.6 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of ctx.sharers) {
      timeline.call(() => crook.lookAt(middle.x, middle.y), undefined, 0.1);
    }

    /*
     * Die Schale liegt von Anfang an da — sichtbar, aber klein und beilaeufig. Wer sie
     * frueh entdeckt, freut sich zweimal: einmal beim Entdecken, einmal beim Ausrutschen.
     */
    const peel = room.spawnProp('props/banana', middle.x, middle.y + 30, 0.8);
    peel.alpha = 0;
    timeline.to(peel, { alpha: 1, duration: 0.2 }, 0);

    // Beide rennen los, gierig und viel zu schnell.
    timeline.call(
      () => {
        first.setFace('smug');
        second.setFace('smug');
        ctx.play('crowd_aah');
      },
      undefined,
      0.15
    );
    timeline.add(first.moveTo(middle.x - 60, middle.y, 520, 'power2.in'), 0.2);
    timeline.add(second.moveTo(middle.x + 60, middle.y, 560, 'power2.in'), 0.25);

    /*
     * Der Ausrutscher. Die Beine fliegen nach vorn, der Koerper faellt nach hinten —
     * und dazwischen steht die Zeit still (Hit-Stop). Ohne den Halt sieht es aus, als
     * haette er sich hingelegt.
     */
    const slipAt = 0.82;
    ctx.play('pass_whoosh', slipAt);
    timeline.call(() => first.setFace('ouch'), undefined, slipAt);
    timeline.to(first.rig.body, { y: -30, rotation: -0.5, duration: 0.12, ease: 'power3.out' }, slipAt);
    timeline.to(first.rig.body.scale, { x: 1.18, y: 0.86, duration: 0.12 }, slipAt);
    timeline.to(peel, { x: peel.x - 70, rotation: -2.4, duration: 0.5, ease: 'power2.out' }, slipAt);

    const afterSlip = hitStop(timeline, slipAt + 0.12);

    // Aufschlag.
    ctx.play('anvil', afterSlip);
    timeline.to(first.rig.body, { y: 46, rotation: -1.3, duration: 0.18, ease: 'power3.in' }, afterSlip);
    timeline.add(ctx.camera.shake(11, 240), afterSlip + 0.18);
    timeline.add(fx.starsAbove(middle.x - 60, middle.y - first.headOffset, 5), afterSlip + 0.2);
    timeline.call(() => first.setFace('x_eyes'), undefined, afterSlip + 0.18);

    /*
     * Der zweite stolpert ueber den ersten. Ein eigener Takt spaeter — er sieht es
     * kommen und kann trotzdem nicht bremsen. Das ist die zweite Haelfte des Gags.
     */
    const tripAt = afterSlip + 0.34;
    timeline.call(() => second.setFace('jaw_drop'), undefined, tripAt - 0.14);
    timeline.to(second.rig.body, { y: -34, rotation: 0.45, duration: 0.14, ease: 'power3.out' }, tripAt);
    const afterTrip = hitStop(timeline, tripAt + 0.14);

    ctx.play('anvil', afterTrip, 3);
    ctx.play('crowd_laugh', afterTrip + 0.1);
    timeline.to(second.rig.body, { y: 46, rotation: 1.2, duration: 0.18, ease: 'power3.in' }, afterTrip);
    timeline.add(ctx.camera.shake(9, 220), afterTrip + 0.18);
    timeline.add(fx.starsAbove(middle.x + 60, middle.y - second.headOffset, 5), afterTrip + 0.2);
    timeline.call(() => second.setFace('x_eyes'), undefined, afterTrip + 0.18);
    timeline.to({}, { duration: ANIM.hitStopMs / 1000 }, afterTrip + 0.18);

    // Die Teiler grinsen. Sie haben nichts getan und trotzdem gewonnen.
    for (const crook of ctx.sharers) {
      timeline.call(() => crook.setFace('happy'), undefined, afterTrip + 0.3);
    }
    timeline.call(() => ctx.say('multiSteal', 2200), undefined, afterTrip + 0.4);

    timeline.add(buildSipCounters(ctx, 140), afterTrip + 0.7);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
