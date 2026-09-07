/**
 * Den besten Satz der Runde teilen (Roadmap M5.3, GDD §7).
 *
 * "Rudi hat Anna dreimal in die Luft gejagt 💣" — das ist der Satz, mit dem am nächsten
 * Tag jemand die App erklärt. Deshalb wird nicht die Statistik geteilt, sondern die
 * **schlimmste Zeile**: der Leger mit den meisten Treffern an einem einzigen Opfer.
 *
 * Drei Wege, in dieser Reihenfolge: Web Share (Handy, öffnet das Teilen-Menü),
 * Zwischenablage (Desktop), und wenn beides fehlt, gibt es den Text zurück, damit der
 * Aufrufer ihn wenigstens anzeigen kann. Keiner der drei wirft — Teilen ist ein Bonus,
 * kein Spielzug.
 *
 * **Kein Netzwerk.** Die Web Share API übergibt den Text an das Betriebssystem; die App
 * selbst schickt nichts (CLAUDE.md: kein Backend, keine externen Requests).
 */

import { t } from '@/core/i18n';
import type { Kill, PlayerId, RoundResult } from '@/core/types';

export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

/**
 * Die Paarung mit den meisten Treffern. Bei Gleichstand gewinnt die erste — welche das
 * ist, hängt an der Reihenfolge der Grabungen und ist damit die frühere Tat.
 */
export function worstPairing(
  kills: readonly Kill[]
): { layer: PlayerId; victim: PlayerId; count: number } | undefined {
  const tally = new Map<string, { layer: PlayerId; victim: PlayerId; count: number }>();

  for (const kill of kills) {
    // Sich selbst kann man nicht hochjagen: Eigene Minen sind stumm (ADR-2).
    if (kill.layer === kill.victim) continue;
    const key = `${kill.layer}>${kill.victim}`;
    const entry = tally.get(key) ?? { layer: kill.layer, victim: kill.victim, count: 0 };
    entry.count += 1;
    tally.set(key, entry);
  }

  let best: { layer: PlayerId; victim: PlayerId; count: number } | undefined;
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}

/** Der Satz zu einer Runde — oder `undefined`, wenn niemand jemanden erwischt hat. */
export function shareText(
  result: RoundResult,
  nameOf: (id: PlayerId) => string | undefined
): string | undefined {
  const worst = worstPairing(result.kills);
  if (!worst) return undefined;

  const layer = nameOf(worst.layer);
  const victim = nameOf(worst.victim);
  if (!layer || !victim) return undefined;

  return t('result.share', { layer, victim, count: worst.count });
}

/**
 * Teilt den Text. Löst immer auf — auch wenn der Nutzer das Teilen-Menü abbricht:
 * Ein Abbruch ist eine Entscheidung, kein Fehler.
 */
export async function share(text: string): Promise<ShareOutcome> {
  const nav = globalThis.navigator as Navigator & {
    share?: (data: { text: string }) => Promise<void>;
  };

  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ text });
      return 'shared';
    } catch {
      // Abgebrochen oder verboten — der Weg über die Zwischenablage bleibt.
    }
  }

  /*
   * `await nav?.clipboard?.writeText(text)` allein reicht nicht: Fehlt die Zwischenablage,
   * ergibt die Kette `undefined`, `await undefined` gelingt — und die App meldet "kopiert",
   * obwohl nichts kopiert wurde. Deshalb wird die Funktion geprueft, nicht nur aufgerufen.
   */
  const clipboard = nav?.clipboard;
  if (typeof clipboard?.writeText !== 'function') return 'unavailable';

  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
