/**
 * `steal_multi_standoff` — "Zu viele Köche", dritte Variante (GDD §4.4).
 *
 * Alle Diebe ziehen gleichzeitig Wasserpistolen. Mexican Standoff, die Kamera schwenkt
 * einmal die Reihe entlang — und dann spritzen alle gleichzeitig. Alle nass, der Sack
 * fällt in die Pfütze.
 *
 * Art Direction §1 verbietet echte Waffen; die Wasserpistole ist als Spielzeug gezeichnet
 * und der Ausgang ist albern, nicht bedrohlich.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const standoff: OutcomeSequence = {
  id: 'steal_multi_standoff',
  outcome: 'multiSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    if (ctx.thieves.length < 2) return timeline;

    timeline.add(ctx.camera.reset(), 0);
    for (const crook of ctx.sharers) crook.setFace('happy');

    // Alle ziehen gleichzeitig.
    ctx.thieves.forEach((thief, index) => {
      const gun = room.spawnProp('props/waterpistol', 0, 0, 0.9);
      gun.parent?.removeChild(gun);
      thief.attachProp(gun, index % 2 === 0 ? 78 : -78, -160);
      gun.alpha = 0;
      timeline.to(gun, { alpha: 1, duration: 0.12 }, 0.1);
      timeline.call(() => thief.setFace('smug'), undefined, 0.1);
      // Jeder zielt auf den naechsten in der Reihe.
      const target = ctx.thieves[(index + 1) % ctx.thieves.length]!;
      timeline.call(() => thief.lookAt(target.position.x, target.position.y), undefined, 0.15);
    });
    ctx.play('card_seal', 0.1);

    /*
     * Der Schwenk. Die Kamera faehrt einmal die Reihe ab und haelt bei jedem kurz an —
     * das ist die Spannung, die das Spritzen danach erst lustig macht.
     */
    ctx.thieves.forEach((thief, index) => {
      timeline.add(ctx.camera.moveTo(thief.position.x, thief.position.y - 120, 1.25, 300), 0.4 + index * 0.45);
    });
    const holdUntil = 0.4 + ctx.thieves.length * 0.45;
    timeline.add(ctx.camera.reset(300), holdUntil);

    // Und alle gleichzeitig.
    const fireAt = holdUntil + 0.35;
    timeline.call(
      () => {
        ctx.play('pass_whoosh');
        ctx.play('crowd_laugh', 0.25);
        for (const thief of ctx.thieves) thief.setFace('ouch');
      },
      undefined,
      fireAt
    );
    for (const thief of ctx.thieves) {
      const splash = room.spawnProp(
        'props/splash',
        thief.position.x,
        thief.position.y - thief.headOffset,
        1.4
      );
      timeline.fromTo(splash, { alpha: 0 }, { alpha: 1, duration: 0.24 }, fireAt);
      timeline.fromTo(
        splash.scale,
        { x: 0.3, y: 0.3 },
        { x: 1.4, y: 1.4, duration: 0.24, ease: 'back.out(2)' },
        fireAt
      );
      timeline.to(splash, { alpha: 0, y: splash.y + 60, duration: 0.5 }, fireAt + 0.3);
      /*
       * Nass: Erst der Treffer, dann der Hit-Stop, dann sackt der Koerper zusammen. Die
       * Reihenfolge ist der Gag — die Reaktion kommt eine Spur zu spaet.
       */
      timeline.to(thief.rig.body, { y: 14, duration: 0.2, ease: 'power2.out' }, hitStop(timeline, fireAt));
      timeline.to(thief.rig.body, { y: 0, duration: 0.4, ease: 'power2.inOut' }, fireAt + 0.7);
    }
    timeline.add(ctx.camera.shake(9, 220), fireAt);
    timeline.add(
      fx.smokePuff(STAGE.worldSize / 2, STAGE.worldSize * 0.6, 5, UI_COLORS.laser),
      fireAt + 0.1
    );
    timeline.call(() => ctx.say('multiSteal', 2000), undefined, fireAt + 0.4);

    timeline.add(buildSipCounters(ctx, 120), fireAt + 0.6);
    timeline.to({}, { duration: 1.0 });
    return timeline;
  },
};
