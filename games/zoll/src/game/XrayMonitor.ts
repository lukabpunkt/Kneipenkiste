/**
 * Der Röntgenmonitor (Art Direction §4.4) — **der Kern-Moment des Spiels**.
 *
 * Drei Regeln, die hier und nur hier durchgesetzt werden (CLAUDE.md, Art Direction §7):
 *
 * 1. **Die Scanline ist heilig.** Das Bild baut sich zeilenweise von oben auf. Umgesetzt
 *    über eine Maske, die nach unten wächst — nicht über Alpha, denn ein Alpha-Fade
 *    zeigt schwach schon alles.
 * 2. **Stocken bei 50 %.** 400 ms Stillstand mit Flackern. Das ist der Lootbox-Moment:
 *    Wer hier nicht kurz die Luft anhält, hat den Rest auch nicht verdient.
 * 3. **Das Ergebnis ist nie vor 100 % erkennbar.** Deshalb liegt saubere Ware im Layout
 *    immer **oben**: Was zuerst sichtbar wird, sind Socken und Zahnbürste — harmlos, egal
 *    was darunter liegt. Der Label-Test prüft, dass `revealed` nicht vor `scanComplete`
 *    liegt.
 */

import gsap from 'gsap';
import { BlurFilter, Container, Graphics, Sprite, type Spritesheet } from 'pixi.js';
import { XRAY as XRAY_CHOREO, XRAY_LABELS } from '@/config/choreo';
import { LAYOUT, UI_COLORS, XRAY as XRAY_THEME } from '@/config/theme';
import type { ItemSet } from '@/core/types';

/** Innenmaße des Monitors in Welteinheiten. */
const SCREEN = {
  width: LAYOUT.monitor.width - 56,
  height: LAYOUT.monitor.height - 56,
} as const;

export interface XrayContents {
  /** Wie viel Schmuggelware im Koffer liegt. 0 = sauber. */
  amount: number;
  itemSet: ItemSet;
  /** Diplomatenpass statt Ware. */
  diplomat?: boolean;
  /** Das peinliche Item bei einem sauberen Koffer. */
  embarrassing?: 'teddy' | 'mug' | 'duck_bow';
}

export class XrayMonitor {
  readonly view = new Container();

  private readonly screen = new Container();
  private readonly contents = new Container();
  private readonly mask: Graphics;
  private readonly grid: Graphics;
  private readonly scanBar: Graphics;
  private readonly sheet: Spritesheet;
  private lowEffects = false;

  constructor(hallSheet: Spritesheet, xraySheet: Spritesheet) {
    this.sheet = xraySheet;

    const frameTexture = hallSheet.textures['monitor'];
    if (!frameTexture) throw new Error('Frame "monitor" fehlt im Hall-Atlas.');
    const frame = new Sprite(frameTexture);
    frame.anchor.set(0.5);

    /* Monitor-Raster: die schwache grüne Gitterlinie hinter den Silhouetten. */
    this.grid = new Graphics();
    for (let x = -SCREEN.width / 2; x <= SCREEN.width / 2; x += 26) {
      this.grid.moveTo(x, -SCREEN.height / 2).lineTo(x, SCREEN.height / 2);
    }
    for (let y = -SCREEN.height / 2; y <= SCREEN.height / 2; y += 26) {
      this.grid.moveTo(-SCREEN.width / 2, y).lineTo(SCREEN.width / 2, y);
    }
    this.grid.stroke({ color: UI_COLORS.xrayDim, width: 1, alpha: 0.5 });

    /*
     * Die Maske. Sie beginnt mit Höhe 0 am oberen Rand und wächst nach unten — genau das
     * ist der zeilenweise Bildaufbau.
     */
    this.mask = new Graphics();
    this.contents.mask = this.mask;

    /* Die helle Kante, die mit der Maske mitläuft. */
    this.scanBar = new Graphics()
      .rect(-SCREEN.width / 2, -2, SCREEN.width, 4)
      .fill({ color: UI_COLORS.xrayGlow, alpha: 0.9 });
    this.scanBar.visible = false;

    this.screen.addChild(this.grid, this.contents, this.mask, this.scanBar);
    this.view.addChild(frame, this.screen);
    this.view.position.set(LAYOUT.monitor.x, LAYOUT.monitor.y);

    this.clear();
  }

  setLowEffects(value: boolean): void {
    this.lowEffects = value;
  }

  /** Leerer, dunkler Monitor — der Zustand zwischen zwei Kontrollen. */
  clear(): void {
    this.contents.removeChildren();
    this.setMaskHeight(0);
    this.scanBar.visible = false;
    this.contents.filters = [];
  }

  private setMaskHeight(fraction: number): void {
    const height = SCREEN.height * Math.max(0, Math.min(1, fraction));
    this.mask
      .clear()
      .rect(-SCREEN.width / 2, -SCREEN.height / 2, SCREEN.width, height)
      .fill(0xffffff);
    this.scanBar.position.y = -SCREEN.height / 2 + height;
  }

