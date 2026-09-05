/**
 * Eine Erdplatte (Art Direction §4.1).
 *
 * Zustaende: `covered` · `pressed` · `opening` · `open_empty` · `crater` · `treasure` ·
 * `mine_revealed` · `dud` · `mine_placed`.
 *
 * **Die Platte weiss nie, was unter ihr liegt.** Sie bekommt fertige Zustaende gesagt —
 * `openEmpty()`, `crater()`, `treasure()` — und kann deshalb gar nicht versehentlich
 * verraten, dass ein leeres Feld eigentlich ein verbrauchter Trittstein war (ADR-2).
 * Der Weg dorthin ist derselbe Code, dieselben Texturen, dieselbe Dauer.
 */

import { Container, Sprite, Text, type Spritesheet } from 'pixi.js';
import { PLATE } from '@/config/choreo';
import { colorById, FONTS, FX_SIZE, hex, UI_COLORS, type ColorId, type CritterId } from '@/config/theme';
import type { Hint } from '@/config/rules';
import { t } from '@/core/i18n';
import type { Cell } from '@/core/types';

export type TileState =
  'covered' | 'open_empty' | 'crater' | 'treasure' | 'dud' | 'mine_placed' | 'mine_revealed';

/** Die Texturnamen im `board`-Atlas. */
const FRAME = {
  plate: 'plates/plate_top',
  pressed: 'plates/plate_pressed',
  hole: 'plates/hole',
  crater: 'plates/crater',
  treasure: 'plates/treasure_glow',
  bomb: 'mines/bomb',
  bombLit: 'mines/bomb_lit',
  ring: 'fx/ring',
  phew: 'fx/phew',
} as const;

const HINT_FRAME: Record<Exclude<Hint, 'none'>, string> = {
  hot: 'fx/temp_hot',
  warm: 'fx/temp_warm',
  cold: 'fx/temp_cold',
};

const CRITTER_FRAME: Record<CritterId, string> = {
  worm: 'critters/worm',
  beetle: 'critters/beetle',
  bone: 'critters/bone',
  boot: 'critters/boot',
};

export interface TileOptions {
  sheet: Spritesheet;
  cell: Cell;
  /** Kantenlaenge in Welteinheiten (aus `FIELD_LAYOUT`). */
  size: number;
  /** Deko-Variante 0–3, damit das Feld nicht gestempelt wirkt. */
  deco: number;
}

export class Tile {
  readonly view = new Container();
  readonly cell: Cell;
  readonly size: number;

  private readonly sheet: Spritesheet;
  /** Der Deckel — kippt beim Oeffnen nach hinten weg. */
  private readonly plate: Sprite;
  private readonly deco: Sprite;
  /** Was unter dem Deckel sichtbar wird. */
  private readonly ground: Sprite;
  /** Inhalt des Lochs: Tier, Bombe, Kiste. */
  private readonly content = new Container();
  /** Legerfarben-Ringe liegen ueber allem. */
  private readonly marks = new Container();
  /**
   * Der Platz des Temperatur-Icons — **immer vorhanden, auch leer.**
   *
   * Eine Sequenz baut ihre Timeline, bevor die Platte aufgeht; das Icon entsteht aber
   * erst beim Aufdecken. Ein fester Container laesst sich schon vorher animieren, ein
   * Sprite, das es noch nicht gibt, nicht.
   */
  private readonly hintSlot = new Container();

  private currentState: TileState = 'covered';

  constructor(options: TileOptions) {
    const { sheet, cell, size, deco } = options;
    this.sheet = sheet;
    this.cell = cell;
    this.size = size;

    this.ground = new Sprite(sheet.textures[FRAME.hole]);
    this.plate = new Sprite(sheet.textures[FRAME.plate]);
    this.deco = new Sprite(sheet.textures[`plates/deco_${deco % 4}`]);

    for (const sprite of [this.ground, this.plate]) {
      sprite.anchor.set(0.5);
      sprite.width = size;
      sprite.height = size;
    }
    /*
     * Die Deko sitzt unten links auf der Platte und skaliert nicht mit ihr mit: Sie soll
     * bei 6 x 6 nicht zu einem Fleck zusammenschrumpfen.
     */
    this.deco.anchor.set(0, 1);
    this.deco.scale.set(size / 260);
    this.deco.position.set(-size * 0.42, size * 0.42);

    this.plate.addChild(this.deco);
    this.view.addChild(this.ground, this.plate, this.content, this.marks, this.hintSlot);

    this.ground.visible = false;
  }

