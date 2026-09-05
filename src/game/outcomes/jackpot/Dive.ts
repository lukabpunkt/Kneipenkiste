/**
 * `jackpot_dive` — "Kopfsprung" (Backlog nach 1.0).
 *
 * Der Tresor platzt nicht, er läuft über: Münzen quellen heraus, sammeln sich zu einem
 * Berg, und einer nach dem anderen nimmt Anlauf und springt kopfüber hinein wie in ein
 * Schwimmbecken. Kassel schaut zu und sagt nichts Nettes.
 *
 * Die zweite Jackpot-Inszenierung. Der Ausbruch (`jackpot_burst`) geht nach **außen** —
 * ein Knall, alles fliegt weg. Dieser hier geht nach **innen**: Das Gold bleibt liegen,
 * und die Crooks gehen hinein. Zwei Bilder für denselben Fall, damit der seltenste
 * Moment des Spiels nicht immer gleich aussieht.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const jackpotDive: OutcomeSequence = {
  id: 'jackpot_dive',
  outcome: 'jackpot',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const world = STAGE.worldSize;
    const vaultAt = { x: world / 2, y: world * 0.2 };
    const pool = { x: world / 2, y: world * 0.56 };
    const crooks = [...room.crooks.values()];

    timeline.add(ctx.camera.reset(), 0);
    for (const crook of crooks) {
      timeline.call(() => crook.lookAt(vaultAt.x, vaultAt.y), undefined, 0);
    }

    // Die Tür geht auf, und es hört nicht mehr auf.
    ctx.play('vault_open', 0.1);
    timeline.add(room.vault.openDoor(), 0.1);
    timeline.add(fx.coinRain(vaultAt.x, world * 0.5, 34, 1600), 0.45);
    ctx.play('coin_shimmer', 0.5);
    ctx.play('coin_shimmer', 0.9, -4);
    timeline.call(() => room.vault.setFill(0), undefined, 1.0);

    /*
     * Der Berg: sieben Muenzen in einem flachen Bogen, keine einzelne grosse.
     *
     * Eine auf das Neunfache gezogene Muenze ist ein oranger Fleck — sie zeigt ihren
     * eigenen Frame-Rand und liest sich nicht als Haufen (ADR-24: weiche Sprites bleiben
     * unter dem Doppelten). Sieben ueberlappende bei 1,4-facher Groesse ergeben eine
     * unregelmaessige Silhouette, und genau die macht den Haufen.
     */
    const heap = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const offset = (i - 3) / 3;
      const coin = room.spawnProp(
        'props/coin',
        pool.x + offset * 150,
        pool.y + 34 - Math.cos(offset * 1.6) * 26,
        1.4
      );
      coin.tint = UI_COLORS.gold;
      coin.alpha = 0;
      return coin;
    });

    heap.forEach((coin, index) => {
      const at = 0.7 + index * 0.05;
      timeline.to(coin, { alpha: 1, duration: 0.16 }, at);
      timeline.fromTo(
        coin,
        { y: coin.y - 60 },
        { y: coin.y, duration: 0.3, ease: 'bounce.out' },
        at
      );
    });

    /*
     * Der erste Sprung. Anticipation in den Knien, Flugbogen, und beim Eintauchen der
     * Hit-Stop — ohne den ist es ein Umfallen, mit ihm ein Kopfsprung.
     */
    const diveAt = 1.35;
    crooks.forEach((crook, index) => {
      const at = diveAt + index * 0.22;
      const from = { ...crook.position };

      timeline.call(() => crook.setFace('happy'), undefined, at - 0.16);
      timeline.to(crook.rig.body.scale, { x: 1.14, y: 0.86, duration: 0.14, ease: 'power2.in' }, at - 0.16);
      timeline.to(crook.rig.body.scale, { x: 0.88, y: 1.12, duration: 0.12 }, at);

      // Bogen zum Haufen, Kopf voran.
      timeline
        .to(crook.view, { x: (from.x + pool.x) / 2, y: from.y - 150, duration: 0.2, ease: 'power2.out' }, at)
        .to(crook.view, { x: pool.x, y: pool.y, duration: 0.2, ease: 'power2.in' }, at + 0.2);
      // Knapp ueber eine Vierteldrehung: Kopf nach unten, nicht ueberschlagen.
      timeline.to(crook.view, { rotation: 1.7, duration: 0.4, ease: 'none' }, at);

      ctx.play('coin_shimmer', at + 0.4, index * 2);
      timeline.add(fx.coinRain(pool.x, 220, 8, 700), at + 0.4);
      // Und untergetaucht.
      timeline.to(crook.view, { alpha: 0, duration: 0.12 }, at + 0.42);
    });

    const lastDive = diveAt + (crooks.length - 1) * 0.22 + 0.42;
    timeline.add(ctx.camera.shake(10, 240), lastDive);
    const afterDive = hitStop(timeline, lastDive);

    ctx.play('jackpot_choir', afterDive);
    timeline.add(room.flash(UI_COLORS.gold, 0.4, 260), afterDive);
    timeline.add(fx.confettiBurst(pool.x, pool.y - 60, 60), afterDive);
    timeline.call(() => ctx.say('jackpot', 2400), undefined, afterDive + 0.3);

    timeline.add(buildSipCounters(ctx, 200), afterDive + 0.5);
    timeline.to({}, { duration: 1.3 });
    return timeline;
  },
};
