/**
 * `share_toast` — "Ehre unter Dieben", zweite Variante (GDD §4.4).
 *
 * Alle heben ein Glas und stoßen an. Es klirrt, einer bekommt Schluckauf. Dann kommt
 * die Gebühr.
 *
 * Kürzer und ruhiger als die Umarmung — zwei Varianten desselben Falls dürfen sich nicht
 * gleich anfühlen, sonst merkt am Tisch niemand, dass es zwei sind.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const toast: OutcomeSequence = {
  id: 'share_toast',
  outcome: 'allShare',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const crooks = [...room.crooks.values()];

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Jeder bekommt ein Glas in die Hand.
    for (const crook of crooks) {
      const glass = room.spawnProp('props/glass', 0, 0, 0.9);
      glass.parent?.removeChild(glass);
      crook.attachProp(glass, 70, -150);
      crook.setFace('happy');
    }

    // Anticipation: erst runter, dann hoch — und in der Mitte klirrt es.
    for (const crook of crooks) {
      timeline
        .to(crook.rig.body, { y: 14, duration: 0.16, ease: 'power2.in' }, 0.1)
        .to(crook.rig.body, { y: -34, duration: 0.24, ease: 'back.out(2)' }, 0.26);
    }
    /*
     * Der Moment des Klirrens: Die Glaeser stehen oben still. Erst danach senken sich
     * die Arme — ein Prosit ohne diesen Halt ist nur eine Auf-und-ab-Bewegung.
     */
    const afterClink = hitStop(timeline, 0.5);
    for (const crook of crooks) {
      timeline.to(crook.rig.body, { y: 0, duration: 0.3, ease: 'power2.out' }, afterClink);
    }
    timeline.call(
      () => {
        ctx.play('coin_shimmer');
        ctx.play('crowd_laugh', 0.25);
        ctx.say('allShare', 1800);
      },
      undefined,
      0.48
    );
    timeline.add(fx.starsAbove(STAGE.worldSize / 2, STAGE.worldSize * 0.42, 4, 800), 0.48);

    /*
     * Einer bekommt Schluckauf: ein Crook zuckt dreimal nach oben. Der Gag lebt davon,
     * dass es genau einer ist — bei allen wäre es ein Effekt, bei einem ist es eine Figur.
     */
    const hiccup = crooks[ctx.rng.int(crooks.length)];
    if (hiccup) {
      for (let i = 0; i < 3; i++) {
        timeline
          .to(hiccup.view, { y: hiccup.position.y - 26, duration: 0.09, ease: 'power2.out' }, 1.0 + i * 0.34)
          .to(hiccup.view, { y: hiccup.position.y, duration: 0.22, ease: 'bounce.out' }, 1.09 + i * 0.34);
      }
    }

    // Die Rechnung.
    timeline.call(
      () => {
        ctx.play('cash_register');
        for (const crook of crooks) crook.setFace('guilty');
      },
      undefined,
      2.0
    );
    timeline.add(buildSipCounters(ctx, 120), 2.05);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
