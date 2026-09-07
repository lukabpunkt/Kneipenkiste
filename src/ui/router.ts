/**
 * Screen-Router.
 *
 * Mountet genau einen Screen in den Host und wechselt mit einem Farb-Wipe (nie
 * Cross-Fade). Richtung ergibt sich aus der Screen-Reihenfolge: vorwärts von rechts,
 * zurück von links. Bei `prefers-reduced-motion` wird daraus ein kurzer Fade.
 */

import { MOTION, UI_COLORS, hex } from '@/config/theme';
import type { Fsm } from '@/core/fsm';
import type { SessionController } from '@/core/session';
import type { ChooseView, PublicRound, ResultView, ViewPhase } from '@/core/publicView';
import type { StepScript } from '@/core/choreographer';
import type { PlayerId } from '@/core/types';
import { prefersReducedMotion, safeAnimate } from './animate';

/**
 * Reihenfolge = Erzählreihenfolge des Spiels. Der Router leitet daraus nur die
 * Wipe-Richtung ab; wer wohin darf, entscheidet die FSM.
 */
export const SCREEN_ORDER = [
  'title',
  'lobby',
  'negotiation',
  'silence',
  'pass',
  'choose',
  'sealed',
  'step',
  'distribute',
  'result',
] as const;
export type ScreenId = (typeof SCREEN_ORDER)[number];

export interface ScreenInstance {
  el: HTMLElement;
  /** Läuft, nachdem der Wipe den Screen freigegeben hat (Fokus, Timer, Animationen). */
  activate?(): void;
  /** Aufräumen: Timer, Listener. */
  destroy?(): void;
}

export interface ScreenContext {
  fsm: Fsm;
  session: SessionController;
  router: Router;
  dev: boolean;
  /** Fragt "Runde abbrechen?" und führt bei Ja zurück in die Lobby. */
  abortRound: () => void;
  /** Öffnet ein Bottom-Sheet (Regeln, Einstellungen, Statistik). */
  host: HTMLElement;

  /*
   * Der **einzige** Weg eines Screens an die laufende Runde (CLAUDE.md:
   * "Screens bekommen ausschließlich publicView").
   *
   * Kein Screen fasst `fsm.context.round` an — nicht weil das heute etwas verraten
   * würde, sondern weil die nächste hinzugefügte Zeile es tun könnte. Ein Lint-Test
   * hält diese Grenze (`publicView.test.ts`, CI-Schritt "Informationssicherheit").
   */
  view(phase: ViewPhase): PublicRound;
  /** Nur das eigene Handy des Spielers, der gerade dran ist. */
  ownChoice(playerId: PlayerId): ChooseView;
  /** Der Reveal. Erst ab STEP verfügbar, dann vollständig. */
  reveal(): ResultView;
  /**
   * Die Zeitachse der Show. Auch das ist eine Projektion: Der Step-Screen bekommt das
   * fertige Skript, nicht das `RoundResult` — sonst läge der morsche Balken in einem
   * Screen, der ihn nur zufällig gerade nicht liest.
   */
  stepScript(): StepScript;
}

export type ScreenFactory = (ctx: ScreenContext) => ScreenInstance;

export interface NavigateOptions {
  direction?: 'forward' | 'back';
  /** Farbe des Wipes (CSS-Farbe). Default: `canyon`. */
  color?: string;
}

export interface Router {
  register(id: ScreenId, factory: ScreenFactory): void;
  go(id: ScreenId, options?: NavigateOptions): Promise<void>;
  readonly current: ScreenId | null;
  /** Baut den aktuellen Screen neu auf (z. B. nach einem Sprachwechsel). */
  refresh(): Promise<void>;
}

export interface RouterOptions {
  host: HTMLElement;
  context: Omit<ScreenContext, 'router'>;
}

/**
 * Setzt den Fokus auf den frisch gemounteten Screen (Audit A5): Ohne das bleibt er im
 * Nichts, die Tab-Reihenfolge fängt wieder beim Dokument an, und ein Screenreader
 * bekommt vom Wechsel nichts mit.
 */
