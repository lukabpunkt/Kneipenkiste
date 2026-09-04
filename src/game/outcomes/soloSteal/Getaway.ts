/**
 * `steal_solo_getaway` — "Der Alleingang" (GDD §4.4).
 *
 * Der Dieb greift sich den Sack, rennt zur Kamera, ein Fluchtauto fährt von rechts ein,
 * Reifenqualm. Die Teiler bleiben mit leeren Taschen stehen, einer hält ein Schild:
 * WIR HATTEN EINEN DEAL.
 *
 * Der Moment, für den es das Spiel gibt (GDD-Pfeiler 1). Deshalb ist der Ablauf
 * bewusst schnell — der Dieb ist weg, bevor jemand reagieren kann, und erst danach
 * fallen den Teilern die Kinnladen herunter.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const getaway: OutcomeSequence = {
  id: 'steal_solo_getaway',
  outcome: 'soloSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thief = ctx.thieves[0];
    if (!thief) return timeline;

    const world = STAGE.worldSize;
    const roadY = world * 0.74;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Der Dieb schnappt sich den Sack und grinst.
    timeline.call(
      () => {
        thief.showBag(true);
        thief.setFace('smug');
        ctx.play('coin_shimmer');
      },
      undefined,
      0
    );
    timeline.to(thief.view.scale, { x: '*=1.12', y: '*=1.12', duration: 0.18, ease: 'back.out(3)' }, 0.05);
    // Der Zugriff steht einen Moment still — die Pose ist die Ansage.
    const afterGrab = hitStop(timeline, 0.23);
    timeline.to(thief.view.scale, { x: '/=1.12', y: '/=1.12', duration: 0.2, ease: 'power2.out' }, afterGrab);

    // Fluchtauto fährt von rechts ein.
    const car = room.spawnProp('props/car', world * 1.5, roadY, 1.9);
    ctx.play('tire_screech', 0.35);
    timeline.to(car, { x: world * 0.72, duration: 0.55, ease: 'power3.out' }, 0.35);
    timeline.add(fx.smokePuff(world * 1.05, roadY + 40, 6, UI_COLORS.steel), 0.6);

    // Der Dieb rennt hin und springt rein — er verschwindet hinter dem Auto.
    timeline.add(thief.moveTo(world * 0.72, roadY, 480, 'power2.in'), 0.75);
    timeline.to(thief.view, { alpha: 0, duration: 0.12 }, 1.2);

    // Die Teiler merken es. Erst verwirrt, dann Kinnlade.
    ctx.sharers.forEach((crook, index) => {
      timeline.call(() => crook.setFace('innocent'), undefined, 1.0 + index * 0.06);
      timeline.add(crook.jawDrop(), 1.35 + index * 0.09);
    });
    ctx.play('crowd_gasp', 1.35);

    // Das Schild.
    const sign = room.spawnProp('props/sign_deal', world * 0.28, world * 0.6, 1.3);
    sign.alpha = 0;
    timeline.fromTo(
      sign,
      { alpha: 0, y: sign.y + 90, rotation: -0.3 },
      { alpha: 1, y: sign.y, rotation: -0.08, duration: 0.4, ease: 'back.out(2.4)' },
      1.5
    );

    // Und weg. Reifenqualm hinterher.
    ctx.play('tire_screech', 1.85);
    timeline.to(car, { x: -world * 0.6, duration: 0.7, ease: 'power2.in' }, 1.9);
    timeline.add(fx.smokePuff(world * 0.7, roadY + 40, 8, UI_COLORS.steel), 1.9);
    timeline.add(ctx.camera.shake(8, 220), 1.9);
    timeline.call(() => ctx.say('soloSteal', 2200), undefined, 2.0);

    /*
     * Kein Trinker-Zaehler: Beim Alleingang steht erst nach der Verteil-UI fest, wer
     * wieviel trinkt (GDD §3.6). Die Show uebergibt an DISTRIBUTE.
     */
    timeline.add(buildSipCounters(ctx, 0), 2.4);
    timeline.to({}, { duration: 0.9 });
    return timeline;
  },
};
