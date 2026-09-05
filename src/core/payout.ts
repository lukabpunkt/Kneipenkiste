/**
 * Auszahlung (GDD §3.5, Architektur §5) — **die** Entscheidungsstelle des Spiels.
 *
 * CLAUDE.md: `resolveRound` ist eine reine Funktion und laeuft **genau einmal** pro
 * Runde, beim Uebergang SEALED → REVEAL. Die Show liest das Ergebnis, sie wuerfelt nicht.
 * Gleiche Eingaben + gleicher Seed → identisches Ergebnis, immer.
 *
 * Warum das ein echtes Dilemma ist: Stehlen lohnt nur allein, Teilen lohnt nur, wenn
 * niemand stiehlt. Genau das rechnet diese Datei aus — und sonst nichts.
 */

import {
  BANK_FEE_SIPS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MOLE_PENALTY_DIVISOR,
  PERJURY_MULTI_FACTOR,
  PERJURY_SOLO_SIPS,
  WITNESS_DIVISOR,
  type Settings,
} from '@/config/rules';
import { buildRevealOrder } from './choreographer';
import { perjurerIds } from './modes';
import { createSeededRng, type SeededRng } from './rng';
import type { Choice, Drinker, Outcome, OverlayId, PlayerId, RoundResult, RoundSetup } from './types';
import { isJackpot, jackpotSips, nextVault, vaultSpec } from './vault';

/** Bis die Registry in M3 steht, zeigt jede Runde die Platzhalter-Inszenierung. */
export const PLACEHOLDER_OUTCOME_ID = 'basic_outcome';

export interface ResolveOptions {
  /** Ab M3: gewichtete Auswahl aus der Outcome-Registry. */
  pickOutcomeSequence?: (outcome: Outcome, rng: SeededRng) => string;
}

/**
 * Rechnet eine Runde aus.
 *
 * `players` gibt die Sitzreihenfolge vor (fuer Gebuehren- und Jackpot-Zeilen);
 * die **Reveal**-Reihenfolge entsteht getrennt davon im Choreographer (ADR-3).
 */
export function resolveRound(
  players: readonly PlayerId[],
  setup: RoundSetup,
  settings: Settings,
  options: ResolveOptions = {}
): RoundResult {
  assertPlayers(players);
  if (!Number.isInteger(setup.vault) || setup.vault < 0) {
    throw new RangeError(`Tresorinhalt muss eine Zahl >= 0 sein, war: ${setup.vault}`);
  }

  const choices = effectiveChoices(players, setup, settings);
  const rng = createSeededRng(setup.seed);
  const spec = vaultSpec(settings);

  const thieves = players.filter((id) => choices[id] === 'steal');
  const sharers = players.filter((id) => choices[id] === 'share');
  const k = thieves.length;
  const n = players.length;

  const perjurers = perjurerIds({ ...setup, choices }, settings.modes);
  const jackpot = k === 0 && isJackpot(setup.vault, spec);
  const outcome = outcomeFor(k, n, jackpot);

  const order = buildRevealOrder(sharers, thieves, moleOf(setup, settings), rng);

  const drinkers: Drinker[] = [];
  let distributorId: PlayerId | undefined;
  let distributableSips: number | undefined;

  switch (outcome) {
    case 'jackpot': {
      // Der Tresor platzt: Jeder bekommt seinen Anteil ab (GDD §3.2).
      const sips = jackpotSips(setup.vault, n);
      for (const id of players) drinkers.push({ playerId: id, sips, reason: 'jackpot' });
      break;
    }

    case 'allShare': {
      // "Die Bank nimmt Gebuehren." Frieden ist nie kostenlos (ADR-2).
      for (const id of players) drinkers.push({ playerId: id, sips: BANK_FEE_SIPS, reason: 'fee' });
      break;
    }

    case 'soloSteal': {
      distributorId = thieves[0]!;
      if (perjurers.includes(distributorId)) {
        // Meineid: Er trinkt selbst und hat entsprechend weniger zu verschenken.
        drinkers.push({ playerId: distributorId, sips: PERJURY_SOLO_SIPS, reason: 'perjury' });
        distributableSips = Math.max(0, setup.vault - PERJURY_SOLO_SIPS);
      } else {
        distributableSips = setup.vault;
      }
      // Die restlichen `drinkers` fuellt der DISTRIBUTE-Screen (Architektur §3).
      break;
    }

    case 'multiSteal':
    case 'allSteal': {
      // Dieselbe Idee zur selben Zeit — jetzt teilen sie sich die Rechnung.
      const share = Math.ceil(setup.vault / k);
      for (const id of order.thieves) {
        drinkers.push(thiefDrinker(id, share, setup, settings, perjurers));
      }
      break;
    }
  }

  const result: RoundResult = {
    ...setup,
    choices,
    outcome,
    thieves: order.thieves,
    sharers: order.sharers,
    perjurers,
    drinkers,
    revealOrder: order.revealOrder,
    outcomeSequenceId: options.pickOutcomeSequence?.(outcome, rng) ?? PLACEHOLDER_OUTCOME_ID,
    overlayIds: overlaysFor(perjurers, setup, settings),
    nextVault: nextVault(setup.vault, { thieves: k, jackpot }, spec),
    ...(distributorId !== undefined ? { distributorId } : {}),
    ...(distributableSips !== undefined ? { distributableSips } : {}),
  };

  return result;
}

