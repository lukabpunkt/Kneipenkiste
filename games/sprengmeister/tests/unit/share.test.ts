/**
 * Der Share-Text (Roadmap M5.3, GDD §7).
 *
 * Geteilt wird nicht die Statistik, sondern die **schlimmste Zeile** der Runde: der
 * Leger mit den meisten Treffern an einem einzigen Opfer. „Rudi hat Anna dreimal in die
 * Luft gejagt 💣" ist der Satz, mit dem am nächsten Tag jemand die App erklärt.
 *
 * Geprüft wird die Auswahl (welche Paarung gewinnt) und die Ausfallsicherheit: Teilen
 * ist ein Bonus, kein Spielzug — kein Weg darf werfen, egal was der Browser kann.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Kill, RoundResult } from '@/core/types';
import { setLocale } from '@/core/i18n';
import { share, shareText, worstPairing } from '@/ui/share';

function kill(layer: string, victim: string): Kill {
  return { layer, victim, cell: 0 };
}

function round(kills: Kill[]): RoundResult {
  return {
    index: 0,
    seed: 1,
    size: 5,
    modes: {
      doubleAgent: false,
      nightDigger: false,
      twoChests: false,
      chainReaction: false,
      masterBonus: false,
    },
    digs: [],
    drinkers: [],
    kills,
    tokens: {},
    distribution: [],
    finderIds: [],
    replay: [],
  };
}

const NAMES: Record<string, string> = { p1: 'Rudi', p2: 'Anna', p3: 'Bo' };
const nameOf = (id: string): string | undefined => NAMES[id];

describe('worstPairing', () => {
  it('findet die Paarung mit den meisten Treffern', () => {
    const worst = worstPairing([kill('p1', 'p2'), kill('p1', 'p2'), kill('p1', 'p2'), kill('p3', 'p2')]);
    expect(worst).toEqual({ layer: 'p1', victim: 'p2', count: 3 });
  });

  it('zaehlt je Paarung, nicht je Leger', () => {
    // Zwei Opfer einmal ist keine Geschichte — dreimal dasselbe Opfer schon.
    const worst = worstPairing([kill('p1', 'p2'), kill('p1', 'p3'), kill('p3', 'p1'), kill('p3', 'p1')]);
    expect(worst).toEqual({ layer: 'p3', victim: 'p1', count: 2 });
  });

  it('ignoriert Selbsttreffer', () => {
    /*
     * Sie duerfen gar nicht vorkommen — eine eigene Mine ist stumm (ADR-2) —, aber ein
     * Share-Text, der jemanden sich selbst hochjagen laesst, waere ein Datenleck mit
     * Pointe.
     */
    expect(worstPairing([kill('p1', 'p1'), kill('p1', 'p1')])).toBeUndefined();
  });

  it('gibt nichts zurueck, wenn niemand jemanden erwischt hat', () => {
    expect(worstPairing([])).toBeUndefined();
  });

  it('nimmt bei Gleichstand die fruehere Tat', () => {
    const worst = worstPairing([kill('p1', 'p2'), kill('p3', 'p2')]);
    expect(worst?.layer).toBe('p1');
  });
});

describe('shareText', () => {
  afterEach(() => setLocale('de'));

  it('baut den Satz aus Namen und Anzahl', () => {
    setLocale('de');
    const text = shareText(round([kill('p1', 'p2'), kill('p1', 'p2')]), nameOf);
    expect(text).toContain('Rudi');
    expect(text).toContain('Anna');
    expect(text).toContain('2');
  });

  it('spricht Englisch, wenn die App Englisch spricht', () => {
    setLocale('en');
    const text = shareText(round([kill('p1', 'p2')]), nameOf);
    expect(text).toBeDefined();
    expect(text).not.toContain('in die Luft');
  });

  it('bleibt stumm, wenn es nichts zu erzaehlen gibt', () => {
    expect(shareText(round([]), nameOf)).toBeUndefined();
  });

  it('bleibt stumm, wenn ein Name fehlt', () => {
    expect(shareText(round([kill('p1', 'weg')]), nameOf)).toBeUndefined();
  });
});

describe('share', () => {
  const nav = globalThis.navigator as Navigator & {
    share?: unknown;
    clipboard?: unknown;
  };
  const savedShare = nav.share;
  const savedClipboard = nav.clipboard;

  const restore = (): void => {
    Object.defineProperty(nav, 'share', { configurable: true, value: savedShare });
    Object.defineProperty(nav, 'clipboard', { configurable: true, value: savedClipboard });
  };
  afterEach(restore);

  it('nutzt das Teilen-Menue, wenn es eines gibt', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(nav, 'share', { configurable: true, value: spy });

    await expect(share('Text')).resolves.toBe('shared');
    expect(spy).toHaveBeenCalledWith({ text: 'Text' });
  });

  it('faellt auf die Zwischenablage zurueck, wenn der Nutzer abbricht', async () => {
    /*
     * Ein Abbruch ist eine Entscheidung, kein Fehler — die Web Share API wirft dabei.
     * Trotzdem soll der Text irgendwo landen.
     */
    Object.defineProperty(nav, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('abort')),
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(nav, 'clipboard', { configurable: true, value: { writeText } });

    await expect(share('Text')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Text');
  });

  it('sagt es, wenn beides fehlt — und wirft nicht', async () => {
    Object.defineProperty(nav, 'share', { configurable: true, value: undefined });
    Object.defineProperty(nav, 'clipboard', { configurable: true, value: undefined });

    await expect(share('Text')).resolves.toBe('unavailable');
  });
});
