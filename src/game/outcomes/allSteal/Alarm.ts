/**
 * `steal_all_alarm` — "Schlägerei", zweite Variante (GDD §4.4).
 *
 * Alle greifen gleichzeitig in den Tresor. Alarm, ein Gitter fällt herunter, alle Crooks
 * stehen dahinter. Die Schlücke werden durch die Gitterstäbe gereicht.
 *
 * Die stillere der beiden Varianten: kein Getümmel, sondern die kalte Konsequenz. Das
 * Gitter fällt in einem Zug und rastet mit einem Schlag ein.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const allStealAlarm: OutcomeSequence = {
  id: 'steal_all_alarm',
  outcome: 'allSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room } = ctx;
    const world = STAGE.worldSize;
    const vaultAt = { x: world / 2, y: world * 0.2 };

    timeline.add(ctx.camera.reset(), 0);

    // Alle greifen gleichzeitig zum Tresor.
    for (const thief of ctx.thieves) {
      timeline.call(() => {
        thief.setFace('smug');
        thief.lookAt(vaultAt.x, vaultAt.y);
      }, undefined, 0);
      timeline.to(thief.rig.armL, { rotation: thief.armRest + 2.0, duration: 0.22, ease: 'back.out(2)' }, 0.1);
      timeline.to(thief.rig.armR, { rotation: -thief.armRest - 2.0, duration: 0.22, ease: 'back.out(2)' }, 0.1);
      timeline.to(thief.rig.body, { y: -16, duration: 0.22 }, 0.1);
    }

    // Alarm.
    timeline.call(
      () => {
        ctx.play('siren_short');
        ctx.play('crowd_gasp', 0.12);
        for (const thief of ctx.thieves) thief.setFace('jaw_drop');
      },
      undefined,
      0.5
    );
    timeline.add(room.raiseAlarm(), 0.5);
    timeline.add(room.flash(0xff2d55, 0.3, 200), 0.5);

    /*
     * Das Gitter faellt in einem Zug — die Anticipation liegt im Alarm davor, nicht in
     * einem Zoegern des Gitters selbst. Es rastet mit einem Schlag ein.
     */
    const bars = room.spawnProp('props/bars', world / 2, -world * 0.5, 3.2);
    timeline.to(bars, { y: world * 0.42, duration: 0.34, ease: 'power3.in' }, 0.8);
    timeline.call(
      () => {
        ctx.play('anvil');
        ctx.play('vault_close', 0.1);
      },
      undefined,
      1.14
    );
    timeline.add(ctx.camera.shake(14, 300), 1.14);
    /*
     * Hit-Stop: Das Gitter steht einen Moment bockstill, erst dann federt es nach
     * (Follow-Through). Ohne den Halt sieht der Aufprall weich aus.
     */
    const afterBars = hitStop(timeline, 1.14);
    timeline.to(bars, { y: world * 0.4, duration: 0.24, ease: 'bounce.out' }, afterBars);

    // Alle stehen hinter Gittern und gucken.
    for (const thief of ctx.thieves) {
      timeline.call(() => thief.setFace('guilty'), undefined, 1.5);
      timeline.to(thief.rig.armL, { rotation: thief.armRest, duration: 0.4 }, 1.5);
      timeline.to(thief.rig.armR, { rotation: -thief.armRest, duration: 0.4 }, 1.5);
      timeline.to(thief.rig.body, { y: 0, duration: 0.4 }, 1.5);
    }
    timeline.call(() => ctx.say('allSteal', 2200), undefined, 1.6);

    timeline.add(buildSipCounters(ctx, 140), 1.9);
    timeline.to({}, { duration: 1.2 });
    return timeline;
  },
};