function focusScreen(el: HTMLElement): void {
  /* Screens, die selbst Bedienelement sind (Pass), behalten ihren eigenen tabindex. */
  if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

function directionBetween(from: ScreenId | null, to: ScreenId): 'forward' | 'back' {
  if (from === null) return 'forward';
  return SCREEN_ORDER.indexOf(to) >= SCREEN_ORDER.indexOf(from) ? 'forward' : 'back';
}

export function createRouter(options: RouterOptions): Router {
  const { host } = options;
  const factories = new Map<ScreenId, ScreenFactory>();

  let current: ScreenId | null = null;
  let instance: ScreenInstance | null = null;
  /** Serialisiert Navigationen, damit sich zwei Wipes nie überlagern. */
  let queue: Promise<void> = Promise.resolve();

  const mount = (id: ScreenId): void => {
    const factory = factories.get(id);
    if (!factory) throw new Error(`Kein Screen registriert fuer "${id}"`);

    instance?.destroy?.();
    host.replaceChildren();

    instance = factory({ ...options.context, router });
    instance.el.dataset.screen = id;
    host.append(instance.el);
    current = id;
    focusScreen(instance.el);
  };

  const wipe = async (id: ScreenId, opts: NavigateOptions): Promise<void> => {
    const direction = opts.direction ?? directionBetween(current, id);
    const color = opts.color ?? hex(UI_COLORS.canyon);
    const half = MOTION.wipeMs / 2;

    const overlay = document.createElement('div');
    overlay.className = 'wipe';
    overlay.style.setProperty('--wipe-color', color);
    overlay.setAttribute('aria-hidden', 'true');
    host.append(overlay);

    const reduced = prefersReducedMotion();
    const enter = reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : direction === 'forward'
        ? [{ transform: 'translate3d(115%,0,0)' }, { transform: 'translate3d(0,0,0)' }]
        : [{ transform: 'translate3d(-115%,0,0)' }, { transform: 'translate3d(0,0,0)' }];
    const leave = reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : direction === 'forward'
        ? [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-115%,0,0)' }]
        : [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(115%,0,0)' }];

    /*
     * `safeAnimate` statt `animation.finished`: Im Hintergrund-Tab hält Chrome
     * Animationen an, das Versprechen löst nie auf — und weil `go()` serialisiert,
     * bliebe der Screenwechsel für den Rest der Session hängen.
     */
    const wipeOptions: KeyframeAnimationOptions = {
      duration: half,
      easing: 'cubic-bezier(.65,0,.35,1)',
      fill: 'forwards',
    };

    await safeAnimate(overlay, enter, wipeOptions, { respectReducedMotion: false });
    mount(id);
    await safeAnimate(overlay, leave, wipeOptions, { respectReducedMotion: false });

    overlay.remove();
    instance?.activate?.();
  };

  const router: Router = {
    register(id, factory) {
      factories.set(id, factory);
    },

    go(id, navOptions = {}) {
      queue = queue.then(async () => {
        if (current === null) {
          /* Erster Screen: kein Wipe, sonst blitzt die Farbe beim Start auf. */
          mount(id);
          instance?.activate?.();
          return;
        }
        if (current === id) return;
        await wipe(id, navOptions);
      });
      return queue;
    },

    refresh() {
      queue = queue.then(() => {
        if (current === null) return;
        mount(current);
        instance?.activate?.();
      });
      return queue;
    },

    get current() {
      return current;
    },
  };

  return router;
}

/** Zu welchem Screen gehört ein FSM-State? */
export const SCREEN_FOR_STATE = {
  TITLE: 'title',
  LOBBY: 'lobby',
  NEGOTIATION: 'negotiation',
  SILENCE: 'silence',
  PASS: 'pass',
  CHOOSE: 'choose',
  SEALED: 'sealed',
  STEP: 'step',
  DISTRIBUTE: 'distribute',
  RESULT: 'result',
} as const satisfies Record<string, ScreenId>;
