/**
 * Der Koffer (Art Direction §4.1).
 *
 * Hartschale in Spielerfarbe, Griff, zwei Schnallen, Gepäckanhänger mit Symbol und Name.
 *
 * **Die wichtigste Regel dieser Datei:** Nach einer Hinweis-Animation sieht ein Koffer
 * mit Hinweis aus wie einer ohne — bis auf das kleine Icon (Art Direction §7). Jede
 * Hinweis-Animation muss deshalb in `resetAfterHint()` vollständig zurücklaufen: keine
 * Restneigung, kein Rest-Offset, kein dunklerer Ton. Ein Koffer, der nach dem Wackeln
 * ein Grad schief steht, verrät mehr als das Hinweis-Modell hergibt.
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, Text, type Spritesheet } from 'pixi.js';
import { FONTS, UI_COLORS, colorById, textColorOn, type ColorId } from '@/config/theme';
import type { HintType, PlayerId } from '@/core/types';

/** Der Gepäckanhänger in Textur-Pixeln. */
const TAG = { width: 88, height: 44 } as const;

/** Rig-Maße in Textur-Pixeln (@1x); Ursprung = Standpunkt auf dem Band. */
const CASE = {
  width: 160,
  height: 120,
  handleY: -120,
  buckleY: -74,
  buckleX: 34,
  tagY: 14,
} as const;

export type SuitcaseState =
  | 'closed'
  | 'selected'
  | 'scanning'
  | 'bribed'
  | 'openCaught'
  | 'openClean'
  | 'passedOk'
  | 'passedSmuggler'
  | 'diplomat';

export interface SuitcaseOptions {
  sheet: Spritesheet;
  playerId: PlayerId;
  name: string;
  colorId: ColorId;
  /** Zielbreite in Welteinheiten — bei 7 Koffern schrumpft die Reihe. */
  width: number;
}

export class Suitcase {
  readonly view = new Container();
  readonly playerId: PlayerId;
  readonly colorId: ColorId;

  /** Alles, was wackeln darf. Der Anhänger schwingt nach. */
  private readonly bodyGroup = new Container();
  private readonly shell: Sprite;
  private readonly handle: Sprite;
  private readonly buckleL: Sprite;
  private readonly buckleR: Sprite;
  private readonly tagGroup = new Container();
  private readonly lock: Sprite;
  private readonly glow: Graphics;

  private state: SuitcaseState = 'closed';
  private readonly baseScale: number;
  private idle = 0;
  private readonly idlePhase: number;

