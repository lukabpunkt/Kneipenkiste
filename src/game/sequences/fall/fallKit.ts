/**
 * Die Bausteine, die alle sechs Stürze teilen (Roadmap M4.3).
 *
 * Jede Fall-Sequenz erzählt einen eigenen Gag, aber vier Dinge sind in allen gleich:
 * der Blickkontakt am Anfang, das Zerreissen des Balkens, der Platsch und der Aufstieg
 * am Ende. Sie hier zu bündeln ist nicht nur weniger Tipparbeit — es ist die einzige Art,
 * die Signatur (ADR-3) und "jeder klettert wieder hoch" (Art Direction §7) sechsmal
 * gleich zu bekommen.
 *
 * Was hier **nicht** hingehört: der Gag. Der ist pro Sequenz anders, und wer ihn
 * hierher zieht, macht aus sechs Stürzen einen mit Parametern.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import type { Hiker } from '../../Hiker';
import type { Plank } from '../../Plank';
import type { SequenceContext } from '../Sequence';

/** Wo im Fluss jemand landet. */
export const RIVER_SURFACE = STAGE.riverY - 10;

/** Die Hikers dieser Gruppe, in der Reihenfolge, in der sie auf dem Balken stehen. */
export function fallersOf(ctx: SequenceContext): Hiker[] {
  return ctx.players
    .map((id) => ctx.hikers.get(id))
    .filter((hiker): hiker is Hiker => hiker !== undefined);
}

export function plankOf(ctx: SequenceContext): Plank | undefined {
  return ctx.plank !== undefined ? ctx.bridge.planks.get(ctx.plank) : undefined;
}

/**
 * Der Blickkontakt — Label `eyeContact` bei 0.
 *
 * **Immer** der Anfang einer Fall-Sequenz, in allen sechs (ADR-3). Die Köpfe drehen sich
 * zueinander, das Gesicht wird `oh`, kurz darauf kommt die Sprechblase. Erst wenn das
 * gelaufen ist, darf etwas brechen.
 */
export function eyeContact(
  timeline: gsap.core.Timeline,
  ctx: SequenceContext,
  fallers: Hiker[],
  plank: Plank
): void {
  timeline.addLabel('eyeContact', 0);
  timeline.call(
    () => {
      fallers.forEach((hiker, index) => {
        const other = fallers[index === 0 ? 1 : index - 1];
        if (other) hiker.lookAt(other);
      });
      ctx.play('creak_1');
    },
    undefined,
    0
  );

  timeline.add(
    ctx.fx.bubbles.show(
      { text: ctx.t('step.oh'), x: plank.baseX, y: plank.baseY - 210 },
      Math.max(500, ctx.timing.snapMs - 200)
    ),
    0.28
  );

  /* Näher ran: Das Publikum soll die zwei Gesichter sehen, nicht die Brücke. */
  timeline.add(ctx.camera.zoomTo(plank.baseX, plank.baseY - 40, Math.max(240, ctx.timing.snapMs)), 0);
}

/**
 * Der Bruch — Label `snap` bei `ctx.timing.snapMs`.
 *
 * Ab hier gehört das Rig der Sequenz (`setDriven`), sonst zieht der Walk-Cycle jeden
 * Frame dagegen.
 */
export function snap(
  timeline: gsap.core.Timeline,
  ctx: SequenceContext,
  fallers: Hiker[],
  plank: Plank,
  options: { breakPlank?: boolean } = {}
): number {
  const at = ctx.timing.snapMs / 1000;

  timeline.addLabel('snap', at);
  timeline.call(
    () => {
      for (const hiker of fallers) {
        hiker.stopWobble();
        hiker.setDriven(true);
      }
      ctx.fx.burstSplinters(plank.baseX, plank.baseY, 10);
      ctx.play('plank_snap');
    },
    undefined,
    at
  );

  if (options.breakPlank !== false) timeline.add(plank.snap(), at);
  timeline.add(ctx.camera.shake(), at);
  return at;
}

