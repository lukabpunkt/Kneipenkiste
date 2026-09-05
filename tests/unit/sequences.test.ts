/**
 * Sequenzen und Registry (Roadmap M3, Audit A3).
 *
 * Wie eine Sequenz **aussieht**, sagt der Look-Check am Geraet. Hier steht, was sich
 * rechnen laesst und was nicht verhandelbar ist:
 *
 * 1. Kein Zug dauert laenger als erlaubt (`ANIM.sequenceMaxMs`, Kiste: `treasureMaxMs`).
 * 2. Der Farbring der Leger kommt spaetestens 300 ms nach dem Explosions-Frame.
 * 3. Nach einer Sequenz steht der Digger wieder da, wo er stand — sonst wandert er ueber
 *    die Runde davon.
 * 4. **Der stumme eigene Trittstein ist von einem leeren Feld nicht zu unterscheiden**
 *    (ADR-2): gleiche Sequenz-ID, gleiche Cues, gleiche Zeiten.
 *
 * Die Buehne ist hier absichtlich gefaelscht: `SequenceTile`, `SequenceDigger` und
 * `SequenceCamera` sind so klein, dass vier Zahlen genuegen. Dadurch laeuft dieser Test
 * ohne PixiJS, ohne Atlas und ohne WebGL — und misst trotzdem genau das, was zaehlt.
 */

import gsap from 'gsap';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPLOSION, NO_REPEAT_WINDOW } from '@/config/choreo';
import { DEFAULT_MODES, type Hint, type Modes } from '@/config/rules';
import { ANIM, type FaceId } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import type { AudioCue } from '@/audio/AudioManager';
import type { DigKind, DigResult } from '@/core/types';
import {
  allSequences,
  kindFor,
  pickSequence,
  registerAllSequences,
  registerSequence,
  resetAllSequences,
  resetHistory,
  sequencesOf,
  type Animatable,
  type DigSequence,
  type SequenceContext,
  type DiggerProp,
  type FxKit,
  type SequenceDigger,
  type SequenceKind,
  type SequenceTile,
} from '@/game/sequences';

/* ------------------------------------------------------------------ */
/* Gefaelschte Buehne                                                  */
/* ------------------------------------------------------------------ */

function animatable(): Animatable {
  return { x: 0, y: 0, alpha: 1, rotation: 0, scale: { x: 1, y: 1 } };
}

const PLATE_SIZE = 185;

function fakeTile(): SequenceTile & { lid: Animatable; lidDropped: boolean; lifts: number } {
  const lid = animatable();
  const tile = {
    size: PLATE_SIZE,
    view: animatable(),
    contentView: animatable(),
    marksView: animatable(),
    hintView: animatable(),
    lid,
    lidDropped: false,
    /** Wie oft der Deckel geholt wurde — einmal beim Bauen, einmal beim Abspielen. */
    lifts: 0,
    liftLid: () => {
      tile.lifts += 1;
      return lid;
    },
    dropLid: () => {
      tile.lidDropped = true;
    },
  };
  return tile;
}

interface FakeDigger extends SequenceDigger {
  faces: FaceId[];
  hints: Hint[];
  sooty: boolean;
  helmet: Animatable;
  helmetAttached: boolean;
  props: Record<DiggerProp, boolean>;
  kicking: boolean;
}

function fakeDigger(): FakeDigger {
  const digger: FakeDigger = {
    view: animatable(),
    body: animatable(),
    helmet: animatable(),
    helmetView: animatable(),
    helmetAttached: true,
    faces: [],
    hints: [],
    sooty: false,
    props: { hairFan: false, pretzelShovel: false, whiteFlag: false },
    kicking: false,
    setFace: (face) => void digger.faces.push(face),
    reactToHint: (hint) => void digger.hints.push(hint),
    soot: () => {
      digger.sooty = true;
    },
    detachHelmet: () => {
      digger.helmetAttached = false;
    },
    attachHelmet: () => {
      digger.helmetAttached = true;
    },
    setProp: (prop, on) => {
      digger.props[prop] = on;
    },
    kickLegs: (active) => {
      digger.kicking = active;
    },
  };
  return digger;
}

