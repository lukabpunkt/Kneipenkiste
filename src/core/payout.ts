/**
 * Auszahlung (GDD §3.4 / §3.5 / §3.6, Architektur §5).
 *
 * Reine Arithmetik: Aus einem Ergebnis werden Trinker und Verteil-Tokens.
 * Getrunken wird sofort bei der Kontrolle, Tokens sammeln sich bis zum Rundenende.
 */

import {
  BONUS_ALL_CAUGHT,
  BONUS_GOOD_INSTINCT,
  CAUGHT_SIPS_PER_ITEM,
  DIPLOMAT_SIPS,
  HARASSMENT_SIPS,
} from '@/config/rules';
import type {
  Bonus,
  Bribe,
  Drinker,
  GateKind,
  GateResult,
  InspectKind,
  InspectResult,
  Opening,
  PlayerId,
  ResultBanner,
  TokenGrant,
} from './types';

/* ------------------------------------------------------------------ */
/* Kontrolle                                                           */
/* ------------------------------------------------------------------ */

export interface InspectPayout {
  drinkers: Drinker[];
  tokensTo?: TokenGrant;
}

/**
 * Wer trinkt, wer bekommt Tokens, wenn ein Koffer geoeffnet wird.
 *
 * - `caught`  → Reisender trinkt 2 x Menge, Beamter bekommt Menge Tokens.
 * - `clean`   → Beamter trinkt 2 ("Belaestigung eines unschuldigen Reisenden").
 * - `diplomat`→ Beamter trinkt 3, der Diplomat kommt **mit** seiner Ware durch.
 */
export function inspectPayout(
  kind: InspectKind,
  travelerId: PlayerId,
  officerId: PlayerId,
  amount: number
): InspectPayout {
  switch (kind) {
    case 'caught':
      return {
        drinkers: [
          { playerId: travelerId, sips: CAUGHT_SIPS_PER_ITEM * amount, reason: 'caught' },
        ],
        tokensTo: { playerId: officerId, tokens: amount },
      };

    case 'clean':
      return {
        drinkers: [{ playerId: officerId, sips: HARASSMENT_SIPS, reason: 'harassment' }],
      };

    case 'diplomat':
      return {
        drinkers: [{ playerId: officerId, sips: DIPLOMAT_SIPS, reason: 'diplomat' }],
        ...(amount > 0 ? { tokensTo: { playerId: travelerId, tokens: amount } } : {}),
      };
  }
}

/* ------------------------------------------------------------------ */
/* Schranke                                                            */
/* ------------------------------------------------------------------ */

/** Wer durchkommt, verteilt: ein Token je Stueck Ware. Saubere bekommen nichts. */
export function gatePayout(kind: GateKind, travelerId: PlayerId, amount: number): TokenGrant | undefined {
  if (kind !== 'smuggler' || amount <= 0) return undefined;
  return { playerId: travelerId, tokens: amount };
}

/* ------------------------------------------------------------------ */
/* Boni (ADR-3)                                                        */
/* ------------------------------------------------------------------ */

/**
 * Der Beamte darf durchwinken — sonst zahlt er bei ehrlichen Runden zwangslaeufig.
 * Beide Boni geben ihm ein positives Ziel statt reiner Vermeidung.
 */
export function bonusesFor(
  officerId: PlayerId,
  openings: readonly Opening[],
  smugglerCount: number
): Bonus[] {
  const caught = openings.filter((o) => o.result.kind === 'caught').length;

  if (smugglerCount >= 1 && caught === smugglerCount) {
    return [{ playerId: officerId, tokens: BONUS_ALL_CAUGHT, reason: 'allCaught' }];
  }
  if (openings.length === 0 && smugglerCount === 0) {
    return [{ playerId: officerId, tokens: BONUS_GOOD_INSTINCT, reason: 'goodInstinct' }];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Banner (GDD §3.8)                                                   */
/* ------------------------------------------------------------------ */

export function bannerFor(openings: readonly Opening[], smugglerCount: number): ResultBanner {
  const caught = openings.filter((o) => o.result.kind === 'caught').length;

  if (smugglerCount >= 1 && caught === smugglerCount) return 'officerOfTheMonth';
  if (smugglerCount === 0) return 'honestRound';
  if (openings.length > 0 && openings.every((o) => o.result.kind === 'clean')) return 'harassment';
  if (caught === 0 && smugglerCount >= 2) return 'smugglerParadise';
  return 'gotThrough';
}

/* ------------------------------------------------------------------ */
/* Token-Konto                                                         */
/* ------------------------------------------------------------------ */

export interface TokenInput {
  openings: readonly Opening[];
  gate: readonly GateResult[];
  bonuses: readonly Bonus[];
  bribes: readonly Bribe[];
  officerId: PlayerId;
}

/**
 * Alle Token-Quellen einer Runde zusammengezaehlt: Kontrolle, Schranke, Boni und
 * angenommene Bestechungen. Eintraege mit 0 Tokens fallen raus — der Distribute-Screen
 * iteriert genau ueber diese Map.
 */
export function tallyTokens(input: TokenInput): Record<PlayerId, number> {
  const tokens: Record<PlayerId, number> = {};
  const add = (grant: TokenGrant | undefined): void => {
    if (!grant || grant.tokens <= 0) return;
    tokens[grant.playerId] = (tokens[grant.playerId] ?? 0) + grant.tokens;
  };

  for (const opening of input.openings) add(opening.result.tokensTo);
  for (const gate of input.gate) add(gate.tokensTo);
  for (const bonus of input.bonuses) add({ playerId: bonus.playerId, tokens: bonus.tokens });
  for (const bribe of input.bribes) {
    if (bribe.accepted === true) add({ playerId: input.officerId, tokens: bribe.amount });
  }

  return tokens;
}

/** Alle Trinker der Runde in Reihenfolge des Auftretens. */
export function collectDrinkers(openings: readonly Opening[]): Drinker[] {
  return openings.flatMap((opening) => opening.result.drinkers);
}

/** Summe der Schluecke eines Spielers — Testhilfe und Statistik. */
export function sipsOf(drinkers: readonly Drinker[], playerId: PlayerId): number {
  return drinkers.reduce((sum, d) => (d.playerId === playerId ? sum + d.sips : sum), 0);
}

/** Fuer die Result-Zeile "{Name} ist durchgekommen": groesste durchgekommene Menge. */
export function biggestRun(gate: readonly GateResult[]): GateResult | null {
  let best: GateResult | null = null;
  for (const entry of gate) {
    if (entry.kind !== 'smuggler') continue;
    if (best === null || entry.amount > best.amount) best = entry;
  }
  return best;
}

export type { InspectResult };
