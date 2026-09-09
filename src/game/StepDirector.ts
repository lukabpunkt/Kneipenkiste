/**
 * Der StepDirector (Architektur §6) — er spielt das `StepScript` ab, mehr nicht.
 *
 * Das Ergebnis steht seit `resolveRound()` fest; hier wird nichts mehr entschieden. Der
 * Director übersetzt eine Zeitachse in **eine** GSAP-Timeline und hängt an den passenden
 * Stellen Sequenzen ein.
 *
 * Die Arbeitsteilung, und sie ist der Kern von M3:
 *
 * - Der Director besitzt die *Beats*: Intro, Anlauf, gemeinsamer Schritt mit Hit-Stop,
 *   Knarren, Slow-Mo, Bruch-Reihenfolge, Nachspiel.
 * - Die *Sequenzen* besitzen, was in einem Beat passiert. Eine Fall-Sequenz beginnt beim
 *   Blickkontakt und trägt ihn selbst (ADR-3) — der Director sagt nur, wann.
 *
 * Deshalb tauscht M4 sechs Dateien und keine Zeile hier.
 */

import gsap from 'gsap';
import { EYE_CONTACT } from '@/config/choreo';
import { MISC_SEQUENCES, OVERLAY_SEQUENCES } from '@/config/sequences';
import type { StepScript } from '@/core/choreographer';
import type { ResultView } from '@/core/publicView';
import type { SeededRng } from '@/core/rng';
import type { PlankId, PlayerId } from '@/core/types';
import type { Bridge } from './Bridge';
import type { Camera } from './Camera';
import type { Canyon } from './Canyon';
import type { Carpenter } from './Carpenter';
import type { FxKit } from './fx';
import type { Hiker } from './Hiker';
import type { Vulture } from './Vulture';
import { STAGE, hikerHeightFor, hikerSpreadFor } from '@/config/theme';
import { FALLBACK_FALL_ID, getSequence, type SequenceContext } from './sequences';

export type StepBeat = 'step' | 'break' | 'skippable';

export interface StepDirectorContext {
  script: StepScript;
  reveal: ResultView;
  bridge: Bridge;
  canyon: Canyon;
  camera: Camera;
  vulture: Vulture;
  carpenter: Carpenter;
  fx: FxKit;
  hikers: Map<PlayerId, Hiker>;
  /** Wer auf welchem Balken steht — für Staffelung und Blickkontakt. */
  occupants: Map<PlankId, PlayerId[]>;
  /** Bestimmt, wie breit zwei Hikers auf einem Balken auseinanderstehen. */
  playerCount: number;
  rng: SeededRng;
  t: (key: string, params?: Record<string, string | number>) => string;
  play: (key: string) => void;
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

  /** Der Kontext, den jede Sequenz bekommt — ohne die `Round`, nur mit dem Reveal. */
  private contextFor(plank: PlankId | undefined, players: PlayerId[], timing: { eyeContactMs: number; snapMs: number }): SequenceContext {
    return {
      reveal: this.ctx.reveal,
      ...(plank !== undefined ? { plank } : {}),
      players,
      hikers: this.ctx.hikers,
      bridge: this.ctx.bridge,
      canyon: this.ctx.canyon,
      camera: this.ctx.camera,
      vulture: this.ctx.vulture,
      carpenter: this.ctx.carpenter,
      fx: this.ctx.fx,
      t: this.ctx.t,
      play: this.ctx.play,
      rng: this.ctx.rng,
      timing,
    };
  }

  /**
   * Spielt eine Sequenz, oder die Ersatz-Sequenz, wenn sie noch nicht gebaut ist.
   *
   * Bis M4 ist jede Fall-Sequenz aus dem Katalog "noch nicht gebaut" — der Choreographer
   * wählt `fall_hold_hands`, gespielt wird `basic_fall`. Eine Show, die wegen einer
   * fehlenden Datei stehenbleibt, wäre die schlechtere Antwort.
   */
  private playSequence(
    id: string,
    fallbackId: string | null,
    ctx: SequenceContext,
    at: number
  ): void {
    const sequence = getSequence(id) ?? (fallbackId ? getSequence(fallbackId) : undefined);
    if (!sequence) return;
    this.timeline.add(sequence.build(ctx), at);
  }

