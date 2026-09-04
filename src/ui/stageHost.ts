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

/** Startet den Nachladevorgang, ohne auf ihn zu warten — läuft in der Lobby. */
export function preloadStage(): void {
  void gameModule()
    .then((game) => game.preloadHallAssets())
    .catch((error: unknown) => console.warn('[stage] Preload fehlgeschlagen', error));
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
      const game = await gameModule();
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
