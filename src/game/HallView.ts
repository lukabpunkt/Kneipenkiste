/**
 * Die Bühne mit Modi (ADR-6).
 *
 * Ein Canvas für drei Screens: Hall, Inspect, Gate. Statt die Halle dreimal aufzubauen,
 * schaltet sie nur den Modus um — und wandert per `attach()` zwischen den Screen-Hosts.
 *
 * Interaktion: Nur im Modus `inspect` sind Koffer tippbar, und nur die, die der Kern
 * freigegeben hat. Die Trefferfläche ist bewusst größer als der Koffer (CLAUDE.md:
 * ≥ 56 px) — ein danebengegangener Tap auf einem Handy in der Tischmitte ist kein
 * Bedienfehler, sondern ein Designfehler.
 */

import type { FederatedPointerEvent} from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import { LAYOUT, STAGE, colorById, type ColorId } from '@/config/theme';
import { layoutSuitcases } from './layout';
import { createEventBus, type EventBus } from '@/core/store';
import type { PlayerId } from '@/core/types';
import type { PublicRound } from '@/core/publicView';
import type { ItemSet } from '@/core/types';
import type { SequenceContext } from './sequences/Sequence';
import { Camera } from './Camera';
import { FxKit } from './fx/FxKit';
import { Hall } from './Hall';
import type { HallAppHandle, HallAssets } from './HallApp';
import { Officer } from './Officer';
import { Suitcase } from './Suitcase';
import { Traveler } from './Traveler';
import { Waldi } from './Waldi';
import { XrayMonitor } from './XrayMonitor';
import type { RandomSource } from '@/core/rng';

export type HallMode = 'idle' | 'hints' | 'interrogation' | 'inspect' | 'gate';

export interface HallViewEvents {
  suitcaseTap: { suitcaseOf: PlayerId };
}

export interface HallViewOptions {
  app: HallAppHandle;
  assets: HallAssets;
  rng: RandomSource;
  /** Wer reist, wer kontrolliert — Namen und Farben kommen von außen. */
  players: { id: PlayerId; name: string; colorId: ColorId }[];
  officerId: PlayerId;
  travelerIds: PlayerId[];
  lowEffects?: boolean;
}

export class HallView {
  readonly events: EventBus<HallViewEvents> = createEventBus<HallViewEvents>();
  readonly hall: Hall;
  readonly xray: XrayMonitor;
  readonly officer: Officer;
  readonly waldi: Waldi;
  readonly camera: Camera;
  readonly fx: FxKit;

  private readonly app: HallAppHandle;
  private readonly root = new Container();
  private readonly hitLayer = new Container();
  private readonly suitcases = new Map<PlayerId, Suitcase>();
  private readonly travelers = new Map<PlayerId, Traveler>();
  private readonly hits = new Map<PlayerId, Graphics>();
  private readonly hitBounds = new Map<
    PlayerId,
    { x: number; y: number; width: number; height: number }
  >();
  /** Abstand zum Reihen-Nachbarn je Koffer — begrenzt die Trefferflaeche. */
  private readonly spacing = new Map<PlayerId, number>();

  private mode: HallMode = 'idle';
  private locked = false;
  private lowEffects: boolean;
  private readonly officerColor: ColorId;

