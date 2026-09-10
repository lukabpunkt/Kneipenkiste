/**
 * Die Bühne zusammenbauen (Roadmap M2.2).
 *
 * Der einzige Weg vom Step-Screen in die Schlucht. Der Screen kennt PIXI nicht — er
 * übergibt das Skript und den Reveal und bekommt eine Handvoll Methoden zurück.
 *
 * Das ist auch die Grenze der Informationssicherheit: Was hier hereinkommt, ist bereits
 * öffentlich (Architektur §4). Die Bühne sieht nie eine `Round`.
 */

import { Container } from 'pixi.js';
import gsap from 'gsap';
import type { ColorId } from '@/config/theme';
import type { Weight } from '@/config/rules';
import type { StepScript } from '@/core/choreographer';
import type { ResultView } from '@/core/publicView';
import type { PlankId, PlayerId } from '@/core/types';
import { Bridge } from './Bridge';
import { FxKit } from './fx';
import { startPosition } from './geometry';
import './sequences';
import { Camera } from './Camera';
import { Canyon } from './Canyon';
import { Carpenter } from './Carpenter';
import { Hiker } from './Hiker';
import { StepDirector, type StepBeat } from './StepDirector';
import { publishStageStats } from './stageStats';
import { Vulture } from './Vulture';
import { createSeededRng } from '@/core/rng';
import { getStageApp, loadStageAssets, type StageHandle } from './StageApp';

export type { StepBeat } from './StepDirector';

export {
  areStageAssetsReady,
  detectLowEffects,
  disposeStage,
  frameMedian,
  loadStageAssets,
  preloadStageAssets,
  currentStage,
  resetStageApp,
} from './StageApp';

export interface MountOptions {
  host: HTMLElement;
  script: StepScript;
  reveal: ResultView;
  /** Farbe je Spieler — der Screen bringt sie mit, die Bühne kennt keine Session. */
  colors: Map<PlayerId, ColorId>;
  weights?: Map<PlayerId, Weight>;
  /** Wie viele Balken die Brücke am Sessionanfang hatte — bestimmt das Raster. */
  slots: number;
  playerCount: number;
  lowEffects: boolean;
  /** `prefers-reduced-motion` des Geräts — schaltet das Rütteln ab (Audit A5). */
  reducedMotion?: boolean;
  seed: number;
  onFinished: () => void;
  /** Schritt, Bruch und Skip-Freigabe — als Ereignisse der Timeline, nicht der Wanduhr. */
  onBeat?: (beat: StepBeat) => void;
  /**
   * Übersetzte Texte. Die Bühne kennt kein i18n-Modul: Sprechblasen und Schilder tragen
   * Text, und der gehört dem Screen, nicht dem Renderer (CLAUDE.md).
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Ein Sound aus dem Sprite. Ist der Ton aus, tut die Funktion nichts. */
  play: (key: string) => void;
}

export interface MountedStage {
  /** Startet die Show. */
  play(): void;
  /** Tap-to-Skip — nur nach dem letzten Bruch erlaubt (der Screen prüft das). */
  skip(): void;
  setLowEffects(low: boolean): void;
  /** Messwerte für Dev-Panel und Perf-Test. */
  stats(): {
    frameTimes: readonly number[];
    workTimes: readonly number[];
    drawCalls: number;
    /** Wie viele Partikel gerade fliegen — Budget aus Art Direction §8. */
    particles: number;
  };
  destroy(): void;
}

