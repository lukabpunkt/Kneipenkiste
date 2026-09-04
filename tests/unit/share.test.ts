/**
 * Teilen-Text und "Verraeter des Abends" (GDD §3.8, Roadmap M5.3).
 *
 * Beides sind reine Funktionen im Regelkern und werden deshalb hier geprueft, nicht im
 * Screen. Der Satz muss ohne die App verstaendlich sein, und der Titel darf niemanden
 * treffen, der gar nicht frei entscheiden durfte.
 */

import { describe, expect, it } from 'vitest';
import { setLocale } from '@/core/i18n';
import { resolveRound } from '@/core/payout';
import { commitRound, createEmptySession, traitorOfTheEvening } from '@/core/session';
import { shareText } from '@/core/share';
import type { Session } from '@/core/types';
import { vaultSpec } from '@/core/vault';
import { makeIds, makePlayers, makeSettings, makeSetup } from './helpers';

const settings = makeSettings();
const spec = vaultSpec(settings);

/** Eine Runde mit vorgegebenen Wahlen — dieselbe Quelle wie im Spiel. */
function round(steals: boolean[], overrides: Parameters<typeof makeSetup>[0] = { vault: 8, steals }) {
  return resolveRound(makeIds(steals.length), makeSetup({ ...overrides, steals }), settings);
}

/* ------------------------------------------------------------------ */
/* Teilen-Text                                                         */
/* ------------------------------------------------------------------ */

describe('shareText()', () => {
  const players = makePlayers(4);

  it('nennt beim Alleingang den Dieb und den Einsatz', () => {
    const result = round([true, false, false, false]);
    const text = shareText({ result, players });

    expect(text).toContain(players[0]!.name);
    expect(text).toContain(String(result.vault));
    // Der Satz muss ohne die App funktionieren — kein Fachbegriff, kein Platzhalter.
    expect(text).not.toContain('{');
    expect(text).not.toContain('[missing:');
  });

  it('zaehlt bei mehreren Dieben, statt Namen aufzuzaehlen', () => {
    const result = round([true, true, false, false]);
    const text = shareText({ result, players });
    expect(text).toContain('2');
    expect(text).not.toContain(players[0]!.name);
  });

  it('macht aus dem Meineid die Schlagzeile', () => {
    const ids = makeIds(4);
    const result = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [true, false, false, false], oaths: [ids[0]!] }),
      makeSettings({}, { oath: true })
    );
    expect(result.perjurers).toEqual([ids[0]]);

    const text = shareText({ result, players });
    // Der Meineid schlaegt den Alleingang: Er ist die bessere Geschichte (GDD §3.8).
    expect(text).not.toBe(shareText({ result: round([true, false, false, false]), players }));
    expect(text).toContain(players[0]!.name);
  });

  it('hat fuer jeden der fuenf Ausgaenge einen eigenen Satz', () => {
    const jackpot = resolveRound(
      makeIds(4),
      makeSetup({ vault: spec.jackpotAt, steals: [false, false, false, false] }),
      settings
    );
    const texts = [
      shareText({ result: round([false, false, false, false]), players }),
      shareText({ result: round([true, false, false, false]), players }),
      shareText({ result: round([true, true, false, false]), players }),
      shareText({ result: round([true, true, true, true]), players }),
      shareText({ result: jackpot, players }),
    ];
    expect(new Set(texts).size).toBe(5);
    for (const text of texts) expect(text).not.toContain('[missing:');
  });

  it('funktioniert in beiden Sprachen', () => {
    setLocale('en');
    const text = shareText({ result: round([true, false, false, false]), players });
    expect(text).not.toContain('[missing:');
    expect(text).toContain(players[0]!.name);
    setLocale('de');
  });

  it('faellt nicht ueber einen Spieler, der nicht mehr in der Liste steht', () => {
    // Kann passieren, wenn jemand nach der Runde aus der Lobby fliegt.
    const text = shareText({ result: round([true, false, false, false]), players: [] });
    expect(text).not.toContain('[missing:');
  });
});

/* ------------------------------------------------------------------ */
/* Verraeter des Abends                                                */
/* ------------------------------------------------------------------ */

describe('traitorOfTheEvening()', () => {
  function sessionWith(rounds: ReturnType<typeof round>[]): Session {
    let session: Session = { ...createEmptySession(), players: makePlayers(4) };
    for (const result of rounds) session = commitRound(session, result);
    return session;
  }

  it('gibt niemanden zurueck, solange niemand gestohlen hat', () => {
    expect(traitorOfTheEvening(sessionWith([]))).toBeUndefined();
    expect(traitorOfTheEvening(sessionWith([round([false, false, false, false])]))).toBeUndefined();
  });

  it('kroent den, der am oeftesten gestohlen hat', () => {
    const session = sessionWith([
      round([true, false, false, false]),
      round([true, true, false, false]),
      round([false, true, false, false]),
      round([true, false, false, false]),
    ]);
    // p0 dreimal, p1 zweimal.
    expect(traitorOfTheEvening(session)).toBe('p0');
  });

  it('entscheidet Gleichstand ueber den niedrigeren Vertrauens-Index', () => {
    const ids = makeIds(4);
    const moleSettings = makeSettings({}, { mole: true });
    /** Eine Runde, in der p1 der Maulwurf ist — die zaehlt ihm nicht als freie Wahl. */
    const forced = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [false, true, false, false], moleId: ids[1]! }),
      moleSettings
    );

    /*
     * Beide stehlen genau zweimal freiwillig. p0 hatte dabei vier freie Runden (50 %
     * Vertrauen), p1 nur zwei (0 %) — die anderen zwei war er Maulwurf. Wer bei **jeder**
     * freien Gelegenheit stiehlt, ist der groessere Verraeter als wer es in der Haelfte tut.
     */
    const session = sessionWith([
      round([true, true, false, false]),
      round([true, true, false, false]),
      forced,
      forced,
    ]);

    expect(traitorOfTheEvening(session)).toBe('p1');
  });

  it('rechnet Maulwurf-Runden nicht an (ADR-7)', () => {
    const ids = makeIds(4);
    const forced = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [false, false, false, true], moleId: ids[3]! }),
      makeSettings({}, { mole: true })
    );
    const freely = round([true, false, false, false]);

    const session = sessionWith([forced, forced, forced, freely]);
    /*
     * p3 wurde dreimal zum Stehlen gezwungen, p0 hat es einmal freiwillig getan. Der
     * Titel gehoert p0 — der Maulwurf hatte keine Wahl, und ein Preis fuer Pech waere
     * die falsche Pointe.
     */
    expect(traitorOfTheEvening(session)).toBe('p0');
  });
});
