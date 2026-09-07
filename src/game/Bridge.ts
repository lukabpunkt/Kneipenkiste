/**
 * Die Brücke (Art Direction §6, Architektur §8).
 *
 * Zwei Seile mit Durchhang, dazwischen die Balken — jeder auf der Kurve, jeder mit der
 * Neigung, die die Kurve an seiner Stelle hat. Die Nummern hängen als Schilder darüber
 * und schwingen im Wind.
 *
 * Die Seile sind **Sprites aus dem Welt-Atlas**, keine `Graphics` (ADR-13): Ein gecachtes
 * Graphics-Objekt hätte seine eigene Textur und damit einen eigenen Draw-Batch gekostet —
 * bei einem Budget von drei ist das ein Drittel für zwei Linien.
 *
 * Der Durchhang wird **einmal beim Aufbau** gerechnet, nie im Loop.
 */

import { Container, Sprite, type Spritesheet } from 'pixi.js';
import { HIKER_DEPTH_STEP, STAGE } from '@/config/theme';
import { BRIDGE_SPAN, plankGeometry } from './geometry';
import { Plank } from './Plank';
import type { Bridge as BridgeModel, PlankId } from '@/core/types';

/** Wie weit die Nummernschilder im Wind ausschlagen (Radiant). */
const SIGN_SWAY = 0.09;

/**
 * Wo die Kurve im Seil-Sprite liegt (Texturpixel des SVG).
 *
 * Ohne diese drei Zahlen raet der Code, wo im Bild das Seil verlaeuft — und dann haengen
 * die Balken sichtbar neben ihrem Seil. Sie stehen hier, weil sie zur **Zeichnung**
 * gehoeren, nicht zur Buehne: Wer `rope.svg` neu zeichnet, muss sie mitpflegen.
 */
const ROPE_TEXTURE = { height: 140, curveTop: 12, sag: 90 } as const;

export interface BridgeOptions {
  sheet: Spritesheet;
  model: BridgeModel;
  /** Wie viele Balken die Brücke am Anfang der Session hatte — bestimmt die Rasterbreite. */
  slots: number;
}

export class Bridge {
  readonly view = new Container();
  /** Balken nach Nummer — auch die, die es gerade nicht gibt, fehlen hier. */
  readonly planks = new Map<PlankId, Plank>();

  private readonly signs = new Map<PlankId, Container>();
  private readonly slots: number;
  private readonly span = BRIDGE_SPAN;

  constructor(options: BridgeOptions) {
    this.slots = options.slots;

    const ropes = new Container();
    /*
     * Zwei Seile: eins hinter den Balken, eins davor. Dadurch laufen die Bretter
     * sichtbar *zwischen* den Seilen durch, statt darauf zu liegen.
     */
    /*
     * Das Sprite wird so skaliert und gesetzt, dass seine Kurve **exakt** auf `sagAt()`
     * liegt: gleiche Endpunkte, gleicher Durchhang. Sonst laufen Seil und Balken
     * auseinander, und die Bruecke sieht aus wie zwei uebereinandergelegte Bilder.
     */
    const ropeHeight = (STAGE.bridgeSagY * ROPE_TEXTURE.height) / ROPE_TEXTURE.sag;
    const curveOffset = (ROPE_TEXTURE.curveTop * ropeHeight) / ROPE_TEXTURE.height;

    for (const [index, offset] of [-30, 24].entries()) {
      const rope = new Sprite(options.sheet.textures['bridge/rope']);
      rope.anchor.set(0, 0);
      rope.width = this.span + 44;
      rope.height = ropeHeight;
      rope.position.set(STAGE.plateauLeftEnd - 22, STAGE.bridgeY + offset - curveOffset);
      /* Ein Seil hinter den Brettern, eins davor — dadurch laufen sie sichtbar dazwischen. */
      rope.zIndex = index === 0 ? 0 : 2;
      ropes.addChild(rope);
    }

    const boards = new Container();
    boards.zIndex = 1;

    const signs = new Container();
    signs.zIndex = 3;

    this.view.sortableChildren = true;
    this.view.addChild(ropes, boards, signs);

    for (const id of options.model.planks) {
      const plank = this.createPlank(options.sheet, id);
      this.planks.set(id, plank);
      boards.addChild(plank.view);
      signs.addChild(this.createSign(options.sheet, id, plank));
    }

  }