  constructor(options: HallViewOptions) {
    this.app = options.app;
    this.lowEffects = options.lowEffects ?? false;

    const byId = new Map(options.players.map((p) => [p.id, p]));
    const officer = byId.get(options.officerId);
    if (!officer) throw new Error('Der Beamte fehlt in der Spielerliste.');
    this.officerColor = officer.colorId;

    this.hall = new Hall(options.assets.hall);
    this.xray = new XrayMonitor(options.assets.hall, options.assets.xray);
    this.xray.setLowEffects(this.lowEffects);

    /*
     * Tropfen und Federn borgen sich Texturen aus den vorhandenen Atlanten statt eigene
     * zu bekommen: Ein Tropfen ist eine getintete Ellipse, eine Feder ein kleines
     * Dreieck — dafuer lohnt kein Frame, und jeder gesparte Atlas ist ein Draw-Call
     * weniger (Audit A2: <= 3).
     */
    const dropTexture = options.assets.xray.textures['toothbrush'];
    const featherTexture = options.assets.items.textures['towel'];
    if (!dropTexture || !featherTexture) throw new Error('Fx-Texturen fehlen im Atlas.');
    this.fx = new FxKit(options.assets.items, dropTexture, featherTexture);
    this.fx.setLowEffects(this.lowEffects);

    /* --- Koffer auf dem Band, ein- oder zweireihig (ADR-13) --- */
    const count = options.travelerIds.length;
    const rows = layoutSuitcases(count);

    options.travelerIds.forEach((id, index) => {
      const player = byId.get(id);
      if (!player) throw new Error(`Reisender ${id} fehlt in der Spielerliste.`);
      const slot = rows[index]!;

      const suitcase = new Suitcase({
        sheet: options.assets.suitcases,
        playerId: id,
        name: player.name,
        colorId: player.colorId,
        width: slot.width,
      });
      suitcase.position(slot.x, slot.y);
      this.suitcases.set(id, suitcase);
      this.spacing.set(id, slot.spacing);
      /* Hintere Reihe zuerst einhaengen — Zeichenreihenfolge ist Tiefenstaffelung. */
      if (slot.back) this.hall.beltLayer.addChildAt(suitcase.view, 0);
      else this.hall.beltLayer.addChild(suitcase.view);
    });

    /* --- Reisende hinter der gelben Linie, in einer Reihe --- */
    const span = LAYOUT.travelers.right - LAYOUT.travelers.left;
    const slot = count > 1 ? span / (count - 1) : 0;

    options.travelerIds.forEach((id, index) => {
      const player = byId.get(id)!;
      const traveler = new Traveler({
        sheet: options.assets.shotlings,
        colorId: player.colorId,
        rng: options.rng,
        lowEffects: this.lowEffects,
        /* Zu acht ruecken sie zusammen und werden etwas kleiner — wie eine echte Schlange. */
        height: LAYOUT.travelerHeight * (count >= 6 ? 0.92 : 1),
      });

      traveler.position(
        count > 1 ? LAYOUT.travelers.left + slot * index : (LAYOUT.travelers.left + LAYOUT.travelers.right) / 2,
        LAYOUT.travelers.row
      );

      this.travelers.set(id, traveler);
      /*
       * Von rechts nach links einhaengen: Wer weiter rechts steht, wird zuerst gezeichnet
       * und von seinem linken Nachbarn ueberlappt — so entsteht eine Schlange statt eines
       * Stapels.
       */
      this.hall.floorLayer.addChildAt(traveler.view, 0);
    });

    /* --- Beamter und Waldi --- */
    this.officer = new Officer({
      sheet: options.assets.shotlings,
      colorId: officer.colorId,
      rng: options.rng,
      lowEffects: this.lowEffects,
    });
    this.officer.position(LAYOUT.officer.x, LAYOUT.officer.y);
    this.hall.floorLayer.addChild(this.officer.view);

    this.waldi = new Waldi(options.assets.dog);
    this.waldi.position(LAYOUT.dog.x, LAYOUT.dog.y);
    this.hall.floorLayer.addChild(this.waldi.view);

    /* --- Zusammenbauen --- */
    this.root.addChild(this.hall.view, this.xray.view, this.fx.view, this.hitLayer);
    this.camera = new Camera(this.app.world, this.app.layout);

    this.buildHitAreas();
    this.setMode('idle');
  }

