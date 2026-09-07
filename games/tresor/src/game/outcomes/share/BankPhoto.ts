/**
 * `share_bank_photo` — "Für die Akten" (Backlog nach 1.0).
 *
 * Kassel holt die Balgenkamera heraus und stellt die Runde auf: alle in einer Reihe,
 * Arme um die Schultern, breites Grinsen. Blitz. Und im Weißblitz kippt es — wenn das
 * Bild zurückkommt, hält Kassel schon die Rechnung hin.
 *
 * Die vierte Inszenierung für "alle teilen" und die einzige, die **Kassel führt**.
 * Umarmung, Prosit und Applaus kommen von den Crooks; hier ist der Bankier der Regisseur,
 * und das Bild, das er macht, ist ein Beweisfoto.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const bankPhoto: OutcomeSequence = {
  id: 'share_bank_photo',
  outcome: 'allShare',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const crooks = [...room.crooks.values()];
    if (crooks.length === 0) return timeline;

    const world = STAGE.worldSize;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Kassel baut auf. Die Kamera kommt von seiner Seite ins Bild.
    const camera = room.spawnProp('props/camera', world * 0.9, world * 0.44, 1.2);
    camera.alpha = 0;
    ctx.play('vault_dial', 0.1);
    timeline.to(camera, { alpha: 1, x: world * 0.8, duration: 0.35, ease: 'back.out(2)' }, 0.1);

    /*
     * Aufstellen: Alle schauen in dieselbe Richtung und legen die Arme um die Schultern.
     * Die Reihe ist der Gag — sie sehen aus wie eine Betriebsfeier, und gleich kommt die
     * Rechnung.
     */
    crooks.forEach((crook, index) => {
      timeline.call(
        () => {
          crook.setFace('happy');
          crook.lookAt(world * 0.8, world * 0.44);
        },
        undefined,
        0.3 + index * 0.05
      );
      timeline.to(crook.rig.armL, { rotation: crook.armRest + 1.5, duration: 0.24, ease: 'back.out(2)' }, 0.35 + index * 0.05);
      timeline.to(crook.rig.armR, { rotation: -crook.armRest - 1.5, duration: 0.24, ease: 'back.out(2)' }, 0.35 + index * 0.05);
    });

    /*
     * Der Blitz. Hier sitzt der Hit-Stop: Im Weissblitz steht alles still — das ist der
     * Moment, den das Foto festhaelt, und der einzige, in dem niemand etwas ahnt.
     */
    const flashAt = 1.1;
    ctx.play('stamp', flashAt);
    timeline.add(room.flash(UI_COLORS.paper, 0.85, 200), flashAt);
    timeline.add(fx.starsAbove(world * 0.78, world * 0.36, 4, 600), flashAt);
    timeline.to(camera, { rotation: -0.12, duration: 0.08 }, flashAt);
    timeline.to(camera, { rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' }, flashAt + 0.08);

    const afterFlash = hitStop(timeline, flashAt);

    // Und die Rechnung. Die Arme fallen, die Gesichter kippen.
    timeline.call(
      () => {
        ctx.play('cash_register');
        for (const crook of crooks) crook.setFace('guilty');
        ctx.say('allShare', 1800);
      },
      undefined,
      afterFlash + 0.25
    );
    for (const crook of crooks) {
      timeline.to(crook.rig.armL, { rotation: crook.armRest, duration: 0.4, ease: 'power2.out' }, afterFlash + 0.25);
      timeline.to(crook.rig.armR, { rotation: -crook.armRest, duration: 0.4, ease: 'power2.out' }, afterFlash + 0.25);
    }
    timeline.to(camera, { alpha: 0, x: world * 0.95, duration: 0.4 }, afterFlash + 0.5);

    timeline.add(buildSipCounters(ctx, 120), afterFlash + 0.45);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
