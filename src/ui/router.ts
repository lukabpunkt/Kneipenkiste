/**
 * Screen-Router.
 *
 * Mountet genau einen Screen in den Host und wechselt mit einem diagonalen Farb-Wipe
 * (320 ms, nie Cross-Fade). Richtung ergibt sich aus der Screen-Reihenfolge: vorwaerts
 * von rechts, zurueck von links. Bei `prefers-reduced-motion` wird daraus ein kurzer Fade.
 */

import { MOTION, UI_COLORS, hex } from '@/config/theme';
import type { Fsm } from '@/core/fsm';
import { prefersReducedMotion, safeAnimate } from './animate';
import type { SessionController } from '@/core/session';
import type { PackView, PublicRound, ResultView, ViewPhase } from '@/core/publicView';
import type { PlayerId } from '@/core/types';

/**
 * Reihenfolge = Erzaehlreihenfolge des Spiels. Der Router leitet daraus nur die
 * Wipe-Richtung ab; wer wohin darf, entscheidet die FSM.
 */
export const SCREEN_ORDER = [
  'title',
  'lobby',
  'officerIntro',
  'pass',
  'pack',
  'packed',
  'hall',
  'inspect',
  'gate',
  'distribute',
  'result',
] as const;
export type ScreenId = (typeof SCREEN_ORDER)[number];

export interface ScreenInstance {
  el: HTMLElement;
  /** Laeuft, nachdem der Wipe den Screen freigegeben hat (Fokus, Timer, Animationen). */
  activate?(): void;
  /** Aufraeumen: Timer, Listener. */
  destroy?(): void;
}

export interface ScreenContext {
  fsm: Fsm;
  session: SessionController;
  router: Router;
  dev: boolean;
  /** Fragt "Runde abbrechen?" und fuehrt bei Ja zurueck in die Lobby. */
  abortRound: () => void;

  /*
   * Der **einzige** Weg eines Screens an die laufende Runde (CLAUDE.md:
   * "Screens bekommen ausschliesslich publicView").
   *
   * Kein Screen fasst `fsm.context.round` an — nicht weil das heute etwas verraten
   * wuerde, sondern weil die naechste hinzugefuegte Zeile es tun koennte. Ein Lint-Test
   * haelt diese Grenze (`publicView.test.ts`).
   */
  view(phase: ViewPhase): PublicRound;
  /** Nur das eigene Pack des Reisenden, der gerade dran ist. */
  ownPack(playerId: PlayerId): PackView;
  /** Der Reveal. Erst ab RESULT verfuegbar, dann vollstaendig. */
  reveal(): ResultView;
}

export type ScreenFactory = (ctx: ScreenContext) => ScreenInstance;

export interface NavigateOptions {
  direction?: 'forward' | 'back';
  /** Farbe des Wipes (CSS-Farbe). Default: `customs`. */
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
 * Nichts, die Tab-Reihenfolge faengt wieder beim Dokument an, und ein Screenreader
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
  /** Serialisiert Navigationen, damit sich zwei Wipes nie ueberlagern. */
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
    const color = opts.color ?? hex(UI_COLORS.customs);
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
     * `safeAnimate` statt `animation.finished`: Im Hintergrund-Tab haelt Chrome
     * Animationen an, das Versprechen loest nie auf — und weil `go()` serialisiert,
     * bliebe der Screenwechsel fuer den Rest der Session haengen.
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

/** Zu welchem Screen gehoert ein FSM-State? */
export const SCREEN_FOR_STATE = {
  TITLE: 'title',
  LOBBY: 'lobby',
  OFFICER_INTRO: 'officerIntro',
  PASS: 'pass',
  PACK: 'pack',
  PACKED: 'packed',
  HALL: 'hall',
  INSPECT: 'inspect',
  GATE: 'gate',
  DISTRIBUTE: 'distribute',
  RESULT: 'result',
} as const satisfies Record<string, ScreenId>;
