/**
 * Der Einstiegspunkt in die Bühne — und die **Chunk-Grenze**.
 *
 * Alles unterhalb von `src/game/` zieht PIXI und GSAP nach sich, zusammen der größte Teil
 * des Bundles. Screens importieren deshalb nie direkt aus `game/`, sondern laden dieses
 * Modul per `await import('@/game')`. So bleibt der Einstiegs-Chunk klein und der Titel
 * erscheint sofort; die Halle lädt währenddessen im Hintergrund (Architektur §1).
 */

export { detectLowEffects, frameMedian, preloadHallAssets, areHallAssetsReady } from './HallApp';
export { ensureStage, currentStage, disposeStage } from './stage';
export type { Stage, StagePlayer, StageRequest } from './stage';
