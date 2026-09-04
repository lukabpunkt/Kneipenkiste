/**
 * Property-Test ueber 10 000 zufaellige Runden (A0-Audit, Architektur §5).
 *
 * Gespielt wird jede Runde komplett durch: packen, Hinweise, zufaellig oeffnen,
 * Schranke, Abrechnung. Danach werden die Invarianten geprueft, die das ganze Spiel
 * tragen — vor allem die, an denen der Bluff haengt.
 */

import { describe, expect, it } from 'vitest';
import { hintCount } from '@/config/rules';
import { maxAmount, maxOpenings, modeFlags } from '@/core/modes';
import { publicView } from '@/core/publicView';
import {
  amountOf,
  canInspect,
  createRound,
  finishRound,
  inspect,
  offerBribe,
  openingsLeft,
  pack,
  resolveBribe,
  runGate,
  smugglerIds,
  startHall,
} from '@/core/round';
import { createSeededRng } from '@/core/rng';
import type { Round } from '@/core/types';
import { makePlayers } from './helpers';

const ROUNDS = 10_000;

describe(`Invarianten ueber ${ROUNDS} Runden`, () => {
  it('haelt alle Zusicherungen aus Architektur §5', () => {
    let truthfulHints = 0;
    let totalHints = 0;
    let hintsWithFreeChoice = 0;
    const banners = new Map<string, number>();

    for (let seed = 0; seed < ROUNDS; seed++) {
      const rng = createSeededRng(seed * 2654435761 + 1);
      const playerCount = 4 + rng.int(5); // 4..8
      const modes = modeFlags({
        bribery: rng.chance(0.3),
        sniffer: rng.chance(0.3),
        diplomat: rng.chance(0.3),
        highSeason: rng.chance(0.2),
      });

      let round: Round = createRound(
        { index: seed, players: makePlayers(playerCount), modes },
        rng
      );

      /* Packen — die Mengen sind bewusst oft 0, damit ehrliche Runden vorkommen. */
      for (const id of round.travelerIds) {
        const amount = rng.chance(0.45) ? 0 : 1 + rng.int(maxAmount(modes));
        round = pack(round, id, amount);
      }

      round = startHall(round, rng);
      const smugglers = smugglerIds(round);
      const cleans = round.travelerIds.filter((id) => amountOf(round, id) === 0);

      /* --- Hinweise --- */
      expect(round.hints).toHaveLength(hintCount(playerCount));
      expect(new Set(round.hints.map((h) => h.suitcaseOf)).size).toBe(round.hints.length);
      expect(new Set(round.hints.map((h) => h.type)).size).toBe(round.hints.length);

      if (smugglers.length === 0) {
        expect(round.hints.every((h) => h.truthful === false)).toBe(true);
      }
      for (const hint of round.hints) {
        expect(smugglers.includes(hint.suitcaseOf)).toBe(hint.truthful);
      }

      /*
       * Nur wo beide Toepfe gross genug sind, konnte der Muenzwurf frei fallen — nur diese
       * Hinweise gehen in die p_true-Statistik ein.
       */
      const h = round.hints.length;
      if (smugglers.length >= h && cleans.length >= h) {
        hintsWithFreeChoice += h;
        totalHints += h;
        truthfulHints += round.hints.filter((hint) => hint.truthful).length;
      }

      if (modes.sniffer && round.dogHintOf !== undefined) {
        /* Waldi luegt nie. */
        expect(round.dogBarks).toBe(amountOf(round, round.dogHintOf) > 0);
      }

      /* --- Bestechung --- */
      if (modes.bribery && rng.chance(0.4)) {
        const from = rng.pick(round.travelerIds);
        round = offerBribe(round, from, (1 + rng.int(3)) as 1 | 2 | 3);
        round = resolveBribe(round, from, rng.chance(0.5));
      }

      /* --- Kontrolle: zufaellig oeffnen --- */
      expect(round.maxOpenings).toBe(maxOpenings(playerCount, modes));
      while (openingsLeft(round) > 0) {
        if (rng.chance(0.25)) break; // durchwinken
        const open = round.travelerIds.filter((id) => canInspect(round, id));
        if (open.length === 0) break;
        round = inspect(round, rng.pick(open)).round;
      }

      expect(round.openings.length).toBeLessThanOrEqual(round.maxOpenings);

      /* Der Diplomat wird nie erwischt. */
      for (const opening of round.openings) {
        if (opening.suitcaseOf === round.diplomatId) expect(opening.result.kind).toBe('diplomat');
        /* Ein gesperrter Koffer wird nie geoeffnet. */
        expect(round.bribes.some((b) => b.from === opening.suitcaseOf && b.accepted === true)).toBe(false);
      }

      /* --- Sichtbarkeit vor dem Reveal --- */
      const view = JSON.stringify(publicView(round, 'INSPECT'));
      expect(view).not.toContain('truthful');
      expect(view).not.toContain('diplomatId');
      expect(view).not.toContain('packs');

      /* --- Schranke --- */
      const { round: gated, gate } = runGate(round, undefined, rng);
      const gateAmounts = gate.map((g) => g.amount);
      const firstSmuggler = gateAmounts.findIndex((a) => a > 0);
      if (firstSmuggler >= 0) {
        expect(gateAmounts.slice(firstSmuggler).every((a) => a > 0)).toBe(true);
      }
      /* Jeder Koffer taucht genau einmal auf: entweder geoeffnet oder an der Schranke. */
      const seen = [...gated.openings.map((o) => o.suitcaseOf), ...gate.map((g) => g.suitcaseOf)];
      expect(new Set(seen).size).toBe(gated.travelerIds.length);

      /* --- Abrechnung --- */
      const result = finishRound(gated, gate);
      banners.set(result.banner, (banners.get(result.banner) ?? 0) + 1);

      for (const drinker of result.drinkers) {
        expect(drinker.sips).toBeGreaterThan(0);
        expect(Number.isInteger(drinker.sips)).toBe(true);
      }

      let expectedTokens = 0;
      for (const { result: opening } of result.openings) {
        /* Der Fang geht an den Beamten, die Ware des Diplomaten an den Diplomaten. */
        if (opening.kind === 'caught' || opening.kind === 'diplomat') expectedTokens += opening.amount;
      }
      for (const entry of result.gate) if (entry.kind === 'smuggler') expectedTokens += entry.amount;
      for (const bonus of result.bonuses) expectedTokens += bonus.tokens;
      for (const bribe of result.bribes) if (bribe.accepted === true) expectedTokens += bribe.amount;

      const actualTokens = Object.values(result.tokens).reduce((a, b) => a + b, 0);
      expect(actualTokens).toBe(expectedTokens);
      expect(Object.values(result.tokens).every((t) => t > 0)).toBe(true);

      /* Der Bonus "alle erwischt" ist nur moeglich, wenn wirklich alle erwischt wurden. */
      if (result.bonuses.some((b) => b.reason === 'allCaught')) {
        expect(result.openings.filter((o) => o.result.kind === 'caught')).toHaveLength(smugglers.length);
        expect(smugglers.length).toBeGreaterThan(0);
      }
    }

    /* Der statistische Kern: p_true = 0.6 (Design-Pfeiler 2). */
    expect(hintsWithFreeChoice).toBeGreaterThan(5_000);
    expect(Math.abs(truthfulHints / totalHints - 0.6)).toBeLessThan(0.03);

    /* Alle fuenf Banner kommen bei zufaelligem Spiel wirklich vor. */
    for (const banner of ['officerOfTheMonth', 'gotThrough', 'smugglerParadise', 'harassment', 'honestRound']) {
      expect(banners.get(banner) ?? 0).toBeGreaterThan(0);
    }
  }, 60_000);
});