/* ------------------------------------------------------------------ */
/* Verteilung durch den Alleindieb (GDD §3.6, ADR-4)                   */
/* ------------------------------------------------------------------ */

/**
 * Traegt die freie Verteilung des Alleindiebs nach. Er darf alles einer Person geben —
 * Rache ist Teil des Spiels. Was er nicht darf: mehr oder weniger verteilen als da ist.
 */
export function applyDistribution(
  result: RoundResult,
  distribution: Readonly<Record<PlayerId, number>>
): RoundResult {
  if (result.outcome !== 'soloSteal') {
    throw new Error(`Verteilt wird nur beim Alleingang, nicht bei "${result.outcome}".`);
  }
  const budget = result.distributableSips ?? 0;

  let sum = 0;
  for (const [playerId, sips] of Object.entries(distribution)) {
    if (!result.sharers.includes(playerId)) {
      throw new Error(`${playerId} hat nicht geteilt und bekommt nichts zugeteilt.`);
    }
    if (!Number.isInteger(sips) || sips < 0) {
      throw new RangeError(`Ungueltige Zuteilung fuer ${playerId}: ${sips}`);
    }
    sum += sips;
  }
  if (sum !== budget) {
    throw new RangeError(`Es muessen genau ${budget} Schluecke verteilt werden, verteilt wurden ${sum}.`);
  }

  const distributed: Drinker[] = result.sharers
    .filter((id) => (distribution[id] ?? 0) > 0)
    .map((id) => ({ playerId: id, sips: distribution[id]!, reason: 'distributed' as const }));

  return { ...result, drinkers: [...result.drinkers, ...distributed] };
}

/* ------------------------------------------------------------------ */
/* Kronzeuge (Backlog nach 1.0)                                        */
/* ------------------------------------------------------------------ */

/** Wer packen darf und wen er nennen kann. */
export interface WitnessDeal {
  /** Der Dieb, der auspackt. */
  witnessId: PlayerId;
  /** Der Dieb, den er verpfeift. */
  accusedId: PlayerId;
}

/**
 * Darf in dieser Runde ueberhaupt jemand auspacken?
 *
 * Nur ab **zwei** Dieben: Beim Alleingang gibt es niemanden zu nennen, und ohne Dieb
 * gibt es nichts zu halbieren. Der Modus muss an sein — er ist ein Zusatz, keine Regel.
 */
export function canTestify(result: RoundResult, settings: Settings): boolean {
  return settings.modes.witness && result.thieves.length >= 2;
}

/**
 * Traegt den Kronzeugen-Deal nach (Backlog nach 1.0).
 *
 * Ein Dieb packt aus und halbiert damit **seinen** Anteil an der Beute. Was er spart,
 * trinkt der Verpfiffene zusaetzlich: Der Tresor verliert nichts, und der Verrat hat
 * einen Preis, den man am Tisch sitzen sieht. Ein gratis Ausstieg waere keine
 * Entscheidung, sondern ein Knopf.
 *
 * **Der Meineid bleibt unberuehrt.** Der Deal handelt von der Beute, nicht vom
 * gebrochenen Eid — wer schwoert und stiehlt, zahlt das voll, auch wenn er auspackt.
 * Genau daran haengt der Satz "Ein Eid ist ein Eid" (GDD §3.7).
 *
 * Reine Funktion wie `applyDistribution`: Sie bekommt das fertige Ergebnis und gibt ein
 * neues zurueck. Wer den Deal nicht will, ruft sie gar nicht auf.
 */
