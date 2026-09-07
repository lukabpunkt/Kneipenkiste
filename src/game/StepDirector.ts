/**
 * Der StepDirector (Architektur §6) — er spielt das `StepScript` ab, mehr nicht.
 *
 * Das Ergebnis steht seit `resolveRound()` fest; hier wird nichts mehr entschieden.
 * Der Director übersetzt eine Zeitachse in eine GSAP-Timeline: Intro → Anlauf →
 * gemeinsamer Schritt mit Hit-Stop → Knarren → Blickkontakt in Slow-Mo → Bruch →
 * Nachspiel.
 *
 * **M2-Stand:** Der Bruch läuft als direkte Animation, ohne Fall-Sequenz. Die sechs
 * Sequenzen kommen in M4 und hängen sich an dieselben Stellen (`breaks[].sequenceId`).
 * Was hier schon vollständig ist, ist die Choreographie — und die ist der Teil, an dem
 * die Show hängt.
 */

import gsap from 'gsap';
import { STAGE, hikerSpreadFor } from '@/config/theme';
import type { StepScript } from '@/core/choreographer';
import type { PlankId, PlayerId } from '@/core/types';
import type { Bridge } from './Bridge';
import type { Camera } from './Camera';
import type { Canyon } from './Canyon';
import type { Carpenter } from './Carpenter';
import type { Hiker } from './Hiker';
import type { Vulture } from './Vulture';

export interface StepDirectorContext {
  script: StepScript;
  bridge: Bridge;
  canyon: Canyon;
  camera: Camera;
  vulture: Vulture;
  carpenter: Carpenter;
  hikers: Map<PlayerId, Hiker>;
  /** Wer auf welchem Balken steht — für Staffelung und Blickkontakt. */
  occupants: Map<PlankId, PlayerId[]>;
  /** Bestimmt, wie breit zwei Hikers auf einem Balken auseinanderstehen. */
  playerCount: number;
  onFinished: () => void;
  /**
   * Meldet Momente, an denen der Screen mithören muss: der gemeinsame Schritt, jeder
   * Bruch, und die Freigabe des Skip-Knopfs.
   *
   * Warum nicht per `setTimeout` im Screen? Weil die Timeline im Blickkontakt auf halbe
   * Geschwindigkeit geht. Ein Wecker auf der Wanduhr klingelt dann **vor** dem Bruch —
   * und gäbe den Skip-Knopf frei, bevor es überhaupt gekracht hat (GDD §4.2).
   */
  onBeat?: (beat: StepBeat) => void;
}

export type StepBeat = 'step' | 'break' | 'skippable';

export class StepDirector {
  private readonly timeline: gsap.core.Timeline;
  private readonly ctx: StepDirectorContext;

  constructor(ctx: StepDirectorContext) {
    this.ctx = ctx;
    this.timeline = gsap.timeline({ paused: true, onComplete: ctx.onFinished });
    this.build();
  }

  private at(ms: number): number {
    return ms / 1000;
  }

  private beat(name: StepBeat): void {
    this.ctx.onBeat?.(name);
  }

