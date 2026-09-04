/**
 * `jackpot_burst` — "JACKPOT" (GDD §4.4).
 *
 * Der Tresor bläht sich auf wie ein Ballon, die Nieten fliegen, dann platzt er in
 * Goldkonfetti. Münzregen, die Crooks tanzen, ein Chor setzt ein — und alle trinken die
 * Beute gleichmäßig.
 *
 * Der seltenste Fall des Spiels (ADR-2: Er verhindert Endlos-Frieden). Entsprechend
 * groß darf er ausfallen: Er ist das einzige Mal, dass der Tresor selbst verliert.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const jackpotBurst: OutcomeSequence = {
  id: 'jackpot_burst',
  outcome: 'jackpot',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const world = STAGE.worldSize;
    const vaultAt = { x: world / 2, y: world * 0.2 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of room.crooks.values()) {
      timeline.call(() => crook.lookAt(vaultAt.x, vaultAt.y), undefined, 0);
    }

    // Aufblaehen — mit dem Ton, der ansteigt.
    ctx.play('vault_dial', 0.1);
    timeline.add(room.vault.burst(), 0.15);

    // Die Nieten fliegen: Sternchen aus dem Tresorrand.
    timeline.add(fx.starsAbove(vaultAt.x, vaultAt.y, 8, 900), 0.55);

    // Und er platzt.
    const burstAt = 0.75;
    timeline.call(
      () => {
        ctx.play('jackpot_choir');
        ctx.play('coin_shimmer', 0.15);
      },
      undefined,
      burstAt
    );
    timeline.add(room.flash(0xffc93c, 0.45, 260), burstAt);
    timeline.add(ctx.camera.shake(16, 320), burstAt);
    timeline.add(fx.confettiBurst(vaultAt.x, vaultAt.y + 40, 90), burstAt);
    timeline.add(fx.coinRain(world / 2, world * 0.9, 40, 1500), burstAt + 0.1);
    timeline.call(() => room.vault.setFill(0), undefined, burstAt + 0.2);

    /*
     * Der Hit-Stop mitten im Knall: Alles steht, das Gold haengt in der Luft — und dann
     * erst begreifen es die Crooks. Der teuerste Moment des Spiels darf einen Atemzug
     * dauern.
     */
    const afterBurst = hitStop(timeline, burstAt);

    // Die Crooks tanzen.
    [...room.crooks.values()].forEach((crook, index) => {
      timeline.add(crook.celebrate(2), afterBurst + 0.17 + index * 0.07);
    });
    timeline.call(() => ctx.say('jackpot', 2400), undefined, burstAt + 0.4);

    timeline.add(buildSipCounters(ctx, 200), burstAt + 1.0);
    timeline.to({}, { duration: 1.4 });
    return timeline;
  },
};
