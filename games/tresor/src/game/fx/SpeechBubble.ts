/**
 * Sprechblase fuer Herrn Kassel (Art Direction §5).
 *
 * Der Rahmen ist ein **9-Slice-Sprite** aus dem `front`-Atlas, kein `Graphics` (ADR-16):
 * Eine gezeichnete Blase haette eine eigene Geometrie und damit einen eigenen Draw-Call
 * gekostet — bei drei erlaubten waere das ein Drittel des Budgets fuer einen Kasten.
 * So batcht sie mit den Karten.
 *
 * Der Text bleibt ein `Text` und kostet den einen zusaetzlichen Draw-Call, den er wert
 * ist: Kassels Saetze kommen aus der i18n, sind auf Deutsch und Englisch verschieden lang
 * und voller Umlaute. Eine Bitmap-Font muesste dafuer den ganzen Zeichensatz vorhalten.
 */

import gsap from 'gsap';
import { Container, NineSliceSprite, Sprite, Text, TextStyle, type Spritesheet } from 'pixi.js';
import { FONTS, UI_COLORS } from '@/config/theme';

const PADDING = { x: 26, y: 18 } as const;
/** Eckradius des Rahmen-Sprites — so gross muss der unverzerrte Rand sein. */
const SLICE = 34;
const MIN_WIDTH = 120;
const MAX_WIDTH = 360;

export interface SpeechBubbleOptions {
  /** `front`-Atlas: Rahmen und Zipfel. */
  sheet: Spritesheet;
}

export class SpeechBubble {
  readonly view = new Container();

  private readonly frame: NineSliceSprite;
  private readonly tail: Sprite;
  private readonly label: Text;

  constructor(options: SpeechBubbleOptions) {
    const frameTexture = options.sheet.textures['front/bubble'];
    const tailTexture = options.sheet.textures['front/bubble_tail'];
    if (!frameTexture || !tailTexture) throw new Error('Sprechblasen-Frames fehlen im Atlas.');

    this.frame = new NineSliceSprite({
      texture: frameTexture,
      leftWidth: SLICE,
      rightWidth: SLICE,
      topHeight: SLICE,
      bottomHeight: SLICE,
    });

    this.tail = new Sprite(tailTexture);
    this.tail.anchor.set(0.5, 0);
    this.tail.scale.set(0.8);

    this.label = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: FONTS.body,
        fontSize: 28,
        fontWeight: '800',
        fill: UI_COLORS.ink,
        wordWrap: true,
        wordWrapWidth: MAX_WIDTH - PADDING.x * 2,
        align: 'center',
      }),
    });
    this.label.anchor.set(0.5);

    this.view.addChild(this.frame, this.tail, this.label);
    this.view.visible = false;
  }

  /** Passt Rahmen und Zipfel an die Textgroesse an. */
  private fit(): void {
    const width = Math.max(MIN_WIDTH, this.label.width + PADDING.x * 2);
    const height = Math.max(SLICE * 2, this.label.height + PADDING.y * 2);

    this.frame.width = width;
    this.frame.height = height;
    // Der Ursprung der Blase liegt in ihrer Mitte, damit sie von dort aufploppt.
    this.frame.position.set(-width / 2, -height / 2);
    this.label.position.set(0, 0);
    // Der Zipfel zeigt nach unten links, Richtung Kassels Kopf.
    this.tail.position.set(-width * 0.18, height / 2 - 4);
  }

  /** Blase einblenden. Gibt eine Timeline zurueck, damit die Show sie einhaengen kann. */
  show(text: string, holdMs = 2600): gsap.core.Timeline {
    this.label.text = text;
    this.fit();
    this.view.visible = true;

    return gsap
      .timeline()
      .fromTo(this.view, { alpha: 0 }, { alpha: 1, duration: 0.18 })
      .fromTo(this.view.scale, { x: 0.7, y: 0.7 }, { x: 1, y: 1, duration: 0.32, ease: 'back.out(2.4)' }, '<')
      .to({}, { duration: holdMs / 1000 })
      .to(this.view, { alpha: 0, duration: 0.2 })
      .call(() => {
        this.view.visible = false;
      });
  }

  hide(): void {
    gsap.killTweensOf([this.view, this.view.scale]);
    this.view.visible = false;
    this.view.alpha = 0;
  }

  destroy(): void {
    gsap.killTweensOf([this.view, this.view.scale]);
    this.view.destroy({ children: true });
  }
}