  /**
   * Unsichtbare Trefferflächen über den Koffern.
   *
   * Sie liegen in einer eigenen Ebene über allem anderen, damit ein Tap nicht davon
   * abhängt, ob gerade ein Reisender davor steht. Und sie sind **größer als der Koffer**:
   * "≥ 56 px" aus CLAUDE.md ist ein Mindestmaß für das, was der Finger trifft, nicht für
   * die Grafik.
   */
  private buildHitAreas(): void {
    for (const [id, suitcase] of this.suitcases) {
      const hit = new Graphics();
      hit.position.set(suitcase.view.x, suitcase.view.y);
      hit.eventMode = 'none';
      hit.cursor = 'pointer';

      hit.on('pointertap', (event: FederatedPointerEvent) => {
        event.stopPropagation();
        if (this.locked || this.mode !== 'inspect') return;
        this.events.emit('suitcaseTap', { suitcaseOf: id });
      });

      this.hits.set(id, hit);
      this.hitLayer.addChild(hit);
    }
    this.relayoutHitAreas();
  }

  /** Wie viele Welteinheiten sind so groß wie `px` CSS-Pixel? */
  private worldUnitsFor(px: number): number {
    const scale = this.app.layout.scale || 1;
    return px / scale;
  }

  /**
   * Zieht die Trefferflächen nach — nach jedem Resize, damit 56 px auch 56 px bleiben.
   *
   * Der Mindestwert wird aus der **aktuellen** Skalierung zurückgerechnet: Auf einem
   * schmalen Handy ist eine Welteinheit weniger wert als auf einem Tablet, und die Regel
   * gilt in beiden Fällen.
   */
  relayoutHitAreas(): void {
    const minWorld = this.worldUnitsFor(STAGE.minTouchPx);
    for (const [id, hit] of this.hits) {
      const suitcase = this.suitcases.get(id);
      const spacing = this.spacing.get(id) ?? Number.POSITIVE_INFINITY;
      if (!suitcase) continue;
      /* Mindestens 56 px — aber nie so breit, dass die Nachbarflaeche mitgetroffen wird. */
      const width = Math.min(spacing, Math.max(suitcase.bounds.width, minWorld));
      const height = Math.max(suitcase.bounds.height, minWorld);
      hit.clear()
        .rect(-width / 2, -height, width, height)
        .fill({ color: 0xffffff, alpha: 0.001 });
      this.hitBounds.set(id, {
        x: suitcase.view.x,
        y: suitcase.view.y - height / 2,
        width,
        height,
      });
    }
  }

  /** Mittelpunkt und Größe einer Trefferfläche in Welteinheiten — die Dev-Sonde misst das. */
  hitAreaOf(playerId: PlayerId): { x: number; y: number; width: number; height: number } | undefined {
    return this.hitBounds.get(playerId);
  }

  /** Hängt die Bühne in die Welt des Singletons. */
  mount(): void {
    this.app.world.addChild(this.root);
    this.camera.syncHome();
  }

  unmount(): void {
    this.app.world.removeChild(this.root);
  }

  /* ------------------------------------------------------------------ */
  /* Modi (Architektur §7)                                               */
  /* ------------------------------------------------------------------ */

  setMode(mode: HallMode): void {
    this.mode = mode;

    /* Tippbar ist nur im Inspect-Modus überhaupt etwas. */
    const interactive = mode === 'inspect';
    this.hitLayer.eventMode = interactive ? 'static' : 'none';
    for (const hit of this.hits.values()) hit.eventMode = interactive ? 'static' : 'none';

    this.hall.runBelt(mode === 'hints');
    this.xray.view.visible = mode === 'inspect';

    if (mode === 'gate') this.camera.toGate();
    else if (mode !== 'inspect') this.camera.reset();
  }

  getMode(): HallMode {
    return this.mode;
  }