  get state(): TileState {
    return this.currentState;
  }

  /* ---------------------------------------------------------------- */
  /* Was die Sequenzen anfassen duerfen                                */
  /* ---------------------------------------------------------------- */

  /**
   * Der Inhalt des Lochs (Tier, Bombe, Kiste) — als Container, nicht als Sprite.
   *
   * Sequenzen bewegen hier ausschliesslich **Darstellung**. Sie erfahren dabei nicht,
   * was drin liegt: Der Container ist bei einem leeren Feld und bei einem verbrauchten
   * eigenen Trittstein derselbe, mit demselben Tier darin (ADR-2).
   */
  get contentView(): Container {
    return this.content;
  }

  /**
   * Die Legerfarben-Ringe. Bei einer Explosion ist das die wichtigste Information des
   * ganzen Spiels (Design-Prioritaet 2) — deshalb duerfen Sequenzen sie aufziehen,
   * aber nur zeitlich: Was drinsteht, entscheidet allein `crater()`/`dud()`.
   */
  get marksView(): Container {
    return this.marks;
  }

  /** Der Platz des Temperatur-Icons. Leer, solange die Platte zu ist. */
  get hintView(): Container {
    return this.hintSlot;
  }

  /** Der Deckel. */
  get plateView(): Sprite {
    return this.plate;
  }

  /**
   * Den bereits weggeblendeten Deckel noch einmal zeigen, damit eine Sequenz ihn
   * wegkippen lassen kann. Ohne Sequenz — Replay, Low-Effects — bleibt er einfach weg.
   */
  liftLid(): Sprite {
    this.plate.visible = true;
    return this.plate;
  }

  /** Ende der Kippbewegung: Deckel weg, Ausgangswerte zurueck. */
  dropLid(): void {
    this.plate.visible = false;
    this.plate.rotation = 0;
    this.plate.alpha = 1;
    this.plate.position.set(0, 0);
  }

