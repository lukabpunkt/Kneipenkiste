/**
 * Schilder und Stempel (GDD §4.2/§4.3, Art Direction §3).
 *
 * Drei Auftritte: Das Todeszone-Schild schwingt vor dem Anlauf ins Bild und kündigt den
 * garantierten Crash an. Das "abgefault"-Schild erklärt im Nachspiel, warum ein Balken
 * fehlt. Der Stempel "FAHNENFLUCHT" knallt auf einen Wortbrecher.
 *
 * Alle drei tragen Text aus i18n, also PIXI-Text (siehe `fx/text.ts`). Sie stehen nie
 * gleichzeitig — das Schild gehört zum Intro, der Stempel zum Nachspiel.
 */

import { Container, Sprite, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { UI_COLORS } from '@/config/theme';
import { createStageText } from './text';

export class Signs {
  readonly view = new Container();

  constructor(private readonly sheet: Spritesheet) {}

  /**
   * Das Todeszone-Schild (GDD §4.2): schwingt mit `elastic.out` herein und bleibt hängen.
   *
   * Es ist die Ansage, auf die das ganze Schrumpfen hinarbeitet — deshalb kommt es früh,
   * gross und mit Trommel, nicht als Randnotiz.
   */
  deathZone(text: string, x: number, y: number): gsap.core.Timeline {
    const group = new Container();

    const board = new Sprite(this.sheet.textures['signs/sign_deathzone']);
    board.anchor.set(0.5, 0);
    board.width = 420;
    board.height = 150;

    const label = createStageText({ text, fontSize: 52, fill: UI_COLORS.ink });
    label.position.set(0, 84);

    group.addChild(board, label);
    group.position.set(x, y - 260);
    /* Der Anker sitzt oben: Das Schild schwingt an seinen Ketten, nicht um die Mitte. */
    group.pivot.set(0, -40);
    this.view.addChild(group);

    const timeline = gsap.timeline();
    timeline
      .fromTo(group, { y: y - 520, alpha: 0 }, { y: y - 260, alpha: 1, duration: 0.45, ease: 'power3.in' })
      .fromTo(group, { rotation: -0.34 }, { rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.42)' })
      .to(group, { alpha: 0, duration: 0.3 }, '+=0.8')
      .call(() => group.destroy({ children: true }));
    return timeline;
  }

  /** "Balken {x} ist abgefault" — die Vorschau auf die nächste Runde (GDD §4.4). */
  note(text: string, x: number, y: number): gsap.core.Timeline {
    const group = new Container();

    const board = new Sprite(this.sheet.textures['signs/sign_help']);
    board.anchor.set(0.5, 0.5);
    board.width = 300;
    board.height = 130;

    const label = createStageText({ text, fontSize: 30, fill: UI_COLORS.ink });
    label.position.set(0, -18);

    group.addChild(board, label);
    group.position.set(x, y);
    this.view.addChild(group);

    const timeline = gsap.timeline();
    timeline
      .fromTo(group.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.34, ease: 'back.out(2.2)' })
      .fromTo(group, { rotation: -0.12 }, { rotation: 0.04, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, '<')
      .to(group, { alpha: 0, duration: 0.3 }, '+=1.1')
      .call(() => group.destroy({ children: true }));
    return timeline;
  }

  /**
   * Der Stempel (GDD §4.3, `deserter_stamp`): kommt von oben, schlägt ein, wackelt aus.
   *
   * Rot, schief, laut — er soll wie ein Urteil wirken, nicht wie eine Beschriftung.
   */
  stamp(text: string, x: number, y: number, tiltDeg = -12): gsap.core.Timeline {
    const group = new Container();

    const frame = new Sprite(this.sheet.textures['fx/stamp']);
    frame.anchor.set(0.5);
    frame.width = 340;
    frame.height = 110;

    const label = createStageText({ text, fontSize: 44, fill: UI_COLORS.danger });

    group.addChild(frame, label);
    group.position.set(x, y);
    group.rotation = (tiltDeg * Math.PI) / 180;
    this.view.addChild(group);

    const timeline = gsap.timeline();
    timeline
      .fromTo(
        group.scale,
        { x: 2.6, y: 2.6 },
        { x: 1, y: 1, duration: 0.16, ease: 'power4.in' }
      )
      .fromTo(group, { alpha: 0 }, { alpha: 1, duration: 0.1 }, '<')
      /* Der Nachschlag: kurz zu klein, dann auf Grösse — das ist der Aufprall. */
      .to(group.scale, { x: 1.08, y: 1.08, duration: 0.09, ease: 'power2.out' })
      .to(group.scale, { x: 1, y: 1, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { alpha: 0, duration: 0.34 }, '+=1.0')
      .call(() => group.destroy({ children: true }));
    return timeline;
  }

  reset(): void {
    this.view.removeChildren().forEach((child) => child.destroy({ children: true }));
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
