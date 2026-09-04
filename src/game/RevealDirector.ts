/**
 * Der RevealDirector (Architektur §6, GDD §4.3) — die Spannungsmaschine.
 *
 * Er bekommt ein fertiges `RevealScript` und die aufgebaute Buehne und macht daraus
 * **eine** GSAP-Timeline. Er entscheidet nichts: Reihenfolge, Verweildauern und Stalls
 * stehen im Skript, das Ergebnis stand schon vor dem Skript fest (CLAUDE.md).
 *
 * Was er beisteuert, ist Regie:
 *
 * - **Kamera** faehrt auf jede Karte und in der Auszahlung zurueck in die Totale.
 * - **Blick-Regie** (Art Direction §7): Alle schauen auf die aktive Karte, ihr Besitzer
 *   zur Kamera — und erst *nach* dem Flip setzt er sein Gesicht auf.
 * - **Trommelwirbel** zieht ueber die Show an, bei der letzten Karte uebernimmt der
 *   Herzschlag und die Musik geht runter.
 * - **Die letzte Karte** bekommt Slow-Mo, zwei Stalls, ein enger werdendes Spotlight und
 *   keinen Skip. Sie ist der Moment, fuer den das Spiel existiert.
 *
 * Tap-to-Skip springt an den Anfang des naechsten Beats — nie bei der ersten Karte, nie
 * bei der letzten, nie waehrend der Auszahlung (GDD §4.3).
 */

import gsap from 'gsap';
import { CARD, DRUMROLL, HEARTBEAT, LAST_CARD, SKIP_FROM_CARD_INDEX, STALL_MS } from '@/config/choreo';
import { STAGE } from '@/config/theme';
import type { Beat, RevealScript } from '@/core/choreographer';
import type { SeededRng } from '@/core/rng';
import type { PlayerId, RoundResult } from '@/core/types';
import * as audio from '@/audio/AudioManager';
import type { Camera } from './Camera';
import { SipCounterPool } from './fx/SipCounter';
import { basicOutcome, BASIC_OUTCOME_ID } from './outcomes/basic';
import {
  outcomeById,
  overlayById,
  pickOutcomeSequence,
  type OutcomeContext,
} from './outcomes/OutcomeSequence';
import type { VaultRoom } from './VaultRoom';

export interface RevealDirectorOptions {
  script: RevealScript;
  result: RoundResult;
  room: VaultRoom;
  camera: Camera;
  rng: SeededRng;
  /**
   * Kassels Saetze. Der Director kennt die Momente, die i18n kennt die Worte — und
   * `src/game/` bleibt frei von Uebersetzungen, so wie der Rest der Buehne.
   * Ohne Angabe schweigt Kassel.
   */
  line?: (key: string) => string;
  /** Laeuft, sobald eine Karte offen liegt — der Screen protokolliert damit (ADR-18). */
  onCardRevealed?: (playerId: PlayerId, choice: 'share' | 'steal', isLast: boolean) => void;
  /** Laeuft ganz am Ende der Show. */
  onFinished?: () => void;
}

export class RevealDirector {
  readonly counters = new SipCounterPool();

  private readonly options: RevealDirectorOptions;
  private readonly timeline: gsap.core.Timeline;
  /** Startzeit jedes Beats in Sekunden — Tap-to-Skip springt dorthin. */
  private readonly beatTimes: number[] = [];
  /** Zu welchem Karten-Index gehoert Beat i? `-1` fuer alles andere. */
  private readonly cardIndexOfBeat: number[] = [];
  private readonly cardCount: number;
  private finished = false;

