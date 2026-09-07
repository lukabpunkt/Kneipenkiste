/**
 * `steal_solo_moonwalk` — "Der Alleingang", zweite Variante (GDD §4.4).
 *
 * Der Dieb zieht den Sack langsam und im Moonwalk aus dem Bild und winkt dabei. Die
 * Teiler gucken erst verwirrt, dann fällt ihnen die Kinnlade herunter.
 *
 * Das Gegenstück zum Fluchtauto: Dort ist er weg, bevor jemand reagiert — hier sehen
 * alle zu und können nichts tun. Langsamkeit ist hier der Witz.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const moonwalk: OutcomeSequence = {
  id: 'steal_solo_moonwalk',
  outcome: 'soloSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room } = ctx;
    const thief = ctx.thieves[0];
    if (!thief) return timeline;

    const world = STAGE.worldSize;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    timeline.call(
      () => {
        thief.showBag(true);
        thief.setFace('smug');
        ctx.play('coin_shimmer');
      },
      undefined,
      0
    );

    // Alle schauen ihm zu — das ist der Punkt.
    for (const crook of ctx.sharers) {
      timeline.call(() => crook.lookAt(thief.position.x, thief.position.y), undefined, 0.2);
    }

    /*
     * Moonwalk: Er gleitet nach links, während der Körper in die andere Richtung wippt.
     * Die Beine bewegen sich vorwärts, die Figur rückwärts — genau darin liegt der Gag.
     */
    const target = -world * 0.15;
    // Anticipation: erst ein Schritt in die falsche Richtung, dann gleitet er los.
    timeline.to(thief.view, { x: thief.position.x + 26, duration: 0.16, ease: 'power2.out' }, 0.2);
    timeline.to(thief.rig.body.scale, { x: 1.08, y: 0.92, duration: 0.16 }, 0.2);
    timeline.to(thief.rig.body.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2)' }, 0.36);
    timeline.to(thief.view, { x: target, duration: 2.4, ease: 'none' }, 0.4);
    for (let i = 0; i < 8; i++) {
      timeline
        .to(thief.rig.body, { x: 12, rotation: 0.06, duration: 0.15, ease: 'sine.inOut' }, 0.4 + i * 0.3)
        .to(thief.rig.body, { x: -12, rotation: -0.06, duration: 0.15, ease: 'sine.inOut' }, 0.55 + i * 0.3);
    }
    timeline.set(thief.rig.body, { x: 0, rotation: 0 });

    // Winken.
    for (let i = 0; i < 4; i++) {
      timeline
        .to(thief.rig.armL, { rotation: thief.armRest + 2.4, duration: 0.18 }, 0.6 + i * 0.36)
        .to(thief.rig.armL, { rotation: thief.armRest + 1.7, duration: 0.18 }, 0.78 + i * 0.36);
    }

    // Erst verwirrt …
    for (const crook of ctx.sharers) timeline.call(() => crook.setFace('innocent'), undefined, 0.8);
    // … dann faellt der Groschen.
    ctx.play('crowd_gasp', 1.7);
    // Der Groschen faellt: einen Wimpernschlag steht alles still, dann klappen die Kinnladen.
    const afterPenny = hitStop(timeline, 1.7);
    ctx.sharers.forEach((crook, index) => {
      timeline.add(crook.jawDrop(), afterPenny + index * 0.11);
    });
    timeline.call(() => ctx.say('soloSteal', 2200), undefined, 1.9);

    timeline.add(buildSipCounters(ctx, 0), 2.6);
    timeline.to({}, { duration: 0.8 });
    return timeline;
  },
};