  private silhouette(frame: string): Sprite {
    const texture = this.sheet.textures[frame];
    if (!texture) throw new Error(`Silhouette "${frame}" fehlt im Röntgen-Atlas.`);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  /**
   * Legt den Kofferinhalt aus.
   *
   * **Socken und Zahnbürste liegen immer oben.** Das ist keine Deko, sondern die
   * technische Umsetzung von "das Ergebnis ist nie vor 100 % erkennbar": Die erste
   * Hälfte des Scans zeigt bei jedem Koffer dasselbe.
   */
  private layout(contents: XrayContents): void {
    this.contents.removeChildren();

    const top = -SCREEN.height / 2;
    const usableWidth = SCREEN.width - 40;

    /* Reihe 1 (oben): immer harmlos. */
    const socks = this.silhouette('socks');
    socks.position.set(-usableWidth * 0.22, top + SCREEN.height * 0.18);
    const brush = this.silhouette('toothbrush');
    brush.position.set(usableWidth * 0.2, top + SCREEN.height * 0.2);
    brush.rotation = -0.18;
    this.contents.addChild(socks, brush);

    if (contents.diplomat === true) {
      const pass = this.silhouette('pass');
      pass.position.set(0, top + SCREEN.height * 0.66);
      pass.scale.set(1.1);
      this.contents.addChild(pass);
      return;
    }

    if (contents.amount <= 0) {
      const item = this.silhouette(contents.embarrassing ?? 'teddy');
      item.position.set(0, top + SCREEN.height * 0.68);
      this.contents.addChild(item);
      return;
    }

    /*
     * Die Ware. Ein Set pro Runde (ADR-5), damit die Silhouetten lesbar bleiben —
     * gemischte Formen sind auf einem Monitor dieser Größe nicht zu unterscheiden.
     */
    const count = Math.min(contents.amount, 10);
    const perRow = count <= 3 ? count : Math.ceil(count / 2);
    const rows = count <= 3 ? 1 : 2;
    const scale = count <= 3 ? 1 : count <= 6 ? 0.78 : 0.6;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = row === rows - 1 ? count - perRow * row : perRow;

      const item = this.silhouette(contents.itemSet);
      item.scale.set(scale);
      item.position.set(
        ((col - (inRow - 1) / 2) * usableWidth) / Math.max(1, inRow),
        top + SCREEN.height * (rows === 1 ? 0.68 : 0.56 + row * 0.26)
      );
      this.contents.addChild(item);
    }
  }

  /**
   * Der Scan. Gibt eine Timeline mit den Labels aus `choreo.ts` zurück —
   * `InspectDirector` hängt seine Beats daran, und die Sequenz-Tests prüfen sie.
   */
  scan(contents: XrayContents): gsap.core.Timeline {
    this.layout(contents);
    this.setMaskHeight(0);
    this.scanBar.visible = true;

    /*
     * Bloom nur während des Scans (Architektur §8). Ein Blur ist billiger als ein echter
     * Bloom und reicht für das Glühen der Silhouetten; auf schwachen Geräten fällt er ganz weg.
     */
    if (!this.lowEffects) {
      const blur = new BlurFilter({ strength: XRAY_THEME.bloomBlur / 2, quality: 2 });
      this.contents.filters = [blur];
    }

    const progress = { value: 0 };
    const apply = (): void => this.setMaskHeight(progress.value);

    const timeline = gsap.timeline({
      onComplete: () => {
        /* Filter runter, sobald der Scan durch ist — sonst kostet er den ganzen Screen. */
        this.contents.filters = [];
        this.scanBar.visible = false;
      },
    });

    timeline.addLabel(XRAY_LABELS.scanStart, 0);

    /* Erste Hälfte. */
    timeline.to(progress, {
      value: XRAY_CHOREO.stallAt,
      duration: XRAY_CHOREO.scanDuration * XRAY_CHOREO.stallAt,
      ease: 'none',
      onUpdate: apply,
    });

    /* Der Stall: Stillstand mit Flackern. */
    timeline.addLabel(XRAY_LABELS.stall);
    timeline.to(this.screen, {
      alpha: XRAY_THEME.flickerAlpha.min,
      duration: 0.08,
      yoyo: true,
      repeat: Math.round(XRAY_CHOREO.stallDuration / 0.16),
      ease: 'steps(2)',
    });
    timeline.set(this.screen, { alpha: 1 });

    /* Zweite Hälfte. */
    timeline.to(progress, {
      value: 1,
      duration: XRAY_CHOREO.scanDuration * (1 - XRAY_CHOREO.stallAt),
      ease: 'none',
      onUpdate: apply,
    });

    timeline.addLabel(XRAY_LABELS.scanComplete);
    /*
     * Und erst hier ist etwas zu erkennen. `revealed` liegt garantiert nicht vor
     * `scanComplete` — der Label-Test in `tests/unit/xray.test.ts` hält das fest.
     */
    timeline.addLabel(XRAY_LABELS.revealed);

    return timeline;
  }

  /** Für Tests und Dev-Preview: wie weit ist das Bild aufgebaut? */
  maskFraction(): number {
    const height = this.mask.getLocalBounds().height;
    return height / SCREEN.height;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
