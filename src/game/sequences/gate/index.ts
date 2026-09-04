/**
 * Die vier Schranken-Sequenzen (GDD §4.2, ADR-4).
 *
 * Saubere Koffer zuerst, Schmuggler zuletzt. Für die sauberen zwei ruhige Varianten,
 * für die Schmuggler zwei laute — und vor jeder lauten der **Stall von 600 ms** mit
 * gelber Ampel: die halbe Sekunde, in der alle noch glauben, es sei nichts.
 *
 * Jede Sequenz bleibt unter 3 s (Audit A3). Das ist keine Willkür: An der Schranke
 * laufen bis zu sieben davon hintereinander, und was einzeln lustig ist, wird zu siebt
 * zur Wartezeit.
 */

import gsap from 'gsap';
import { play } from '@/audio/AudioManager';
import { GATE } from '@/config/choreo';
import { LAYOUT } from '@/config/theme';
import { t } from '@/core/i18n';
import type { Sequence, SequenceContext } from '../Sequence';

/** Der gemeinsame Anfang: Reisender und Koffer gehen zur Schranke. */
function walkUp(ctx: SequenceContext, timeline: gsap.core.Timeline): void {
  const target = LAYOUT.gate.x - 90;
  if (ctx.traveler) timeline.add(ctx.traveler.walkThroughGate(target, GATE.walkUp), 0);
  timeline.to(ctx.suitcase.view, { x: target - 60, duration: GATE.walkUp, ease: 'none' }, 0);
}

/**
 * Das gemeinsame Ende: Wer durch ist, geht auch weg.
 *
 * Ohne das stapeln sich bei sieben Koffern sieben Reisende auf demselben Fleck — und die
 * Schranke sieht am Ende aus wie eine Menschentraube, nicht wie ein Durchgang. Sie laufen
 * nach rechts aus dem Bild und blenden dabei aus.
 */
function exitStage(ctx: SequenceContext, timeline: gsap.core.Timeline): void {
  const out = LAYOUT.gate.x + 220;

  if (ctx.traveler) {
    timeline.add(ctx.traveler.walkThroughGate(out, 0.45), '>0.15');
    timeline.to(ctx.traveler.view, { alpha: 0, duration: 0.3 }, '<0.15');
  }
  timeline.to(ctx.suitcase.view, { x: out - 50, alpha: 0, duration: 0.45, ease: 'none' }, '<');
}

/* ------------------------------------------------------------------ */
/* Saubere Koffer                                                      */
/* ------------------------------------------------------------------ */

/** `pass_clean_wave` — Stempel „OK", der Reisende winkt kurz. 1.2 s. */
export const WaveGate: Sequence = {
  id: 'gate_clean_wave',
  kind: 'gateClean',
  weight: 1,
  build(ctx) {
    const timeline = gsap.timeline();
    walkUp(ctx, timeline);

    timeline.call(() => {
      ctx.view.hall.setLight('green');
      ctx.traveler?.setFace('happy');
      play('stamp_ok');
    });
    timeline.add(
      ctx.fx.stamp(ctx.suitcase.view.x, ctx.suitcase.view.y - 120, 'ok', t('gate.stampOk'), ctx.rng),
      '<'
    );
    if (ctx.traveler) timeline.add(ctx.traveler.wave(), '<0.1');
    timeline.add(ctx.officer.clipboardMark('check'), '<');
    exitStage(ctx, timeline);

    return timeline;
  },
};

/**
 * `pass_clean_relief` — der Reisende atmet aus, die Knie werden weich.
 *
 * Der Gag lebt davon, dass er nichts zu verbergen hatte: Wer erleichtert ist, obwohl er
 * sauber war, hat trotzdem geschwitzt. Das ist der Tisch, nicht die Figur.
 */
export const ReliefGate: Sequence = {
  id: 'gate_clean_relief',
  kind: 'gateClean',
  weight: 1,
  build(ctx) {
    const timeline = gsap.timeline();
    walkUp(ctx, timeline);

    timeline.call(() => {
      ctx.view.hall.setLight('green');
      ctx.traveler?.sweat(2);
      play('crowd_aww');
    });

    if (ctx.traveler) {
      const rig = ctx.traveler.rig;
      /* Knie weich: einmal absacken, dann fangen. */
      timeline.to(rig.body, { y: 22, duration: 0.22, ease: 'power2.in' });
      timeline.to(rig.body.scale, { y: 0.9, x: 1.08, duration: 0.22, ease: 'power2.in' }, '<');
      timeline.call(() => ctx.traveler?.setFace('happy'));
      timeline.to(rig.body, { y: 0, duration: 0.42, ease: 'elastic.out(1,0.45)' });
      timeline.to(rig.body.scale, { y: 1, x: 1, duration: 0.42, ease: 'elastic.out(1,0.45)' }, '<');
    }

    timeline.add(
      ctx.fx.stamp(ctx.suitcase.view.x, ctx.suitcase.view.y - 120, 'ok', t('gate.stampOk'), ctx.rng),
      '<0.1'
    );
    exitStage(ctx, timeline);

    return timeline;
  },
};

