/**
 * Die Show gegen das Ergebnis (Audit A3, DoD M3).
 *
 * Tausend simulierte Runden, und für jede die eine Frage: **Zeigt die Show genau das, was
 * `resolveRound()` entschieden hat?** Nicht ungefähr, nicht meistens — genau.
 *
 * Das ist die Zusicherung, an der das ganze Spiel hängt. Die Show ist geskriptet aus einem
 * feststehenden Ergebnis (CLAUDE.md); würde sie davon abweichen, wäre der Reveal eine
 * zweite, widersprechende Wahrheit — und niemand wüsste, welche zählt.
 */

import { describe, expect, it } from 'vitest';
import { buildStepScript, createSequencePicker } from '@/core/choreographer';
import { resolveRound } from '@/core/round';
import { createSeededRng, type SeededRng } from '@/core/rng';
import { resultView } from '@/core/publicView';
import { CREAK_AMPLITUDE, EYE_CONTACT, MAX_STEP_MS, PACE_TIMINGS } from '@/config/choreo';
import { MISC_SEQUENCES, OVERLAY_SEQUENCES } from '@/config/sequences';
import { PACE_PRESETS, type Pace, type Weight } from '@/config/rules';
import type { ModeFlags } from '@/core/modes';
import type { Choice, PlayerId, Round } from '@/core/types';

const ROUNDS = 1000;

function randomModes(rng: SeededRng): ModeFlags {
  return {
    flags: rng.chance(0.35),
    rotten: rng.chance(0.3),
    weights: rng.chance(0.25),
    fog: rng.chance(0.2),
    rope: rng.chance(0.25),
  };
}

function randomRound(index: number, rng: SeededRng): Round {
  const playerCount = rng.intBetween(3, 8);
  const playerIds: PlayerId[] = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const modes = randomModes(rng);

  const plankCount = rng.intBetween(playerCount - 1, playerCount + 2);
  const planks = Array.from({ length: plankCount }, (_, i) => i + 1);
  const bridge = modes.rotten
    ? { count: plankCount, planks, removed: [], rottenPlank: rng.pick(planks) }
    : { count: plankCount, planks, removed: [] };

  const choices: Record<PlayerId, Choice> = {};
  const weights: Record<PlayerId, Weight> = {};
  const flags: Record<PlayerId, number> = {};

  for (const id of playerIds) {
    choices[id] = modes.rope && rng.chance(0.1) ? { rope: true } : { plank: rng.pick(planks) };
    if (modes.weights) weights[id] = rng.intBetween(1, 3) as Weight;
    if (modes.flags && rng.chance(0.6)) flags[id] = rng.pick(planks);
  }

  const round: Round = { index, seed: rng.int(0xffffffff), playerIds, modes, bridge, choices };
  if (modes.weights) round.weights = weights;
  if (modes.flags) round.flags = flags;
  return round;
}

