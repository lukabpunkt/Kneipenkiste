/**
 * Messsonde für die Bühne (`?dev=1`).
 *
 * Sie gibt Tests und dem Dev-Panel Zugriff auf Dinge, die von außen nicht sichtbar sind:
 * wo die Koffer auf dem Bildschirm liegen, wie viele Draw-Calls das letzte Bild gekostet
 * hat, wie lange ein Update dauert — und **jeden** ausgelösten Koffer-Tap.
 *
 * Der Tap-Zähler ist der Kern des A2-Checks "50 Taps → 50 korrekte `suitcaseTap`": Ohne
 * ihn könnte ein Test nur zählen, wie viele Koffer sich geöffnet haben, und das sind
 * höchstens k. Er misst also den Hit-Test, nicht die Spielregel.
 */

import type { Stage } from '@/game/stage';
import type { ItemSet, PlayerId } from '@/core/types';

export interface SuitcaseRect {
  playerId: PlayerId;
  /** Mittelpunkt der Trefferfläche in CSS-Pixeln, relativ zum Viewport. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Was eine gebaute Sequenz über sich verrät — der A4-Audit misst genau das. */
export interface SequenceReport {
  id: string;
  kind: string;
  durationSec: number;
  labels: Record<string, number>;
}

export interface StageProbe {
  suitcases(): SuitcaseRect[];
  drawCalls(): number;
  frameTimes(): readonly number[];
  updateTimes(): readonly number[];
  /** Alle Koffer-Taps, die die Bühne gemeldet hat, in Reihenfolge. */
  taps(): PlayerId[];
  resetTaps(): void;
  /**
   * Trennt die Bühne vom Screen und lässt alle Koffer tippbar.
   *
   * Der A2-Check misst die **Zuverlässigkeit des Hit-Tests** — kommt ein Tap dort an, wo
   * er hingehört? Im echten Spiel sperrt schon der erste Tap das Board für die Dauer der
   * Sequenz, und k begrenzt die Öffnungen ohnehin auf höchstens drei. Ohne diesen Schalter
   * würde der Test die Spielregel messen statt die Bedienbarkeit.
   */
  isolateTaps(): void;
  mode(): string;
  /** Wie oft die Bühne insgesamt aufgebaut wurde — muss über Hall/Inspect/Gate 1 bleiben. */
  builds(): number;
  /**
   * Baut jede Röntgen-Sequenz einmal auf der echten Bühne und meldet Dauer und Labels.
   *
   * Der A4-Audit fordert für jede Sequenz: `revealed ≥ scanComplete`, Reihenfolge
   * Gesicht → Urteil → Banner, und Dauer ≤ 5 s. Ohne diese Sonde ließe sich das nur an
   * der Choreografie prüfen, nicht an dem, was wirklich gebaut wird — und genau dort
   * schleicht sich ein vertauschter Beat ein.
   */
  xraySequences(itemSet: string, amount: number): SequenceReport[];
  /**
   * Zieht `count`-mal aus einer Kategorie und meldet die IDs.
   *
   * Der A4-Audit fordert „No-Repeat 3 über 1 000 Runden" — das lässt sich nur an der
   * echten Registry messen, mit ihrer echten Historie.
   */
  drawSequences(kind: string, count: number): string[];
  /** Wie viele Partikel gerade leben — das Budget aus Art Direction §8 liest das. */
  particles(): number;
}

let taps: PlayerId[] = [];
let builds = 0;
let bound: Stage | undefined;
/**
 * Der Host wandert beim Screenwechsel mit (ADR-6) — die Sonde muss **immer** den
 * aktuellen kennen. Merkte sie sich den ersten, läge er nach dem Wechsel nicht mehr im
 * Dokument, und alle Koordinaten kämen als (0, 0) zurück.
 */
let host: HTMLElement | undefined;

/** Zählt jeden Bühnenaufbau — der A2-Check "ohne Neuinitialisierung" liest das. */
export function noteStageBuild(): void {
  builds += 1;
}

export function resetStageProbe(): void {
  taps = [];
  builds = 0;
  bound = undefined;
  host = undefined;
}

/** Hängt die Sonde an eine Bühne und veröffentlicht sie unter `window.__zollStage`. */
export function attachStageProbe(stage: Stage, canvasHost: HTMLElement): void {
  host = canvasHost;
  if (bound === stage) return;
  bound = stage;

  stage.view.events.on('suitcaseTap', ({ suitcaseOf }) => taps.push(suitcaseOf));

  const probe: StageProbe = {
    suitcases() {
      const rect = (host ?? canvasHost).getBoundingClientRect();
      const point = { x: 0, y: 0 };
      const out: SuitcaseRect[] = [];

      for (const id of stage.view.suitcaseIds()) {
        const area = stage.view.hitAreaOf(id);
        if (!area) continue;
        /*
         * Gemessen wird die **Trefferfläche**, nicht die Grafik. "≥ 56 px" aus CLAUDE.md
         * ist eine Aussage über das, was der Finger trifft.
         */
        stage.app.worldToScreen(area.x, area.y, point);
        out.push({
          playerId: id,
          x: rect.left + point.x,
          y: rect.top + point.y,
          width: area.width * stage.app.layout.scale,
          height: area.height * stage.app.layout.scale,
        });
      }
      return out;
    },

    drawCalls: () => stage.app.drawCalls(),
    frameTimes: () => stage.app.frameTimes(),
    updateTimes: () => stage.app.updateTimes(),
    taps: () => [...taps],
    resetTaps: () => {
      taps = [];
    },

    isolateTaps() {
      stage.view.events.clear();
      stage.view.events.on('suitcaseTap', ({ suitcaseOf }) => taps.push(suitcaseOf));
      stage.view.lock(false);
      stage.view.setMode('inspect');
      stage.view.setAllInspectable();
    },
    mode: () => stage.view.getMode(),
    builds: () => builds,

    particles: () => stage.view.fx.activeParticles,

    drawSequences(kind, count) {
      const registry = stage.registry;
      registry.clearHistory();
      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        out.push(registry.pick(kind as Parameters<typeof registry.pick>[0], stage.rng).id);
      }
      registry.clearHistory();
      return out;
    },

    xraySequences(itemSet, amount) {
      const target = stage.view.suitcaseIds()[0];
      if (!target) return [];

      const reports: SequenceReport[] = [];

      for (const kind of ['xrayCaught', 'xrayClean', 'xrayOverlay'] as const) {
        for (const sequence of stage.registry.all(kind)) {
          const ctx = stage.view.sequenceContext(target, itemSet as ItemSet, amount, stage.rng);
          if (!ctx) continue;

          /*
           * `paused` bauen und sofort wieder abräumen: Die Sequenz soll vermessen, nicht
           * abgespielt werden — sonst stünde die Bühne danach woanders.
           */
          const timeline = sequence.build(ctx);
          timeline.pause(0);

          reports.push({
            id: sequence.id,
            kind: sequence.kind,
            durationSec: timeline.duration(),
            labels: { ...timeline.labels },
          });

          timeline.kill();
        }
      }

      stage.view.reset();
      return reports;
    },
  };

  Reflect.set(globalThis, '__zollStage', probe);
}
