/**
 * Der Host für die PIXI-Bühne in einem Screen (Architektur §7).
 *
 * Zwei Ebenen: unten das Canvas, darüber ein DOM-HUD. Das HUD ist als Ganzes
 * **durchlässig** — nur seine Bedienelemente fangen Zeiger ab. Ohne diese Regel läge
 * eine unsichtbare Glasscheibe über den Koffern, und das A2-Audit ("DOM-HUD blockiert
 * keine Koffer-Taps") wäre nicht zu bestehen.
 */

import { t } from '@/core/i18n';
import type * as gameExports from '@/game';
import type { Stage, StagePlayer } from '@/game/stage';
import type { PublicRound } from '@/core/publicView';
import type { ScreenContext } from './router';

/**
 * Die Bühne wird **dynamisch** geladen (Architektur §1).
 *
 * `import('@/game')` schneidet PIXI und GSAP aus dem Einstiegs-Chunk heraus: Der Titel
 * erscheint ohne sie, und der Hall-Chunk lädt während der Lobby im Hintergrund nach.
 */
const gameModule = (): Promise<typeof gameExports> => import('@/game');

/**
 * Ein Chunk, den es auf dem Server nicht mehr gibt.
 *
 * Nach einem Deploy liegt die alte `index.html` noch im Browser-Cache (GitHub Pages gibt
 * ihr zehn Minuten), und die verweist auf Chunk-Namen aus dem alten Build. Der Import
 * scheitert dann mit „Failed to fetch dynamically imported module" — und die Halle ließe
 * sich bis zum Ablauf des Caches kein einziges Mal mehr öffnen.
 */
function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed/i.test(message);
}

const RELOAD_MARK = 'zoll.staleChunkReload';

/**
 * Holt einmal die neue `index.html` und macht damit weiter.
 *
 * Genau **einmal** pro Sitzung: Scheitert es danach wieder, liegt es nicht am Cache, und
 * eine Schleife aus Neuladen wäre schlimmer als eine ehrliche Fehlermeldung.
 */
function reloadOnceForStaleChunk(error: unknown): boolean {
  if (!isStaleChunk(error)) return false;

  try {
    if (globalThis.sessionStorage?.getItem(RELOAD_MARK)) return false;
    globalThis.sessionStorage?.setItem(RELOAD_MARK, '1');
  } catch {
    /* Ohne sessionStorage gibt es keine Schleifenbremse — dann lieber nicht neu laden. */
    return false;
  }

  console.warn('[stage] Chunk aus einem alten Build — lade neu', error);
  location.reload();
  return true;
}

/** Startet den Nachladevorgang, ohne auf ihn zu warten — läuft in der Lobby. */
export function preloadStage(): void {
  void gameModule()
    .then((game) => game.preloadHallAssets())
    .catch((error: unknown) => {
      /*
       * Der beste Ort für das Neuladen: In der Lobby ist noch keine Runde im Gang, und
       * die Namen stehen in der gespeicherten Session. Es kostet nichts.
       */
      if (reloadOnceForStaleChunk(error)) return;
      console.warn('[stage] Preload fehlgeschlagen', error);
    });
}

export interface StageHost {
  /** Wurzel: Canvas-Host plus HUD, füllt den verfügbaren Platz. */
  el: HTMLElement;
  /** Hier hängen HUD-Elemente hinein. */
  hud: HTMLElement;
  /** Baut die Bühne (einmal pro Runde) und hängt das Canvas hier ein. */
  ready(): Promise<Stage>;
  /** Nimmt das Canvas heraus, ohne die Bühne abzureißen. */
  release(): void;
}

/** Spieler-Stammdaten für die Bühne — Namen und Farben, sonst nichts. */
function stagePlayers(ctx: ScreenContext): StagePlayer[] {
  return ctx.session.players().map((player) => ({
    id: player.id,
    name: player.name,
    colorId: player.colorId,
  }));
}

export function createStageHost(ctx: ScreenContext, view: PublicRound): StageHost {
  const el = document.createElement('div');
  el.className = 'stage';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'stage__canvas';
  canvasHost.setAttribute('aria-hidden', 'true');

  const hud = document.createElement('div');
  hud.className = 'stage__hud';

  /* Ein Textfallback für Screenreader — das Canvas selbst sagt ihnen nichts. */
  const description = document.createElement('p');
  description.className = 'visually-hidden';
  description.textContent = t('hall.stageDescription', { count: view.suitcases.length });

  el.append(canvasHost, hud, description);

  let stage: Stage | undefined;
  let preview: { el: HTMLElement; destroy(): void } | undefined;

  return {
    el,
    hud,

    async ready() {
      /*
       * Auch hier neu laden, wenn der Chunk aus einem alten Build stammt: Die Runde ist
       * dann zwar verloren — ohne Neuladen aber das ganze Spiel, denn die Halle käme bis
       * zum Ablauf des Caches kein einziges Mal mehr hoch.
       */
      const game = await gameModule().catch((error: unknown) => {
        reloadOnceForStaleChunk(error);
        throw error;
      });

      stage = await game.ensureStage({
        roundKey: `${view.index}`,
        seed: view.index * 7919 + 13,
        players: stagePlayers(ctx),
        officerId: view.officerId,
        travelerIds: [...view.travelerIds],
        lowEffects: ctx.session.settings().lowEffects || game.detectLowEffects(),
      });
      stage.attach(canvasHost);

      /* Nur im Dev-Build: Messsonde und, auf Wunsch, die Sequenz-Preview. */
      if (ctx.dev) {
        const { attachStageProbe } = await import('@/dev/stageProbe');
        attachStageProbe(stage, canvasHost);

        const { isSequencePanel, createSequencePreview } = await import('@/dev/sequencePreview');
        if (isSequencePanel() && !preview) {
          preview = createSequencePreview(stage, view.itemSet);
          el.append(preview.el);
        }
      }

      return stage;
    },

    release() {
      preview?.destroy();
      preview = undefined;
      stage?.detach();
    },
  };
}