  private build(): void {
    const { script, bridge, camera, vulture, hikers } = this.ctx;
    const tl = this.timeline;

    /* --- Intro: Kamerafahrt über die Schlucht, Gustav kreist --- */
    tl.add(camera.intro(script.intro.endsAt), 0);
    tl.add(vulture.circle(script.intro.endsAt), 0);
    if (script.intro.deathZone) {
      /* Die Todeszone wird gross angekündigt (GDD §4.2) — das Schild und die Trommel. */
      tl.add(vulture.screech(), this.at(script.intro.endsAt * 0.5));
    }

    /* --- Anlauf: alle laufen gleichzeitig los und kommen im selben Frame an --- */
    const runMs = script.step.at - script.intro.endsAt;
    for (const entry of script.run) {
      const hiker = hikers.get(entry.hikerId);
      if (!hiker) continue;

      const target = this.targetFor(entry.hikerId, entry.plank);
      /*
       * Die Signatur (CLAUDE.md): `runTo` bekommt eine **Dauer**, keine Geschwindigkeit.
       * Acht verschiedene Distanzen, ein Ankunftsframe.
       */
      tl.add(hiker.runTo(target.x, target.y, runMs), this.at(script.intro.endsAt));
    }

    /* --- Der Schritt: Hit-Stop. Ein Frame, in dem die Welt steht --- */
    tl.addLabel('step', this.at(script.step.at));
    tl.call(
      () => {
        for (const hiker of hikers.values()) hiker.setFace('scared');
        this.beat('step');
      },
      undefined,
      this.at(script.step.at)
    );

    /* --- Knarren: jeder besetzte Balken, die sicheren leiser (ADR-3) --- */
    const creakAt = script.step.at + script.step.hitStopMs;
    for (const entry of script.creak) {
      tl.call(
        () => {
          bridge.planks.get(entry.plank)?.creak(entry.amplitude);
          for (const playerId of this.ctx.occupants.get(entry.plank) ?? []) {
            hikers.get(playerId)?.wobble(entry.amplitude);
          }
        },
        undefined,
        this.at(creakAt)
      );

      /* Der morsche Balken fällt mitten im Knarren aus der Tarnung. */
      if (entry.revealAt !== undefined && entry.amplitudeEnd !== undefined) {
        const amplitude = entry.amplitudeEnd;
        tl.call(
          () => bridge.planks.get(entry.plank)?.setCreakAmplitude(amplitude),
          undefined,
          this.at(entry.revealAt)
        );
      }
    }

    /* --- Blickkontakt: die Signatur, immer vor dem Bruch (ADR-3) --- */
    for (const look of script.eyeContact) {
      tl.call(
        () => {
          const [a, b] = look.hikerIds;
          const first = a ? hikers.get(a) : undefined;
          const second = b ? hikers.get(b) : undefined;
          if (first && second) {
            first.lookAt(second);
            second.lookAt(first);
          }
          /* Ab drei Leuten schaut jeder den an, der links von ihm steht. */
          for (let i = 2; i < look.hikerIds.length; i += 1) {
            const other = hikers.get(look.hikerIds[i - 1]!);
            const self = hikers.get(look.hikerIds[i]!);
            if (other && self) self.lookAt(other);
          }
        },
        undefined,
        this.at(look.at)
      );

      const plank = bridge.planks.get(look.plank);
      if (plank) tl.add(camera.zoomTo(plank.baseX, plank.baseY, 400), this.at(look.at));
    }

    /*
     * Slow-Mo vom ersten Blick bis zum ersten Bruch.
     *
     * Über `timeScale` der ganzen Timeline, nicht über einzelne Tweens: Nur so wird das
     * gesamte Bild langsam — Knarren, Wind, Kamera. Ein Slow-Mo, in dem der Nebel weiter
     * in Echtzeit zieht, ist kein Slow-Mo.
     */
    if (script.slowMo) {
      const { from, to, factor } = script.slowMo;
      tl.call(() => tl.timeScale(factor), undefined, this.at(from));
      tl.call(() => tl.timeScale(1), undefined, this.at(to));
    }

    /* --- Bruch: nacheinander, mit Kamera-Shake (M4 hängt hier die Sequenzen ein) --- */
    for (const entry of script.breaks) {
      const plank = bridge.planks.get(entry.plank);
      const fallers = this.ctx.occupants.get(entry.plank) ?? [];
      const rotten = entry.sequenceId === 'rotten_crack';

      tl.call(
        () => {
          this.beat('break');
          if (!plank) return;
          for (const playerId of fallers) hikers.get(playerId)?.stopWobble();
          if (rotten) {
            bridge.revealRotten(entry.plank);
            plank.crumble();
          } else {
            plank.snap();
          }
        },
        undefined,
        this.at(entry.at)
      );

      tl.add(camera.shake(), this.at(entry.at));

      /* Der Fall — in M2 als schlichter Sturz zum Fluss, ab M4 als Sequenz. */
      fallers.forEach((playerId, index) => {
        const hiker = hikers.get(playerId);
        if (!hiker) return;
        /*
         * Jeder driftet ein Stück in seine eigene Richtung. Ohne das fallen zwei Hikers
         * deckungsgleich, und aus dem Bild "die beiden stürzen zusammen" wird "einer
         * stürzt" — das Gegenteil dessen, was die Runde erzählt.
         */
        const drift = (index - (fallers.length - 1) / 2) * 46;
        tl.add(this.basicFall(hiker, drift), this.at(entry.at + 60));
      });
    }

    /* --- Sicher: ausatmen, sobald es das erste Mal kracht --- */
    for (const entry of script.safe) {
      const hiker = hikers.get(entry.hikerId);
      if (!hiker) continue;
      tl.call(
        () => {
          hiker.stopWobble();
          hiker.resetHead();
          hiker.setFace('happy');
          bridge.planks.get(this.plankOf(entry.hikerId) ?? -1)?.stopCreak();
        },
        undefined,
        this.at(entry.at)
      );
    }

    /*
     * Der Skip-Knopf wird frei — als Ereignis **auf der Timeline**, nicht auf der
     * Wanduhr. Nach dem letzten Bruch, keine Sekunde früher (GDD §4.2).
     */
    tl.call(() => this.beat('skippable'), undefined, this.at(script.skippableFrom));

    /* --- Nachspiel --- */
    this.buildAftermath();

    tl.addLabel('aftermath', this.at(script.aftermath.at));
  }

