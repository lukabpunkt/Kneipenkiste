/**
 * Der Tresorraum (Art Direction §6) — und alles, was darin steht.
 *
 * Aufbau von hinten nach vorn: Wand, wandernde Laser, Tresor, Samttisch, Karten, Crooks,
 * Herr Kassel — und darueber Spotlight und Vignette. Genau diese Reihenfolge bestimmt
 * auch die Atlas-Einteilung (ADR-14): drei Texturen, drei Draw-Calls.
 *
 * Architektur §2 zaehlt den Tresor zu diesem Modul, deshalb baut und besitzt der Raum die
 * Buehne komplett: Tresor, Karten, Crooks, Kassel. Der `RevealDirector` (M3) bekommt sie
 * fertig aufgestellt und muss nur noch Regie fuehren.
 *
 * Der Alarm-Modus faerbt die Laser rot und laesst den Raum dreimal aufblitzen. Er ist
 * kein Effekt um des Effekts willen: Er markiert den Moment, in dem klar ist, dass jemand
 * gestohlen hat (GDD §4.3).
 */

import gsap from 'gsap';
import { Container, Sprite, TilingSprite, type Spritesheet, type Texture } from 'pixi.js';
import { createNoise2D } from 'simplex-noise';
import { ALARM, LASER, SPOT_ALPHA, STAGE, UI_COLORS } from '@/config/theme';
import type { SeededRng } from '@/core/rng';
import type { Choice, Player, PlayerId } from '@/core/types';
import { Crook } from './Crook';
import { DecisionCard } from './DecisionCard';
import { Kassel } from './Kassel';
import { layoutStage, type StageLayoutResult } from './layout';
import type { StageAssets } from './StageApp';
import { Vault, type VaultSound } from './Vault';

/** Wieviele Laser durch den Raum wandern. */
const LASER_COUNT = 5;
/** Nennlaenge des Laser-Sprites in Textur-Pixeln. */
const LASER_TEXTURE_WIDTH = 64;

export interface VaultRoomOptions {
  assets: StageAssets;
  rng: SeededRng;
  lowEffects?: boolean;
  onSound?: (id: VaultSound) => void;
}

export interface PopulateOptions {
  players: readonly Player[];
  choices: Readonly<Record<PlayerId, Choice>>;
  /** Eid-Modus: Wer geschworen hat, dessen Karte traegt ein Siegel. */
  oaths?: readonly PlayerId[];
  /** Fuellstand des Tresors, 0..1. */
  vaultFill: number;
}

export class VaultRoom {
  /** Haengt in `world` und traegt alles — die Kamera bewegt genau diesen Container. */
  readonly view = new Container();
  /** Licht und Vignette, ueber allem. Liegt im `overlay`, nicht in der Welt. */
  readonly light = new Container();

  readonly vault: Vault;
  readonly kassel: Kassel;
  readonly crooks = new Map<PlayerId, Crook>();
  readonly cards = new Map<PlayerId, DecisionCard>();

  private readonly assets: StageAssets;
  private readonly rng: SeededRng;
  private readonly onSound: (id: VaultSound) => void;

  private readonly backLayer = new Container();
  /**
   * Kassel liegt in einer eigenen Ebene, nicht bei den Crooks: `populate()` raeumt die
   * Figuren zwischen zwei Runden ab, und er soll dabei stehen bleiben. Dieselbe Textur,
   * also kostet die zusaetzliche Ebene keinen Draw-Call (ADR-14).
   */
  private readonly kasselLayer = new Container();
  private readonly crookLayer = new Container();
  private readonly cardLayer = new Container();

  private readonly wall: TilingSprite;
  private readonly lasers: Sprite[] = [];
  private readonly table: Sprite;
  private readonly spotlight: Sprite;
  private readonly vignette: Sprite;
  /** Der rote Blitz beim Alarm — ein eingefaerbter Vollbild-Sprite. */
  private readonly alarmFlash: Sprite;

