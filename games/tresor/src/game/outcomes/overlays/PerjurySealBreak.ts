/**
 * `perjury_seal_break` (GDD §4.4) — der Moment, für den es den Eid-Modus gibt.
 *
 * Beim Aufdecken der Karte eines Meineidigen bricht das Wachssiegel: Blitz, drei
 * Scherben, ein Donner. Das Overlay legt sich **über** die Dieb-Inszenierung, es ersetzt
 * sie nicht — wer schwört und stiehlt, wird zweimal angesehen.
 *
 * M4 gibt dem Moment seine zwei Pointen: Dem Meineidigen waechst in drei Schueben die
 * Luegennase, und Kassel knallt ihm den MEINEID-Stempel auf die Brust. Beides ist
 * Anklage, kein Schmuck — der Eid-Modus lebt davon, dass ein gebrochener Eid sichtbar
 * teurer aussieht als ein ehrlicher Diebstahl.
 */

import gsap from 'gsap';
import { Sprite } from 'pixi.js';
import { UI_COLORS } from '@/config/theme';
import type { OutcomeContext, OverlaySequence } from '../OutcomeSequence';
import type { DecisionCard } from '../../DecisionCard';
import type { Crook } from '../../Crook';

/** Wieviele Scherben wegfliegen (Art Direction §8: genau drei). */
const SHARDS = 3;

export const perjurySealBreak: OverlaySequence = {
  id: 'perjury_seal_break',

  buildOnCard(ctx: OutcomeContext, card: DecisionCard, crook: Crook): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const sheet = ctx.room.frontSheet;
    const shardTexture = sheet.textures['cards/seal_shard'];

    ctx.play('thunder');
    ctx.play('stamp', 0.18);
    // Kassel kommentiert den Bruch — er ist der Buchhalter des Eids (GDD §7).
    ctx.say('perjury', 2200);

    // Der Blitz: Der Raum blitzt kurz weiss auf, dann bleibt Rot.
    timeline.add(ctx.room.flash(UI_COLORS.paper, 0.35, 120), 0);
    timeline.add(ctx.camera.shake(9, 220), 0.08);

    // Der Crook zuckt zusammen und schaut ertappt.
    timeline.call(() => crook.setFace('guilty'), undefined, 0.1);
    timeline.to(crook.view.scale, { y: crook.view.scale.y * 0.9, duration: 0.08 }, 0.1);
    timeline.to(crook.view.scale, { y: crook.view.scale.y, duration: 0.24, ease: 'elastic.out(1, 0.4)' });

    /*
     * Die Nase waechst, waehrend die Scherben noch fliegen: Erst der Bruch, dann die
     * Luege, dann der Stempel — drei Schlaege statt eines Knalls (Art Direction §7,
     * Staffelung).
     */
    timeline.add(crook.growNose(), 0.34);
    timeline.add(crook.stamp(), 0.78);
    timeline.add(ctx.camera.shake(6, 160), 0.78);
    timeline.add(ctx.room.flash(UI_COLORS.steal, 0.22, 140), 0.78);

    if (!shardTexture) return timeline;

    /*
     * Die Scherben haengen an der Karte, nicht an der Buehne: Sie sollen dort
     * wegfliegen, wo das Siegel klebte — auch wenn die Karte inzwischen woanders liegt.
     */
    for (let i = 0; i < SHARDS; i++) {
      const shard = new Sprite(shardTexture);
      shard.anchor.set(0.5);
      shard.position.set(70, 100);
      card.view.addChild(shard);

      const angle = (-0.4 + i * 0.45) * Math.PI;
      timeline.fromTo(
        shard,
        { alpha: 1, rotation: 0 },
        {
          x: 70 + Math.cos(angle) * 150,
          y: 100 + Math.sin(angle) * 150 + 90,
          rotation: (i - 1) * 2.4,
          alpha: 0,
          duration: 0.75,
          ease: 'power2.out',
          onComplete: () => shard.destroy(),
        },
        0.06
      );
    }

    return timeline;
  },
};
