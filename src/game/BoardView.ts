/**
 * Das Feld als PIXI-Komponente (Architektur §7, ADR-6).
 *
 * Vier Modi — `place` | `dig` | `replay` | `idle` — und **eine** Instanz fuer alle drei
 * Screens, die das Feld brauchen. Zwischen Place, Dig und Result wird nur `setMode()`
 * gerufen; das Canvas wandert per `attach()` zum neuen Host, ohne dass PIXI neu
 * initialisiert. Ein zweites `Application`-Objekt waere ein Audit-A2-Fehler.
 *
 * **Diese Komponente sieht das private Board nie.** Sie bekommt `PublicView`,
 * `PlaceView` oder `ReplayView` — dieselbe Regel wie beim DOM-Grid aus M1 (ADR-2).
 */

import { Container, Rectangle, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { REPLAY } from '@/config/choreo';
import { FIELD_LAYOUT, STAGE, type ColorId } from '@/config/theme';
import type { BoardSize } from '@/config/rules';
import { createSeededRng, type SeededRng } from '@/core/rng';
import type { Cell, PlaceView, PlayerId, PublicView, ReplayView } from '@/core/types';
import { chebyshev } from '@/core/board';
import { prefersReducedMotion } from '@/ui/animate';
import { Field } from './Field';
import { Tile } from './Tile';

export type BoardMode = 'place' | 'dig' | 'replay' | 'idle';

export interface BoardViewOptions {
  sheet: Spritesheet;
  size: BoardSize;
  playerCount: number;
  /** Bestimmt die Deko-Verteilung — dasselbe Feld sieht bei gleichem Seed gleich aus. */
  seed: number;
  colorOf: (playerId: PlayerId) => ColorId | undefined;
}

export class BoardView {
  readonly view = new Container();
  readonly field: Field;
  readonly size: BoardSize;

  private readonly tiles: Tile[] = [];
  private readonly colorOf: (playerId: PlayerId) => ColorId | undefined;
  private readonly tapListeners = new Set<(cell: Cell) => void>();

  private mode: BoardMode = 'idle';
  private isLocked = false;
  private pressedTile: Tile | undefined;
  /** Der Timer, der ab und zu eine verdeckte Platte wackeln laesst. */
  private wiggleTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly wiggleRng: SeededRng;

  /** Kantenlaenge des Plattenfeldes in Welteinheiten — die Kamera rechnet damit. */
  readonly extent: number;

  constructor(options: BoardViewOptions) {
    const { sheet, size, playerCount, seed, colorOf } = options;
    this.size = size;
    this.colorOf = colorOf;

    const layout = FIELD_LAYOUT[size];
    this.extent = size * layout.plate + (size - 1) * layout.gap;

    this.field = new Field({ sheet, playerCount, boardExtent: this.extent });
    this.view.addChild(this.field.view);
    this.wiggleRng = createSeededRng(seed ^ 0x1d1e);

    // Horizontal zentriert, vertikal am oberen Rand — darunter stehen die Diggers (ADR-12).
    const originX = (STAGE.worldSize - this.extent) / 2 + layout.plate / 2;
    const originY = this.field.fieldTop + layout.plate / 2;
    const rng = createSeededRng(seed);

    for (let cell = 0; cell < size * size; cell++) {
      const tile = new Tile({ sheet, cell, size: layout.plate, deco: rng.int(4) });
      tile.setPosition(
        originX + (cell % size) * (layout.plate + layout.gap),
        originY + Math.floor(cell / size) * (layout.plate + layout.gap)
      );

      /*
       * Hit-Testing per PIXI statt per DOM-Overlay (Architektur §8): Ein Overlay ueber
       * dem Canvas wuerde bei jedem Resize nachgezogen werden muessen und waere genau
       * dann falsch, wenn die Kamera zoomt.
       */
      tile.view.eventMode = 'static';
      tile.view.cursor = 'pointer';
      tile.view.hitArea = new Rectangle(-layout.plate / 2, -layout.plate / 2, layout.plate, layout.plate);

      tile.view.on('pointerdown', () => this.onPointerDown(tile));
      tile.view.on('pointerup', () => this.onPointerUp(tile));
      tile.view.on('pointerupoutside', () => this.releasePress());
      tile.view.on('pointercancel', () => this.releasePress());

      this.tiles.push(tile);
      this.field.boardLayer.addChild(tile.view);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Eingabe                                                           */
  /* ---------------------------------------------------------------- */

  private interactive(): boolean {
    return !this.isLocked && (this.mode === 'place' || this.mode === 'dig');
  }

  private onPointerDown(tile: Tile): void {
    if (!this.interactive()) return;
    if (this.mode === 'dig' && tile.state !== 'covered') return;
    this.releasePress();
    this.pressedTile = tile;
    tile.press(true);
  }

  private onPointerUp(tile: Tile): void {
    const wasPressed = this.pressedTile === tile;
    this.releasePress();
    if (!wasPressed || !this.interactive()) return;
    if (this.mode === 'dig' && tile.state !== 'covered') return;

    for (const listener of [...this.tapListeners]) listener(tile.cell);
  }

  private releasePress(): void {
    this.pressedTile?.press(false);
    this.pressedTile = undefined;
  }

  /** Ein Tap auf eine Platte. Im Replay- und Idle-Modus feuert das nie. */
  onTileTap(listener: (cell: Cell) => void): () => void {
    this.tapListeners.add(listener);
    return () => this.tapListeners.delete(listener);
  }

  /**
   * Sperrt das Feld waehrend einer Inszenierung. Taps werden **ignoriert, nicht
   * gepuffert** (Architektur §3) — sonst prasseln nach einer Explosion drei nachgereichte
   * Grabungen herein, die niemand ausgeloest hat.
   */
  setLocked(locked: boolean): void {
    this.isLocked = locked;
    if (locked) this.releasePress();
  }

  get locked(): boolean {
    return this.isLocked;
  }

  /* ---------------------------------------------------------------- */
  /* Modi                                                              */
  /* ---------------------------------------------------------------- */

  setMode(mode: BoardMode): void {
    this.mode = mode;
    this.releasePress();
    /*
     * Das Leben im Feld gehoert den Phasen, in denen jemand ueberlegt. Im Replay laufen
     * ohnehin alle Platten auf, und eine wackelnde Platte mitten in der Aufloesung
     * lenkt nur ab.
     */
    if (mode === 'place' || mode === 'dig') this.startIdleWiggle();
    else this.stopIdleWiggle();
  }

  /* ---------------------------------------------------------------- */
  /* Leben im Feld (Art Direction §4.1)                                */
  /* ---------------------------------------------------------------- */

  /**
   * Alle paar Sekunden wackelt eine zufaellige verdeckte Platte — "da lebt was".
   *
   * Das ist kein Schmuck: Ein Feld aus 36 gleichen Platten sieht aus wie ein Bild.
   * Sobald sich eine bewegt, sieht es aus wie Erde, unter der etwas liegt — und genau
   * das soll man beim Tippen im Hinterkopf haben (Design-Prioritaet 1).
   *
   * Die Platte, die wackelt, wird **zufaellig** gewaehlt und verraet nichts: Der
   * Generator haengt am Feld-Seed, nicht am Inhalt der Zelle (ADR-2).
   */
  private startIdleWiggle(): void {
    this.stopIdleWiggle();
    if (prefersReducedMotion()) return;

    const [minMs, maxMs] = STAGE.plateIdleWiggleMs;
    const next = (): void => {
      this.wiggleTimer = globalThis.setTimeout(
        () => {
          this.wiggleOnce();
          next();
        },
        this.wiggleRng.intBetween(minMs, maxMs)
      );
    };
    next();
  }

  private stopIdleWiggle(): void {
    if (this.wiggleTimer !== undefined) clearTimeout(this.wiggleTimer);
    this.wiggleTimer = undefined;
  }

  private wiggleOnce(): void {
    if (this.isLocked) return;
    const covered = this.tiles.filter((tile) => tile.state === 'covered');
    if (covered.length === 0) return;

    const tile = this.wiggleRng.pick(covered);
    // Winzig: 4 Grad in 160 ms. Wer hinsieht, merkt es; wer nicht, wird nicht gestoert.
    gsap.to(tile.view, {
      rotation: 0.07,
      duration: 0.16,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => {
        tile.view.rotation = 0;
      },
    });
  }

  get currentMode(): BoardMode {
    return this.mode;
  }

  /** Minenphase: leeres Feld plus die eigenen Sprengkoerper (GDD §3.3). */
  renderPlace(view: PlaceView): void {
    for (const tile of this.tiles) tile.reset();
    for (const cell of view.ownMines) this.tiles[cell]?.minePlaced('mine');
    for (const cell of view.ownDuds) this.tiles[cell]?.minePlaced('dud');
  }

  /** Grabphase und Result: nur, was oeffentlich ist. */
  renderPublic(view: PublicView): void {
    for (const tile of this.tiles) {
      const opened = view.opened[tile.cell];
      if (!opened) {
        if (tile.state !== 'covered') tile.reset();
        continue;
      }
      this.paintOpened(tile, opened);
    }
  }

  /**
   * Zeigt genau eine Zelle in ihrem Endzustand — der `DigDirector` nutzt das, um das
   * Ergebnis erst **nach** der Anticipation aufzudecken.
   */
  revealCell(view: PublicView, cell: Cell): void {
    const opened = view.opened[cell];
    const tile = this.tiles[cell];
    if (opened && tile) this.paintOpened(tile, opened);
  }

  private paintOpened(tile: Tile, opened: PublicView['opened'][Cell]): void {
    const blamed = opened.blamed
      .map((id) => this.colorOf(id))
      .filter((color): color is ColorId => color !== undefined);

    switch (opened.kind) {
      /*
       * `empty` ist auch der stumme eigene Trittstein (ADR-2). Kein zweiter Zweig,
       * keine andere Textur, keine andere Dauer — die Daten geben ohnehin nicht her,
       * welcher Fall es war.
       */
      case 'empty':
        tile.openEmpty(opened.critter, opened.hint);
        return;
      case 'crater':
        tile.crater(blamed, opened.hint);
        return;
      case 'dud':
        tile.dud(blamed, opened.hint);
        return;
      case 'treasure':
        tile.treasure();
        return;
      case 'greed':
        tile.treasure(blamed);
    }
  }

  /**
   * Feld-Replay (GDD §4.4, Art Direction §4.6).
   *
   * Die Welle laeuft **von der Kiste nach aussen**, 40 ms pro Chebyshev-Ring. Das ist
   * nicht nur huebsch: Sie fuehrt den Blick vom Fundort weg ueber das Feld und macht
   * damit genau die Reihenfolge auf, in der man die Runde noch einmal liest — "und DA
   * lag deine Mine, direkt neben meinem Zug".
   *
   * Bei `prefers-reduced-motion` steht alles sofort da (Audit A5).
   */
  renderReplay(view: ReplayView): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const origin = view.cells.find((cell) => cell.treasure)?.cell ?? 0;
    const instant = prefersReducedMotion();

    for (const cell of view.cells) {
      const tile = this.tiles[cell.cell];
      if (!tile) continue;

      const paint = (): void => {
        if (cell.opened) this.paintOpened(tile, cell.opened);
        else tile.reset();

        const owners = [...cell.mineOwners, ...cell.dudOwners]
          .map((id) => this.colorOf(id))
          .filter((color): color is ColorId => color !== undefined);
        if (owners.length > 0) tile.revealMine(owners, cell.neverTriggered);
      };

      /*
       * Bei "Bewegung reduzieren" wird aus der Welle ein Fade (Audit A5): Alle Platten
       * decken gleichzeitig auf und blenden ein. Die Aufloesung bleibt damit ein
       * eigener Moment — sie wandert nur nicht mehr ueber den Bildschirm.
       */
      if (instant) {
        paint();
        tile.view.alpha = 0;
        timeline.to(tile.view, { alpha: 1, duration: REPLAY.plateFlipMs / 1000, ease: 'none' }, 0);
        continue;
      }

      const ring = chebyshev(cell.cell, origin, this.size);
      const at = Math.min((ring * REPLAY.ringStepMs) / 1000, REPLAY.maxTotalMs / 1000);
      timeline.add(paint, at);
      timeline.fromTo(
        tile.view.scale,
        { x: 0.72, y: 0.72 },
        { x: 1, y: 1, duration: REPLAY.plateFlipMs / 1000, ease: 'back.out(2)' },
        at
      );
    }

    return timeline;
  }

  /* ---------------------------------------------------------------- */

  tileAt(cell: Cell): Tile | undefined {
    return this.tiles[cell];
  }

  /** Die Platte in der Feldmitte — die Sequenz-Vorschau spielt immer dort. */
  get centerCell(): Cell {
    const middle = Math.floor(this.size / 2);
    return middle * this.size + middle;
  }

  /** Weltposition einer Platte — Kamera und Digger brauchen sie. */
  positionOf(cell: Cell): { x: number; y: number } {
    const tile = this.tiles[cell];
    return { x: tile?.view.x ?? STAGE.worldSize / 2, y: tile?.view.y ?? STAGE.worldHeight / 2 };
  }

  /** Neue Runde: alle Platten zu, Modus bleibt. */
  resetTiles(): void {
    for (const tile of this.tiles) tile.reset();
  }

  destroy(): void {
    this.stopIdleWiggle();
    this.tapListeners.clear();
    for (const tile of this.tiles) tile.destroy();
    this.field.destroy();
    this.view.destroy({ children: true });
  }
}
