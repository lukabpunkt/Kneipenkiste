/**
 * Screen-Router.
 *
 * Mountet genau einen Screen in den Host und wechselt mit einem **Farb-Wipe**
 * (Art Direction §4.2: 320 ms, nie Cross-Fade). Richtung ergibt sich aus der
 * Screen-Reihenfolge: vorwaerts von rechts, zurueck von links.
 * Bei `prefers-reduced-motion` wird aus dem Wipe ein kurzer Fade.
 *
 * Ab M2 haengt der Router zusaetzlich das PIXI-Canvas zwischen den Screen-Hosts um
 * (ADR-6) — bis dahin ist das Feld ein DOM-Grid.
 */

import { hex, MOTION, UI_COLORS } from '@/config/theme';
import type { Fsm } from '@/core/fsm';
import { t } from '@/core/i18n';
import type { SessionStore } from '@/core/session';
import { prefersReducedMotion, safeAnimate } from '@/ui/animate';

export const SCREEN_ORDER = [
  'title',
  'lobby',
  'pass',
  'place',
  'buried',
  'dig',
  'distribute',
  'result',
] as const;
export type ScreenId = (typeof SCREEN_ORDER)[number];

export interface ScreenInstance {
  /** Das Wurzelelement des Screens. */
  el: HTMLElement;
  /** Laeuft, nachdem der Wipe den Screen freigegeben hat (Fokus, Animationen, Timer). */
  activate?(): void;
  /** Aufraeumen: Timer, Listener, Animationen. */
  destroy?(): void;
}

export interface ScreenContext {
  fsm: Fsm;
  session: SessionStore;
  router: Router;
  dev: boolean;
}

export type ScreenFactory = (ctx: ScreenContext) => ScreenInstance;

export interface NavigateOptions {
  direction?: 'forward' | 'back';
  /** Farbe des Wipes (CSS-Farbe). Default: Bauhelm-Gelb. */
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
  /** Wird nach jedem Screenwechsel gerufen — der Soundtrack haengt daran (GDD §6). */
  onNavigate?: (id: ScreenId) => void;
}

/**
 * Setzt den Fokus auf den frisch gemounteten Screen (Audit A5).
 *
 * Ohne das bleibt der Fokus dort, wo der alte Screen war — nach dem Austausch also im
 * Nichts, und die Tab-Reihenfolge beginnt wieder ganz oben. Ein Screenreader liest
 * ausserdem nichts vor, weil sich fuer ihn nur DOM ausgetauscht hat.
 */
function focusScreen(el: HTMLElement): void {
  /*
   * Nur setzen, wenn der Screen nicht selbst ein Bedienelement ist: Der Pass-Screen ist
   * eine grosse Taste mit `tabindex="0"` — auf -1 gezogen waere er per Tastatur nicht
   * mehr erreichbar.
   */
  if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/**
 * Die Ersatzseite, wenn eine Screen-Fabrik wirft.
 *
 * Bewusst ohne Abhaengigkeiten: kein Button-Bauteil, kein Sheet, keine Animation. Wenn
 * hier etwas kaputt ist, kann es genauso gut das Bauteil sein.
 */
function createErrorScreen(): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--error';
  el.setAttribute('role', 'alert');

  const title = document.createElement('h1');
  title.textContent = t('error.title');

  const body = document.createElement('p');
  body.textContent = t('error.body');

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'btn btn--primary';
  reload.textContent = t('error.reload');
  reload.addEventListener('click', () => globalThis.location.reload());

  el.append(title, body, reload);
  return { el };
}

/** Leitet die Richtung aus der Position in `SCREEN_ORDER` ab. */
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

    /*
     * **Ein kaputter Screen darf nicht die Runde mitnehmen** (Roadmap M5.5).
     *
     * Wirft eine Screen-Fabrik, stand hier vorher ein weisses Bild: Der alte Screen war
     * schon abgeraeumt, der neue kam nie. Am Tisch heisst das, dass das Handy mitten in
     * einer Runde nicht mehr reagiert und niemand weiss, ob die Runde verloren ist.
     *
     * Die Ersatzseite sagt beides: was passiert ist, und dass die Session gespeichert
     * ist (`saveSession` laeuft bei jeder Aenderung). Ein Neuladen holt sie zurueck.
     */
    try {
      instance = factory({ ...options.context, router });
    } catch (error) {
      console.error(`Screen "${id}" konnte nicht gebaut werden.`, error);
      instance = createErrorScreen();
    }

    instance.el.dataset['screen'] = id;
    host.append(instance.el);
    current = id;
    focusScreen(instance.el);
    options.onNavigate?.(id);
  };

  /**
   * Deckt den Screen mit einem Farbstreifen zu, tauscht den Inhalt aus und gibt ihn
   * wieder frei. Eine Animation, zwei Haelften à 160 ms.
   */
  const wipe = async (id: ScreenId, opts: NavigateOptions): Promise<void> => {
    const direction = opts.direction ?? directionBetween(current, id);
    const color = opts.color ?? hex(UI_COLORS.hazard);
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
          // Erster Screen: kein Wipe, sonst blitzt die Farbe beim Start auf.
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