  private readonly noise = createNoise2D();
  private readonly laserSeeds: number[] = [];
  private elapsed = 0;
  private alarmed = false;
  private lowEffects: boolean;
  private layout: StageLayoutResult = layoutStage(0);

  constructor(options: VaultRoomOptions) {
    this.assets = options.assets;
    this.rng = options.rng;
    this.lowEffects = options.lowEffects ?? false;
    this.onSound = options.onSound ?? (() => undefined);

    const { back, front } = options.assets;
    const world = STAGE.worldSize;

    /*
     * Wand und Boden in einem: eine Kachel, die weit ueber die Weltgrenzen hinausragt.
     *
     * `StageApp` skaliert auf die **Breite**; auf einem 9:16-Display ist damit rund die
     * doppelte Welthoehe sichtbar. Was hier nicht gedeckt ist, waere ein schwarzer
     * Streifen — deshalb reicht die Kachel von -900 bis 1900.
     */
    this.wall = new TilingSprite({
      texture: this.texture(back, 'back/wall'),
      width: world,
      height: world * 2.8,
    });
    this.wall.position.set(0, -world * 0.9);
    this.wall.tileScale.set(1.6);

    /* --- Laser: duenne Linien, die durch den Raum treiben --- */
    const laserTexture = this.texture(back, 'back/laser');
    for (let i = 0; i < LASER_COUNT; i++) {
      const laser = new Sprite(laserTexture);
      laser.anchor.set(0.5);
      laser.alpha = LASER.alpha;
      laser.tint = UI_COLORS.laser;
      laser.scale.set(world / LASER_TEXTURE_WIDTH, 0.8);
      this.lasers.push(laser);
      this.laserSeeds.push(this.rng.range(0, 100));
    }

    /* --- Tresor --- */
    this.vault = new Vault({
      sheet: back,
      size: STAGE.worldSize * 0.34,
      onSound: this.onSound,
    });

    /* --- Samttisch: die Buehne, auf der die Karten liegen --- */
    this.table = new Sprite(this.texture(back, 'back/table'));
    this.table.anchor.set(0.5, 0.22);
    this.table.width = world * 1.5;
    this.table.scale.y = this.table.scale.x;
    this.table.position.set(world / 2, world * 0.52);

    /* --- Herr Kassel --- */
    this.kassel = new Kassel({
      sheet: options.assets.crooks,
      frontSheet: front,
      height: 210,
      ...(this.lowEffects ? { lowEffects: true } : {}),
    });

    this.backLayer.addChild(this.wall, ...this.lasers, this.vault.view, this.table);
    this.kasselLayer.addChild(this.kassel.view);
    this.view.addChild(
      this.backLayer,
      this.kasselLayer,
      this.crookLayer,
      this.cardLayer,
      this.kassel.bubble.view
    );

    /* --- Licht --- */
    this.spotlight = new Sprite(this.texture(front, 'front/spotlight'));
    this.spotlight.anchor.set(0.5, 0);
    // Breiter als die Welt: Die harten Kanten des Kegels laufen so aus dem Bild und
    // wirken wie Licht, nicht wie ein Dreieck.
    this.spotlight.width = world * 1.9;
    this.spotlight.scale.y = this.spotlight.scale.x;
    this.spotlight.position.set(world / 2, -world * 0.05);
    this.spotlight.alpha = SPOT_ALPHA;

    this.vignette = new Sprite(this.texture(front, 'front/vignette'));
    this.vignette.anchor.set(0.5);
    this.vignette.width = world * 1.6;
    this.vignette.height = world * 1.6;
    this.vignette.position.set(world / 2, world / 2);

    this.alarmFlash = new Sprite(this.texture(front, 'front/vignette'));
    this.alarmFlash.anchor.set(0.5);
    this.alarmFlash.width = world * 2.2;
    this.alarmFlash.height = world * 2.2;
    this.alarmFlash.position.set(world / 2, world / 2);
    this.alarmFlash.tint = UI_COLORS.steal;
    this.alarmFlash.alpha = 0;

    this.light.addChild(this.spotlight, this.vignette, this.alarmFlash);
    this.setLowEffects(this.lowEffects);
  }

