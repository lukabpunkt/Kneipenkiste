/**
 * Die Buehne (Art Direction §6, ADR-12).
 *
 * Wiese, Zaun, ein Cartoon-Baum (Landeplatz fuer `hit_tree_landing`), Maulwurfshuegel,
 * ein "VORSICHT"-Schild und die Digger-Baenke.
 *
 * Die Welt ist im Hochformat: Die **Breite gehoert dem Feld** — nur so bleiben die
 * Platten ueber 56 px (GDD §5) —, die zusaetzliche Hoehe gehoert den Baenken. Deshalb
 * liegt die Deko am oberen und unteren Rand, nicht seitlich neben dem Feld.
 *
 * Alles hier ist Deko und liegt **hinter** dem Feld. Nichts davon ist tippbar: Die
 * Tippflaeche gehoert den Platten, und ein Zaunpfahl, der Taps schluckt, waere genau die
 * Art Fehler, die man erst auf einer Party bemerkt.
 */

import { Container, Graphics, Sprite, type Spritesheet } from 'pixi.js';
import { STAGE, UI_COLORS } from '@/config/theme';

/** Wo ein Digger steht, wenn er nicht dran ist. */
export interface BenchSlot {
  x: number;
  y: number;
  /** Auf der oberen Bank stehen die Diggers hinter dem Feld und werden kleiner gezeichnet. */
  back: boolean;
}

export interface FieldOptions {
  sheet: Spritesheet;
  playerCount: number;
  /** Kantenlaenge des Plattenfeldes in Welteinheiten. */
  boardExtent: number;
}

export class Field {
  readonly view = new Container();
  /** Hier haengt die `BoardView` ihre Platten ein — zwischen Deko und Diggers. */
  readonly boardLayer = new Container();
  readonly benchSlots: readonly BenchSlot[];
  /** Oberkante des Plattenfeldes in Welteinheiten. */
  readonly fieldTop: number;

  constructor(options: FieldOptions) {
    const { sheet, playerCount, boardExtent } = options;
    const width = STAGE.worldSize;
    const height = STAGE.worldHeight;
    const twoBenches = playerCount >= STAGE.twoBenchesFrom;

    this.fieldTop = twoBenches ? STAGE.fieldTop.double : STAGE.fieldTop.single;
    const fieldBottom = this.fieldTop + boardExtent;

    /* --- Wiese: zwei Baender, hell nach dunkel (Art Direction §2) --- */
    const meadow = new Graphics()
      .rect(0, 0, width, height)
      .fill(UI_COLORS.grass)
      // Der dunklere Streifen beginnt kurz unter dem Feld — dort steht die vordere Bank.
      .rect(0, fieldBottom + 20, width, height - fieldBottom - 20)
      .fill(UI_COLORS.grassDark);
    this.view.addChild(meadow);

    /* --- Deko oberhalb des Feldes ---------------------------------- */
    const headroom = this.fieldTop;

    const fence = new Sprite(sheet.textures['field/fence']);
    fence.anchor.set(0, 1);
    fence.scale.set((width * 0.38) / fence.texture.width);
    // Am linken Rand ausgerichtet, damit kein Pfosten ins Feld ragt.
    fence.position.set(width * 0.04, headroom * 0.78);
    this.view.addChild(fence);

    // Der Baum ist der Landeplatz von hit_tree_landing (Art Direction §6).
    const tree = new Sprite(sheet.textures['field/tree']);
    tree.anchor.set(0.5, 1);
    tree.scale.set((width * 0.2) / tree.texture.width);
    tree.position.set(width * 0.86, headroom * 0.98);
    this.view.addChild(tree);

    const sign = new Sprite(sheet.textures['field/sign_caution']);
    sign.anchor.set(0.5, 1);
    sign.scale.set((width * 0.09) / sign.texture.width);
    sign.position.set(width * 0.55, headroom * 0.9);
    this.view.addChild(sign);

    /* --- Maulwurfshuegel: verteilt in den Randstreifen -------------- */
    for (const [x, y, scale] of [
      [0.07, headroom * 0.62, 0.075],
      [0.4, headroom * 0.5, 0.06],
      [0.94, (fieldBottom + height) / 2 / height, 0.07],
    ] as const) {
      const hill = new Sprite(sheet.textures['field/molehill']);
      hill.anchor.set(0.5, 1);
      hill.scale.set((width * scale) / hill.texture.width);
      hill.position.set(width * x, typeof y === 'number' && y < 1 ? y * height : y);
      this.view.addChild(hill);
    }

    /*
     * Die Baenke. Bis 5 Spieler reicht eine unten; ab 6 kommt eine zweite oben dazu,
     * sonst stehen acht Diggers Schulter an Schulter (Art Direction §5).
     */
    const frontY = fieldBottom + (height - fieldBottom) * 0.72;
    const backY = this.fieldTop * 0.86;

    this.benchSlots = buildSlots(playerCount, twoBenches, frontY, backY, width);

    for (const y of twoBenches ? [frontY, backY] : [frontY]) {
      const bench = new Sprite(sheet.textures['field/bench']);
      bench.anchor.set(0.5, 0.1);
      bench.scale.set((width * 0.8) / bench.texture.width);
      bench.position.set(width / 2, y + height * 0.012);
      this.view.addChild(bench);
    }

    this.view.addChild(this.boardLayer);
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}

/**
 * Verteilt die Plaetze gleichmaessig. Bei zwei Baenken bekommt die vordere die erste
 * Haelfte — wer dran ist, laeuft von dort kuerzer zum Feld, und die vordere Reihe ist
 * die, die man ansieht.
 */
function buildSlots(
  playerCount: number,
  twoBenches: boolean,
  frontY: number,
  backY: number,
  width: number
): BenchSlot[] {
  const frontCount = twoBenches ? Math.ceil(playerCount / 2) : playerCount;
  const slots: BenchSlot[] = [];

  const spread = (count: number, y: number, back: boolean): void => {
    for (let i = 0; i < count; i++) {
      // Raender freilassen, damit niemand halb aus dem Bild steht.
      const t = count === 1 ? 0.5 : 0.14 + (0.72 * i) / (count - 1);
      slots.push({ x: width * t, y, back });
    }
  };

  spread(frontCount, frontY, false);
  if (twoBenches) spread(playerCount - frontCount, backY, true);
  return slots;
}
