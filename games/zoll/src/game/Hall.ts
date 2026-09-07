/**
 * Die Zollhalle (Art Direction §6) — die Kulisse.
 *
 * Wand mit Split-Flap-Tafel, Uhr und Piktogramm; Förderband, das im Röntgengerät endet;
 * gelbe Linie; Schranke rechts. Alles statisch, alles aus einem Atlas — die Halle darf
 * keine Draw-Calls kosten, die der Kern-Moment braucht (Audit A2: ≤ 3 Batches).
 *
 * Sie ist die einzige **helle** Bühne der Spielefamilie. Texte auf ihr stehen deshalb in
 * `ink` mit `paper`-Kontur, nicht umgekehrt.
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, TilingSprite, type Spritesheet } from 'pixi.js';
import { LAYOUT, STAGE, UI_COLORS } from '@/config/theme';

export class Hall {
  readonly view = new Container();
  /** Ebene für die Koffer — liegt über dem Band, unter den Figuren. */
  readonly beltLayer = new Container();
  /** Ebene für Reisende, Beamter und Waldi. */
  readonly floorLayer = new Container();
  /** Ebene für Gerät und Monitor. */
  readonly machineLayer = new Container();

  private readonly belt: TilingSprite;
  private readonly rollers: Sprite[] = [];
  private readonly light: Sprite;
  private readonly gate: Sprite;
  private beltSpeed = 0;

  constructor(sheet: Spritesheet) {
    const texture = (frame: string): Sprite => {
      const t = sheet.textures[frame];
      if (!t) throw new Error(`Frame "${frame}" fehlt im Hall-Atlas.`);
      return new Sprite(t);
    };

    /*
     * Wand und Boden reichen über die Welt hinaus.
     *
     * Die Bühne füllt die Breite des Hosts; bei einem hohen Host bleibt oben und unten
     * ein Streifen der 1000×1000-Welt unbedeckt. Ohne Überzeichnung wäre dort der
     * Hintergrund des Screens zu sehen — ein weißes Band unter dem Hallenboden.
     */
    const OVERSCAN = 600;
    const wall = new Graphics()
      .rect(-OVERSCAN, -OVERSCAN, STAGE.worldWidth + OVERSCAN * 2, LAYOUT.wallBottom + OVERSCAN)
      .fill(UI_COLORS.hallWall);
    const floor = new Graphics()
      .rect(
        -OVERSCAN,
        LAYOUT.wallBottom,
        STAGE.worldWidth + OVERSCAN * 2,
        STAGE.worldHeight - LAYOUT.wallBottom + OVERSCAN
      )
      .fill(UI_COLORS.hallFloor);
    /* Fliesenfugen, angedeutet — mehr würde von der Kofferreihe ablenken. */
    const joints = new Graphics();
    for (let y = LAYOUT.wallBottom + 120; y < STAGE.worldHeight; y += 120) {
      joints.moveTo(0, y).lineTo(STAGE.worldWidth, y);
    }
    joints.stroke({ color: UI_COLORS.hallFloorLine, width: 3 });

    this.view.addChild(wall, floor, joints);

    /* --- Wanddeko --- */
    const board = texture('splitflap');
    board.anchor.set(0.5);
    board.position.set(LAYOUT.board.x, LAYOUT.board.y);
    board.width = LAYOUT.board.width;
    board.scale.y = board.scale.x;

    const clock = texture('clock');
    clock.anchor.set(0.5);
    clock.position.set(LAYOUT.clock.x, LAYOUT.clock.y);

    const pictogram = texture('pictogram');
    pictogram.anchor.set(0.5);
    pictogram.position.set(LAYOUT.pictogram.x, LAYOUT.pictogram.y);

    this.view.addChild(board, clock, pictogram);

    /* --- Förderband --- */
    const beltTexture = sheet.textures['belt'];
    if (!beltTexture) throw new Error('Frame "belt" fehlt im Hall-Atlas.');
    this.belt = new TilingSprite({
      texture: beltTexture,
      width: LAYOUT.belt.right,
      height: LAYOUT.belt.height,
    });
    this.belt.position.set(LAYOUT.belt.left, LAYOUT.belt.top);
    this.view.addChild(this.belt);

    for (let x = 40; x < LAYOUT.belt.right; x += 120) {
      const roller = texture('roller');
      roller.anchor.set(0.5);
      roller.position.set(x, LAYOUT.belt.top + LAYOUT.belt.height + 6);
      roller.scale.set(0.8);
      this.rollers.push(roller);
      this.view.addChild(roller);
    }

    /* --- Die gelbe Linie --- */
    const line = texture('line');
    line.anchor.set(0, 0.5);
    line.width = STAGE.worldWidth;
    line.position.set(0, LAYOUT.yellowLine);
    this.view.addChild(line);

    /* --- Schranke und Ampel (rechts, im Gate-Modus im Bild) --- */
    this.gate = texture('gate');
    this.gate.anchor.set(0.5, 1);
    this.gate.position.set(LAYOUT.gate.x, LAYOUT.gate.y + LAYOUT.gate.width);
    this.light = texture('light');
    this.light.anchor.set(0.5, 1);
    this.light.position.set(LAYOUT.gate.x + 120, LAYOUT.gate.y + 40);
    this.view.addChild(this.gate, this.light);

    /* --- Röntgengerät --- */
    const machine = texture('machine');
    machine.anchor.set(0.5, 1);
    machine.position.set(LAYOUT.machine.x, LAYOUT.machine.y + LAYOUT.machine.height / 2);
    this.machineLayer.addChild(machine);

    this.view.addChild(this.beltLayer, this.floorLayer, this.machineLayer);
  }

  /** Band an oder aus. Die Rollen drehen mit. */
  runBelt(on: boolean): void {
    this.beltSpeed = on ? 60 : 0;
  }

  update(deltaMs: number): void {
    if (this.beltSpeed === 0) return;
    const step = (this.beltSpeed * deltaMs) / 1000;
    this.belt.tilePosition.x -= step;
    for (const roller of this.rollers) roller.rotation -= step / 26;
  }

  /** Ampel an der Schranke: gelb bedeutet "kurz warten" (Schmuggler-Stall). */
  setLight(color: 'red' | 'amber' | 'green'): void {
    const tint = color === 'red' ? UI_COLORS.alarm : color === 'amber' ? UI_COLORS.customs : UI_COLORS.ok;
    gsap.to(this.light, { tint, duration: 0.15 });
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