  /**
   * Der morsche Balken zeigt sich.
   *
   * Bewusst kein Konstruktor-Argument: Die Brücke steht schon während der Absprache in
   * der Vorschau, und ein Feld, das den morschen Balken kennt, wäre ein Feld, das ihn
   * irgendwann auch zeigt. Erst der StepDirector ruft das hier — im Moment des Bruchs
   * (GDD §3.6).
   */
  revealRotten(id: PlankId): void {
    this.planks.get(id)?.showRotten(true);
  }

  private createPlank(sheet: Spritesheet, id: PlankId): Plank {
    return new Plank({ sheet, id, ...plankGeometry(id, this.slots) });
  }

  /**
   * Das Nummernschild — ein fertiges Sprite aus dem Welt-Atlas, Zahl inklusive.
   *
   * Ein PIXI-`Text` haette pro Schild eine eigene Textur bekommen: zehn Texturwechsel in
   * einem Frame, bei einem Budget von drei (Audit A2). Und er waere leer geblieben, wenn
   * die Schrift beim Erzeugen noch nicht geladen war (`scripts/build-signs.mjs`).
   */
  private createSign(sheet: Spritesheet, id: PlankId, plank: Plank): Container {
    const container = new Container();
    container.position.set(plank.baseX, plank.baseY - 96);

    const board = new Sprite(sheet.textures[`signs/num_${id}`] ?? sheet.textures['signs/num_1']);
    /* Anker oben an der Schnur: Das Schild schwingt daran, nicht um seine Mitte. */
    board.anchor.set(0.5, 0);
    board.width = 44;
    board.height = 50;

    container.addChild(board);
    this.signs.set(id, container);
    return container;
  }

  /**
   * Wo ein Hiker auf diesem Balken steht.
   *
   * `spread` kommt von aussen, weil es von der Hikergroesse abhaengt und die haengt an
   * der Spielerzahl — die Bruecke kennt beides nicht. Die Fuesse duerfen dabei ueber den
   * Balken hinausragen: Auf einem 60 Einheiten breiten Brett stehen zwei Wanderer nun mal
   * mit den Aussenkanten in der Luft, und genau das ist der Witz.
   */
  standPoint(
    id: PlankId,
    slot = 0,
    occupants = 1,
    spread = 0
  ): { x: number; y: number; depth: number } | null {
    const plank = this.planks.get(id);
    if (!plank) return null;

    const offset = occupants === 1 ? 0 : (slot - (occupants - 1) / 2) * spread;
    /* Wer weiter rechts steht, steht naeher an der Kamera — sonst ueberlagern sie sich flach. */
    const depth = occupants === 1 ? 0 : slot * HIKER_DEPTH_STEP;
    return { x: plank.baseX + offset, y: plank.standY() + depth, depth };
  }

  /** Ein Balken ist abgefault: Er fällt und lässt seine Lücke zurück. */
  rot(id: PlankId): gsap.core.Timeline | null {
    const plank = this.planks.get(id);
    if (!plank) return null;
    this.signs.get(id)?.destroy();
    this.signs.delete(id);
    return plank.rot();
  }

  /** Wind lässt die Schilder schwingen — der einzige Loop-Anteil der Brücke. */
  update(wind: number): void {
    for (const sign of this.signs.values()) {
      sign.rotation = wind * SIGN_SWAY;
    }
  }

  reset(): void {
    for (const plank of this.planks.values()) plank.reset();
  }

  destroy(): void {
    for (const plank of this.planks.values()) plank.destroy();
    this.planks.clear();
    this.signs.clear();
    this.view.destroy({ children: true });
  }
}