  /** Der schlichte Sturz aus M2: fallen, platschen, nass wieder hochklettern. */
  private basicFall(hiker: Hiker, driftX = 0): gsap.core.Timeline {
    const startX = hiker.x;
    const startY = hiker.y;

    hiker.setDriven(true);
    hiker.setFace('help');

    const timeline = gsap.timeline();
    timeline
      .to(hiker.view.position, { y: STAGE.riverY - 10, duration: 0.85, ease: 'power2.in' })
      .to(hiker.view.position, { x: startX + driftX, duration: 0.85, ease: 'sine.out' }, '<')
      .to(hiker.view, { rotation: 1.6, duration: 0.85, ease: 'none' }, '<')
      .to(hiker.view, { alpha: 0.25, duration: 0.2 })
      /* Jeder klettert wieder hoch — kein Hiker verschwindet (Art Direction §7). */
      .add(hiker.wetClimb(startX, startY))
      .call(() => hiker.setDriven(false));
    return timeline;
  }

  private buildAftermath(): void {
    const { script, bridge, carpenter, vulture, hikers } = this.ctx;
    const tl = this.timeline;
    const at = this.at(script.aftermath.at);

    if (script.aftermath.kind === 'allSafeRot' && script.removedPlank !== undefined) {
      const removed = script.removedPlank;
      /*
       * `all_safe_rot`: Erst jubeln alle — und dann fault vor ihren Augen ein Balken ab.
       * Das ist Design-Pfeiler 3 in einem Bild: Frieden ist nie stabil.
       */
      tl.call(
        () => {
          for (const hiker of hikers.values()) hiker.safeWave();
        },
        undefined,
        at
      );
      tl.add(vulture.laugh(), at + 0.4);
      const rot = bridge.rot(removed);
      if (rot) tl.add(rot, at + 0.6);
      return;
    }

    if (script.aftermath.kind === 'repair') {
      const broken = [...bridge.planks.values()].filter((plank) => plank.isBroken());
      tl.add(
        carpenter.repair(broken, (plank) => plank.reset()),
        at
      );
    }
  }

  private plankOf(hikerId: PlayerId): PlankId | undefined {
    for (const [plank, ids] of this.ctx.occupants) {
      if (ids.includes(hikerId)) return plank;
    }
    return undefined;
  }

  /** Wohin ein Hiker läuft: auf seinen Balken, oder unter die Brücke ans Seil. */
  private targetFor(hikerId: PlayerId, plank: PlankId | 'rope'): { x: number; y: number } {
    if (plank === 'rope') {
      /* Der Seil-Nutzer hangelt sich unter der Brücke durch (GDD §3.6). */
      return { x: STAGE.plateauRightStart - 30, y: STAGE.bridgeY + STAGE.bridgeSagY + 70 };
    }

    const occupants = this.ctx.occupants.get(plank) ?? [hikerId];
    const slot = Math.max(0, occupants.indexOf(hikerId));
    const spread = hikerSpreadFor(this.ctx.playerCount, occupants.length);
    const point = this.ctx.bridge.standPoint(plank, slot, occupants.length, spread);
    return point ?? { x: STAGE.worldWidth / 2, y: STAGE.bridgeY };
  }

  play(): void {
    this.timeline.play(0);
  }

  /** Tap-to-Skip — springt ans Nachspiel. Nie vorher (GDD §4.2). */
  skipToAftermath(): void {
    this.timeline.timeScale(1);
    this.timeline.seek('aftermath');
  }

  /** Wie weit die Show ist, in Millisekunden. */
  elapsedMs(): number {
    return this.timeline.time() * 1000;
  }

  destroy(): void {
    this.timeline.kill();
  }
}
