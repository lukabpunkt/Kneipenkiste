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
 * In M2 sind die Sequenzen Platzhalter (`basic_*`). Ab M3/M4 haengt sich hier die
 * Registry aus `sequences/` ein; der Ablauf drumherum bleibt derselbe.
 */

import gsap from 'gsap';
import { ANTICIPATION, BANNER, CHAIN, EXPLOSION, PLATE } from '@/config/choreo';
import { ANIM } from '@/config/theme';
import type { DigResult, PublicView } from '@/core/types';
import { prefersReducedMotion } from '@/ui/animate';
import type { BoardView } from './BoardView';
import type { Camera } from './Camera';
import type { Digger } from './Digger';

export interface DigDirectorOptions {
  board: BoardView;
  camera: Camera;
  /** Liefert den Digger eines Spielers — der Director haelt keine eigene Liste. */
  diggerOf: (playerId: string) => Digger | undefined;
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
   * Zeigt das Banner. **Setzbar, nicht fest verdrahtet:** Die Buehne lebt ueber Place,
   * Dig und Result hinweg (ADR-6), das Banner gehoert aber nur dem Dig-Screen. Wer den
   * Handler beim Bauen festschreibt, gibt dem Dig-Screen den leeren Handler des
   * Place-Screens — und das Banner bleibt stumm.
   */
  private banner: (result: DigResult) => void = () => undefined;

  constructor(options: DigDirectorOptions) {
    this.options = options;
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

    const sequenceId = sequenceFor(result);
    const timeline = gsap.timeline();
    this.timeline = timeline;

    /* --- 1. Kamera auf die Platte ------------------------------------ */
    timeline.add(camera.zoomTo(target.x, target.y), 0);

    /* --- 2. Anticipation: die Jenga-Sekunde -------------------------- */
    if (digger) {
      // Der Digger stellt sich **unter** die Platte, nicht darauf — sonst verdeckt er
      // genau das Ergebnis, um das es geht.
      timeline.add(digger.walkTo(target.x, target.y + standOffset(board, result.cell, digger)), 0);
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

    /* --- 4. Der Schuldige, vor jedem Gag ------------------------------ */
    if (isBlast) {
      camera.shake(result.foreignMines.length > 1 ? ANIM.shakeAmplitudePx * 1.4 : undefined);

      /*
       * Der Ring liegt bereits auf der Platte (`revealCell`), er wird hier nur
       * aufgezogen. `EXPLOSION.ringDelayMs` ist der Zielwert; die harte Grenze aus
       * CLAUDE.md ist `ANIM.colorRingMaxDelayMs` — `sequenceRegistry.test.ts` misst
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
      timeline.add(() => board.revealCell(view, reveal.cell), `+=${CHAIN.stepMs / 1000}`);
      void index;
    });

    /* --- Temperatur-Reaktion des Diggers (GDD §4.3) ------------------ */
    if (!isBlast && digger) {
      timeline.add(() => digger.reactToHint(result.hint));
    }

    /* --- 5. Zurueck ------------------------------------------------- */
    // Das Banner steht 2,2 s; erst danach raeumt die Kamera auf.
    timeline.to({}, { duration: BANNER.drinkHoldMs / 1000 });
    if (digger) timeline.add(digger.walkHome(), '<');
    timeline.add(camera.reset(), '<');

    await timeline.then();
    this.timeline = undefined;

    /*
     * Nach einem Kistenfund bleibt das Feld gesperrt: Die Runde ist vorbei, und ein
     * nachgereichter Tap wuerde ins Leere laufen (Architektur §6, Schritt 6).
     */
    if (!result.roundOver) board.setLocked(false);

    return { sequenceId, ringDelayMs: isBlast ? EXPLOSION.ringDelayMs : 0 };
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

/**
 * Welche Sequenz gespielt wird. In M2 gibt es genau eine je Ergebnisart; ab M3 waehlt
 * die Registry gewichtet und ohne Wiederholung (Architektur §6).
 *
 * `empty` deckt auch den stummen eigenen Trittstein ab — es gibt hier bewusst keinen
 * eigenen Zweig dafuer (ADR-2).
 */
function sequenceFor(result: DigResult): string {
  return `basic_${result.kind}`;
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
