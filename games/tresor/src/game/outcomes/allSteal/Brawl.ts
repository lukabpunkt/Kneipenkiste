/**
 * `steal_all_brawl` — "Schlägerei" (GDD §4.4).
 *
 * Eine Cartoon-Kampfwolke mit herausragenden Armen, Beinen und Sternchen; gelegentlich
 * fliegt ein Schuh heraus. Die Wolke verzieht sich, alle sitzen mit Beulen und X-Augen
 * im Kreis, Herr Kassel verteilt gleichmäßig per Kelle.
 *
 * Die Wolke ist der ganze Trick: Man sieht nichts und ergänzt sich alles selbst. Deshalb
 * ist sie dicht, wackelt hart und spuckt genau einen Schuh aus — zwei wären zu viel.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const brawl: OutcomeSequence = {
  id: 'steal_all_brawl',
  outcome: 'allSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const world = STAGE.worldSize;
    const middle = { x: world / 2, y: world * 0.6 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Alle stuerzen in die Mitte.
    ctx.thieves.forEach((thief, index) => {
      const spread = (index - (ctx.thieves.length - 1) / 2) * 34;
      thief.setFace('guilty');
      timeline.add(thief.moveTo(middle.x + spread, middle.y, 420, 'power3.in'), 0.05);
    });
    ctx.play('crowd_gasp', 0.2);

    // Die Wolke: mehrere Rauchsprites, die uebereinander liegen und wackeln.
    const cloudAt = 0.5;
    /*
     * Neun kleine Wolken statt fuenf grossen: Ein Rauchsprite auf das Vierfache gezogen
     * zeigt seinen eigenen Rahmen als helles Rechteck — die weiche Kante liegt im Atlas
     * direkt auf dem Frame-Rand und wird beim Vergroessern mitgesampelt. Bei knapp
     * doppelter Groesse passiert das nicht, und die Wolke bekommt nebenbei eine
     * unruhigere Silhouette.
     */
    const puffs = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
      room.spawnProp(
        'props/smoke',
        middle.x + ((i % 5) - 2) * 62 + (i > 4 ? 30 : 0),
        middle.y - 100 - (i > 4 ? 58 : 0) + (i % 2) * 22,
        i === 2 || i === 6 ? 2.2 : 1.7
      )
    );
    for (const puff of puffs) {
      puff.tint = UI_COLORS.paper;
      puff.alpha = 0;
      timeline.to(puff, { alpha: 0.95, duration: 0.16 }, cloudAt);
    }
    // Die Kaempfer verschwinden darin.
    for (const thief of ctx.thieves) {
      timeline.to(thief.view, { alpha: 0, duration: 0.16 }, cloudAt + 0.08);
    }
    ctx.play('brawl', cloudAt);

    // Die Wolke wackelt — hart und unregelmaessig, sonst wirkt sie wie eine Feder.
    for (let i = 0; i < 9; i++) {
      const at = cloudAt + 0.2 + i * 0.16;
      const dx = ctx.rng.range(-24, 24);
      const dy = ctx.rng.range(-16, 16);
      for (const puff of puffs) {
        timeline.to(puff, { x: puff.x + dx, y: puff.y + dy, duration: 0.08, ease: 'none' }, at);
        timeline.to(puff, { x: puff.x, y: puff.y, duration: 0.08, ease: 'none' }, at + 0.08);
      }
      if (i % 3 === 1) timeline.add(fx.starsAbove(middle.x + dx, middle.y - 180, 3, 700), at);
    }
    timeline.add(ctx.camera.shake(10, 900), cloudAt + 0.2);

    // Genau ein Schuh fliegt raus.
    const shoe = room.spawnProp('props/shoe', middle.x, middle.y - 150, 1.2);
    timeline.to(
      shoe,
      { x: middle.x - 320, y: middle.y - 40, rotation: -6, duration: 0.8, ease: 'power2.out' },
      cloudAt + 0.7
    );

    // Die Wolke verzieht sich, alle sitzen platt da.
    const clearAt = cloudAt + 1.8;
    for (const puff of puffs) {
      timeline.to(puff, { alpha: 0, y: puff.y - 60, duration: 0.4 }, clearAt);
    }
    /*
     * Hit-Stop vor der Pointe: Die Wolke ist weg, einen Moment passiert nichts — und
     * dann erst sieht man, wie es allen ergangen ist.
     */
    const afterCloud = hitStop(timeline, clearAt);
    for (const thief of ctx.thieves) {
      timeline.to(thief.view, { alpha: 1, duration: 0.2 }, afterCloud);
      timeline.call(() => thief.setFace('x_eyes'), undefined, afterCloud);
      timeline.to(thief.rig.body, { y: 40, rotation: ctx.rng.range(-0.3, 0.3), duration: 0.3 }, afterCloud);
      timeline.to(thief.rig.body.scale, { x: 1.2, y: 0.8, duration: 0.3 }, afterCloud);
    }
    ctx.play('crowd_laugh', clearAt);

    // Kassel mit der Kelle.
    const ladle = room.spawnProp('props/ladle', room.kassel.view.x, room.kassel.view.y - 200, 1.1);
    ladle.alpha = 0;
    timeline.to(ladle, { alpha: 1, rotation: 0.4, duration: 0.3 }, clearAt + 0.2);
    timeline.to(ladle, { rotation: -0.2, duration: 0.35, yoyo: true, repeat: 1 }, clearAt + 0.5);
    timeline.to(ladle, { alpha: 0, duration: 0.3 }, clearAt + 1.3);
    timeline.call(() => ctx.say('allSteal', 2200), undefined, clearAt + 0.3);

    timeline.add(buildSipCounters(ctx, 140), clearAt + 0.4);
    timeline.to({}, { duration: 1.0 });
    return timeline;
  },
};