/**
 * Ein Effekt-Kasten, der nichts zeichnet, aber mitzaehlt.
 *
 * Die echten Effekte haengen an PixiJS und an Pools; hier interessiert nur, **dass** und
 * **wo** eine Sequenz sie anfordert — und dass sie das Budget nicht sprengt.
 */
interface FakeFx extends FxKit {
  calls: { kind: string; x: number; y: number; count: number }[];
  /** Wieviele Partikel gerade **sichtbar** waeren. */
  visible: number;
}

function fakeFx(): FakeFx {
  const calls: FakeFx['calls'] = [];
  const state = { visible: 0 };
  const record = (kind: string, x: number, y: number, count = 1): gsap.core.Timeline => {
    calls.push({ kind, x, y, count });
    /*
     * Der Ersatz zaehlt nicht beim Anfordern, sondern im `onStart` — genau wie die
     * echte `FxLayer` das Sprite erst dort sichtbar macht (ADR-23). Damit kann der
     * Reinheitstest unten sehen, ob eine Sequenz beim **Bauen** schon etwas zeigt.
     */
    return gsap.timeline().to(
      {},
      {
        duration: 0.3,
        onStart: () => {
          state.visible += 1;
        },
      }
    );
  };
  return {
    calls,
    get visible() {
      return state.visible;
    },
    smoke: (x, y, scale = 1) => record('smoke', x, y, scale),
    dirt: (x, y, count = 12) => record('dirt', x, y, count),
    stars: (x, y, count = 5) => record('stars', x, y, count),
    leaves: (x, y, count = 8) => record('leaves', x, y, count),
    confetti: (x, y) => record('confetti', x, y),
    clear: () => {
      state.visible = 0;
    },
  };
}

interface Played {
  cue: AudioCue;
  at: number;
}

interface Harness {
  context: SequenceContext;
  tile: ReturnType<typeof fakeTile>;
  digger: FakeDigger;
  fx: FakeFx;
  cues: Played[];
  shakes: number;
}

function digResult(overrides: Partial<DigResult> = {}): DigResult {
  return {
    cell: 12,
    by: 'p1',
    kind: 'empty' as DigKind,
    hint: 'warm',
    foreignMines: [],
    dudOwners: [],
    ownMineConsumed: false,
    ownDudConsumed: false,
    treasureFound: false,
    chainReveals: [],
    roundOver: false,
    sequenceId: '',
    ...overrides,
  };
}

function harness(result: DigResult, seed = 7, lowEffects = false): Harness {
  const tile = fakeTile();
  const digger = fakeDigger();
  const fx = fakeFx();
  const cues: Played[] = [];
  const state = { shakes: 0 };

  const context: SequenceContext = {
    result,
    tile,
    digger,
    others: [fakeDigger(), fakeDigger()],
    camera: {
      shake: () => {
        state.shakes += 1;
      },
    },
    fx,
    // Der Baum steht rechts oben — dieselbe Ecke wie im echten Feld (Art Direction §6).
    field: { treeTop: { x: 860, y: 150 }, tree: animatable() },
    blamedColors: ['red'],
    rng: createSeededRng(seed),
    audio: (cue, when = 0) => void cues.push({ cue, at: when }),
    lowEffects,
  };

  return {
    context,
    tile,
    digger,
    fx,
    cues,
    get shakes() {
      return state.shakes;
    },
  };
}

/**
 * Spielt eine Timeline synchron bis zum Ende ab.
 *
 * `time(…, false)` statt `seek()`: `seek` unterdrueckt Callbacks, und genau die sind
 * hier interessant — die Cues werden in einem Callback zum Sequenzstart geplant.
 */
function runToEnd(timeline: gsap.core.Timeline): void {
  timeline.pause(0);
  timeline.time(timeline.duration(), false);
}

