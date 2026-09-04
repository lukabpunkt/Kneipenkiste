/**
 * `steal_all_pie_fight` — "Die Tortenschlacht" (Backlog nach 1.0).
 *
 * Jeder wirft, jeder wird getroffen. Die Torten fliegen im Bogen quer über die Bühne,
 * jede landet mit einem Klatscher in einem Gesicht, und am Ende steht die Runde weiß
 * bekleckert da, während Kassel mit dem Staubsauger anrückt.
 *
 * Die dritte Inszenierung für "alle stehlen". Die Schlägerei versteckt alles in einer
 * Staubwolke, der Alarm sperrt alle weg — diese hier zeigt es. Jeder Treffer ist einzeln
 * lesbar, und genau darin liegt der Unterschied: Man sieht, **wer** wen erwischt hat.
 */

import gsap from 'gsap';
import { colorById, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

/** Abstand zwischen zwei Würfen. Kurz genug für Chaos, lang genug zum Mitlesen. */
const THROW_GAP = 0.26;

export const pieFight: OutcomeSequence = {
  id: 'steal_all_pie_fight',
  outcome: 'allSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thieves = ctx.thieves;
    if (thieves.length < 2) return timeline;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of thieves) crook.setFace('smug');

    /*
     * Jeder wirft auf seinen Nachbarn — reihum. Damit trifft jeder genau einmal und wird
     * genau einmal getroffen: gerecht, symmetrisch und ohne dass jemand ueberzaehlig ist.
     */
    let last = 0.2;
    thieves.forEach((thrower, index) => {
      const target = thieves[(index + 1) % thieves.length]!;
      const from = { x: thrower.position.x, y: thrower.position.y - thrower.headOffset * 0.6 };
      const to = { x: target.position.x, y: target.position.y - target.headOffset };
      const at = 0.2 + index * THROW_GAP;
      last = at;

      const pie = room.spawnProp('props/pie', from.x, from.y, 0.55);
      // Die Torte traegt die Farbe des Werfers — man soll sehen, wer geworfen hat.
      pie.tint = colorById(thrower.colorId).hex;

      // Ausholen: Arm zurueck, Koerper dreht mit.
      timeline.to(thrower.rig.armR, { rotation: -thrower.armRest - 2.2, duration: 0.12 }, at - 0.12);
      timeline.to(thrower.rig.armR, { rotation: -thrower.armRest + 0.4, duration: 0.1, ease: 'power3.in' }, at);
      timeline.to(thrower.rig.armR, { rotation: -thrower.armRest, duration: 0.3, ease: 'power2.out' }, at + 0.1);
      ctx.play('pass_whoosh', at, index * 2);

      // Der Bogen: hoch, dann runter. Eine gerade Linie sieht aus wie ein Fehler.
      const peak = Math.min(from.y, to.y) - 150;
      timeline
        .to(pie, { x: (from.x + to.x) / 2, y: peak, duration: 0.16, ease: 'power2.out' }, at)
        .to(pie, { x: to.x, y: to.y, rotation: 3.2, duration: 0.16, ease: 'power2.in' }, at + 0.16);

      // Treffer: Die Torte platzt weiss auf, der Kopf kippt zurueck.
      const hitAt = at + 0.32;
      timeline.call(
        () => {
          ctx.play('anvil', 0, 6 + index);
          target.setFace('x_eyes');
          pie.tint = UI_COLORS.paper;
        },
        undefined,
        hitAt
      );
      timeline.to(pie.scale, { x: 1.5, y: 1.5, duration: 0.1, ease: 'back.out(3)' }, hitAt);
      timeline.to(target.rig.head, { rotation: 0.4, duration: 0.1, ease: 'power3.out' }, hitAt);
      timeline.to(target.rig.body, { y: 14, duration: 0.1 }, hitAt);
      timeline.add(fx.starsAbove(to.x, to.y - 20, 3, 700), hitAt + 0.05);

      // Der Klecks bleibt kurz kleben und rutscht dann herunter.
      timeline.to(pie, { y: to.y + 80, alpha: 0, duration: 0.7, ease: 'power1.in' }, hitAt + 0.35);
      timeline.to(target.rig.head, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' }, hitAt + 0.12);
      timeline.to(target.rig.body, { y: 0, duration: 0.4, ease: 'power2.out' }, hitAt + 0.12);
    });

    /*
     * Der letzte Treffer bekommt den Hit-Stop und den Screen-Shake — bis dahin ist es
     * eine Kette, ab hier ein Schlusspunkt.
     */
    const finalAt = last + 0.32;
    timeline.add(ctx.camera.shake(12, 260), finalAt);
    const afterFinal = hitStop(timeline, finalAt);
    ctx.play('crowd_laugh', afterFinal);

    // Kassel holt den Staubsauger.
    const vacuum = room.spawnProp('props/vacuum', room.kassel.view.x - 40, room.kassel.view.y - 150, 1.1);
    vacuum.alpha = 0;
    timeline.to(vacuum, { alpha: 1, rotation: -0.3, duration: 0.3 }, afterFinal + 0.2);
    timeline.to(vacuum, { rotation: 0.2, duration: 0.4, yoyo: true, repeat: 1 }, afterFinal + 0.5);
    timeline.to(vacuum, { alpha: 0, duration: 0.3 }, afterFinal + 1.4);
    timeline.call(() => ctx.say('allSteal', 2200), undefined, afterFinal + 0.3);

    // Und alle schauen schuldbewusst.
    for (const crook of thieves) {
      timeline.call(() => crook.setFace('guilty'), undefined, afterFinal + 0.5);
    }

    timeline.add(buildSipCounters(ctx, 140), afterFinal + 0.5);
    timeline.to({}, { duration: 1.0 });
    return timeline;
  },
};
