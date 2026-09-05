/**
 * Der Regisseur einer Grabung (Architektur §6).
 *
 * Er **entscheidet nichts**. `core/board.ts#dig` hat das bereits getan; hier wird ein
 * fertiges `DigResult` abgespielt (CLAUDE.md). Das ist keine Formalie: Solange der
 * Director nur inszeniert, kann keine Animation versehentlich den Spielzustand
 * verschieben — und die Regeln bleiben da, wo sie getestet sind.
 *
 * ## Ablauf, und die Reihenfolge ist verbindlich
 *
 * 1. Feld sperren, Kamera auf die Platte.
 * 2. **Anticipation** (~900 ms, Art Direction §6): Digger laeuft hin, drei
 *    Schaufelstoesse, 200 ms Stille mit zitternder Platte. Das ist die Jenga-Sekunde und
 *    der Grund, warum jeder Tap ein Nervenmoment ist (Design-Prioritaet 1).
 * 3. Ergebnis aufdecken.
 * 4. Bei einer Explosion: **der Farbring der Leger, spaetestens 300 ms nach dem
 *    Explosions-Frame** (Design-Prioritaet 2) — vor jedem Gag. Wer schuld ist, darf nie
 *    hinter der Pointe warten.
 * 5. Digger zurueck zur Bank (russig bleibt russig), Kamera zurueck, entsperren.
 *
 * Welche Sequenz gespielt wird, entscheidet die Registry (`sequences/`) — gewichtet,
 * gefiltert, ohne Wiederholung. Der Ablauf drumherum ist bei jeder Sequenz derselbe:
 * Anticipation, Aufdecken, Ring, Sequenz, zurueck.
 */

import gsap from 'gsap';
import { ANTICIPATION, BANNER, CHAIN, EXPLOSION, PLATE } from '@/config/choreo';
import type { Modes } from '@/config/rules';
import { ANIM, type ColorId } from '@/config/theme';
import { createSeededRng, type SeededRng } from '@/core/rng';
import type { DigResult, PublicView } from '@/core/types';
import { play as playCue, type AudioCue } from '@/audio/AudioManager';
import { prefersReducedMotion } from '@/ui/animate';
import type { BoardView } from './BoardView';
import type { Camera } from './Camera';
import type { Digger } from './Digger';
import { kindFor, pickSequence, type FxKit, type SequenceContext } from './sequences';

export interface DigDirectorOptions {
  board: BoardView;
  camera: Camera;
  /** Liefert den Digger eines Spielers — der Director haelt keine eigene Liste. */
  diggerOf: (playerId: string) => Digger | undefined;
  /** Alle Diggers in Sitzreihenfolge — die Zuschauer der Sequenzen. */
  diggers: () => readonly Digger[];
  /** Rauch, Erde, Sternchen — die gemeinsamen Effekte (Art Direction §8). */
  fx: FxKit;
  /** Die aktiven Modi. Sie filtern die Registry (`excludeInModes`). */
  modes: () => Modes;
  /** Farbe eines Spielers — die Sequenz kennt nur Farben, keine Namen. */
  colorOf: (playerId: string) => ColorId | undefined;
  /** Rundenseed: dieselbe Runde spielt dieselben Sequenzen. */
  seed: number;
  lowEffects?: boolean;
}

/** Womit eine Inszenierung endet — der Screen entscheidet danach, wie es weitergeht. */
export interface DigPlayback {
  /** Die gespielte Sequenz. Ab M4 kommen hier die echten IDs her. */
  sequenceId: string;
  /** Versatz des Farbrings zum Explosions-Frame in ms. Muss ≤ 300 bleiben. */
  ringDelayMs: number;
}

export class DigDirector {
  private readonly options: DigDirectorOptions;
  private timeline: gsap.core.Timeline | undefined;
  /**
   * Der Generator fuer die Sequenzwahl. Bewusst **seeded** und nicht `crypto`: Eine
   * Wiederholung derselben Runde soll dieselbe Show ergeben, und `crypto` gehoert allein
   * der Kistenposition (CLAUDE.md).
   */
  private readonly rng: SeededRng;
  /**
   * Zeigt das Banner. **Setzbar, nicht fest verdrahtet:** Die Buehne lebt ueber Place,
   * Dig und Result hinweg (ADR-6), das Banner gehoert aber nur dem Dig-Screen. Wer den
   * Handler beim Bauen festschreibt, gibt dem Dig-Screen den leeren Handler des
   * Place-Screens — und das Banner bleibt stumm.
   */
  private banner: (result: DigResult) => void = () => undefined;

  constructor(options: DigDirectorOptions) {
    this.options = options;
    this.rng = createSeededRng(options.seed);
  }

