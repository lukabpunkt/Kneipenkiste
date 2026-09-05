/**
 * Die Klammer zwischen Screens und PIXI (ADR-6).
 *
 * Place, Dig und Result brauchen dasselbe Feld. Statt es dreimal aufzubauen, lebt hier
 * **eine** Bühne fuer die ganze Runde: `BoardView`, `Camera`, die Diggers und der
 * `DigDirector`. Die Screens holen sie sich mit `attach(host)` und geben sie mit
 * `detach()` wieder her — das Canvas wandert, PIXI bleibt.
 *
 * Wechselt die Spielerzahl oder die Feldgroesse, wird die Buehne neu gebaut; alles
 * andere ist ein `setMode()`.
 */

import { Container, type Spritesheet } from 'pixi.js';
import { MODE_IDS, type BoardSize, type Modes } from '@/config/rules';
import { diggerHeightFor, type ColorId } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import type { Cell, DigResult, PlaceView, Player, PlayerId, PublicView, ReplayView } from '@/core/types';
import { getBoardApp, loadBoardAssets, type BoardAppHandle } from './BoardApp';
import { BoardView, type BoardMode } from './BoardView';
import { Camera } from './Camera';
import { DigDirector, type DigPlayback } from './DigDirector';
import { Digger } from './Digger';
import { FxLayer } from './fx/FxLayer';
import { registerAllSequences, resetHistory } from './sequences';

export interface BoardStageOptions {
  players: readonly Player[];
  size: BoardSize;
  seed: number;
  /** Die aktiven Modi — sie filtern die Sequenz-Registry. */
  modes: Modes;
  lowEffects?: boolean;
}

export class BoardStage {
  readonly board: BoardView;
  readonly camera: Camera;
  readonly director: DigDirector;
  /** Rauch, Erde, Sternchen, Blaetter — die gemeinsamen Effekte der Sequenzen. */
  readonly fx: FxLayer;

  private readonly app: BoardAppHandle;
  private readonly diggers = new Map<PlayerId, Digger>();
  private readonly signature: string;
  /**
   * Der Container, den die Kamera bewegt.
   *
   * Eine eigene Ebene, weil `BoardApp.relayout()` `world` bei jedem Resize neu
   * skaliert und positioniert — Zoom und Shake darauf zu legen hiesse, dass sich
   * Kamera und Layout gegenseitig ueberschreiben. Mit dieser Zwischenebene gehoert
   * `world` dem Layout und `cameraLayer` der Kamera.
   */
  private readonly cameraLayer = new Container();

  private constructor(
    app: BoardAppHandle,
    sheets: { diggers: Spritesheet; board: Spritesheet },
    options: BoardStageOptions
  ) {
    this.app = app;
    this.signature = signatureOf(options);

    const colorOf = (id: PlayerId): ColorId | undefined =>
      options.players.find((player) => player.id === id)?.colorId;

    this.board = new BoardView({
      sheet: sheets.board,
      size: options.size,
      playerCount: options.players.length,
      seed: options.seed,
      colorOf,
    });

    const height = diggerHeightFor(options.players.length);
    options.players.forEach((player, index) => {
      const digger = new Digger({
        sheet: sheets.diggers,
        colorId: player.colorId,
        vest: player.outfit.vest,
        height,
        ...(options.lowEffects === undefined ? {} : { lowEffects: options.lowEffects }),
      });
      const slot = this.board.field.benchSlots[index];
      if (slot) digger.setHome(slot.x, slot.y, slot.back);
      /*
       * Die Diggers haengen **im Feld-Layer**, damit sie mit den Platten zusammen
       * skalieren und die Kamera sie mitnimmt. Wer hinten sitzt, wird zuerst gezeichnet.
       */
      this.board.field.boardLayer.addChild(digger.view);
      this.diggers.set(player.id, digger);
    });

    /*
     * Die Effekte haengen im Feld-Layer **ueber** den Platten und Diggers: Rauch legt
     * sich vor die Figur, sonst steht der Digger vor seiner eigenen Explosion. Derselbe
     * Layer heisst auch: dieselben Koordinaten wie `tile.view.x/y`.
     */
    this.fx = new FxLayer({
      sheet: sheets.board,
      rng: createSeededRng(options.seed ^ 0x5f3a),
      ...(options.lowEffects === undefined ? {} : { lowEffects: options.lowEffects }),
    });
    this.board.field.boardLayer.addChild(this.fx.view);
    // Nachtgraeber: dunkles Feld, zwei Laternen (GDD §3.6, Roadmap M5.2).
    this.board.field.setNight(options.modes.nightDigger);

    this.camera = new Camera(this.cameraLayer);
    /*
     * Die Sequenzen werden hier angemeldet, nicht per Import-Nebenwirkung: Der
     * Board-Chunk ist der erste Ort, an dem sie ueberhaupt gebraucht werden, und der
     * Aufruf ist idempotent.
     */
    registerAllSequences();

    this.director = new DigDirector({
      board: this.board,
      camera: this.camera,
      diggerOf: (id) => this.diggers.get(id),
      diggers: () => this.allDiggers(),
      fx: this.fx,
      modes: () => options.modes,
      colorOf,
      seed: options.seed,
      ...(options.lowEffects === undefined ? {} : { lowEffects: options.lowEffects }),
    });

    this.cameraLayer.addChild(this.board.view);
    app.world.addChild(this.cameraLayer);
  }