/**
 * Der Platsch: Spritzer, Ringe, Ton.
 *
 * In `call()` und nicht als Tween, weil die Position erst beim Abspielen feststeht
 * (ADR-19) — beim Bauen der Timeline steht der Hiker noch auf dem Plateau.
 */
export function splash(timeline: gsap.core.Timeline, ctx: SequenceContext, fallers: Hiker[]): void {
  timeline.call(() => {
    for (const hiker of fallers) ctx.fx.splashAt(hiker.x, STAGE.riverY);
    ctx.play('splash');
  });
}

/**
 * Der Aufstieg — Label `climbedBack` am Ende.
 *
 * Kein Hiker verschwindet (Art Direction §7). Das ist der Grund, warum die Stürze lustig
 * bleiben statt gemein zu werden: Man sieht sofort, dass es niemandem wehtut.
 */
export function climbBack(
  timeline: gsap.core.Timeline,
  ctx: SequenceContext,
  fallers: Hiker[],
  plank: Plank
): void {
  /* Untertauchen — damit der Aufstieg ein Auftauchen ist. */
  timeline.to(
    fallers.map((hiker) => hiker.view),
    { alpha: 0.2, duration: 0.2 }
  );

  /*
   * **Nach** dem Ausblenden, nicht gleichzeitig: `wetClimb` setzt die Deckkraft selbst
   * zurück, und eine noch laufende Ausblendung überschriebe sie sofort wieder (ADR-19).
   */
  timeline.call(() => {
    for (const hiker of fallers) {
      hiker.view.rotation = 0;
      hiker.squash(1);
      hiker.wetClimb(hiker.x, plank.baseY - 4);
    }
    ctx.play('crowd_laugh');
  });

  /* Der Aufstieg läuft in einer eigenen Timeline; die Show wartet auf ihn. */
  timeline.to({}, { duration: 1.2 });
  timeline.call(() => {
    for (const hiker of fallers) hiker.setDriven(false);
  });
  timeline.addLabel('climbedBack');
}

/** Der schlichte Sturz zum Fluss — die Grundbewegung, auf der die Gags aufsetzen. */
export function dropToRiver(
  timeline: gsap.core.Timeline,
  fallers: Hiker[],
  at: number,
  options: { durationMs?: number; spin?: boolean; drift?: number } = {}
): void {
  const duration = (options.durationMs ?? 800) / 1000;
  const drift = options.drift ?? 52;

  fallers.forEach((hiker, index) => {
    const offset = (index - (fallers.length - 1) / 2) * drift;
    timeline.to(hiker.view.position, { y: RIVER_SURFACE, duration, ease: 'power2.in' }, at);
    timeline.to(hiker.view.position, { x: () => hiker.x + offset, duration, ease: 'sine.out' }, at);
    if (options.spin !== false) {
      timeline.to(
        hiker.view,
        { rotation: index % 2 === 0 ? 1.7 : -1.7, duration, ease: 'none' },
        at
      );
    }
  });
}

/**
 * Die Hüte bleiben oben und schweben hinterher (GDD §4.3).
 *
 * Ein Follow-Through-Effekt im Wortsinn: Was leichter ist, kommt später an. Zwei
 * Sequenzen nutzen ihn, deshalb steht er hier.
 */
export function hatsFlutter(
  timeline: gsap.core.Timeline,
  ctx: SequenceContext,
  fallers: Hiker[],
  at: number
): void {
  timeline.call(
    () => {
      ctx.play('hat_flutter');
      for (const hiker of fallers) {
        const hat = hiker.detachHat(ctx.fx.view);
        if (!hat) continue;
        gsap.to(hat.position, { y: RIVER_SURFACE - 40, duration: 2.2, ease: 'sine.in' });
        gsap.to(hat, { rotation: 2.4, duration: 2.2, ease: 'none' });
        gsap.to(hat.position, { x: hat.position.x + 30, duration: 1.1, yoyo: true, repeat: 1 });
      }
    },
    undefined,
    at
  );
}