  /** Sperrt das Board, solange eine Sequenz läuft. */
  lock(value: boolean): void {
    this.locked = value;
  }

  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Übernimmt, was der Screen sehen darf. Die Bühne bekommt **nur** `publicView` —
   * sie weiß nicht, was in den Koffern liegt, und kann es deshalb auch nicht verraten.
   */
  applyView(view: PublicRound): void {
    for (const suitcase of view.suitcases) {
      const node = this.suitcases.get(suitcase.playerId);
      if (!node) continue;

      const hit = this.hits.get(suitcase.playerId);
      if (hit) hit.eventMode = suitcase.inspectable && !this.locked ? 'static' : 'none';

      if (suitcase.locked && node.getState() !== 'bribed') node.setBribed();
      if (suitcase.opened) node.setState('openCaught');
    }
  }

  /**
   * Macht jeden Koffer tippbar — ausschließlich für die Messsonde im Dev-Build.
   *
   * Im Spiel entscheidet der Regelkern über `publicView.inspectable`, wer angetippt
   * werden darf; diese Methode umgeht das, um den Hit-Test isoliert messen zu können.
   */
  setAllInspectable(): void {
    for (const hit of this.hits.values()) hit.eventMode = 'static';
    this.hitLayer.eventMode = 'static';
  }

  suitcaseOf(playerId: PlayerId): Suitcase | undefined {
    return this.suitcases.get(playerId);
  }

  /** Alle Koffer der Runde in Aufstellreihenfolge — Dev-Sonde und Directors lesen das. */
  suitcaseIds(): PlayerId[] {
    return [...this.suitcases.keys()];
  }

  /** Die Farbe des Beamten — alles, was ihm gehoert, traegt sie (CLAUDE.md). */
  get officerColorId(): ColorId {
    return this.officerColor;
  }

  travelerOf(playerId: PlayerId): Traveler | undefined {
    return this.travelers.get(playerId);
  }

  /** Der Auswahl-Glow trägt die Farbe des Beamten — er hat getippt. */
  highlight(playerId: PlayerId, on: boolean): void {
    this.suitcases.get(playerId)?.select(on, colorById(this.officerColor).hex);
  }

  /**
   * Stellt die Ruhepose aller Figuren und Koffer wieder her.
   *
   * Gebraucht von der Dev-Sonde, die Sequenzen baut, um sie zu vermessen: Ein `build()`
   * setzt Startwerte, und ohne Reset stünde die Bühne danach schief.
   */
  reset(): void {
    for (const traveler of this.travelers.values()) traveler.reset();
    this.officer.reset();
    for (const suitcase of this.suitcases.values()) suitcase.resetAfterHint();
    this.fx.clear();
  }

  setLowEffects(value: boolean): void {
    this.lowEffects = value;
    this.xray.setLowEffects(value);
    this.fx.setLowEffects(value);
    for (const traveler of this.travelers.values()) traveler.setLowEffects(value);
    this.officer.setLowEffects(value);
  }

  update(deltaMs: number): void {
    this.hall.update(deltaMs);
    this.fx.update(deltaMs);
    for (const suitcase of this.suitcases.values()) suitcase.update(deltaMs);
    for (const traveler of this.travelers.values()) traveler.update(deltaMs);
    this.officer.update(deltaMs);
  }

  /**
   * Baut den Kontext, den eine Sequenz bekommt.
   *
   * Er enthaelt Bewegliches (Koffer, Reisender, Beamter, Effekte) — aber **keine**
   * Rundendaten ausser Menge und Item-Set, und die sind zu diesem Zeitpunkt bereits
   * oeffentlich (das Roentgenbild hat sie gezeigt).
   */
  sequenceContext(
    suitcaseOf: PlayerId,
    itemSet: ItemSet,
    amount: number,
    rng: RandomSource
  ): SequenceContext | null {
    const suitcase = this.suitcases.get(suitcaseOf);
    if (!suitcase) return null;

    return {
      view: this,
      suitcase,
      traveler: this.travelers.get(suitcaseOf),
      officer: this.officer,
      fx: this.fx,
      rng,
      itemSet,
      amount,
      suitcaseOf,
    };
  }

  destroy(): void {
    this.events.clear();
    this.unmount();
    this.fx.destroy();
    this.root.destroy({ children: true });
  }
}