  private texture(sheet: Spritesheet, frame: string): Texture {
    const texture = sheet.textures[frame];
    if (!texture) throw new Error(`Frame "${frame}" fehlt im Atlas.`);
    return texture;
  }

  /* ---------------------------------------------------------------- */
  /* Buehne aufstellen                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * Stellt Karten und Crooks fuer eine Runde auf.
   *
   * Wird zwischen zwei Runden erneut gerufen: Die Figuren werden abgeraeumt und neu
   * gebaut. Das ist billiger, als es klingt — acht Crooks sind rund hundert Sprites aus
   * einer Textur, und zwischen zwei Runden hat der Browser Zeit.
   */
  populate(options: PopulateOptions): void {
    this.clearFigures();

    const { players } = options;
    this.layout = layoutStage(players.length);
    const oaths = new Set(options.oaths ?? []);

    this.vault.setPosition(this.layout.vault.x, this.layout.vault.y);
    this.vault.setFill(options.vaultFill);
    this.kassel.setPosition(this.layout.kassel.x, this.layout.kassel.y);

    players.forEach((player, index) => {
      const seat = this.layout.seats[index];
      if (!seat) return;

      const crook = new Crook({
        sheet: this.assets.crooks,
        colorId: player.colorId,
        rng: this.rng,
        height: this.layout.crookHeight,
        stripes: player.outfit.stripes,
        lowEffects: this.lowEffects,
        ...(player.outfit.hatId ? { hatId: player.outfit.hatId } : {}),
      });
      crook.setPosition(seat.crook.x, seat.crook.y);
      this.crookLayer.addChild(crook.view);
      this.crooks.set(player.id, crook);

      const card = new DecisionCard({
        sheet: this.assets.front,
        colorId: player.colorId,
        choice: options.choices[player.id] ?? 'share',
        width: this.layout.cardWidth,
        sealed: oaths.has(player.id),
      });
      card.setPosition(seat.card.x, seat.card.y, seat.card.rotation);
      this.cardLayer.addChild(card.view);
      this.cards.set(player.id, card);
    });

    /*
     * Tiefensortierung: Der Bogen ist gebogen, also steht der mittlere Crook weiter vorn
     * als die aeusseren. Ohne Sortierung entscheidet die Sitzreihenfolge, wer wen
     * verdeckt — und dann steht der linke Nachbar plötzlich vor dem, der näher an der
     * Kamera ist.
     */
    this.crookLayer.children.sort((a, b) => a.position.y - b.position.y);
    this.cardLayer.children.sort((a, b) => a.position.y - b.position.y);
  }

  /** Wo die Karte eines Spielers liegt — die Kamera fragt danach. */
  cardPosition(playerId: PlayerId): { x: number; y: number } | undefined {
    const card = this.cards.get(playerId);
    if (!card) return undefined;
    return { x: card.view.position.x, y: card.view.position.y };
  }

  /**
   * Blick-Regie (Art Direction §7): Alle schauen auf die genannte Karte, ihr Besitzer
   * schaut zur Kamera. Ohne diese Zeile wirkt der Halbkreis wie ein Schaufenster.
   */
  lookAtCard(playerId: PlayerId): void {
    const target = this.cardPosition(playerId);
    if (!target) return;
    for (const [id, crook] of this.crooks) {
      if (id === playerId) crook.lookAhead();
      else crook.lookAt(target.x, target.y);
    }
  }

  lookAhead(): void {
    for (const crook of this.crooks.values()) crook.lookAhead();
  }