  private build(): void {
    const { script, bridge, camera, vulture, hikers } = this.ctx;
    const tl = this.timeline;

    /* --- Intro: Kamerafahrt über die Schlucht, Gustav kreist --- */
    tl.add(camera.intro(script.intro.endsAt), 0);
    tl.add(vulture.circle(script.intro.endsAt), 0);
    tl.call(() => this.ctx.play('wind_loop'), undefined, 0);

    if (script.intro.deathZone) {
      /* Die Todeszone wird gross angekündigt — vor dem Anlauf, nicht danach (GDD §4.2). */
      this.playSequence(
        MISC_SEQUENCES.deathzoneSign,
        null,
        this.contextFor(undefined, [], { eyeContactMs: 0, snapMs: 0 }),
        this.at(script.intro.endsAt * 0.35)
      );
    }

    /* --- Anlauf: alle laufen gleichzeitig los und kommen im selben Frame an --- */
    const runMs = script.step.at - script.intro.endsAt;
    tl.call(() => this.ctx.play('footsteps_run'), undefined, this.at(script.intro.endsAt));

    for (const entry of script.run) {
      const hiker = hikers.get(entry.hikerId);
      if (!hiker) continue;
      const target = this.targetFor(entry.hikerId, entry.plank);
      /*
       * Die Signatur (CLAUDE.md): `runTo` bekommt eine **Dauer**, keine Geschwindigkeit.
       * Acht verschiedene Distanzen, ein Ankunftsframe — auch der am Seil, der nicht
       * läuft, sondern hangelt (GDD §3.6).
       */
      const move =
        entry.plank === 'rope'
          ? hiker.climbRope(target.x, target.y, runMs)
          : hiker.runTo(target.x, target.y, runMs);
      tl.add(move, this.at(script.intro.endsAt));
    }

    /* --- Der Schritt: Hit-Stop. Ein Frame, in dem die Welt steht --- */
    tl.addLabel('step', this.at(script.step.at));
    tl.call(
      () => {
        for (const hiker of hikers.values()) hiker.setFace('scared');
        this.ctx.play('step_thud');
        this.beat('step');
      },
      undefined,
      this.at(script.step.at)
    );

    /* --- Knarren: jeder besetzte Balken, die sicheren leiser (ADR-3) --- */
    const creakAt = script.step.at + script.step.hitStopMs;
    script.creak.forEach((entry, index) => {
      tl.call(
        () => {
          bridge.planks.get(entry.plank)?.creak(entry.amplitude);
          for (const playerId of this.ctx.occupants.get(entry.plank) ?? []) {
            hikers.get(playerId)?.wobble(entry.amplitude);
          }
          /* Vier Knarr-Varianten, damit acht Balken nicht im Chor dasselbe sagen. */
          this.ctx.play(`creak_${(index % 4) + 1}`);
        },
        undefined,
        this.at(creakAt + index * 60)
      );

      /* Der morsche Balken fällt mitten im Knarren aus der Tarnung. */
      if (entry.revealAt !== undefined && entry.amplitudeEnd !== undefined) {
        const amplitude = entry.amplitudeEnd;
        tl.call(
          () => {
            bridge.planks.get(entry.plank)?.setCreakAmplitude(amplitude);
            this.ctx.play('rope_strain');
          },
          undefined,
          this.at(entry.revealAt)
        );
      }
    });

    /*
     * --- Bruch: die Fall-Sequenz trägt Blickkontakt UND Bruch ---
     *
     * Sie startet beim Blickkontakt, nicht beim Bruch. Nur so steckt die Signatur in der
     * Sequenz und kann in M4 nicht versehentlich weggelassen werden (Architektur §7).
     */
    for (const entry of script.breaks) {
      const players = this.ctx.occupants.get(entry.plank) ?? [];
      const look = script.eyeContact.find((item) => item.plank === entry.plank);
      const startAt = look ? look.at : entry.at;

      tl.call(() => this.beat('break'), undefined, this.at(entry.at));

      const isRotten = entry.sequenceId === OVERLAY_SEQUENCES.rottenCrack;
      const ctx = this.contextFor(entry.plank, players, {
        eyeContactMs: look ? EYE_CONTACT.durationMs : 0,
        snapMs: entry.at - startAt,
      });

      /* Der morsche Balken bricht ohne Zeugen — sein Overlay ist die ganze Sequenz. */
      this.playSequence(entry.sequenceId, isRotten ? null : FALLBACK_FALL_ID, ctx, this.at(startAt));
    }

    /*
     * Slow-Mo vom ersten Blick bis zum ersten Bruch — über `timeScale` der ganzen
     * Timeline, nicht über einzelne Tweens: Ein Slow-Mo, in dem der Nebel weiter in
     * Echtzeit zieht, ist kein Slow-Mo.
     */
    if (script.slowMo) {
      const { from, to, factor } = script.slowMo;
      tl.call(() => tl.timeScale(factor), undefined, this.at(from));
      tl.call(() => tl.timeScale(1), undefined, this.at(to));
    }

    /* --- Sicher: ausatmen, sobald es das erste Mal kracht --- */
    for (const entry of script.safe) {
      const plank = this.plankOf(entry.hikerId);
      this.playSequence(
        entry.sequenceId,
        null,
        this.contextFor(plank, [entry.hikerId], { eyeContactMs: 0, snapMs: 0 }),
        this.at(entry.at)
      );
    }

    /* --- Overlays: Stempel und Kommentare --- */
    for (const overlay of script.overlays) {
      if (overlay.id === OVERLAY_SEQUENCES.rottenCrack) continue; /* läuft schon als Bruch */
      this.playSequence(
        overlay.id,
        null,
        this.contextFor(this.plankOf(overlay.target), [overlay.target], { eyeContactMs: 0, snapMs: 0 }),
        this.at(script.aftermath.at - 400)
      );
    }

    /*
     * Der Skip-Knopf wird frei — als Ereignis **auf der Timeline**, nicht auf der
     * Wanduhr. Nach dem letzten Bruch, keine Sekunde früher (GDD §4.2).
     */
    tl.call(() => this.beat('skippable'), undefined, this.at(script.skippableFrom));

    /* --- Nachspiel --- */
    tl.addLabel('aftermath', this.at(script.aftermath.at));
    const aftermathId =
      script.aftermath.kind === 'allSafeRot' ? MISC_SEQUENCES.allSafeRot : MISC_SEQUENCES.repairCarpenter;
    this.playSequence(
      aftermathId,
      null,
      this.contextFor(undefined, [], { eyeContactMs: 0, snapMs: 0 }),
      this.at(script.aftermath.at)
    );
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
      /*
       * Der Seil-Nutzer hangelt sich unter der Brücke durch (GDD §3.6).
       *
       * Der Ursprung eines Hikers liegt zwischen den Füßen. Setzt man ihn knapp unter die
       * Brücke, ragt sein Kopf oben wieder heraus und er steht scheinbar auf dem Plateau —
       * genau so sah es im ersten Durchlauf aus. Er muss um seine **ganze Höhe** tiefer,
       * dann hängen die Hände am Seil und der Rest baumelt.
       */
      return {
        x: STAGE.plateauRightStart - 30,
        y: STAGE.bridgeY + STAGE.bridgeSagY + hikerHeightFor(this.ctx.playerCount) * 0.95,
      };
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

  elapsedMs(): number {
    return this.timeline.time() * 1000;
  }

  destroy(): void {
    this.timeline.kill();
  }
}
