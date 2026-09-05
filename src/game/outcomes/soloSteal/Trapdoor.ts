/**
 * `steal_solo_trapdoor` — "Der Ausgang nach unten" (Backlog nach 1.0).
 *
 * Unter dem Dieb klappt eine Falltür auf. Er sackt weg, winkt noch einmal aus dem Loch,
 * dann fällt der Deckel zu — und die Teiler stehen um ein Loch herum, in dem eben noch
 * jemand stand.
 *
 * Die fünfte Inszenierung für den Alleingang und die einzige, die **nach unten** geht.
 * Fluchtauto und Moonwalk gehen nach links, der Hubschrauber nach oben, der Magier
 * bleibt stehen. Damit sind alle vier Richtungen vergeben.
 */

import gsap from 'gsap';
import { UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const trapdoor: OutcomeSequence = {
  id: 'steal_solo_trapdoor',
  outcome: 'soloSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thief = ctx.thieves[0];
    if (!thief) return timeline;

    const at = { ...thief.position };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Er greift zu und grinst — noch weiss niemand, dass er einen Ausgang hat.
    timeline.call(
      () => {
        thief.showBag(true);
        thief.setFace('smug');
        ctx.play('coin_shimmer');
      },
      undefined,
      0
    );

    /*
     * Das Loch erscheint **unter** ihm — es liegt in der Requisiten-Ebene, also hinter
     * den Figuren. Genau deshalb sieht es aus, als staende er darauf.
     */
    const hole = room.spawnProp('props/hole', at.x, at.y + 6, 0.9);
    hole.alpha = 0;
    hole.scale.set(0.2, 0.2);
    ctx.play('vault_open', 0.35);
    timeline.to(hole, { alpha: 1, duration: 0.14 }, 0.35);
    timeline.to(hole.scale, { x: 0.9, y: 0.9, duration: 0.26, ease: 'back.out(2)' }, 0.35);

    // Anticipation: Er sackt kurz ein, bevor der Boden nachgibt.
    timeline.to(thief.rig.body, { y: 16, duration: 0.12, ease: 'power2.in' }, 0.5);
    timeline.to(thief.rig.body.scale, { x: 1.1, y: 0.9, duration: 0.12 }, 0.5);

    /*
     * Und weg. Der Hit-Stop sitzt in dem Augenblick, in dem er halb im Loch steht —
     * ohne ihn ist es ein Sturz, mit ihm ein Abgang.
     */
    const dropAt = 0.68;
    ctx.play('pass_whoosh', dropAt);
    timeline.to(thief.view, { y: at.y + 90, duration: 0.16, ease: 'power3.in' }, dropAt);
    const afterDrop = hitStop(timeline, dropAt + 0.16);

    // Das Winken aus dem Loch — der eigentliche Gag.
    timeline.call(() => thief.setFace('wave'), undefined, afterDrop);
    timeline.to(thief.rig.armL, { rotation: thief.armRest + 2.4, duration: 0.16 }, afterDrop);
    timeline.to(thief.rig.armL, { rotation: thief.armRest + 1.7, duration: 0.16 }, afterDrop + 0.16);
    timeline.to(thief.rig.armL, { rotation: thief.armRest + 2.4, duration: 0.16 }, afterDrop + 0.32);

    // Dann ist er ganz unten durch.
    timeline.to(thief.view, { y: at.y + 260, alpha: 0, duration: 0.34, ease: 'power2.in' }, afterDrop + 0.5);
    timeline.add(fx.smokePuff(at.x, at.y, 6, UI_COLORS.steel), afterDrop + 0.5);
    ctx.play('vault_close', afterDrop + 0.84);
    timeline.add(ctx.camera.shake(8, 200), afterDrop + 0.84);

    // Das Loch schliesst sich. Uebrig bleibt der Tisch, als waere nichts gewesen.
    timeline.to(hole.scale, { x: 0.1, y: 0.1, duration: 0.24, ease: 'power3.in' }, afterDrop + 0.84);
    timeline.to(hole, { alpha: 0, duration: 0.2 }, afterDrop + 0.96);

    // Die Teiler starren auf die leere Stelle.
    ctx.sharers.forEach((crook, index) => {
      timeline.call(() => crook.lookAt(at.x, at.y), undefined, afterDrop + 0.2);
      timeline.call(() => crook.setFace('innocent'), undefined, afterDrop + 0.3 + index * 0.05);
      timeline.add(crook.jawDrop(), afterDrop + 0.9 + index * 0.09);
    });
    ctx.play('crowd_gasp', afterDrop + 0.9);
    timeline.call(() => ctx.say('soloSteal', 2200), undefined, afterDrop + 1.05);

    // Kein Zaehler mit Zahlen: Beim Alleingang entscheidet DISTRIBUTE (GDD §3.6).
    timeline.add(buildSipCounters(ctx, 0), afterDrop + 1.2);
    timeline.to({}, { duration: 0.9 });
    return timeline;
  },
};