/**
 * Die reinen Zahlen eines Anzeigeobjekts.
 *
 * GSAP haengt beim ersten Tween einen Cache (`_gsap`) mit einer laufenden Nummer an das
 * Objekt — ein direkter Vergleich zweier Buehnen wuerde daran scheitern, ohne dass sich
 * irgendetwas Sichtbares unterscheidet.
 */
function pose(target: Animatable): Record<string, number> {
  return {
    x: target.x,
    y: target.y,
    alpha: target.alpha,
    rotation: target.rotation,
    scaleX: target.scale.x,
    scaleY: target.scale.y,
  };
}

/** Der Versatz eines Labels zum Explosions-Frame in Millisekunden. */
function labelDelayMs(timeline: gsap.core.Timeline, label: string): number | undefined {
  const labels = timeline.labels;
  const frame = labels[EXPLOSION.frameLabel];
  const target = labels[label];
  if (frame === undefined || target === undefined) return undefined;
  return (target - frame) * 1000;
}

const MODES: Modes = { ...DEFAULT_MODES };

/* ------------------------------------------------------------------ */

describe('Registry', () => {
  beforeEach(() => {
    resetAllSequences();
  });

  it('meldet alle Sequenzen genau einmal an, auch bei mehrfachem Aufruf', () => {
    registerAllSequences();
    const first = allSequences().length;
    registerAllSequences();
    expect(allSequences()).toHaveLength(first);
  });

  it('erfuellt das Soll aus GDD §9.5: 8 Hits, 1 Blindgaenger, 3 Treasure, 4 Leer-Varianten', () => {
    registerAllSequences();
    expect(sequencesOf('hit')).toHaveLength(8);
    expect(sequencesOf('empty')).toHaveLength(4);
    expect(sequencesOf('dud')).toHaveLength(1);
    // "Preis der Gier" zaehlt als dritte Treasure-Sequenz, liegt aber unter `greed`.
    expect(sequencesOf('treasure').length + sequencesOf('greed').length).toBe(3);
  });

  it('weist eine doppelte ID zurueck', () => {
    registerAllSequences();
    const existing = sequencesOf('empty')[0]!;
    expect(() => registerSequence(existing)).toThrow(/doppelt/);
  });

  it('haelt Sequenzen zurueck, die mehr Minen brauchen als unter der Platte lagen', () => {
    const needsTwo: DigSequence = {
      id: 'test_stack',
      kind: 'hit',
      weight: 1,
      minStack: 2,
      build: () => gsapTimeline(),
    };
    registerSequence(needsTwo);

    expect(pickSequence({ kind: 'hit', modes: MODES, stack: 1, rng: createSeededRng(1) })).toBeUndefined();
    expect(pickSequence({ kind: 'hit', modes: MODES, stack: 2, rng: createSeededRng(1) })?.id).toBe(
      'test_stack'
    );
  });

  it('haelt Sequenzen zurueck, die im aktiven Modus nicht gespielt werden duerfen', () => {
    /*
     * Der konkrete Fall aus dem GDD: `hit_dud_then_boom` waere im Doppelagent-Modus von
     * einem echten Blindgaenger nicht zu unterscheiden — und wuerde damit die Regel des
     * Modus aushebeln.
     */
    registerSequence({
      id: 'test_dud_then_boom',
      kind: 'hit',
      weight: 1,
      excludeInModes: ['doubleAgent'],
      build: () => gsapTimeline(),
    });

    const rng = createSeededRng(1);
    expect(pickSequence({ kind: 'hit', modes: MODES, stack: 1, rng })?.id).toBe('test_dud_then_boom');
    expect(
      pickSequence({ kind: 'hit', modes: { ...MODES, doubleAgent: true }, stack: 1, rng })
    ).toBeUndefined();
  });

  it('wiederholt sich nicht, solange es genug Alternativen gibt', () => {
    registerAllSequences();
    const rng = createSeededRng(42);
    const picks: string[] = [];
    for (let i = 0; i < 4; i++) {
      picks.push(pickSequence({ kind: 'empty', modes: MODES, stack: 0, rng })!.id);
    }
    // Drei Fenster-Plaetze: die ersten vier Ausgaben duerfen sich nicht wiederholen.
    expect(new Set(picks).size).toBe(4);
  });

  it('wiederholt lieber, als gar nichts zu spielen', () => {
    registerAllSequences();
    const rng = createSeededRng(3);
    // Es gibt nur eine Blindgaenger-Sequenz — sie muss trotzdem jedes Mal kommen.
    for (let i = 0; i < 5; i++) {
      expect(pickSequence({ kind: 'dud', modes: MODES, stack: 1, rng })?.id).toBe('dud_pfff');
    }
  });

  it('faengt nach `resetHistory()` wieder von vorn an', () => {
    registerAllSequences();
    const rng = createSeededRng(9);
    const first = pickSequence({ kind: 'empty', modes: MODES, stack: 0, rng })!.id;
    resetHistory();
    const again = createSeededRng(9);
    expect(pickSequence({ kind: 'empty', modes: MODES, stack: 0, rng: again })!.id).toBe(first);
  });

  it('spielt bei gleichem Seed dieselbe Show', () => {
    registerAllSequences();
    const run = (): string[] => {
      resetHistory();
      const rng = createSeededRng(1234);
      return Array.from(
        { length: 6 },
        () => pickSequence({ kind: 'empty', modes: MODES, stack: 0, rng })!.id
      );
    };
    expect(run()).toEqual(run());
  });
});

