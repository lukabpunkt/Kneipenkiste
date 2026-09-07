/**
 * `steal_solo_magician` — "Der Alleingang", dritte Variante (GDD §4.4).
 *
 * Der Dieb zaubert den Tresorinhalt mit einem Tuch weg und verbeugt sich. Die Teiler
 * klatschen automatisch, merken es dann — und hören auf.
 *
 * Das Klatschen ist der Witz: Die Reaktion kommt vor dem Verstehen. Deshalb ist der
 * Applaus rhythmisch und bricht mitten im Takt ab.
 */

import gsap from 'gsap';
import { STAGE, UI_COLORS } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const magician: OutcomeSequence = {
  id: 'steal_solo_magician',
  outcome: 'soloSteal',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const thief = ctx.thieves[0];
    if (!thief) return timeline;

    const world = STAGE.worldSize;
    const vaultAt = { x: world / 2, y: world * 0.2 };

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();
    for (const crook of ctx.sharers) {
      timeline.call(() => crook.lookAt(vaultAt.x, vaultAt.y), undefined, 0);
    }

    // Das Tuch faehrt ueber den Tresor.
    const cloth = room.spawnProp('props/cloth', world * 1.3, vaultAt.y, 2.6);
    cloth.tint = UI_COLORS.velvet;
    ctx.play('pass_whoosh', 0.2);
    timeline.to(cloth, { x: vaultAt.x, duration: 0.45, ease: 'power2.out' }, 0.2);
    timeline.to(cloth, { rotation: 0.06, duration: 0.2, yoyo: true, repeat: 1 }, 0.65);

    // Darunter verschwindet der Inhalt.
    timeline.call(() => room.vault.setFill(0), undefined, 0.9);
    timeline.add(fx.smokePuff(vaultAt.x, vaultAt.y + 60, 6, UI_COLORS.velvetLight), 0.9);
    ctx.play('coin_shimmer', 0.9);

    // Tuch weg, Tresor leer — und dann eine Sekundenbruchteil-Stille auf dem leeren Tresor.
    timeline.to(cloth, { x: -world * 0.35, duration: 0.5, ease: 'power2.in' }, 1.1);
    hitStop(timeline, 1.6);

    // Die Verbeugung.
    timeline.call(() => thief.setFace('smug'), undefined, 1.3);
    timeline
      .to(thief.rig.body, { rotation: 0.5, y: 20, duration: 0.3, ease: 'power2.out' }, 1.35)
      .to(thief.rig.body, { rotation: 0, y: 0, duration: 0.35, ease: 'back.out(2)' }, 1.85);

    /*
     * Der Applaus. Vier Takte — und beim dritten faellt der Groschen: Die Haende bleiben
     * oben stehen, die Gesichter kippen. Genau dieser Bruch ist der Gag.
     */
    ctx.play('crowd_laugh', 1.5);
    ctx.sharers.forEach((crook) => {
      for (let i = 0; i < 4; i++) {
        const at = 1.5 + i * 0.26;
        timeline
          .to(crook.rig.armL, { rotation: crook.armRest + 1.5, duration: 0.12 }, at)
          .to(crook.rig.armR, { rotation: -crook.armRest - 1.5, duration: 0.12 }, at)
          .to(crook.rig.armL, { rotation: crook.armRest + 1.1, duration: 0.12 }, at + 0.13)
          .to(crook.rig.armR, { rotation: -crook.armRest - 1.1, duration: 0.12 }, at + 0.13);
      }
      // Und aus.
      timeline.call(() => crook.setFace('jaw_drop'), undefined, 2.55);
      timeline.to(crook.rig.armL, { rotation: crook.armRest, duration: 0.5, ease: 'power2.out' }, 2.6);
      timeline.to(crook.rig.armR, { rotation: -crook.armRest, duration: 0.5, ease: 'power2.out' }, 2.6);
    });
    ctx.play('crowd_gasp', 2.55);
    timeline.call(() => ctx.say('soloSteal', 2000), undefined, 2.7);

    timeline.add(buildSipCounters(ctx, 0), 3.0);
    timeline.to({}, { duration: 0.8 });
    return timeline;
  },
};
