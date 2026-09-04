/**
 * `steal_multi_tugofwar` — "Zu viele Köche" (GDD §4.4).
 *
 * Der erste Dieb jubelt und hebt den Sack — dann reißt der zweite daran. Tauziehen, der
 * Sack platzt, die Münzen fliegen den Dieben direkt in den Mund. Die Teiler stehen mit
 * Popcorn daneben.
 *
 * Der Doppel-Dieb-Twist ist der zweitbeste Moment des Spiels (GDD §4.2). Deshalb feiert
 * der erste **erst** — sonst gibt es nichts, was der zweite verderben könnte.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const tugOfWar: OutcomeSequence = {
  id: 'steal_multi_tugofwar',
  outcome: 'multiSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const [first, second] = ctx.thieves;
    if (!first || !second) return timeline;

    const world = STAGE.worldSize;
    const middle = { x: world / 2, y: world * 0.62 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Die Teiler holen Popcorn. Sie sind ab jetzt Publikum.
    ctx.sharers.forEach((crook, index) => {
      const popcorn = room.spawnProp('props/popcorn', 0, 0, 0.9);
      popcorn.parent?.removeChild(popcorn);
      crook.attachProp(popcorn, 70, -140);
      timeline.call(() => crook.setFace('happy'), undefined, 0.2 + index * 0.05);
      timeline.call(() => crook.lookAt(middle.x, middle.y), undefined, 0.2);
    });

    // Der erste feiert.
    timeline.call(() => first.showBag(true), undefined, 0);
    timeline.add(first.moveTo(middle.x - 90, middle.y, 420), 0.1);
    timeline.add(first.celebrate(1), 0.5);
    ctx.play('crowd_aah', 0.5);

    // Der zweite kommt dazu und greift zu.
    timeline.add(second.moveTo(middle.x + 90, middle.y, 380, 'power3.in'), 0.9);
    timeline.call(
      () => {
        second.setFace('smug');
        first.setFace('guilty');
        ctx.play('crowd_gasp');
      },
      undefined,
      1.25
    );

    // Tauziehen: dreimal hin und her, jedes Mal härter.
    for (let i = 0; i < 3; i++) {
      const at = 1.4 + i * 0.3;
      const pull = 26 + i * 10;
      timeline
        .to(first.view, { x: middle.x - 90 - pull, duration: 0.15, ease: 'power2.out' }, at)
        .to(second.view, { x: middle.x + 90 + pull, duration: 0.15, ease: 'power2.out' }, at)
        .to(first.view, { x: middle.x - 90 + pull, duration: 0.15, ease: 'power2.out' }, at + 0.15)
        .to(second.view, { x: middle.x + 90 - pull, duration: 0.15, ease: 'power2.out' }, at + 0.15);
    }

    // Der Sack platzt. Hit-Stop, dann Muenzen.
    const burstAt = 2.3;
    timeline.call(
      () => {
        first.showBag(false);
        ctx.play('anvil');
        for (const thief of ctx.thieves) thief.setFace('jaw_drop');
      },
      undefined,
      burstAt
    );
    timeline.add(ctx.camera.shake(12, 260), burstAt);
    timeline.add(fx.smokePuff(middle.x, middle.y - 140, 5, UI_COLORS.gold), burstAt);
    timeline.add(fx.confettiBurst(middle.x, middle.y - 140, 24), burstAt);
    // Der Hit-Stop: Beide stehen mit offenem Mund da, bevor die Muenzen fliegen.
    const afterBurst = hitStop(timeline, burstAt);

    // Die Muenzen fliegen den Dieben in den Mund — der Zaehler-Moment beginnt hier.
    const mouths = ctx.thieves.map((thief) => ({
      x: thief.position.x,
      y: thief.position.y - thief.headOffset * 0.85,
    }));
    timeline.add(fx.coinsTo({ x: middle.x, y: middle.y - 150 }, mouths, 4), afterBurst + 0.12);
    ctx.play('coin_shimmer', burstAt + 0.3);
    timeline.call(() => ctx.say('multiSteal', 2200), undefined, burstAt + 0.4);

    timeline.add(buildSipCounters(ctx, 180), burstAt + 0.7);
    timeline.to({}, { duration: 1.1 });
    return timeline;
  },
};