/* ------------------------------------------------------------------ */

describe('Alle Sequenzen', () => {
  beforeEach(() => {
    resetAllSequences();
    registerAllSequences();
  });

  it('bleibt in der erlaubten Dauer (GDD §4, ANIM)', () => {
    for (const sequence of allSequences()) {
      const isTreasure = sequence.kind === 'treasure' || sequence.kind === 'greed';
      const limit = isTreasure ? ANIM.treasureMaxMs : ANIM.sequenceMaxMs;
      const { context } = harness(resultFor(sequence.kind));
      const duration = sequence.build(context).duration() * 1000;

      expect(duration, sequence.id).toBeLessThanOrEqual(limit);
      // Und sie ist nicht leer — eine Sequenz ohne Laufzeit waere ein Aussetzer.
      expect(duration, sequence.id).toBeGreaterThan(0);
    }
  });

  it('zeigt bei jeder Explosion den Farbring ≤ 300 ms nach dem Frame (Design-Prioritaet 2)', () => {
    const blasts = allSequences().filter((s) => s.kind === 'hit' || s.kind === 'greed' || s.kind === 'dud');
    expect(blasts.length).toBeGreaterThan(0);

    for (const sequence of blasts) {
      const { context } = harness(resultFor(sequence.kind));
      const delay = labelDelayMs(sequence.build(context), EXPLOSION.ringLabel);
      expect(delay, `${sequence.id} hat kein Ring-Label`).toBeDefined();
      expect(delay!, sequence.id).toBeLessThanOrEqual(ANIM.colorRingMaxDelayMs);
      expect(delay!, sequence.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('veraendert die Buehne beim Bauen nicht', () => {
    /*
     * **Der Test, der `fromTo` einfaengt.** Eine Sequenz wird gebaut, bevor die
     * Anticipation ueberhaupt losgeht — der Digger sitzt zu diesem Zeitpunkt noch auf der
     * Bank, die Platte ist zu. Ein `fromTo` schreibt seine Startwerte aber **sofort**
     * (`immediateRender` steht per Vorgabe auf `true`), und dann steht der Digger schon
     * im Krater, waehrend er eigentlich noch graebt.
     *
     * Genau das ist hier einmal passiert (`hit_crater_hop`): Der Digger sprang beim Bauen
     * an die Krater-Position, und weil die Sequenz sich seinen Standplatz erst beim
     * Abspielen merkt, kam er danach nie wieder heraus.
     */
    for (const sequence of allSequences()) {
      const test = harness(resultFor(sequence.kind));
      const before = {
        digger: pose(test.digger.view),
        body: pose(test.digger.body),
        tile: pose(test.tile.view),
        content: pose(test.tile.contentView),
        marks: pose(test.tile.marksView),
      };

      sequence.build(test.context);

      expect(pose(test.digger.view), sequence.id).toEqual(before.digger);
      expect(pose(test.digger.body), sequence.id).toEqual(before.body);
      expect(pose(test.tile.view), sequence.id).toEqual(before.tile);
      expect(pose(test.tile.contentView), sequence.id).toEqual(before.content);
      expect(pose(test.tile.marksView), sequence.id).toEqual(before.marks);
      // Und kein Ton faellt vorzeitig: Cues werden geplant, nicht gespielt.
      expect(test.cues, sequence.id).toHaveLength(0);

      /*
       * Die zweite Haelfte, und sie hat gefehlt: **kein Partikel und keine Requisite**
       * darf beim Bauen schon zu sehen sein. Genau daran ist im Spiel jeder Knall
       * gescheitert — neun Rauchwolken sassen fast eine Sekunde bewegungslos auf der
       * geschlossenen Platte, und beim Aufdecken *erschien* nichts mehr, es fing nur an
       * sich zu bewegen (Playtest-Finding 01, ADR-23).
       */
      expect(test.fx.visible, `${sequence.id} zeigt Partikel beim Bauen`).toBe(0);
      expect(test.digger.helmetAttached, `${sequence.id} loest den Helm beim Bauen`).toBe(true);
      expect(test.digger.sooty, `${sequence.id} rust beim Bauen`).toBe(false);
      expect(test.digger.kicking, sequence.id).toBe(false);
      expect(Object.values(test.digger.props).some(Boolean), sequence.id).toBe(false);
      expect(test.digger.faces, `${sequence.id} setzt beim Bauen ein Gesicht`).toHaveLength(0);
      expect(test.shakes, `${sequence.id} wackelt beim Bauen`).toBe(0);
    }
  });

  it('holt den Deckel auch beim Abspielen noch einmal hervor', () => {
    /*
     * Der Fehler, gegen den dieser Test steht: Wer `liftLid()` nur beim **Bauen** ruft,
     * animiert spaeter ein Sprite, das `revealCell` inzwischen weggeblendet hat — die
     * Platte verschwindet, statt wegzukippen. Sichtbar ist das nur am Geraet; hier ist
     * es eine Zahl.
     */
    for (const sequence of allSequences()) {
      const test = harness(resultFor(sequence.kind));
      const timeline = sequence.build(test.context);
      const afterBuild = test.tile.lifts;
      runToEnd(timeline);
      expect(test.tile.lifts, sequence.id).toBeGreaterThan(afterBuild);
    }
  });

  it('gibt den Deckel wieder frei', () => {
    for (const sequence of allSequences()) {
      const test = harness(resultFor(sequence.kind));
      runToEnd(sequence.build(test.context));
      expect(test.tile.lidDropped, sequence.id).toBe(true);
    }
  });

  it('plant jeden Cue vor dem Ende der Sequenz', () => {
    for (const sequence of allSequences()) {
      const test = harness(resultFor(sequence.kind));
      const timeline = sequence.build(test.context);
      runToEnd(timeline);

      expect(test.cues.length, sequence.id).toBeGreaterThan(0);
      for (const played of test.cues) {
        expect(played.at, `${sequence.id}/${played.cue}`).toBeGreaterThanOrEqual(0);
        expect(played.at, `${sequence.id}/${played.cue}`).toBeLessThanOrEqual(timeline.duration());
      }
    }
  });

  it('laesst den Digger nach einer weiterlaufenden Runde stehen, wo er stand', () => {
    /*
     * Nur fuer Sequenzen, nach denen weitergegraben wird — und dazu gehoeren **alle acht
     * Hits**: Eine Explosion beendet die Runde nicht. Wer als Haufen liegen bleibt,
     * rutscht danach quer ueber das Feld zur Bank, und der naechste Zug faengt mit einem
     * Digger an, der auf dem Kopf steht.
     *
     * Nach einem Kistenfund ist die Runde dagegen vorbei (GDD §3.5) — dass der Digger
     * dort unter der Kiste liegen bleibt, ist die Pointe, kein Fehler;
     * `BoardStage.resetRound()` raeumt ihn zum Rundenstart auf.
     */
    const ongoing = allSequences().filter(
      (s) => s.kind === 'empty' || s.kind === 'dud' || s.kind === 'hit'
    );
    for (const sequence of ongoing) {
      const test = harness(resultFor(sequence.kind));
      runToEnd(sequence.build(test.context));

      expect(test.digger.view.x, sequence.id).toBeCloseTo(0, 3);
      expect(test.digger.view.y, sequence.id).toBeCloseTo(0, 3);
      expect(test.digger.view.rotation, sequence.id).toBeCloseTo(0, 3);
      expect(test.digger.view.scale.x, sequence.id).toBeCloseTo(1, 3);
      expect(test.digger.view.scale.y, sequence.id).toBeCloseTo(1, 3);
    }
  });

  it('kommt ohne die Zuschauer aus, wenn Low-Effects an ist', () => {
    for (const sequence of allSequences()) {
      const result = resultFor(sequence.kind);
      const plain = harness(result);
      const low = harness(result, 7, true);

      const full = sequence.build(plain.context).duration();
      const reduced = sequence.build(low.context).duration();
      // Kuerzer oder gleich — aber nie laenger, und nie auf null.
      expect(reduced, sequence.id).toBeLessThanOrEqual(full + 1e-6);
      expect(reduced, sequence.id).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('Hit-Sequenzen (GDD §4.1, Audit A4)', () => {
  beforeEach(() => {
    resetAllSequences();
    registerAllSequences();
  });

  const hits = (): readonly DigSequence[] => sequencesOf('hit');

  it('macht jede Explosion sichtbar: Rauch und Erde', () => {
    /*
     * Design-Prioritaet 4 ist die Lesbarkeit des Feldes. Ein Krater, der ohne Rauch und
     * ohne Erde entsteht, sieht aus wie eine Platte, die verschwunden ist.
     */
    for (const sequence of hits()) {
      const test = harness(resultFor('hit'));
      sequence.build(test.context);
      const kinds = test.fx.calls.map((call) => call.kind);
      expect(kinds, sequence.id).toContain('smoke');
      expect(kinds, sequence.id).toContain('dirt');
    }
  });

  it('macht den Digger russig und laesst ihn russig', () => {
    // Der Russ ist der sichtbare Score der Runde (Art Direction §7).
    for (const sequence of hits()) {
      const test = harness(resultFor('hit'));
      runToEnd(sequence.build(test.context));
      expect(test.digger.sooty, sequence.id).toBe(true);
    }
  });

  it('gibt dem Digger Helm und Haende zurueck', () => {
    /*
     * Vier der acht nehmen ihm etwas weg — den Helm, die Schaufel, die Fassung. Am Ende
     * muss alles zurueck sein, sonst schleppt der naechste Zug eine Brezel-Schaufel oder
     * eine weisse Fahne mit.
     */
    for (const sequence of hits()) {
      const test = harness(resultFor('hit'));
      runToEnd(sequence.build(test.context));
      expect(test.digger.helmetAttached, sequence.id).toBe(true);
      expect(test.digger.kicking, sequence.id).toBe(false);
      expect(Object.values(test.digger.props).some(Boolean), sequence.id).toBe(false);
    }
  });

  it('sagt in der ersten Sekunde, dass es geknallt hat', () => {
    /*
     * Audit A4: "In 1 s lesbar — wer trinkt, wie viel, wer war's." Der Name und die
     * Schlucke stehen im Banner (`DigScreen`), hier zaehlt die Buehne: Knall auf dem
     * Frame, Ring dahinter, beides deutlich innerhalb der Sekunde.
     */
    for (const sequence of hits()) {
      const test = harness(resultFor('hit'));
      const timeline = sequence.build(test.context);
      runToEnd(timeline);

      const frame = timeline.labels[EXPLOSION.frameLabel] ?? 0;
      const boom = test.cues.find((played) => played.cue.startsWith('explosion_'));
      expect(boom, `${sequence.id} knallt nicht`).toBeDefined();
      expect(boom!.at, sequence.id).toBeCloseTo(frame, 2);

      const ring = labelDelayMs(timeline, EXPLOSION.ringLabel);
      expect(ring!, sequence.id).toBeLessThanOrEqual(ANIM.colorRingMaxDelayMs);
      expect(frame * 1000 + ring!, `${sequence.id} braucht zu lange`).toBeLessThanOrEqual(
        1000 + ANIM.colorRingMaxDelayMs
      );
    }
  });

  it('haelt `hit_chain_dance` zurueck, solange nur eine Mine unter der Platte lag', () => {
    /*
     * Kein Geschmack, sondern Wahrheit: Die Sequenz erzaehlt von **zwei** Legern. Bei
     * einer einzelnen Mine waere der zweite Schlag gelogen.
     */
    const ids = (stack: number): string[] => {
      const rng = createSeededRng(5);
      resetHistory();
      return Array.from({ length: 40 }, () => pickSequence({ kind: 'hit', modes: MODES, stack, rng })!.id);
    };
    expect(ids(1)).not.toContain('hit_chain_dance');
    expect(ids(2)).toContain('hit_chain_dance');
  });

  it('spielt `hit_dud_then_boom` nie im Doppelagent-Modus (GDD §3.6)', () => {
    /*
     * Sonst waere ein echter Blindgaenger von einer Mine, die erst "klick" macht, nicht
     * zu unterscheiden — und der ganze Bluff des Modus waere weg.
     */
    const ids = (modes: Modes): string[] => {
      const rng = createSeededRng(11);
      resetHistory();
      return Array.from({ length: 40 }, () => pickSequence({ kind: 'hit', modes, stack: 1, rng })!.id);
    };
    expect(ids(MODES)).toContain('hit_dud_then_boom');
    expect(ids({ ...MODES, doubleAgent: true })).not.toContain('hit_dud_then_boom');
  });

  it('wiederholt sich ueber 1 000 Runden nie innerhalb des Fensters (Audit A4)', () => {
    const rng = createSeededRng(2718);
    const seen: string[] = [];

    for (let round = 0; round < 1000; round++) {
      resetHistory();
      // Acht Grabungen je Runde — mehr Explosionen, als eine Runde ueberhaupt hergibt.
      const history: string[] = [];
      for (let dig = 0; dig < 8; dig++) {
        const picked = pickSequence({ kind: 'hit', modes: MODES, stack: 2, rng })!;
        // Das Fenster haelt die letzten drei zurueck.
        expect(history.slice(0, NO_REPEAT_WINDOW), `Runde ${round}`).not.toContain(picked.id);
        history.unshift(picked.id);
        seen.push(picked.id);
      }
    }

    // Und alle acht kommen tatsaechlich vor — ein Gewicht von null waere ein toter Gag.
    for (const sequence of hits()) expect(seen, sequence.id).toContain(sequence.id);
  });
});

/* ------------------------------------------------------------------ */

describe('Leer-Sequenzen (GDD §4.3)', () => {
  beforeEach(() => {
    resetAllSequences();
    registerAllSequences();
  });

  it('reagiert auf die Temperatur, wie das Icon es sagt', () => {
    for (const hint of ['hot', 'warm', 'cold'] as const) {
      const test = harness(digResult({ hint }));
      runToEnd(sequencesOf('empty')[0]!.build(test.context));
      expect(test.digger.hints, hint).toContain(hint);
      expect(
        test.cues.map((c) => c.cue),
        hint
      ).toContain(`temp_${hint}` as AudioCue);
    }
  });

  it('laesst den Temperatur-Ton weg, wo es keinen Hinweis gibt', () => {
    const test = harness(digResult({ hint: 'none' }));
    runToEnd(sequencesOf('empty')[0]!.build(test.context));
    for (const played of test.cues) {
      expect(played.cue.startsWith('temp_')).toBe(false);
    }
  });

  it('haelt sich an die 800 ms aus dem GDD', () => {
    for (const sequence of sequencesOf('empty')) {
      const { context } = harness(digResult());
      expect(sequence.build(context).duration() * 1000, sequence.id).toBeCloseTo(800, 0);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('Der stumme eigene Trittstein (ADR-2, GDD §4.3)', () => {
  beforeEach(() => {
    resetAllSequences();
    registerAllSequences();
  });

  /**
   * Das Ergebnis, das `core/board.ts#dig` fuer einen verbrauchten eigenen Trittstein
   * liefert: `kind: 'empty'`, aber mit gesetztem `ownMineConsumed`. Das Flag existiert
   * nur fuer die Auszahlung (Feigling-Zaehlung) und darf die Inszenierung nicht anfassen.
   */
  const own = digResult({ ownMineConsumed: true });
  const plain = digResult();

  it('faellt auf dieselbe Sequenzart wie ein leeres Feld', () => {
    expect(kindFor(own)).toBe('empty');
    expect(kindFor(own)).toBe(kindFor(plain));
  });

  it('waehlt bei gleichem Zufallsstand dieselbe Sequenz', () => {
    const pick = (): string => {
      resetHistory();
      return pickSequence({
        kind: kindFor(own),
        modes: MODES,
        stack: 0,
        rng: createSeededRng(2024),
      })!.id;
    };
    const forOwnMine = pick();
    const forEmpty = pick();
    expect(forOwnMine).toBe(forEmpty);
  });

  it('spielt dieselben Toene zu denselben Zeiten', () => {
    for (const sequence of sequencesOf('empty')) {
      const a = harness(own);
      const b = harness(plain);
      runToEnd(sequence.build(a.context));
      runToEnd(sequence.build(b.context));
      expect(a.cues, sequence.id).toEqual(b.cues);
    }
  });

  it('dauert exakt gleich lang', () => {
    for (const sequence of sequencesOf('empty')) {
      const a = harness(own);
      const b = harness(plain);
      expect(sequence.build(a.context).duration(), sequence.id).toBe(sequence.build(b.context).duration());
    }
  });

  it('hinterlaesst dieselbe Buehne', () => {
    for (const sequence of sequencesOf('empty')) {
      const a = harness(own);
      const b = harness(plain);
      runToEnd(sequence.build(a.context));
      runToEnd(sequence.build(b.context));

      expect(pose(a.tile.contentView), sequence.id).toEqual(pose(b.tile.contentView));
      expect(pose(a.tile.view), sequence.id).toEqual(pose(b.tile.view));
      expect(pose(a.tile.hintView), sequence.id).toEqual(pose(b.tile.hintView));
      expect(a.digger.faces, sequence.id).toEqual(b.digger.faces);
      expect(a.digger.hints, sequence.id).toEqual(b.digger.hints);
      // Und niemand wird russig: Ein Trittstein ist keine Explosion.
      expect(a.digger.sooty, sequence.id).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */

/** Ein zur Sequenzart passendes Ergebnis. */
function resultFor(kind: SequenceKind): DigResult {
  switch (kind) {
    case 'hit':
      return digResult({ kind: 'crater', foreignMines: ['p2'] });
    case 'dud':
      return digResult({ kind: 'dud', dudOwners: ['p2'] });
    case 'treasure':
      return digResult({ kind: 'treasure', treasureFound: true, roundOver: true, hint: 'none' });
    case 'greed':
      return digResult({
        kind: 'greed',
        treasureFound: true,
        roundOver: true,
        foreignMines: ['p2'],
        hint: 'none',
      });
    case 'empty':
      return digResult();
  }
}

/** Eine leere Timeline fuer die Registry-Tests — sie wird nie abgespielt. */
function gsapTimeline(): gsap.core.Timeline {
  return gsap.timeline();
}
