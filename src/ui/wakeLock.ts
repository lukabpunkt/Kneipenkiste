/**
 * Wake-Lock waehrend Hall, Inspect und Gate (GDD §5).
 *
 * Das Handy liegt in der Mitte, alle reden — es darf nicht mitten im Verhoer dunkel
 * werden. Die API gibt es nicht ueberall; fehlt sie, ist das kein Fehlerfall.
 */

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

let sentinel: WakeLockSentinelLike | null = null;

export async function acquireWakeLock(): Promise<void> {
  if (sentinel) return;
  const api = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
  if (!api) return;

  try {
    sentinel = await api.request('screen');
  } catch {
    /* Akkusparmodus oder kein Nutzer-Gesture — das Spiel laeuft trotzdem. */
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!sentinel) return;
  const current = sentinel;
  sentinel = null;
  try {
    await current.release();
  } catch {
    /* Schon freigegeben. */
  }
}

/** Der Lock geht beim Tab-Wechsel verloren — hier kommt er zurueck. */
export function watchWakeLock(shouldHold: () => boolean): () => void {
  const onVisible = (): void => {
    if (document.visibilityState === 'visible' && shouldHold()) void acquireWakeLock();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}
