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
import { EXPLOSION } from '@/config/choreo';
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

function fakeDigger(): SequenceDigger & { faces: FaceId[]; hints: Hint[]; sooty: boolean } {
  const digger = {
    view: animatable(),
    faces: [] as FaceId[],
    hints: [] as Hint[],
    sooty: false,
    setFace: (face: FaceId) => void digger.faces.push(face),
    reactToHint: (hint: Hint) => void digger.hints.push(hint),
    soot: () => {
      digger.sooty = true;
    },
  };
  return digger;
}

interface Played {
  cue: AudioCue;
  at: number;
}

interface Harness {
  context: SequenceContext;
  tile: ReturnType<typeof fakeTile>;
  digger: ReturnType<typeof fakeDigger>;
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
    blamedColors: ['red'],
    rng: createSeededRng(seed),
    audio: (cue, when = 0) => void cues.push({ cue, at: when }),
    lowEffects,
  };

  return {
    context,
    tile,
    digger,
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

  it('erfuellt das Soll aus GDD §4: 4 Leer-Varianten, 1 Blindgaenger, 3 Treasure', () => {
    registerAllSequences();
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
     * Nur fuer Sequenzen, nach denen weitergegraben wird. Nach einem Kistenfund ist die
     * Runde vorbei (GDD §3.5) — dass der Digger dort unter der Kiste liegen bleibt, ist
     * die Pointe, kein Fehler; `BoardStage.resetRound()` raeumt ihn zum Rundenstart auf.
     */
    const ongoing = allSequences().filter((s) => s.kind === 'empty' || s.kind === 'dud');
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