  private clearFigures(): void {
    for (const crook of this.crooks.values()) crook.destroy();
    for (const card of this.cards.values()) card.destroy();
    this.crooks.clear();
    this.cards.clear();
    this.crookLayer.removeChildren();
    this.cardLayer.removeChildren();
  }

  /* ---------------------------------------------------------------- */
  /* Leben                                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Ein Tick fuer den ganzen Raum: Laser treiben, Crooks atmen und blinzeln.
   *
   * Simplex-Noise statt Zufall fuer die Laser: Zufall liesse die Linien zittern, Noise
   * laesst sie *treiben* — und das ist der Unterschied zwischen "kaputt" und "bewacht".
   */
  update(deltaMs: number): void {
    this.elapsed += deltaMs;

    for (const crook of this.crooks.values()) crook.update(deltaMs);
    this.kassel.update(deltaMs);

    if (this.lowEffects) return;

    const world = STAGE.worldSize;
    const t = this.elapsed / LASER.moveIntervalMs;
    for (let i = 0; i < this.lasers.length; i++) {
      const laser = this.lasers[i]!;
      const seed = this.laserSeeds[i]!;
      const drift = this.noise(t * 0.35, seed);
      const tilt = this.noise(t * 0.2, seed + 50);
      laser.position.set(world / 2, world * (0.06 + (i / LASER_COUNT) * 0.46) + drift * 55);
      laser.rotation = tilt * 0.22;
    }
  }

  /** Alarm an: Laser werden rot, der Raum blitzt dreimal (Art Direction §6). */
  raiseAlarm(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    if (this.alarmed) return timeline;
    this.alarmed = true;

    for (const laser of this.lasers) {
      timeline.to(laser, { tint: UI_COLORS.steal, duration: 0.2 }, 0);
    }
    if (!this.lowEffects) {
      for (let pulse = 0; pulse < ALARM.pulses; pulse++) {
        timeline
          .to(this.alarmFlash, { alpha: ALARM.overlayAlpha, duration: 0.1 }, pulse * 0.32)
          .to(this.alarmFlash, { alpha: 0, duration: 0.2 }, pulse * 0.32 + 0.1);
      }
    }
    return timeline;
  }

  /** Spotlight enger ziehen — die letzte Karte bekommt den Raum fuer sich (GDD §4.3). */
  narrowSpot(factor: number, durationMs: number): gsap.core.Timeline {
    return gsap.timeline().to(this.spotlight.scale, {
      x: this.spotlight.scale.x * factor,
      duration: durationMs / 1000,
      ease: 'power2.inOut',
    });
  }

  setLowEffects(low: boolean): void {
    this.lowEffects = low;
    // Laser und Vignette sind Deko; auf schwachen Geraeten fliegen sie zuerst raus.
    for (const laser of this.lasers) laser.visible = !low;
    this.vignette.visible = !low;
    for (const crook of this.crooks.values()) crook.setLowEffects(low);
    this.kassel.setLowEffects(low);
  }

  /** Ausgangszustand zwischen zwei Runden. */
  reset(): void {
    gsap.killTweensOf([this.alarmFlash, this.spotlight.scale, ...this.lasers]);
    this.alarmed = false;
    this.alarmFlash.alpha = 0;
    this.spotlight.scale.set(this.spotlight.scale.y);
    for (const laser of this.lasers) {
      laser.tint = UI_COLORS.laser;
      laser.alpha = LASER.alpha;
    }
    this.vault.reset();
    this.kassel.reset();
    for (const crook of this.crooks.values()) crook.reset();
    for (const card of this.cards.values()) card.reset();
  }

  destroy(): void {
    gsap.killTweensOf([this.alarmFlash, this.spotlight.scale, ...this.lasers]);
    this.clearFigures();
    this.vault.destroy();
    this.kassel.destroy();
    this.view.destroy({ children: true });
    this.light.destroy({ children: true });
  }
}