  constructor(options: RevealDirectorOptions) {
    this.options = options;
    this.cardCount = options.script.beats.filter((beat) => beat.type === 'card').length;
    this.timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        this.finished = true;
        audio.stopDrumroll();
        audio.stopHeartbeat();
        audio.unduckMusic();
        options.onFinished?.();
      },
    });

    options.room.view.addChild(this.counters.view);
    this.build();
  }

  /* ---------------------------------------------------------------- */
  /* Aufbau                                                            */
  /* ---------------------------------------------------------------- */

  private build(): void {
    const { script } = this.options;
    let cardIndex = 0;

    for (const beat of script.beats) {
      const at = beat.t / 1000;
      this.beatTimes.push(at);

      switch (beat.type) {
        case 'intro':
          this.cardIndexOfBeat.push(-1);
          this.addIntro(at);
          break;

        case 'card':
          this.cardIndexOfBeat.push(cardIndex);
          this.addCard(beat, at, cardIndex);
          cardIndex += 1;
          break;

        case 'alarm':
          this.cardIndexOfBeat.push(-1);
          this.addAlarm(at);
          break;

        case 'outcome':
          this.cardIndexOfBeat.push(-1);
          this.addOutcome(at);
          break;

        case 'outro':
          this.cardIndexOfBeat.push(-1);
          this.addOutro(at);
          break;
      }
    }
  }

  /** Intro: Licht an, Rad dreht, Tuer auf, Kassel bittet um die Karten (GDD §4.3). */
  private addIntro(at: number): void {
    const { room } = this.options;
    this.timeline.add(room.vault.openDoor(), at);
    this.timeline.call(
      () => {
        room.kassel.say(this.line('cardsPlease'));
        audio.startDrumroll(DRUMROLL.rateStart);
      },
      undefined,
      at + 0.4
    );
  }

  /**
   * Ein Karten-Beat.
   *
   * Der Ablauf ist immer gleich und trotzdem nie langweilig, weil sich drei Dinge
   * aendern: die Verweildauer (Tempo-Kurve), die Zahl der Stalls und — bei der letzten —
   * das Tempo selbst.
   */
  private addCard(beat: Extract<Beat, { type: 'card' }>, at: number, index: number): void {
    const { room, camera } = this.options;
    const card = room.cards.get(beat.playerId);
    const crook = room.crooks.get(beat.playerId);
    const position = room.cardPosition(beat.playerId);
    if (!card || !position) return;

    const timeScale = beat.isLast ? CARD.lastCardTimeScale : 1;

    // Kamera und Blicke gehen zur Karte, bevor sie sich bewegt.
    this.timeline.add(camera.moveTo(position.x, position.y), at);
    this.timeline.call(() => room.lookAtCard(beat.playerId), undefined, at);

    // Trommelwirbel zieht ueber die Show an (GDD §4.5).
    const progress = this.cardCount <= 1 ? 1 : index / (this.cardCount - 1);
    const rate = DRUMROLL.rateStart + (DRUMROLL.rateEnd - DRUMROLL.rateStart) * progress;

    if (beat.isLast) {
      this.timeline.call(
        () => {
          audio.stopDrumroll();
          audio.duckMusic();
          audio.startHeartbeat(HEARTBEAT.bpm[0]);
        },
        undefined,
        at
      );
      this.timeline.add(room.narrowSpot(LAST_CARD.spotShrinkTo, LAST_CARD.spotShrinkMs), at);
      // Der Puls zieht ueber die Verweildauer an — das ist die halbe Spannung.
      this.timeline.to(
        { bpm: HEARTBEAT.bpm[0] },
        {
          bpm: HEARTBEAT.bpm[1],
          duration: beat.holdMs / 1000,
          ease: 'power2.in',
          onUpdate() {
            audio.setHeartbeatBpm(this.targets()[0].bpm as number);
          },
        },
        at
      );
    } else {
      this.timeline.call(() => audio.setDrumrollRate(rate), undefined, at);
    }

    const liftAt = at + CARD.panMs / 1000;
    this.timeline.call(() => audio.play('card_lift'), undefined, liftAt);
    this.timeline.add(card.lift(), liftAt);

    const flipAt = liftAt + CARD.liftMs / 1000;
    this.timeline.call(() => audio.play('card_flip'), undefined, flipAt);
    // Ein Tick je Stocken — ohne ihn hoert man das Zoegern nicht (Audit A3: Sound-Sync).
    for (const [i] of beat.stalls.entries()) {
      this.timeline.call(
        () => audio.play('card_stall'),
        undefined,
        flipAt + (CARD.flipMs / 2 + i * STALL_MS) / 1000 / timeScale
      );
    }
    this.timeline.add(card.flip(beat.stalls, timeScale), flipAt);

    /*
     * Nach dem Flip: Der Besitzer setzt sein Gesicht auf, die Karte blitzt in ihrer
     * Farbe, das Publikum reagiert. Vorher waere es verraten (Art Direction §7).
     */
    const flipEnd = flipAt + (CARD.flipMs + beat.stalls.length * STALL_MS) / 1000 / timeScale;
    this.timeline.call(
      () => {
        crook?.setFace(beat.choice === 'steal' ? 'smug' : 'innocent');
        audio.play(beat.choice === 'steal' ? 'reveal_steal' : 'reveal_share');
        audio.play(beat.choice === 'steal' ? 'crowd_gasp' : 'crowd_aah', 0.1);
        this.options.onCardRevealed?.(beat.playerId, beat.choice, beat.isLast);
      },
      undefined,
      flipEnd
    );

    // Die Overlays haengen an der Karte, nicht an der Auszahlung (GDD §4.4).
    this.addOverlays(beat.playerId, flipEnd + 0.1);
  }

  /** Meineid-Siegel und Maulwurf-Helm — beide legen sich auf die frisch offene Karte. */
  private addOverlays(playerId: PlayerId, at: number): void {
    const { result, room } = this.options;
    const card = room.cards.get(playerId);
    const crook = room.crooks.get(playerId);
    if (!card || !crook) return;

    for (const overlayId of result.overlayIds) {
      if (overlayId === 'perjury_seal_break' && !result.perjurers.includes(playerId)) continue;
      if (overlayId === 'mole_reveal' && result.moleId !== playerId) continue;

      const overlay = overlayById(overlayId);
      if (!overlay) continue;
      this.timeline.add(overlay.buildOnCard(this.context(), card, crook), at);
    }
  }

  /** Alarm: Laser werden rot, der Raum blitzt, die Sirene geht kurz an (GDD §4.3). */
  private addAlarm(at: number): void {
    this.timeline.add(this.options.room.raiseAlarm(), at);
    this.timeline.call(
      () => {
        audio.play('siren_short');
        audio.play('crowd_gasp', 0.15);
      },
      undefined,
      at
    );
    this.timeline.add(this.options.camera.shake(), at);
  }

  /**
   * Die Ergebnis-Inszenierung.
   *
   * **Die Auswahl passiert hier, nicht in `payout.ts`.** Der Regelkern darf die Registry
   * nicht kennen — sie lebt im Buehnen-Chunk, der erst waehrend der Verhandlung laedt
   * (ADR-15). `resolveRound()` traegt deshalb den Platzhalter ein, und der Director
   * ersetzt ihn durch die gewichtete Wahl. Deterministisch bleibt es trotzdem: Beide
   * ziehen aus demselben Seed (ADR-20).
   *
   * Ist fuer den Outcome-Typ noch nichts registriert — in M3 der Normalfall —, uebernimmt
   * `basic_outcome`. Lieber eine schlichte Ansage als eine leere Buehne.
   */
  private addOutcome(at: number): void {
    const beat = this.options.script.beats.find((entry) => entry.type === 'outcome');
    const scripted = beat?.type === 'outcome' ? beat.sequenceId : BASIC_OUTCOME_ID;
    const id =
      scripted === BASIC_OUTCOME_ID
        ? (pickOutcomeSequence(this.options.result.outcome, this.options.rng) ?? scripted)
        : scripted;
    const chosen = outcomeById(id) ?? basicOutcome;

    this.timeline.call(
      () => this.options.room.kassel.say(this.line(this.options.result.outcome), 2400),
      undefined,
      at
    );
    this.timeline.add(chosen.build(this.context()), at);
  }

  /** Outro: Tuer zu (oder offen bei "alle teilen"), Ton aus. */
  private addOutro(at: number): void {
    const { room, result } = this.options;
    this.timeline.call(
      () => {
        audio.stopDrumroll();
        audio.stopHeartbeat();
        audio.unduckMusic();
      },
      undefined,
      at
    );
    /*
     * Bei "alle teilen" bleibt die Tuer offen und der Tresor fuellt sich weiter
     * (GDD §4.3, Outro) — ein Zuknallen waere das falsche Zeichen.
     */
    if (result.outcome === 'allShare' || result.outcome === 'jackpot') {
      this.timeline.add(room.vault.grow(room.vault.getFill()), at);
    } else {
      this.timeline.add(room.vault.closeDoor(), at);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Kontext fuer Sequenzen                                            */
  /* ---------------------------------------------------------------- */

  private context(): OutcomeContext {
    const { result, room, camera, rng } = this.options;
    const crooksOf = (ids: readonly PlayerId[]) =>
      ids.map((id) => room.crooks.get(id)).filter((crook): crook is NonNullable<typeof crook> => !!crook);

    return {
      result,
      room,
      camera,
      thieves: crooksOf(result.thieves),
      sharers: crooksOf(result.sharers),
      cards: room.cards,
      counters: this.counters,
      rng,
      play: (cue, when) => audio.play(cue, when),
      positionOf: (playerId) => {
        const crook = room.crooks.get(playerId);
        if (!crook) return { x: STAGE.worldSize / 2, y: STAGE.worldSize / 2 };
        return { x: crook.view.position.x, y: crook.view.position.y - 190 };
      },
    };
  }

  private line(key: string): string {
    return this.options.line?.(key) ?? '';
  }

  /* ---------------------------------------------------------------- */
  /* Steuerung                                                         */
  /* ---------------------------------------------------------------- */

  play(): void {
    this.timeline.play();
  }

  pause(): void {
    this.timeline.pause();
    audio.stopDrumroll();
    audio.stopHeartbeat();
  }

  resume(): void {
    if (!this.finished) this.timeline.play();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Gesamtdauer in Millisekunden — der Timing-Test aus A3 prueft sie. */
  get durationMs(): number {
    return this.timeline.duration() * 1000;
  }

  /**
   * Tap-to-Skip (GDD §4.3).
   *
   * Springt an den Anfang des naechsten Beats. Erlaubt **nur** waehrend eines
   * Karten-Beats ab der zweiten Karte und nie bei der letzten — die Regel schuetzt den
   * Moment, fuer den es die ganze Show gibt.
   */
  skip(): boolean {
    if (this.finished) return false;
    const now = this.timeline.time();

    let current = -1;
    for (let i = 0; i < this.beatTimes.length; i++) {
      if (this.beatTimes[i]! <= now) current = i;
      else break;
    }
    if (current < 0) return false;

    const cardIndex = this.cardIndexOfBeat[current] ?? -1;
    if (cardIndex < SKIP_FROM_CARD_INDEX) return false;
    if (cardIndex >= this.cardCount - 1) return false;

    const next = this.beatTimes[current + 1];
    if (next === undefined) return false;
    this.timeline.seek(next, false);
    return true;
  }

  destroy(): void {
    this.timeline.kill();
    audio.stopDrumroll();
    audio.stopHeartbeat();
    audio.unduckMusic();
    this.counters.destroy();
  }
}
