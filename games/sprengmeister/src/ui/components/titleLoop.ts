/**
 * Der grabende Digger auf dem Titel (Roadmap M5.1, Art Direction §1).
 *
 * Er gräbt, findet eine Mine, fliegt aus dem Bild, kommt rußig zurück — und fängt von
 * vorn an. Das ist das ganze Spiel in fünf Sekunden, ohne ein Wort.
 *
 * ## Warum das hier DOM ist und nicht PIXI
 *
 * Der Titel ist der erste Screen. Wer ihn mit dem Renderer baut, zieht PixiJS und GSAP
 * (zusammen über 400 KB) in den Einstiegs-Chunk — und das Spiel startet langsamer, damit
 * ein Logo wackelt. Der Board-Chunk bleibt lazy (Architektur §1, Audit A5), also läuft
 * die Schleife aus Emoji, CSS-Transformationen und einem einzigen Timer.
 *
 * Bei „Bewegung reduzieren" steht der Digger einfach da und gräbt nicht. Die Schleife
 * trägt keine Information — sie darf ersatzlos entfallen (Audit A5).
 */

import { UI_TIMING } from '@/config/theme';
import { prefersReducedMotion } from '@/ui/animate';

export interface TitleLoop {
  el: HTMLElement;
  start(): void;
  stop(): void;
}

/** Die vier Zustände der Schleife, in dieser Reihenfolge. */
type Phase = 'dig' | 'boom' | 'gone' | 'back';

/** Wie lange jede Phase steht. Zusammen gut fünf Sekunden. */
const PHASE_MS: Record<Phase, number> = {
  dig: 2400,
  boom: 700,
  gone: 900,
  back: 1400,
};

const NEXT: Record<Phase, Phase> = { dig: 'boom', boom: 'gone', gone: 'back', back: 'dig' };

export function createTitleLoop(): TitleLoop {
  const el = document.createElement('div');
  el.className = 'title-loop';
  /*
   * Für Screenreader ist die Schleife Dekoration: Sie wiederholt nur, was die Tagline
   * darunter in Worten sagt. Ein Element, das alle fünf Sekunden seinen Inhalt wechselt,
   * wäre in einer Vorlesereihenfolge ein Störfeuer.
   */
  el.setAttribute('aria-hidden', 'true');

  const digger = document.createElement('span');
  digger.className = 'title-loop__digger';
  digger.textContent = '🧑‍🏭';

  const mine = document.createElement('span');
  mine.className = 'title-loop__mine';
  mine.textContent = '💣';

  const puff = document.createElement('span');
  puff.className = 'title-loop__puff';
  puff.textContent = '💥';

  el.append(mine, puff, digger);

  let timer: ReturnType<typeof setTimeout> | undefined;

  const enter = (phase: Phase): void => {
    el.dataset['phase'] = phase;
    timer = globalThis.setTimeout(() => enter(NEXT[phase]), PHASE_MS[phase]);
  };

  return {
    el,

    start() {
      if (prefersReducedMotion()) {
        // Der Digger steht neben seiner Mine — dasselbe Bild, nur ohne Bewegung.
        el.dataset['phase'] = 'dig';
        return;
      }
      enter('dig');
    },

    /**
     * Anhalten, wenn der Screen verlassen wird.
     *
     * Ohne das läuft der Timer weiter, solange die App offen ist — und die Schleife
     * dreht sich stundenlang hinter einem längst gewechselten Screen. Audit A5 prüft
     * genau das: zehn Minuten Titel ohne Leck.
     */
    stop() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}

/** Nur damit die Timings an einer Stelle stehen — die CSS-Dauern lesen dieselben Werte. */
export const TITLE_LOOP_TIMING = { ...PHASE_MS, wipeMs: UI_TIMING.wipeMs };
