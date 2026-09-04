/**
 * Der Platz im Screen, in dem das PIXI-Canvas haengt (ADR-6).
 *
 * Drei Screens brauchen das Feld — Place, Dig und Result. Statt es dreimal aufzubauen,
 * wandert **dasselbe Canvas** zwischen ihren Hosts: `mount()` haengt es ein, `unmount()`
 * nimmt es heraus. Dazwischen passiert an PIXI nichts.
 *
 * Der Host uebernimmt drei Aufgaben, die sonst in jedem Screen stuenden:
 *
 * - **Warten aushalten.** Bis die Atlanten geladen sind, steht hier ein ruhiger
 *   Platzhalter statt eines Sprungs im Layout.
 * - **PIXI spaet laden.** Der Import ist dynamisch: PixiJS und GSAP sind zusammen ueber
 *   400 KB und werden erst gebraucht, wenn jemand wirklich Minen legt. Title und Lobby
 *   starten dadurch ohne sie (Architektur §1, Board-Chunk lazy).
 * - **Scheitern aushalten.** Laedt der Atlas nicht, bleibt der Platzhalter stehen und
 *   das Spiel bedienbar, statt auf ein Canvas zu warten, das nie kommt.
 */

import { boardSizeFor, cellCount } from '@/config/rules';
import type { Fsm } from '@/core/fsm';
import type { BoardStage } from '@/game/BoardStage';
import type { BoardMode } from '@/game/BoardView';
import type { DigResult } from '@/core/types';

export interface StageHostOptions {
  /** Zeigt das Banner einer Grabung. Nur der Dig-Screen braucht das. */
  showBanner?: (result: DigResult) => void;
}

export interface StageHost {
  el: HTMLElement;
  /** Die Buehne, sobald sie steht. Vorher `undefined` — Screens rendern dann nichts. */
  readonly board: BoardStage | undefined;
  /** Haengt das Canvas ein und gibt die Buehne zurueck. */
  mount(fsm: Fsm, mode: BoardMode): Promise<BoardStage>;
  unmount(): void;
}

export function createStageHost(options: StageHostOptions = {}): StageHost {
  const el = document.createElement('div');
  el.className = 'stage-host';

  const placeholder = document.createElement('div');
  placeholder.className = 'stage-host__placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  el.append(placeholder);

  let stage: BoardStage | undefined;
  let mounted = false;

  return {
    el,

    get board() {
      return stage;
    },

    async mount(fsm, mode) {
      mounted = true;
      const size = boardSizeFor(fsm.context.players.length);

      /*
       * Dynamischer Import: Hier faengt der Board-Chunk an. Alles davor — Title, Lobby,
       * Regeln, Einstellungen — kommt ohne PixiJS aus.
       */
      const [{ getBoardStage }, { installTestBridge }] = await Promise.all([
        import('@/game/BoardStage'),
        import('@/game/testBridge'),
      ]);

      const next = await getBoardStage({
        players: [...fsm.context.players],
        size,
        seed: fsm.context.seed,
        modes: fsm.context.settings.modes,
        lowEffects: fsm.context.settings.lowEffects,
      });

      // Der Screen kann waehrend des Ladens schon wieder verlassen worden sein.
      if (!mounted) return next;

      stage = next;
      placeholder.remove();
      next.attach(el);
      next.setMode(mode);
      /*
       * Bei **jedem** Mount neu setzen: Die Buehne ueberlebt den Screenwechsel, der
       * Banner-Handler nicht. Ohne diese Zeile zeigt der Dig-Screen kein Banner, weil
       * noch der leere Handler des Place-Screens haengt.
       */
      next.setBannerHandler(options.showBanner ?? (() => undefined));
      // Nur im Dev- und E2E-Build; im Deploy-Build faellt der Aufruf weg (ADR-11).
      installTestBridge(next, cellCount(size));
      return next;
    },

    unmount() {
      mounted = false;
      // Der Chunk ist bereits geladen, wenn es etwas abzuräumen gibt.
      void import('@/game/testBridge').then(({ removeTestBridge }) => removeTestBridge());
      stage?.detach();
      stage = undefined;
      if (!placeholder.isConnected) el.append(placeholder);
    },
  };
}