  /** Weltposition der Plattenmitte — der Digger laeuft hierhin. */
  setPosition(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /* ---------------------------------------------------------------- */
  /* Zustaende                                                         */
  /* ---------------------------------------------------------------- */

  /** Zurueck auf Anfang — neue Runde. */
  reset(): void {
    this.currentState = 'covered';
    this.plate.visible = true;
    this.plate.texture = this.sheet.textures[FRAME.plate]!;
    this.plate.rotation = 0;
    this.plate.alpha = 1;
    this.plate.scale.set(this.size / this.plate.texture.width);
    this.plate.position.set(0, 0);
    this.ground.visible = false;
    this.content.removeChildren();
    this.content.position.set(0, 0);
    this.content.rotation = 0;
    this.content.alpha = 1;
    this.content.scale.set(1);
    this.marks.removeChildren();
    this.marks.scale.set(1);
    this.marks.alpha = 1;
    this.hintSlot.removeChildren();
    this.hintSlot.scale.set(1);
    this.view.scale.set(1);
    this.view.alpha = 1;
  }

  /** Tap-Feedback: die Platte sackt kurz ein (Art Direction §4.1). */
  press(pressed: boolean): void {
    if (this.currentState !== 'covered' && this.currentState !== 'mine_placed') return;
    this.plate.texture = this.sheet.textures[pressed ? FRAME.pressed : FRAME.plate]!;
    this.view.scale.set(pressed ? PLATE.pressScale : 1);
  }

  /**
   * Der Deckel kippt nach hinten weg und gibt den Boden frei.
   * Gibt die Dauer zurueck, damit der Aufrufer sie in eine Timeline haengen kann.
   */
  private openLid(groundFrame: string): void {
    this.ground.texture = this.sheet.textures[groundFrame]!;
    this.ground.visible = true;
    this.plate.visible = false;
    this.view.scale.set(1);
  }

  /**
   * Leeres Feld — **und damit auch der stumme eigene Trittstein.**
   * Es gibt hier bewusst keinen zweiten Weg: gleiche Textur, gleiches Tier, gleiche Dauer.
   */
  openEmpty(critter: CritterId | undefined, hint: Hint): void {
    this.currentState = 'open_empty';
    this.openLid(FRAME.hole);
    this.content.removeChildren();

    if (critter) {
      const sprite = new Sprite(this.sheet.textures[CRITTER_FRAME[critter]]);
      sprite.anchor.set(0.5);
      sprite.scale.set((this.size * 0.5) / sprite.texture.width);
      sprite.position.set(0, this.size * 0.04);
      this.content.addChild(sprite);
    }
    this.showHint(hint);
  }

  /**
   * Krater mit den Ringen der Leger. Der Ring ist die Information, nicht die Deko.
   *
   * ## Warum hier Restrauch und Truemmer liegen
   *
   * Bis zum ersten Playtest war ein Krater optisch ein Loch mit einem Farbton weniger:
   * dieselbe Form wie ein leeres Feld, nur dunkler — und **leerer**, denn ein leeres Feld
   * hat wenigstens einen Wurm drin. Wer ueber das Brett schaute, sah nicht, wo es
   * geknallt hatte. Jetzt bleibt liegen, was eine Explosion hinterlaesst.
   *
   * **Das ist ausdruecklich kein Bruch von ADR-2.** `BoardView.paintOpened` trennt
   * `empty` und `crater` in zwei Zweige; hierher kommt man nur mit mindestens einer
   * **fremden** Mine. Der stumme eigene Trittstein laeuft durch `openEmpty()` und wird
   * von dieser Methode nie beruehrt.
   */
  crater(blamed: readonly ColorId[], hint: Hint): void {
    this.currentState = 'crater';
    this.openLid(FRAME.crater);
    this.content.removeChildren();

    // Der Rauch, der nicht mehr aufsteigt: dunkel, ruhig, bleibt liegen.
    const smoulder = new Sprite(this.sheet.textures['fx/smoke_s']);
    smoulder.anchor.set(0.5);
    smoulder.tint = UI_COLORS.soot;
    smoulder.alpha = 0.35;
    smoulder.scale.set((this.size * (FX_SIZE.craterSmoke / 185)) / smoulder.texture.width);
    smoulder.position.set(0, -this.size * 0.06);
    this.content.addChild(smoulder);

    /*
     * Drei Erdklumpen am Rand. Feste Positionen statt Zufall: Der Krater soll bei jedem
     * Blick gleich aussehen, sonst flackert das Feld beim Neuzeichnen.
     */
    for (const [dx, dy, turn] of [
      [-0.3, 0.26, 0.4],
      [0.32, 0.3, -0.7],
      [0.12, -0.3, 1.9],
    ] as const) {
      const debris = new Sprite(this.sheet.textures['fx/dirt']);
      debris.anchor.set(0.5);
      debris.scale.set((this.size * (FX_SIZE.craterDebris / 185)) / debris.texture.width);
      debris.position.set(this.size * dx, this.size * dy);
      debris.rotation = turn;
      this.content.addChild(debris);
    }

    this.showRings(blamed);
    this.showHint(hint);
  }

  /** Blindgaenger: Rauchwoelkchen, Leger sichtbar, sonst nichts (GDD §3.6). */
  dud(blamed: readonly ColorId[], hint: Hint): void {
    this.currentState = 'dud';
    this.openLid(FRAME.hole);
    this.content.removeChildren();

    const puff = new Sprite(this.sheet.textures['fx/smoke_s']);
    puff.anchor.set(0.5);
    puff.tint = UI_COLORS.smoke;
    puff.alpha = 0.85;
    puff.scale.set((this.size * 0.6) / puff.texture.width);
    this.content.addChild(puff);

    this.showRings(blamed);
    this.showHint(hint);
  }

  /** Kiste. Bei "Preis der Gier" kommen die Ringe der Leger dazu. */
  treasure(blamed: readonly ColorId[] = []): void {
    this.currentState = 'treasure';
    this.openLid(blamed.length > 0 ? FRAME.crater : FRAME.treasure);
    this.content.removeChildren();

    const crate = new Sprite(
      this.sheet.textures[blamed.length > 0 ? 'treasure/crate_singed' : 'treasure/crate_open']
    );
    crate.anchor.set(0.5, 0.6);
    crate.scale.set((this.size * 0.82) / crate.texture.width);
    this.content.addChild(crate);

    this.showRings(blamed);
  }

  /** Place-Screen: die eigene Mine steckt halb in der Erde, Lunte glimmt. */
  minePlaced(kind: 'mine' | 'dud'): void {
    this.currentState = 'mine_placed';
    this.content.removeChildren();

    const bomb = new Sprite(this.sheet.textures[kind === 'mine' ? FRAME.bombLit : FRAME.bomb]);
    bomb.anchor.set(0.5, 0.62);
    bomb.scale.set((this.size * 0.62) / bomb.texture.width);
    // Die Platte hebt sich leicht an, damit die Bombe darunter hervorlugt.
    this.plate.position.set(0, this.size * 0.06);
    this.content.addChild(bomb);
    this.content.position.set(0, -this.size * 0.06);
  }

  /** Place-Screen: Mine wieder herausnehmen (zweiter Tap). */
  clearPlacement(): void {
    this.currentState = 'covered';
    this.content.removeChildren();
    this.content.position.set(0, 0);
    this.plate.position.set(0, 0);
  }

  /**
   * Feld-Replay (GDD §4.4): Jetzt darf alles sichtbar werden — auch die Minen, auf die
   * nie jemand getreten ist. Das ist der zweite grosse Moment einer Runde.
   */
  revealMine(owners: readonly ColorId[], neverTriggered: boolean): void {
    this.currentState = 'mine_revealed';

    if (neverTriggered) {
      const bomb = new Sprite(this.sheet.textures[FRAME.bomb]);
      bomb.anchor.set(0.5, 0.6);
      bomb.scale.set((this.size * 0.55) / bomb.texture.width);
      this.content.addChild(bomb);

      const phew = new Sprite(this.sheet.textures[FRAME.phew]);
      phew.anchor.set(0.5, 1);
      phew.scale.set((this.size * 0.66) / phew.texture.width);
      phew.position.set(0, -this.size * 0.3);
      this.marks.addChild(phew);

      /*
       * Der Text kommt als PIXI-Text, nicht als Textur: "Puh" steht in `i18n` und muss
       * sich mit der Sprache aendern — ein Schild mit eingebranntem Wort waere auf
       * Englisch falsch beschriftet (CLAUDE.md: alle Texte ueber i18n).
       */
      const label = new Text({
        text: t('result.phew'),
        style: {
          fontFamily: FONTS.display,
          fontSize: this.size * 0.2,
          fill: UI_COLORS.ink,
        },
      });
      label.anchor.set(0.5, 1);
      label.position.set(0, -this.size * 0.42);
      this.marks.addChild(label);
    }
    this.showRings(owners);
  }

  /* ---------------------------------------------------------------- */

  /**
   * Die Ringe der Leger. Mehrere Ringe sitzen ineinander, damit auch ein Doppelstapel
   * lesbar bleibt — und jeder traegt seine Farbe als Tint, nicht als eigene Textur.
   */
  private showRings(colors: readonly ColorId[]): void {
    colors.forEach((colorId, index) => {
      const color = colorById(colorId);
      const scale = 0.78 - index * 0.26;

      const ring = new Sprite(this.sheet.textures[FRAME.ring]);
      ring.anchor.set(0.5);
      ring.tint = color.hex;
      ring.scale.set((this.size * scale) / ring.texture.width);
      this.marks.addChild(ring);

      /*
       * Das Symbol laeuft mit. Acht Farben allein sind nicht deuteranopie-fest
       * (Audit A2) — und ueber einem Krater ist "wer war das" die wichtigste
       * Information des ganzen Spiels (Design-Prioritaet 2).
       */
      const symbol = new Sprite(this.sheet.textures[`symbols/${color.symbol}`]);
      symbol.anchor.set(0.5);
      symbol.tint = color.hex;
      symbol.scale.set((this.size * scale * 0.42) / symbol.texture.width);
      this.marks.addChild(symbol);
    });
  }

  /**
   * Das Temperatur-Icon sitzt unten rechts auf der Platte — **immer als Icon auf hellem
   * Kreis**, waehrend Spielerfarben immer Ringe sind (Art Direction §2). `temp.hot` ist
   * derselbe Farbwert wie Spielerfarbe Rot; nur die zwei Formensprachen halten sie
   * ueber demselben Krater auseinander.
   */
  private showHint(hint: Hint): void {
    this.hintSlot.removeChildren();
    this.hintSlot.scale.set(1);
    if (hint === 'none') return;

    const icon = new Sprite(this.sheet.textures[HINT_FRAME[hint]]);
    icon.anchor.set(1, 1);
    icon.scale.set((this.size * 0.34) / icon.texture.width);
    this.hintSlot.addChild(icon);
    /*
     * Der Slot traegt die Position, das Icon sitzt in seinem Ursprung: So skaliert eine
     * Sequenz den Slot von 0 auf 1, ohne dass das Icon dabei durchs Bild wandert.
     */
    this.hintSlot.position.set(this.size * 0.44, this.size * 0.44);
  }

  /** Nur fuer Tests und das Dev-Panel. */
  debugColors(): string[] {
    return this.marks.children
      .filter((child): child is Sprite => child instanceof Sprite && child.tint !== 0xffffff)
      .map((sprite) => hex(sprite.tint as number));
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