export async function mountStage(options: MountOptions): Promise<MountedStage> {
  /*
   * Erst die Schriften, dann die Bühne: PIXI rastert Text einmal beim Erzeugen. Ist
   * "Luckiest Guy" da noch nicht geladen, stehen die Balkennummern für den Rest der
   * Runde in der Ersatzschrift — und niemand merkt, woran es lag.
   */
  await document.fonts.ready.catch(() => undefined);

  const assets = await loadStageAssets();
  const stage: StageHandle = await getStageApp();
  stage.clearWorld();

  const rng = createSeededRng(options.seed);

  /* --- Schlucht --- */
  const canyon = new Canyon({ sheet: assets.world, rng, lowEffects: options.lowEffects });

  /* --- Brücke: alle Balken, die es diese Runde noch gibt --- */
  const bridge = new Bridge({
    sheet: assets.world,
    model: {
      count: options.reveal.planks.length,
      planks: options.reveal.planks.map((plank) => plank.id),
      removed: options.reveal.removedPlank !== undefined ? [options.reveal.removedPlank] : [],
    },
    slots: options.slots,
  });

  /* --- Figuren --- */
  const figures = new Container();
  figures.sortableChildren = true;

  const hikers = new Map<PlayerId, Hiker>();
  const occupants = new Map<PlankId, PlayerId[]>();
  for (const plank of options.reveal.planks) {
    if (plank.players.length > 0) occupants.set(plank.id, [...plank.players]);
  }

  const lineup = options.script.run.map((entry) => entry.hikerId);
  lineup.forEach((playerId, index) => {
    const hiker = new Hiker({
      sheet: assets.chars,
      playerId,
      colorId: options.colors.get(playerId) ?? 'red',
      playerCount: options.playerCount,
      ...(options.weights?.get(playerId) !== undefined
        ? { weight: options.weights.get(playerId)! }
        : {}),
      lowEffects: options.lowEffects,
    });

    const start = startPosition(index, lineup.length);
    hiker.position(start.x, start.y);
    if (options.reveal.ropeUsers.includes(playerId)) hiker.setRope(true);

    hikers.set(playerId, hiker);
    figures.addChild(hiker.view);
  });

  const vulture = new Vulture(assets.chars);
  const carpenter = new Carpenter(assets.chars);
  const fx = new FxKit(assets.world);

  canyon.midground.addChild(bridge.view, figures, carpenter.view, fx.view);
  /* Gustav sitzt auf dem linken Plateau, also vor der Brücke, aber hinter den Hikers. */
  canyon.midground.addChildAt(vulture.view, 0);
  stage.world.addChild(canyon.view);

  /* --- Kamera --- */
  const camera = new Camera(stage.world);
  camera.setReducedMotion(options.reducedMotion === true);
  const offLayout = stage.onLayout((layout) =>
    camera.setBaseScale(layout.scale, layout.width, layout.height)
  );
  camera.reset();

  const director = new StepDirector({
    script: options.script,
    reveal: options.reveal,
    bridge,
    canyon,
    camera,
    vulture,
    carpenter,
    fx,
    hikers,
    occupants,
    playerCount: options.playerCount,
    rng,
    t: options.t,
    play: options.play,
    onFinished: options.onFinished,
    ...(options.onBeat ? { onBeat: options.onBeat } : {}),
  });

  /* --- Der Loop: eine Uhr, keine Allokationen --- */
  const tick = (ticker: { deltaMS: number }): void => {
    const started = performance.now();
    canyon.update(ticker.deltaMS);
    bridge.update(canyon.windAt());
    fx.update(ticker.deltaMS);
    for (const hiker of hikers.values()) hiker.update();
    /* Was der Loop wirklich kostet — die Frame-Zeit misst nur den Bildschirmtakt. */
    stage.recordWork(performance.now() - started);
  };
  stage.app.ticker.add(tick);

  stage.attach(options.host);

  const stats = (): MountedStage['stats'] extends () => infer R ? R : never => ({
    frameTimes: stage.frameTimes(),
    workTimes: stage.workTimes(),
    drawCalls: stage.drawCalls(),
    particles: fx.activeParticles(),
  });
  /* Dev-Panel und `perf.spec.ts` lesen hier mit — sonst niemand. */
  publishStageStats(stats);

  return {
    play: () => director.play(),
    skip: () => director.skipToAftermath(),

    setLowEffects(low) {
      canyon.setLowEffects(low);
      for (const hiker of hikers.values()) hiker.setLowEffects(low);
    },

    stats,

    destroy() {
      publishStageStats(undefined);
      stage.app.ticker.remove(tick);
      offLayout();
      director.destroy();
      gsap.globalTimeline.clear();
      fx.destroy();
      for (const hiker of hikers.values()) hiker.destroy();
      hikers.clear();
      bridge.destroy();
      vulture.destroy();
      carpenter.destroy();
      canyon.destroy();
      stage.detach();
      stage.clearWorld();
    },
  };
}
