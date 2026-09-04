/**
 * `steal_solo_helicopter` — "Die Ausschleusung" (Backlog nach 1.0).
 *
 * Ein Seil fällt von oben. Der Dieb hängt sich dran, steigt auf, winkt herunter — und
 * verschwindet über dem Bildrand, während unten die Teiler mit offenen Mündern stehen.
 *
 * Die vierte Inszenierung für den Alleingang und die einzige, die **nach oben** geht.
 * Genau darum steht sie hier: Getaway fährt nach links, Moonwalk gleitet nach links,
 * der Magier verschwindet auf der Stelle. Eine vierte Flucht in dieselbe Richtung wäre
 * die dritte Wiederholung gewesen.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

/** Wie schnell sich der Rotor dreht (Umdrehungen pro Sekunde). */
const ROTOR_RPS = 9;

export const helicopter: OutcomeSequence = {
  id: 'steal_solo_helicopter',
  outcome: 'soloSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thief = ctx.thieves[0];
    if (!thief) return timeline;

    const world = STAGE.worldSize;
    const start = { ...thief.position };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    /*
     * Der Hubschrauber steht die ganze Zeit ausserhalb des Bildes — man sieht nur das
     * Seil und, ganz am Ende, die Kufen. Das ist billiger als eine Flugbahn und liest
     * sich besser: Was man nicht sieht, ist immer groesser.
     */
    const heli = room.spawnProp('props/helicopter', world * 0.55, -world * 0.42, 1.1);
    // Er fliegt nach links hinaus — also schaut er auch dorthin.
    heli.scale.x *= -1;
    const rotor = room.spawnProp('props/rotor', world * 0.5, -world * 0.5, 1.1);

    // Der Rotor dreht durch, nicht mit — deshalb eine eigene, endlose Umdrehung.
    timeline.to(rotor, { rotation: Math.PI * 2 * ROTOR_RPS, duration: 3.2, ease: 'none' }, 0);
    ctx.play('drumroll', 0);
    ctx.play('drumroll', 0.4, -5);

    // Das Seil: eine gestreckte Requisite, die von oben herunterfaehrt.
    const rope = room.spawnProp('props/bars', start.x, -world * 0.3, 1);
    rope.scale.set(0.06, 3.4);
    rope.tint = UI_COLORS.steel;
    timeline.to(rope, { y: start.y - 120, duration: 0.4, ease: 'power2.out' }, 0.15);

    // Der Dieb greift zu. Anticipation nach unten, dann ruckt es ihn hoch.
    timeline.call(
      () => {
        thief.showBag(true);
        thief.setFace('smug');
        ctx.play('coin_shimmer');
      },
      undefined,
      0.45
    );
    timeline.to(thief.rig.body, { y: 18, duration: 0.14, ease: 'power2.in' }, 0.55);
    timeline.to(thief.rig.body.scale, { x: 1.12, y: 0.88, duration: 0.14 }, 0.55);

    /*
     * Der Ruck. Hier sitzt der Hit-Stop: Das Seil steht auf Zug, der Dieb haengt einen
     * Wimpernschlag in der Luft, bevor es ihn hochreisst.
     */
    const jerkAt = 0.72;
    ctx.play('pass_whoosh', jerkAt);
    timeline.to(thief.rig.body, { y: -40, duration: 0.1, ease: 'power4.out' }, jerkAt);
    timeline.to(thief.rig.body.scale, { x: 0.86, y: 1.16, duration: 0.1 }, jerkAt);
    timeline.add(ctx.camera.shake(7, 200), jerkAt);
    const afterJerk = hitStop(timeline, jerkAt + 0.1);

    // Und hoch. Seil und Dieb steigen gemeinsam, der Koerper pendelt nach.
    timeline.to(thief.view, { y: -world * 0.28, duration: 1.15, ease: 'power2.in' }, afterJerk);
    timeline.to(rope, { y: -world * 0.9, duration: 1.15, ease: 'power2.in' }, afterJerk);
    timeline.to(thief.view, { rotation: 0.22, duration: 0.5, ease: 'sine.inOut' }, afterJerk);
    timeline.to(thief.view, { rotation: -0.14, duration: 0.5, ease: 'sine.inOut' }, afterJerk + 0.5);

    // Winken im Steigflug — der eigentliche Gag.
    for (let i = 0; i < 3; i++) {
      const at = afterJerk + 0.16 + i * 0.28;
      timeline.to(thief.rig.armL, { rotation: thief.armRest + 2.4, duration: 0.14 }, at);
      timeline.to(thief.rig.armL, { rotation: thief.armRest + 1.6, duration: 0.14 }, at + 0.14);
    }

    // Unten: erst Verwirrung, dann Kinnladen.
    ctx.sharers.forEach((crook, index) => {
      timeline.call(() => crook.lookAt(start.x, -world * 0.2), undefined, afterJerk + 0.1);
      timeline.call(() => crook.setFace('innocent'), undefined, afterJerk + 0.2 + index * 0.05);
      timeline.add(crook.jawDrop(), afterJerk + 0.7 + index * 0.09);
    });
    ctx.play('crowd_gasp', afterJerk + 0.7);

    // Staub vom Rotor.
    timeline.add(fx.smokePuff(start.x, start.y, 7, UI_COLORS.steel), afterJerk + 0.2);
    timeline.add(fx.smokePuff(world * 0.5, world * 0.5, 6, UI_COLORS.steel), afterJerk + 0.6);

    // Der Hubschrauber kippt kurz ins Bild und ist weg.
    timeline.to(heli, { y: -world * 0.2, duration: 0.5, ease: 'power2.out' }, afterJerk + 0.5);
    timeline.to(rotor, { y: -world * 0.28, duration: 0.5, ease: 'power2.out' }, afterJerk + 0.5);
    timeline.to([heli, rotor], { x: `-=${world * 0.9}`, duration: 0.9, ease: 'power2.in' }, afterJerk + 1.0);
    timeline.call(() => ctx.say('soloSteal', 2200), undefined, afterJerk + 1.1);

    /*
     * Kein Trinker-Zaehler mit Zahlen: Beim Alleingang steht erst nach der Verteil-UI
     * fest, wer trinkt (GDD §3.6). Die Show uebergibt an DISTRIBUTE.
     */
    timeline.add(buildSipCounters(ctx, 0), afterJerk + 1.3);
    timeline.to({}, { duration: 0.9 });
    return timeline;
  },
};