/* ------------------------------------------------------------------ */
/* Schmuggler                                                          */
/* ------------------------------------------------------------------ */

/**
 * Der Stall vor jedem Schmuggler-Reveal.
 *
 * Die Ampel bleibt **gelb** — nicht grün, nicht rot. Grün wäre eine Lüge, rot verriete
 * das Ergebnis. Gelb heißt „warte", und genau das sollen alle am Tisch tun.
 */
function smugglerStall(ctx: SequenceContext, timeline: gsap.core.Timeline): void {
  timeline.call(() => {
    ctx.view.hall.setLight('amber');
    play('crowd_gasp');
  });
  timeline.to({}, { duration: GATE.smugglerStall });
}

/** `pass_smuggler_moonwalk` — er moonwalkt durch, dreht sich, zeigt die Ware. */
export const MoonwalkGate: Sequence = {
  id: 'gate_smuggler_moonwalk',
  kind: 'gateSmuggler',
  weight: 1,
  build(ctx) {
    const timeline = gsap.timeline();
    walkUp(ctx, timeline);
    smugglerStall(ctx, timeline);

    timeline.call(() => {
      ctx.traveler?.beSmug();
      play('moonwalk_sting');
    });

    if (ctx.traveler) {
      /* Rückwärts gleiten: Der Körper bewegt sich, die Beine tun so, als liefen sie vor. */
      const rig = ctx.traveler.rig;
      timeline.to(ctx.traveler.view, { x: '-=70', duration: 0.5, ease: 'none' });
      timeline.to(rig.legL, { rotation: 0.4, duration: 0.12, yoyo: true, repeat: 3 }, '<');
      timeline.to(rig.legR, { rotation: -0.4, duration: 0.12, yoyo: true, repeat: 3 }, '<');
      /* Und dann dreht er sich um. */
      timeline.to(ctx.traveler.view.scale, { x: -ctx.traveler.view.scale.x, duration: 0.14 });
    }

    timeline.add(ctx.suitcase.openCaught(), '<');
    timeline.call(() => {
      ctx.fx.itemFountain(ctx.suitcase.view.x, ctx.suitcase.view.y - 60, ctx.itemSet, ctx.amount, ctx.rng);
      play('items_fountain');
      ctx.officer.setFace('facepalm');
    });
    timeline.add(ctx.officer.clipboardMark('crumple'), '<');
    timeline.add(
      ctx.fx.stamp(
        ctx.suitcase.view.x,
        ctx.suitcase.view.y - 150,
        'through',
        t('gate.stampThrough'),
        ctx.rng
      ),
      '<'
    );
    exitStage(ctx, timeline);

    return timeline;
  },
};

/** `pass_smuggler_bow` — er verbeugt sich, der Koffer klappt auf wie ein Zauberkasten. */
export const BowGate: Sequence = {
  id: 'gate_smuggler_bow',
  kind: 'gateSmuggler',
  weight: 1,
  build(ctx) {
    const timeline = gsap.timeline();
    walkUp(ctx, timeline);
    smugglerStall(ctx, timeline);

    timeline.call(() => {
      ctx.traveler?.beSmug();
      play('crowd_laugh');
    });

    if (ctx.traveler) {
      /* Die Verbeugung: Oberkörper runter, Arm zur Seite, wieder hoch. */
      const rig = ctx.traveler.rig;
      timeline.to(rig.body, { rotation: 0.42, y: 12, duration: 0.28, ease: 'power2.out' });
      timeline.to(rig.armR, { rotation: -1.2, duration: 0.28, ease: 'back.out(2)' }, '<');
      timeline.to(rig.body, { rotation: 0, y: 0, duration: 0.32, ease: 'back.out(1.6)' }, '>0.15');
      timeline.to(rig.armR, { rotation: -0.2, duration: 0.32 }, '<');
    }

    timeline.add(ctx.suitcase.openCaught(), '<');
    timeline.call(() => {
      ctx.fx.itemFountain(ctx.suitcase.view.x, ctx.suitcase.view.y - 60, ctx.itemSet, ctx.amount, ctx.rng);
      ctx.fx.confettiBurst(ctx.suitcase.view.x, ctx.suitcase.view.y - 100, ctx.rng);
      play('confetti');
      ctx.officer.setFace('facepalm');
    });
    timeline.add(
      ctx.fx.stamp(
        ctx.suitcase.view.x,
        ctx.suitcase.view.y - 150,
        'through',
        t('gate.stampThrough'),
        ctx.rng
      ),
      '<'
    );
    exitStage(ctx, timeline);

    return timeline;
  },
};

export const GATE_SEQUENCES: readonly Sequence[] = [WaveGate, ReliefGate, MoonwalkGate, BowGate];