describe(`Die Show zeigt das Ergebnis — ${ROUNDS} Runden`, () => {
  it('inszeniert genau die Gruppen, die abgerechnet wurden', () => {
    const rng = createSeededRng(0x5104);
    const picker = createSequencePicker(0xfeed);

    for (let i = 0; i < ROUNDS; i += 1) {
      const round = randomRound(i, rng);
      const result = resolveRound(round, { rng, picker });
      const reveal = resultView(result);
      const pace = PACE_PRESETS[i % PACE_PRESETS.length]!;
      const script = buildStepScript(result, pace);

      /* --- Wer läuft, läuft: genau die Spieler der Runde, keiner mehr, keiner weniger --- */
      expect(script.run.map((entry) => entry.hikerId).sort()).toEqual([...round.playerIds].sort());

      /* --- Knarren: jeder besetzte Balken, keiner sonst (ADR-3) --- */
      const occupied = result.groups.map((group) => group.plank).sort((a, b) => a - b);
      expect(script.creak.map((entry) => entry.plank).sort((a, b) => a - b)).toEqual(occupied);

      for (const entry of script.creak) {
        const group = result.groups.find((item) => item.plank === entry.plank)!;
        if (group.rotten) {
          expect(entry.amplitude).toBe(CREAK_AMPLITUDE.rottenStart);
          expect(entry.amplitudeEnd).toBe(CREAK_AMPLITUDE.rottenEnd);
        } else {
          expect(entry.amplitude).toBe(
            group.collision ? CREAK_AMPLITUDE.collision : CREAK_AMPLITUDE.safe
          );
        }
      }

      /* --- Brüche: genau die Balken, die brechen, in seeded Reihenfolge --- */
      const breaking = result.groups
        .filter((group) => group.collision || group.rotten)
        .map((group) => group.plank)
        .sort((a, b) => a - b);
      expect(script.breaks.map((entry) => entry.plank).sort((a, b) => a - b)).toEqual(breaking);

      /* Die Reihenfolge ist reproduzierbar — dasselbe Ergebnis, dasselbe Skript. */
      expect(buildStepScript(result, pace).breaks.map((entry) => entry.plank)).toEqual(
        script.breaks.map((entry) => entry.plank)
      );

      /* --- Blickkontakt: nur Kollisionen, und immer vor dem Bruch --- */
      const collisions = result.groups.filter((group) => group.collision).map((group) => group.plank);
      expect(script.eyeContact.map((entry) => entry.plank).sort((a, b) => a - b)).toEqual(
        [...collisions].sort((a, b) => a - b)
      );

      for (const look of script.eyeContact) {
        const snap = script.breaks.find((entry) => entry.plank === look.plank)!;
        expect(look.at).toBeLessThan(snap.at);
        expect(look.at).toBeGreaterThanOrEqual(script.step.at);
        expect(look.durationMs).toBe(EYE_CONTACT.durationMs);
        /* Beide Beteiligten stehen drin — eine "Oh."-Blase über einem allein wäre sinnlos. */
        expect(look.hikerIds.length).toBeGreaterThanOrEqual(2);
      }

      /* --- Sicher-Sequenzen: für jeden, der allein und trocken steht --- */
      const safePlayers = result.groups
        .filter((group) => !group.collision && !group.rotten)
        .map((group) => group.players[0]!);
      expect(script.safe.map((entry) => entry.hikerId).sort()).toEqual([...safePlayers].sort());

      /* --- Nachspiel: schrumpfen oder reparieren, nie beides --- */
      if (result.outcome === 'allSafe') {
        expect(script.aftermath.kind).toBe('allSafeRot');
        expect(script.removedPlank).toBe(reveal.removedPlank);
        expect(result.sequenceIds.misc).toContain(MISC_SEQUENCES.allSafeRot);
      } else {
        expect(script.aftermath.kind).toBe('repair');
        expect(script.removedPlank).toBeUndefined();
        expect(result.sequenceIds.misc).toContain(MISC_SEQUENCES.repairCarpenter);
      }

      /* --- Overlays: morsch und Fahnenflucht, jeweils mit Ziel --- */
      const rottenPlayers = result.groups
        .filter((group) => group.rotten)
        .map((group) => group.players[0]!);
      const rottenOverlays = script.overlays
        .filter((entry) => entry.id === OVERLAY_SEQUENCES.rottenCrack)
        .map((entry) => entry.target);
      expect(rottenOverlays.sort()).toEqual([...rottenPlayers].sort());

      const stampTargets = script.overlays
        .filter((entry) => entry.id === OVERLAY_SEQUENCES.deserterStamp)
        .map((entry) => entry.target);
      expect(stampTargets.sort()).toEqual([...result.deserters].sort());

      /* --- Tap-to-Skip nie vor dem letzten Bruch (GDD §4.2) --- */
      for (const entry of script.breaks) {
        expect(entry.at).toBeLessThanOrEqual(script.skippableFrom);
      }

      expect(script.totalMs).toBeLessThanOrEqual(MAX_STEP_MS);
    }
  });
});

describe('Timing-Presets (DoD M3)', () => {
  const round = (): Round => ({
    index: 0,
    seed: 4711,
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    modes: { flags: false, rotten: false, weights: false, fog: false, rope: false },
    bridge: { count: 6, planks: [1, 2, 3, 4, 5, 6], removed: [] },
    choices: { p1: { plank: 1 }, p2: { plank: 1 }, p3: { plank: 3 }, p4: { plank: 4 } },
  });

  function scriptFor(pace: Pace) {
    const result = resolveRound(round(), {
      rng: createSeededRng(1),
      picker: createSequencePicker(1),
    });
    return buildStepScript(result, pace);
  }

  it('trifft die Phasen aus `choreo.ts` auf ± 1 s', () => {
    for (const pace of PACE_PRESETS) {
      const script = scriptFor(pace);
      const timings = PACE_TIMINGS[pace];

      expect(Math.abs(script.intro.endsAt - timings.intro)).toBeLessThanOrEqual(1000);
      expect(Math.abs(script.step.at - (timings.intro + timings.run))).toBeLessThanOrEqual(1000);
      expect(script.step.hitStopMs).toBe(timings.hitStop);
    }
  });

  it('macht "kurz" kürzer und "lang" länger — in dieser Reihenfolge', () => {
    const short = scriptFor('short');
    const normal = scriptFor('normal');
    const long = scriptFor('long');

    expect(short.step.at).toBeLessThan(normal.step.at);
    expect(normal.step.at).toBeLessThan(long.step.at);
    expect(short.totalMs).toBeLessThan(long.totalMs);
  });

  it('lässt den gemeinsamen Hit-Stop in jedem Preset gleich hart sitzen', () => {
    /* Er ist die Signatur — Tempo darf alles skalieren, nur ihn nicht (CLAUDE.md). */
    const stops = PACE_PRESETS.map((pace) => scriptFor(pace).step.hitStopMs);
    expect(new Set(stops).size).toBe(1);
  });
});
