/**
 * Wake-Lock (GDD §5, Roadmap M1.6 als Stub).
 *
 * Waehrend Place und Dig liegt das Handy auf dem Tisch und wird zwischen den Zuegen
 * nicht angefasst — ohne Wake-Lock geht dabei genau im spannendsten Moment der
 * Bildschirm aus.
 *
 * Die API gibt es nicht ueberall (Safari erst ab 16.4, Firefox gar nicht). Das ist kein
 * Fehlerfall: still fehlschlagen, nie werfen.
 */

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

let sentinel: WakeLockSentinelLike | null = null;
/** Wir wollen den Lock — auch wenn der Tab gerade im Hintergrund ist. */
let wanted = false;

function api(): WakeLockLike | undefined {
  return (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
}

export function wakeLockSupported(): boolean {
  return api() !== undefined;
}

export async function acquireWakeLock(): Promise<void> {
  wanted = true;
  const wakeLock = api();
  if (!wakeLock || sentinel) return;
  try {
    sentinel = await wakeLock.request('screen');
    // Das System gibt den Lock beim Tab-Wechsel selbst frei; dann merken wir uns nur,
    // dass wir ihn eigentlich noch wollen — `visibilitychange` holt ihn zurueck.
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false;
  const current = sentinel;
  sentinel = null;
  try {
    await current?.release();
  } catch {
    // Schon freigegeben — irrelevant.
  }
}

/**
 * Haengt sich an `visibilitychange`: Kommt der Tab zurueck und wir wollten den Lock
 * noch, wird er neu angefordert. Gibt eine Abmeldefunktion zurueck.
 */
export function watchWakeLock(): () => void {
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible' && wanted) void acquireWakeLock();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}