  constructor(options: SuitcaseOptions) {
    this.playerId = options.playerId;
    this.colorId = options.colorId;

    const sheet = options.sheet;
    const color = colorById(options.colorId);

    const sprite = (frame: string, tint?: number): Sprite => {
      const texture = sheet.textures[frame];
      if (!texture) throw new Error(`Frame "${frame}" fehlt im Koffer-Atlas.`);
      const s = new Sprite(texture);
      s.anchor.set(0.5, 1);
      if (tint !== undefined) s.tint = tint;
      return s;
    };

    /*
     * Der Auswahl-Glow liegt **hinter** dem Koffer und ist im Ruhezustand unsichtbar.
     * Er zeigt an, was der Beamte gerade antippt — nicht, was verdächtig ist.
     */
    this.glow = new Graphics()
      .roundRect(-CASE.width / 2 - 12, -CASE.height - 12, CASE.width + 24, CASE.height + 24, 22)
      .fill({ color: color.hex, alpha: 0.55 });
    this.glow.alpha = 0;

    this.shell = sprite('shell', color.hex);
    this.handle = sprite('handle');
    this.handle.position.set(0, CASE.handleY);
    this.buckleL = sprite('buckle');
    this.buckleL.position.set(-CASE.buckleX, CASE.buckleY);
    this.buckleR = sprite('buckle');
    this.buckleR.position.set(CASE.buckleX, CASE.buckleY);

    const tag = sprite('tag', color.hex);
    tag.anchor.set(0.5, 0.5);

    /*
     * Der Name auf dem Anhänger. Passt er nicht, wird er auf ein Kürzel gekürzt
     * (Art Direction §4.1) — ein abgeschnittenes "Gustav" ist schlechter zu lesen als
     * ein sauberes "GUS", und auf dem Band stehen bis zu sieben davon nebeneinander.
     */
    const label = new Text({
      text: options.name,
      style: {
        fontFamily: FONTS.body,
        fontSize: 22,
        fontWeight: '800',
        fill: textColorOn(options.colorId),
      },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(8, 0);

    const maxLabelWidth = TAG.width - 34;
    if (label.width > maxLabelWidth) {
      label.text = options.name.slice(0, 3).toUpperCase();
      /* Auch das Kürzel darf nicht überstehen — dann skaliert es eben. */
      if (label.width > maxLabelWidth) label.scale.set(maxLabelWidth / label.width);
    }

    this.tagGroup.addChild(tag, label);
    this.tagGroup.position.set(0, CASE.tagY);

    this.lock = sprite('lock');
    this.lock.anchor.set(0.5, 0.5);
    this.lock.position.set(0, -CASE.height / 2);
    this.lock.visible = false;

    this.bodyGroup.addChild(this.shell, this.handle, this.buckleL, this.buckleR, this.lock);
    this.view.addChild(this.glow, this.bodyGroup, this.tagGroup);

    this.baseScale = options.width / CASE.width;
    this.view.scale.set(this.baseScale);

    /* Jeder Koffer atmet in eigenem Takt — sonst wippt die ganze Reihe im Gleichschritt. */
    this.idlePhase = Math.random() * Math.PI * 2;
  }

  position(x: number, y: number): void {
    this.view.position.set(x, y);
  }

  /** Weltbreite und -höhe für die Trefferfläche (Audit A2: ≥ 56 px auf dem Gerät). */
  get bounds(): { width: number; height: number } {
    return { width: CASE.width * this.baseScale, height: CASE.height * this.baseScale };
  }

  getState(): SuitcaseState {
    return this.state;
  }

  /**
   * Idle: alle paar Sekunden minimal atmen. Für **alle** Koffer gleich — ein Koffer, der
   * anders atmet, wäre ein Hinweis, den niemand vergeben hat.
   */
  update(deltaMs: number): void {
    if (this.state !== 'closed' && this.state !== 'bribed') return;
    this.idle += deltaMs / 1000;
    this.bodyGroup.scale.y = 1 + Math.sin(this.idle * 0.7 + this.idlePhase) * 0.006;
  }

  /* ------------------------------------------------------------------ */
  /* Zustände                                                            */
  /* ------------------------------------------------------------------ */

  /** Auswahl-Glow in Beamtenfarbe; hebt den Koffer leicht an. */
  select(on: boolean, tint?: number): void {
    if (tint !== undefined) this.glow.tint = tint;
    gsap.to(this.glow, { alpha: on ? 1 : 0, duration: 0.16 });
    gsap.to(this.bodyGroup, { y: on ? -10 : 0, duration: 0.18, ease: 'back.out(2)' });
    if (on) this.state = 'selected';
    else if (this.state === 'selected') this.state = 'closed';
  }

  /** Bestechung angenommen: Vorhängeschloss, Koffer nicht mehr tippbar. */
  setBribed(): gsap.core.Timeline {
    this.state = 'bribed';
    this.lock.visible = true;
    this.lock.scale.set(0);
    return gsap
      .timeline()
      .to(this.lock.scale, { x: 1, y: 1, duration: 0.32, ease: 'back.out(2.4)' })
      .to(this.view, { rotation: 0.04, duration: 0.1, yoyo: true, repeat: 1 }, 0);
  }

  /** Rollt von links aufs Band. */
  rollIn(toX: number, durationSec: number): gsap.core.Timeline {
    this.view.x = -CASE.width * this.baseScale;
    return gsap
      .timeline()
      .to(this.view, { x: toX, duration: durationSec, ease: 'power2.out' })
      .to(this.tagGroup, { rotation: 0.22, duration: durationSec * 0.5, ease: 'sine.out' }, 0)
      .to(this.tagGroup, { rotation: 0, duration: 0.4, ease: 'elastic.out(1,0.35)' });
  }

  /** Fährt ins Röntgengerät. */
  travelIntoMachine(toX: number, durationSec: number): gsap.core.Timeline {
    this.state = 'scanning';
    return gsap
      .timeline()
      .to(this.view, { x: toX, duration: durationSec, ease: 'power1.inOut' })
      .to(this.view, { alpha: 0, duration: 0.18 }, durationSec - 0.18);
  }

  /** Kommt aus dem Gerät zurück an seinen Platz. */
  returnFromMachine(toX: number, durationSec: number): gsap.core.Timeline {
    return gsap
      .timeline()
      .to(this.view, { alpha: 1, duration: 0.15 })
      .to(this.view, { x: toX, duration: durationSec, ease: 'power1.inOut' }, 0);
  }

  /**
   * Eine Hinweis-Animation. Sie ist visuell eindeutig — man sieht das Wackeln — und
   * **lässt nichts zurück**: `resetAfterHint()` stellt exakt die Ruhepose wieder her.
   */
  playHint(type: HintType, durationSec: number): gsap.core.Timeline {
    const timeline = gsap.timeline({ onComplete: () => this.resetAfterHint() });
    const body = this.bodyGroup;

    switch (type) {
      case 'wobble':
        timeline
          .to(this.view, { rotation: 0.09, duration: durationSec * 0.14, ease: 'sine.inOut' })
          .to(this.view, {
            rotation: -0.09,
            duration: durationSec * 0.16,
            yoyo: true,
            repeat: 3,
            ease: 'sine.inOut',
          })
          .to(this.view, { rotation: 0, duration: durationSec * 0.2, ease: 'elastic.out(1,0.4)' })
          .to(this.tagGroup, { rotation: 0.4, duration: durationSec * 0.3, ease: 'sine.inOut' }, 0)
          .to(this.tagGroup, { rotation: 0, duration: durationSec * 0.5, ease: 'elastic.out(1,0.3)' });
        break;

      case 'heavy':
        /* Der Koffer sinkt ins Band ein, das Band ächzt. */
        timeline
          .to(body, { y: 9, duration: durationSec * 0.35, ease: 'power2.in' })
          .to(body.scale, { y: 0.94, x: 1.05, duration: durationSec * 0.35, ease: 'power2.in' }, 0)
          .to(body, { y: 0, duration: durationSec * 0.45, ease: 'elastic.out(1,0.45)' })
          .to(body.scale, { y: 1, x: 1, duration: durationSec * 0.45, ease: 'elastic.out(1,0.45)' }, '<');
        break;

      case 'click':
        timeline.to(this.view, {
          x: `+=3`,
          duration: 0.05,
          yoyo: true,
          repeat: Math.round(durationSec / 0.1),
          ease: 'none',
        });
        break;

      case 'drip':
      case 'feather':
      case 'dog':
        /*
         * Diese drei zeigen sich neben dem Koffer (Tropfen, Feder, Waldi) — der Koffer
         * selbst bewegt sich nur minimal. Die eigentlichen Effekte kommen in M3; hier
         * steht schon das Timing, damit der Rhythmus später derselbe bleibt.
         */
        timeline
          .to(body, { y: -4, duration: durationSec * 0.3, ease: 'sine.inOut' })
          .to(body, { y: 0, duration: durationSec * 0.4, ease: 'sine.inOut' });
        break;
    }

    return timeline;
  }

  /**
   * Zurück in die exakte Ruhepose. Diese Methode ist die technische Seite von
   * "Hinweise sind eindeutig, ihre Bedeutung nicht" — ohne sie sammelt ein Koffer über
   * mehrere Hinweise hinweg Abweichungen an und sieht am Ende anders aus als die anderen.
   */
  resetAfterHint(): void {
    this.view.rotation = 0;
    this.view.alpha = 1;
    this.view.scale.set(this.baseScale);
    this.bodyGroup.position.set(0, 0);
    this.bodyGroup.rotation = 0;
    this.bodyGroup.scale.set(1, 1);
    this.tagGroup.rotation = 0;
    this.tagGroup.position.set(0, CASE.tagY);
  }

  /** Springt auf: erwischt. Der Deckel klappt weg, die Ware kommt raus (Fontäne in M4). */
  openCaught(): gsap.core.Timeline {
    this.state = 'openCaught';
    return gsap
      .timeline()
      .to(this.view.scale, { y: this.baseScale * 1.12, duration: 0.07, ease: 'power2.out' })
      .to(this.view.scale, { y: this.baseScale, duration: 0.24, ease: 'elastic.out(1,0.4)' })
      .to(this.buckleL, { y: CASE.buckleY - 30, alpha: 0, duration: 0.2 }, 0)
      .to(this.buckleR, { y: CASE.buckleY - 30, alpha: 0, duration: 0.2 }, 0.04);
  }

  /** Klappt auf: sauber. Ruhiger, fast entschuldigend. */
  openClean(): gsap.core.Timeline {
    this.state = 'openClean';
    return gsap
      .timeline()
      .to(this.buckleL, { y: CASE.buckleY - 18, alpha: 0, duration: 0.26, ease: 'power2.out' })
      .to(this.buckleR, { y: CASE.buckleY - 18, alpha: 0, duration: 0.26, ease: 'power2.out' }, 0.08)
      .to(this.view, { rotation: -0.05, duration: 0.3, ease: 'sine.inOut' }, 0);
  }

  setState(state: SuitcaseState): void {
    this.state = state;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}

export { CASE as SUITCASE_METRICS, UI_COLORS };
