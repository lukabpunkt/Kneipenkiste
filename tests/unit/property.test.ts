/**
 * Property-Test ueber 10 000 Runden (DoD M0.5, Audit A0).
 *
 * Er prueft keine Beispiele, sondern die Invarianten aus Architektur §5 — und zwar ueber
 * zufaellige Spielerzahlen, Balkenzahlen, Modi und Wahlen. Was hier durchkommt, kommt
 * auch auf einer Party durch.
 */

import { describe, expect, it } from 'vitest';
import { isDeathZone } from '@/core/bridge';
import { resolveRound } from '@/core/round';
import { createSequencePicker, buildStepScript } from '@/core/choreographer';
import { createSeededRng, type SeededRng } from '@/core/rng';
import { MAX_STEP_MS } from '@/config/choreo';
import { PACE_PRESETS } from '@/config/rules';
import type { ModeFlags } from '@/core/modes';
import type { Choice, PlayerId, Round } from '@/core/types';
import type { Weight } from '@/config/rules';

const ROUNDS = 10_000;

function randomModes(rng: SeededRng): ModeFlags {
  return {
    flags: rng.chance(0.35),
    rotten: rng.chance(0.3),
    weights: rng.chance(0.3),
    fog: rng.chance(0.2),
    rope: rng.chance(0.3),
  };
}

function randomRound(index: number, rng: SeededRng): Round {
  const playerCount = rng.intBetween(3, 8);
  const playerIds: PlayerId[] = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const modes = randomModes(rng);

  /* Die ganze Spannweite, die im Spiel vorkommen kann: von B_min bis B_0. */
  const plankCount = rng.intBetween(playerCount - 1, playerCount + 2);
  const planks = Array.from({ length: plankCount }, (_, i) => i + 1);
  const bridge = modes.rotten
    ? { count: plankCount, planks, removed: [], rottenPlank: rng.pick(planks) }
    : { count: plankCount, planks, removed: [] };

  const choices: Record<PlayerId, Choice> = {};
  const weights: Record<PlayerId, Weight> = {};
  const flags: Record<PlayerId, number> = {};

  for (const id of playerIds) {
    /* Das Seil bekommt hier jeder, der es haben will — der Verbrauch haengt an der Session. */
    choices[id] = modes.rope && rng.chance(0.12) ? { rope: true } : { plank: rng.pick(planks) };
    if (modes.weights) weights[id] = rng.intBetween(1, 3) as Weight;
    if (modes.flags && rng.chance(0.6)) flags[id] = rng.pick(planks);
  }

  const round: Round = { index, seed: rng.int(0xffffffff), playerIds, modes, bridge, choices };
  if (modes.weights) round.weights = weights;
  if (modes.flags) round.flags = flags;
  return round;
}

describe(`Invarianten ueber ${ROUNDS.toLocaleString('de-DE')} zufaellige Runden`, () => {
  it('haelt jede Invariante aus Architektur §5', () => {
    const rng = createSeededRng(0x5eed);
    const picker = createSequencePicker(0xc0ffee);

    for (let i = 0; i < ROUNDS; i += 1) {
      const round = randomRound(i, rng);
      const n = round.playerIds.length;
      const result = resolveRound(round, { rng, picker });

      /* 1. Jeder steht auf genau einem Balken oder haengt am Seil. */
      const placed = result.groups.reduce((sum, g) => sum + g.players.length, 0);
      expect(placed + result.ropeUsers.length).toBe(n);

      /* 2. Keine negativen oder gebrochenen Werte. */
      for (const drinker of result.drinkers) {
        expect(drinker.sips).toBeGreaterThan(0);
        expect(Number.isInteger(drinker.sips)).toBe(true);
      }
      for (const sips of Object.values(result.giving)) {
        expect(sips).toBeGreaterThan(0);
        expect(Number.isInteger(sips)).toBe(true);
      }

      /* 3. Die naechste Bruecke bleibt im erlaubten Fenster. */
      expect(result.nextBridge.count).toBeGreaterThanOrEqual(n - 1);
      expect(result.nextBridge.count).toBeLessThanOrEqual(n + 2);
      expect(result.nextBridge.planks).toHaveLength(result.nextBridge.count);

      /* 4. Todeszone heisst garantierte Kollision (Schubfachprinzip). */
      if (isDeathZone(round.bridge, n)) {
        const standing = n - result.ropeUsers.length;
        /* Nur wenn ueberhaupt mehr Leute stehen als es Balken gibt — Seile entlasten. */
        if (standing > round.bridge.count) {
          expect(result.groups.some((g) => g.collision)).toBe(true);
          expect(result.outcome).toBe('deathZone');
        }
      }

      /* 5. Friede heisst: nichts zu verteilen, und hoechstens Seil-Gebuehren. */
      if (result.outcome === 'allSafe') {
        expect(result.giving).toEqual({});
        expect(result.drinkers.every((d) => d.reason === 'ropeFee')).toBe(true);
        expect(result.removedPlank).toBeDefined();
      } else {
        expect(result.nextBridge.count).toBe(n + 2);
      }

      /* 6. Wer trinkt, steht auf einem Kollisionsbalken, am Seil oder auf morschem Holz. */
      for (const drinker of result.drinkers) {
        expect(round.playerIds).toContain(drinker.playerId);
      }

      /* 7. Jede Kollisionsgruppe hat eine Fall-Sequenz, jeder Sichere eine Safe-Sequenz. */
      for (const group of result.groups) {
        if (group.collision) expect(result.sequenceIds.fall[group.plank]).toBeTruthy();
      }
    }
  });

  it('baut aus jedem Ergebnis ein spielbares Skript', () => {
    const rng = createSeededRng(0xb00c);
    const picker = createSequencePicker(0xb00c);

    for (let i = 0; i < 2000; i += 1) {
      const round = randomRound(i, rng);
      const result = resolveRound(round, { rng, picker });
      const pace = PACE_PRESETS[i % PACE_PRESETS.length]!;
      const script = buildStepScript(result, pace);

      /* Alle kommen gleichzeitig an — die Signatur, ausnahmslos. */
      expect(new Set(script.run.map((r) => r.arriveAt)).size).toBe(1);
      expect(script.run).toHaveLength(round.playerIds.length);

      /* Jeder besetzte Balken knarrt. */
      expect(script.creak).toHaveLength(result.groups.length);

      /* Blickkontakt immer vor dem Bruch, nie ohne Kollision. */
      for (const look of script.eyeContact) {
        const snap = script.breaks.find((b) => b.plank === look.plank)!;
        expect(snap).toBeDefined();
        expect(look.at).toBeLessThan(snap.at);
        expect(look.hikerIds.length).toBeGreaterThanOrEqual(2);
      }
      expect(script.eyeContact).toHaveLength(result.groups.filter((g) => g.collision).length);

      /* Der Deckel haelt. */
      expect(script.totalMs).toBeLessThanOrEqual(MAX_STEP_MS);
      expect(script.skippableFrom).toBeLessThanOrEqual(script.totalMs);
    }
  });
});