export function applyCrownWitness(result: RoundResult, deal: WitnessDeal): RoundResult {
  const { witnessId, accusedId } = deal;

  if (result.thieves.length < 2) {
    throw new Error('Ausgepackt wird nur, wenn es mehr als einen Dieb gibt.');
  }
  if (!result.thieves.includes(witnessId)) {
    throw new Error(`${witnessId} hat nicht gestohlen und kann nicht auspacken.`);
  }
  if (!result.thieves.includes(accusedId)) {
    throw new Error(`${accusedId} hat nicht gestohlen und kann nicht verpfiffen werden.`);
  }
  if (witnessId === accusedId) {
    throw new Error('Niemand verpfeift sich selbst.');
  }
  if (result.witnessId !== undefined) {
    throw new Error('In dieser Runde hat schon jemand ausgepackt.');
  }
  /*
   * **Wer den Eid gebrochen hat, hat nichts zu verhandeln.** Der ganze Schluck eines
   * Meineidigen laeuft unter `perjury`, nicht unter `split` — er hat keinen Beuteanteil,
   * den er halbieren koennte. Das ist keine technische Ausrede, sondern die Regel: Der
   * Deal gilt der Beute, und wer geschworen und gestohlen hat, zahlt seinen Eid voll.
   */
  if (result.perjurers.includes(witnessId)) {
    throw new Error(`${witnessId} hat einen Eid gebrochen und kann nicht auspacken.`);
  }

  /*
   * Gehandelt wird nur ueber `split` — den Anteil an der Beute. Gebuehr, Jackpot,
   * Verteilung und Meineid bleiben, wie sie sind.
   */
  const witnessShare = result.drinkers.find(
    (drinker) => drinker.playerId === witnessId && drinker.reason === 'split'
  );
  if (!witnessShare || witnessShare.sips <= 0) return { ...result, witnessId, accusedId };

  const reduced = Math.ceil(witnessShare.sips / WITNESS_DIVISOR);
  const moved = witnessShare.sips - reduced;

  const drinkers: Drinker[] = result.drinkers.map((drinker) => {
    if (drinker.reason !== 'split') return drinker;
    if (drinker.playerId === witnessId) return { ...drinker, sips: reduced };
    if (drinker.playerId === accusedId) return { ...drinker, sips: drinker.sips + moved };
    return drinker;
  });

  /*
   * Der Verpfiffene kann selbst Meineidiger sein — dann hat er keinen `split`-Eintrag,
   * und die verschobenen Schluecke haetten nirgends hingekonnt. Sie bekommen einen
   * eigenen: Er zahlt seinen Eid **und** uebernimmt den Anteil des Kronzeugen. Ohne
   * diese Zeile verschwinden Schluecke aus dem Tresor — genau das hat der Property-Test
   * ueber 2 000 Deals gefunden.
   */
  const accusedHasShare = drinkers.some(
    (drinker) => drinker.playerId === accusedId && drinker.reason === 'split'
  );
  if (!accusedHasShare && moved > 0) {
    drinkers.push({ playerId: accusedId, sips: moved, reason: 'split' });
  }

  return { ...result, drinkers, witnessId, accusedId };
}

/* ------------------------------------------------------------------ */
/* Vorschau fuer die Verhandlungsphase (GDD §3.3)                      */
/* ------------------------------------------------------------------ */

export interface PayoutPreviewRow {
  /** Anzahl Diebe, fuer die diese Zeile gilt. `2` steht fuer "2 oder mehr". */
  thieves: number;
  outcome: Outcome;
  /** Was ein Dieb trinkt (bei `soloSteal`: 0, er verteilt). */
  thiefSips: number;
  /** Was ein Teiler trinkt (bei `soloSteal`: haengt von der Verteilung ab → `null`). */
  sharerSips: number | null;
  nextVault: number;
}

/**
 * Die Auszahlungstabelle **fuer genau diese Runde**, wie sie waehrend der Verhandlung
 * unter dem Tresor steht. Sie kommt aus derselben Quelle wie das echte Ergebnis,
 * damit die Tabelle nie luegt (Audit A1).
 */
