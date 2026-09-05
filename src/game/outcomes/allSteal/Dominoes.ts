/**
 * `steal_all_dominoes` — "Die Kettenreaktion" (Backlog nach 1.0).
 *
 * Alle greifen gleichzeitig zu. Der Erste stolpert, kippt in den Zweiten, der in den
 * Dritten — einmal reihum durch den ganzen Halbkreis, bis der Letzte gegen den Tresor
 * fällt und der die Tür zuschlägt.
 *
 * Die vierte Inszenierung für "alle stehlen" und die einzige, die mit der Spielerzahl
 * **besser** wird: Bei drei Leuten ist es ein Umfallen, bei acht eine Welle. Die
 * Schlägerei versteckt alles in einer Wolke, der Alarm sperrt alle gleichzeitig weg, die
 * Tortenschlacht ist ein Sternmuster — diese hier ist eine Linie, und Linien liest man
 * schneller als alles andere.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

/** Abstand zwischen zwei Umfallern. Kurz genug für eine Welle, lang genug zum Mitlesen. */
const CHAIN_GAP = 0.16;

export const dominoes: OutcomeSequence = {
  id: 'steal_all_dominoes',
  outcome: 'allSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thieves = ctx.thieves;
    if (thieves.length < 2) return timeline;

    const world = STAGE.worldSize;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Alle greifen zu — gleichzeitig, gierig, mit derselben Bewegung.
    for (const thief of thieves) {
      thief.setFace('smug');
      timeline.to(thief.rig.armL, { rotation: thief.armRest + 1.8, duration: 0.2, ease: 'back.out(2)' }, 0.1);
      timeline.to(thief.rig.armR, { rotation: -thief.armRest - 1.8, duration: 0.2, ease: 'back.out(2)' }, 0.1);
      timeline.to(thief.rig.body, { y: -14, duration: 0.2 }, 0.1);
    }
    ctx.play('coin_shimmer', 0.1);

    /*
     * Der erste Stolperer. Nur er hat eine Anticipation — die anderen fallen, weil er
     * fällt, und wer geschubst wird, holt nicht aus.
     */
    const startAt = 0.55;
    ctx.play('pass_whoosh', startAt);
    timeline.to(thieves[0]!.rig.body, { y: 6, duration: 0.1, ease: 'power2.in' }, startAt);

    /** Einer kippt: Rotation zur Seite, Squash beim Aufprall, Sterne, Stoss auf den nächsten. */
    const topple = (index: number, at: number): void => {
      const thief = thieves[index];
      if (!thief) return;
      const last = index === thieves.length - 1;

      timeline.call(() => thief.setFace(last ? 'x_eyes' : 'ouch'), undefined, at);
      timeline.to(thief.rig.body, { rotation: 0.9, y: 30, duration: 0.16, ease: 'power3.in' }, at);
      timeline.to(thief.rig.body.scale, { x: 1.16, y: 0.86, duration: 0.1 }, at + 0.16);
      timeline.to(thief.rig.armL, { rotation: thief.armRest + 0.6, duration: 0.24 }, at + 0.16);
      timeline.to(thief.rig.armR, { rotation: -thief.armRest - 0.6, duration: 0.24 }, at + 0.16);

      ctx.play('card_stall', at + 0.16, index * 2);
      timeline.add(fx.starsAbove(thief.position.x, thief.position.y - thief.headOffset, 3, 650), at + 0.18);
    };

    thieves.forEach((_, index) => topple(index, startAt + 0.1 + index * CHAIN_GAP));

    /*
     * Der Letzte fällt gegen den Tresor. Hier sitzt der Hit-Stop: Die Tür knallt zu, und
     * einen Wimpernschlag lang passiert nichts — das ist der Schlusspunkt der Welle.
     */
    const slamAt = startAt + 0.1 + thieves.length * CHAIN_GAP + 0.2;
    ctx.play('vault_close', slamAt);
    ctx.play('crowd_laugh', slamAt + 0.2);
    timeline.add(room.vault.closeDoor(), slamAt);
    timeline.add(ctx.camera.shake(14, 300), slamAt);
    timeline.add(fx.smokePuff(world / 2, world * 0.3, 6), slamAt);

    const afterSlam = hitStop(timeline, slamAt);

    // Und alle liegen da. Kassel sagt, was zu sagen ist.
    timeline.call(() => ctx.say('allSteal', 2200), undefined, afterSlam + 0.2);

    timeline.add(buildSipCounters(ctx, 140), afterSlam + 0.4);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