  static async create(options: BoardStageOptions): Promise<BoardStage> {
    const [app, sheets] = await Promise.all([getBoardApp(), loadBoardAssets()]);
    app.clearWorld();
    return new BoardStage(app, sheets, options);
  }

  /** Passt diese Buehne noch zur Runde, oder muss sie neu gebaut werden? */
  matches(options: BoardStageOptions): boolean {
    return this.signature === signatureOf(options);
  }

  /** Haengt das Canvas in den Host des aktuellen Screens (ADR-6). */
  attach(host: HTMLElement): void {
    this.app.attach(host);
  }

  detach(): void {
    this.app.detach();
  }

  setMode(mode: BoardMode): void {
    this.board.setMode(mode);
  }

  /**
   * Meldet das Banner des Screens an, der das Feld gerade haelt.
   *
   * Muss bei **jedem** Mount gesetzt werden: Die Buehne wird zwischen Place, Dig und
   * Result wiederverwendet (ADR-6), das Banner gehoert aber nur dem Dig-Screen.
   */
  setBannerHandler(handler: (result: DigResult) => void): void {
    this.director.setBannerHandler(handler);
  }

  onTileTap(listener: (cell: Cell) => void): () => void {
    return this.board.onTileTap(listener);
  }

  renderPlace(view: PlaceView): void {
    this.board.renderPlace(view);
  }

  renderPublic(view: PublicView): void {
    this.board.renderPublic(view);
  }

  /** Spielt die Replay-Welle ab (GDD §4.4). */
  renderReplay(view: ReplayView): void {
    this.board.renderReplay(view);
  }

  /** Spielt eine Grabung ab. Waehrenddessen ist das Feld gesperrt. */
  play(result: DigResult, view: PublicView): Promise<DigPlayback> {
    return this.director.play(result, view);
  }

  /**
   * Neue Runde: Platten zu, Diggers sauber und zurueck auf die Bank.
   * **Nur hier** verschwindet der Russ — waehrend einer Runde bleibt er (Art Dir. §7).
   */
  resetRound(): void {
    this.director.stop();
    this.camera.stop();
    this.board.resetTiles();
    this.board.setLocked(false);
    this.fx.clear();
    for (const digger of this.diggers.values()) digger.reset();
    // Jede Runde faengt mit einem leeren No-Repeat-Fenster an (Architektur §6).
    resetHistory();
  }

  diggerOf(playerId: PlayerId): Digger | undefined {
    return this.diggers.get(playerId);
  }

  /** Alle Diggers in Sitzreihenfolge. */
  allDiggers(): readonly Digger[] {
    return [...this.diggers.values()];
  }

  /** Frame-Zeiten und Draw-Calls fuer Dev-Panel und Perf-Test. */
  stats(): { frameTimes: readonly number[]; drawCalls: number } {
    return { frameTimes: this.app.frameTimes(), drawCalls: this.app.drawCalls() };
  }

  destroy(): void {
    this.director.stop();
    this.camera.stop();
    this.fx.destroy();
    for (const digger of this.diggers.values()) digger.destroy();
    this.diggers.clear();
    this.board.destroy();
    this.cameraLayer.destroy({ children: true });
    this.app.clearWorld();
  }
}

/**
 * Woran sich entscheidet, ob eine Buehne wiederverwendet werden kann. Spielerzahl und
 * Feldgroesse aendern das Layout; der Seed bestimmt die Deko-Verteilung. Die Modi stehen
 * mit drin, weil der Director sie an die Sequenz-Registry weiterreicht (`excludeInModes`)
 * — eine wiederverwendete Buehne wuerde sonst mit den Modi der Vorrunde filtern.
 */
function signatureOf(options: BoardStageOptions): string {
  const modes = MODE_IDS.filter((mode) => options.modes[mode]).join('+');
  const players = options.players.map((p) => `${p.id}/${p.colorId}`).join(',');
  return `${options.size}:${options.seed}:${modes}:${players}`;
}

/* ------------------------------------------------------------------ */
/* Die Buehne der laufenden Runde                                      */
/* ------------------------------------------------------------------ */

let current: BoardStage | undefined;

/**
 * Gibt die Buehne der laufenden Runde — und baut sie nur dann neu, wenn sich Spieler,
 * Feldgroesse oder Seed geaendert haben. Genau das ist der Punkt von ADR-6: Zwischen
 * Place, Dig und Result passiert **nichts**.
 */
export async function getBoardStage(options: BoardStageOptions): Promise<BoardStage> {
  if (current?.matches(options)) return current;
  current?.destroy();
  current = await BoardStage.create(options);
  return current;
}

/** Die aktuelle Buehne, falls es eine gibt — fuer Dev-Panel und Tests. */
export function activeBoardStage(): BoardStage | undefined {
  return current;
}

export function releaseBoardStage(): void {
  current?.destroy();
  current = undefined;
}