export function previewPayouts(playerCount: number, vault: number, settings: Settings): PayoutPreviewRow[] {
  const spec = vaultSpec(settings);
  const jackpot = isJackpot(vault, spec);
  const rows: PayoutPreviewRow[] = [];

  rows.push({
    thieves: 0,
    outcome: jackpot ? 'jackpot' : 'allShare',
    thiefSips: 0,
    sharerSips: jackpot ? jackpotSips(vault, playerCount) : BANK_FEE_SIPS,
    nextVault: nextVault(vault, { thieves: 0, jackpot }, spec),
  });

  rows.push({
    thieves: 1,
    outcome: 'soloSteal',
    thiefSips: 0,
    sharerSips: null,
    nextVault: spec.startVault,
  });

  if (playerCount >= 3) {
    rows.push({
      thieves: 2,
      outcome: 'multiSteal',
      thiefSips: Math.ceil(vault / 2),
      sharerSips: 0,
      nextVault: spec.startVault,
    });
  }

  rows.push({
    thieves: playerCount,
    outcome: 'allSteal',
    thiefSips: Math.ceil(vault / playerCount),
    sharerSips: 0,
    nextVault: spec.startVault,
  });

  return rows;
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/** Gesamtzahl Schluecke, die in dieser Runde fliessen. */
export function totalSips(result: RoundResult): number {
  return result.drinkers.reduce((sum, d) => sum + d.sips, 0);
}

/** Was ein einzelner Spieler in dieser Runde trinkt. */
export function sipsFor(result: RoundResult, playerId: PlayerId): number {
  return result.drinkers.reduce((sum, d) => (d.playerId === playerId ? sum + d.sips : sum), 0);
}

function assertPlayers(players: readonly PlayerId[]): void {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new RangeError(
      `Der Tresor braucht ${MIN_PLAYERS}-${MAX_PLAYERS} Spieler, bekam ${players.length}.`
    );
  }
  if (new Set(players).size !== players.length) {
    throw new Error('Doppelte Spieler-ID in der Runde.');
  }
}

/**
 * Der Maulwurf **muss** stehlen — sein Choice-Screen zeigt nur STEHLEN (GDD §3.7).
 * Wir erzwingen es hier trotzdem, damit die Invariante "Maulwurf ist immer in `thieves`"
 * unabhaengig von der UI gilt.
 */
function effectiveChoices(
  players: readonly PlayerId[],
  setup: RoundSetup,
  settings: Settings
): Record<PlayerId, Choice> {
  const mole = moleOf(setup, settings);
  const out: Record<PlayerId, Choice> = {};
  for (const id of players) {
    if (id === mole) {
      out[id] = 'steal';
      continue;
    }
    const choice = setup.choices[id];
    if (choice === undefined) throw new Error(`Es fehlt die Wahl von ${id}.`);
    out[id] = choice;
  }
  return out;
}

function moleOf(setup: RoundSetup, settings: Settings): PlayerId | undefined {
  return settings.modes.mole ? setup.moleId : undefined;
}

function outcomeFor(k: number, n: number, jackpot: boolean): Outcome {
  if (k === 0) return jackpot ? 'jackpot' : 'allShare';
  if (k === 1) return 'soloSteal';
  return k === n ? 'allSteal' : 'multiSteal';
}

/** Was ein Dieb bei k >= 2 trinkt — inkl. Maulwurf-Rabatt und Meineid-Aufschlag. */
function thiefDrinker(
  id: PlayerId,
  share: number,
  setup: RoundSetup,
  settings: Settings,
  perjurers: readonly PlayerId[]
): Drinker {
  if (id === moleOf(setup, settings)) {
    // "Befehl ist Befehl" — halbe Strafe, aufgerundet (GDD §3.7).
    return { playerId: id, sips: Math.ceil(share / MOLE_PENALTY_DIVISOR), reason: 'split' };
  }
  if (perjurers.includes(id)) {
    return { playerId: id, sips: share * PERJURY_MULTI_FACTOR, reason: 'perjury' };
  }
  return { playerId: id, sips: share, reason: 'split' };
}

function overlaysFor(perjurers: readonly PlayerId[], setup: RoundSetup, settings: Settings): OverlayId[] {
  const ids: OverlayId[] = [];
  if (perjurers.length > 0) ids.push('perjury_seal_break');
  if (moleOf(setup, settings) !== undefined) ids.push('mole_reveal');
  return ids;
}