  /** Der Screen, der gerade das Feld haelt, meldet hier sein Banner an. */
  setBannerHandler(handler: (result: DigResult) => void): void {
    this.banner = handler;
  }

  /**
   * Spielt ein Ergebnis ab und loest auf, wenn das Feld wieder frei ist.
   * Waehrenddessen ist die `BoardView` gesperrt — Taps werden ignoriert, nicht gepuffert.
   */
  async play(result: DigResult, view: PublicView): Promise<DigPlayback> {
    const { board, camera, diggerOf } = this.options;
    board.setLocked(true);

    const digger = diggerOf(result.by);
    const target = board.positionOf(result.cell);
    const tile = board.tileAt(result.cell);

    const timeline = gsap.timeline();
    this.timeline = timeline;

    /*
     * Die Sequenz wird **vor** dem Abspielen gewaehlt und gebaut. Sie bekommt das fertige
     * Ergebnis und die Buehne — mehr nicht (Architektur §6). `kindFor` bildet den stummen
     * eigenen Trittstein auf dieselbe Art ab wie ein leeres Feld, deshalb kann hier gar
     * keine Sequenz entstehen, die ihn verraet (ADR-2).
     */
    const sequence = pickSequence({
      kind: kindFor(result),
      modes: this.options.modes(),
      stack: result.foreignMines.length,
      rng: this.rng,
    });

    /* --- 1. Kamera auf die Platte ------------------------------------ */
    timeline.add(camera.zoomTo(target.x, target.y), 0);

    /* --- 2. Anticipation: die Jenga-Sekunde -------------------------- */
    if (digger) {
      // Der Digger stellt sich **unter** die Platte, nicht darauf — sonst verdeckt er
      // genau das Ergebnis, um das es geht.
      timeline.add(digger.walkTo(target.x, target.y + standOffset(board, result.cell, digger)), 0);
      /*
       * Die drei Schaufelstoesse werden in **einem** Callback auf die Audio-Uhr gelegt,
       * nicht einzeln aus der Timeline getriggert: So sitzt der Rhythmus, auch wenn ein
       * Frame ausfaellt (ADR-13, Audit A3 fordert ± 50 ms).
       */
      timeline.add(() => {
        for (let stroke = 0; stroke < ANTICIPATION.shovelStrokes; stroke++) {
          playCue('shovel_dig', (stroke * ANTICIPATION.shovelStrokeMs) / 1000, stroke * 60);
        }
      });
      timeline.add(digger.digAnimation());
    } else {
      timeline.to({}, { duration: ANTICIPATION.walkMs / 1000 });
    }

    /*
     * Die Stille davor. Die Platte zittert — mehr passiert nicht, und genau das ist der
     * Moment, in dem am Tisch niemand mehr redet.
     */
    if (tile && !prefersReducedMotion()) {
      timeline.to(
        tile.view,
        {
          x: `+=${2}`,
          duration: 0.04,
          repeat: Math.round(ANTICIPATION.holdMs / 80),
          yoyo: true,
          ease: 'none',
        },
        `-=${ANTICIPATION.holdMs / 1000}`
      );
    }
    timeline.to({}, { duration: ANTICIPATION.holdMs / 1000 });

    /* --- 3. Das Ergebnis --------------------------------------------- */
    timeline.addLabel(EXPLOSION.frameLabel);
    timeline.add(() => {
      board.revealCell(view, result.cell);
      this.banner(result);
    });

    const isBlast = result.kind === 'crater' || result.kind === 'greed';

    /* --- 4. Die Sequenz ---------------------------------------------- */
    if (sequence && tile && digger) {
      const context: SequenceContext = {
        result,
        tile,
        digger,
        others: this.options.diggers().filter((other) => other !== digger),
        camera,
        fx: this.options.fx,
        field: { treeTop: board.field.treeTop, tree: board.field.treeView },
        blamedColors: result.foreignMines
          .map((playerId) => this.options.colorOf(playerId))
          .filter((color): color is ColorId => color !== undefined),
        rng: this.rng,
        audio: (cue: AudioCue, when = 0, detune = 0) => playCue(cue, when, detune),
        lowEffects: this.options.lowEffects ?? false,
      };
      timeline.add(sequence.build(context), EXPLOSION.frameLabel);
    }

    /*
     * --- Der Schuldige, vor jedem Gag ---------------------------------
     *
     * Nur, wenn die Sequenz es nicht selbst tut. Solange es fuer eine Ergebnisart noch
     * keine Sequenz gibt (die Hit-Sequenzen kommen in M4), muss der Ring trotzdem
     * kommen — er ist Regel, nicht Inszenierung (Design-Prioritaet 2).
     */
    if (isBlast && !sequence) {
      camera.shake(result.foreignMines.length > 1 ? ANIM.shakeAmplitudePx * 1.4 : undefined);
      timeline.add(() => {
        playCue(explosionCue(result.foreignMines.length));
      }, EXPLOSION.frameLabel);

      /*
       * Der Ring liegt bereits auf der Platte (`revealCell`), er wird hier nur
       * aufgezogen. `EXPLOSION.ringDelayMs` ist der Zielwert; die harte Grenze aus
       * CLAUDE.md ist `ANIM.colorRingMaxDelayMs` — `sequences.test.ts` misst
       * gegen das Label.
       */
      timeline.addLabel(EXPLOSION.ringLabel, `${EXPLOSION.frameLabel}+=${EXPLOSION.ringDelayMs / 1000}`);
      if (tile) {
        timeline.fromTo(
          tile.view.scale,
          { x: 0.86, y: 0.86 },
          { x: 1, y: 1, duration: EXPLOSION.ringGrowMs / 1000, ease: 'back.out(2.4)' },
          EXPLOSION.ringLabel
        );
      }
      digger?.soot();
    }

    /* --- Kettenreaktion: eine Welle, keine Salve --------------------- */
    result.chainReveals.forEach((reveal, index) => {
      timeline.add(
        () => {
          board.revealCell(view, reveal.cell);
          playCue('explosion_s', 0, -index * 40);
        },
        `+=${CHAIN.stepMs / 1000}`
      );
    });

    /* --- Temperatur-Reaktion des Diggers (GDD §4.3) ------------------ */
    if (!isBlast && !sequence && digger) {
      timeline.add(() => digger.reactToHint(result.hint));
    }

    /*
     * --- 5. Zurueck --------------------------------------------------
     *
     * Zwei Dinge muessen fertig sein, bevor die Kamera aufraeumt: die Sequenz und das
     * Banner. Das Banner steht 2,2 s **ab dem Aufdecken**, nicht ab dem Ende der
     * Sequenz — beides laeuft gleichzeitig, sonst waere jede Grabung zwei Wartezeiten
     * hintereinander.
     *
     * Und nach einem leeren Feld gibt es gar kein Banner (`DigScreen.present`): Dort
     * waeren 2,2 s reines Nichts zwischen zwei Zuegen. Der haeufigste Ausgang des
     * Spiels ist damit auch der schnellste — 800 ms, dann ist der Naechste dran
     * (GDD §4.3, Design-Prioritaet 5).
     */
    const showsBanner = result.kind !== 'empty';
    const bannerEnd = showsBanner
      ? (timeline.labels[EXPLOSION.frameLabel] ?? 0) + BANNER.drinkHoldMs / 1000
      : 0;
    const tailAt = Math.max(timeline.duration(), bannerEnd);

    if (digger) timeline.add(digger.walkHome(), tailAt);
    timeline.add(camera.reset(), tailAt);

    await timeline.then();
    this.timeline = undefined;

    /*
     * Nach einem Kistenfund bleibt das Feld gesperrt: Die Runde ist vorbei, und ein
     * nachgereichter Tap wuerde ins Leere laufen (Architektur §6, Schritt 6).
     */
    if (!result.roundOver) board.setLocked(false);

    return {
      sequenceId: sequence?.id ?? `basic_${result.kind}`,
      ringDelayMs: isBlast ? EXPLOSION.ringDelayMs : 0,
    };
  }

  /** Bricht eine laufende Inszenierung ab — Screenwechsel, Rundenabbruch. */
  stop(): void {
    this.timeline?.kill();
    this.timeline = undefined;
  }

  get isPlaying(): boolean {
    return this.timeline !== undefined;
  }
}

/** Je mehr Minen unter der Platte lagen, desto tiefer der Knall (GDD §6). */
function explosionCue(stack: number): AudioCue {
  if (stack >= 3) return 'explosion_l';
  return stack >= 2 ? 'explosion_m' : 'explosion_s';
}

/**
 * Wie weit unterhalb der Plattenmitte der Digger steht.
 *
 * Sein Ursprung liegt zwischen den Fuessen, der Koerper geht nach **oben**. Ein Offset
 * von nur einer halben Platte hiesse also, dass sein Kopf mitten auf der Platte liegt
 * und das Ergebnis verdeckt. Deshalb kommt seine Koerperhoehe dazu — er steht darunter
 * und schaut hinauf.
 */
function standOffset(board: BoardView, cell: number, digger: Digger): number {
  const tile = board.tileAt(cell);
  return (tile?.size ?? 0) * 0.5 + digger.height * 0.72;
}

export { PLATE };
