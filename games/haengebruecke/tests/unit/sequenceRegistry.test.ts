/**
 * Die Sequenz-Auswahl über viele Runden (Roadmap M4.4, Audit A4).
 *
 * `sequences.test.ts` prüft, dass Katalog und Registry deckungsgleich sind. Hier geht es
 * um das, was der Choreographer daraus **macht**: Kommt jede Sequenz dran? Wiederholt
 * sich keine zu früh? Und landet `fall_domino` nie bei einem Paar?
 *
 * Der Grund ist Abnutzung. Sechs Stürze reichen für einen Abend nur, wenn sie sich
 * verteilen — dreimal hintereinander `fall_hold_hands` fühlt sich an wie eine Sequenz.
 */

import { describe, expect, it } from 'vitest';
import { createSequencePicker } from '@/core/choreographer';
import { FALL_SEQUENCES, SAFE_SEQUENCES, fallCandidates } from '@/config/sequences';
import { SEQUENCE_NO_REPEAT } from '@/config/choreo';
import { resolveRound } from '@/core/round';
import { createSeededRng, type SeededRng } from '@/core/rng';
import { noModes } from '@/core/modes';
import type { Choice, PlayerId, Round } from '@/core/types';

const ROUNDS = 1000;

describe('Auswahl über 1 000 Runden', () => {
  /** Runden, in denen zwei oder drei Leute auf einem Balken landen. */
  function* rounds(rng: SeededRng): Generator<Round> {
    for (let index = 0; index < ROUNDS; index += 1) {
      const groupSize = rng.chance(0.35) ? 3 : 2;
      const playerCount = groupSize + 2;
      const playerIds: PlayerId[] = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
      const plankCount = playerCount + 2;

      const choices: Record<PlayerId, Choice> = {};
      playerIds.forEach((id, i) => {
        choices[id] = { plank: i < groupSize ? 1 : i + 1 };
      });

      yield {
        index,
        seed: rng.int(0xffffffff),
        playerIds,
        modes: noModes(),
        bridge: { count: plankCount, planks: Array.from({ length: plankCount }, (_, i) => i + 1), removed: [] },
        choices,
      };
    }
  }

  it('benutzt jede Fall- und jede Sicher-Sequenz', () => {
    const rng = createSeededRng(0xa11);
    const picker = createSequencePicker(0xb0b);

    const falls = new Set<string>();
    const safes = new Set<string>();

    for (const round of rounds(rng)) {
      const result = resolveRound(round, { rng, picker });
      for (const id of Object.values(result.sequenceIds.fall)) falls.add(id);
      for (const id of Object.values(result.sequenceIds.safe)) safes.add(id);
    }

    /* Alle sechs kommen vor — sonst hätte eine davon niemand je gesehen. */
    for (const meta of FALL_SEQUENCES) expect(falls.has(meta.id), meta.id).toBe(true);
    for (const meta of SAFE_SEQUENCES) expect(safes.has(meta.id), meta.id).toBe(true);
  });

  it('hält den No-Repeat-Abstand ein', () => {
    const picker = createSequencePicker(0xc0de);

    /* Der Abstand ist auf die Kandidatenzahl gedeckelt: Bei drei Sicher-Sequenzen wäre
       ein starres Fenster von drei nicht erfüllbar (siehe `createSequencePicker`). */
    const pairWindow = Math.min(SEQUENCE_NO_REPEAT, fallCandidates(2).length - 1);
    const safeWindow = Math.min(SEQUENCE_NO_REPEAT, SAFE_SEQUENCES.length - 1);

    const pairs: string[] = [];
    const safes: string[] = [];

    for (let i = 0; i < ROUNDS; i += 1) {
      const fall = picker.pickFall(2);
      expect(pairs.slice(-pairWindow), `Runde ${i}: ${fall} zu früh wiederholt`).not.toContain(fall);
      pairs.push(fall);

      const safe = picker.pickSafe();
      expect(safes.slice(-safeWindow), `Runde ${i}: ${safe} zu früh wiederholt`).not.toContain(safe);
      safes.push(safe);
    }
  });

  it('lässt fall_domino nie bei einem Paar zu', () => {
    const picker = createSequencePicker(0xd00);
    for (let i = 0; i < ROUNDS; i += 1) {
      expect(picker.pickFall(2)).not.toBe('fall_domino');
    }
    expect(fallCandidates(2).map((meta) => meta.id)).not.toContain('fall_domino');
    expect(fallCandidates(3).map((meta) => meta.id)).toContain('fall_domino');
  });

  it('verteilt nach Gewicht, nicht gleichmäßig', () => {
    const picker = createSequencePicker(0xe11);
    const counts = new Map<string, number>();

    for (let i = 0; i < ROUNDS * 5; i += 1) {
      const id = picker.pickFall(3);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    /*
     * `fall_hold_hands` und `fall_domino` haben Gewicht 3, der Rest 2 — das Bild mit den
     * Händchenhaltenden ist das, das das Spiel verkauft (GDD §1), und soll häufiger kommen.
     */
    const holdHands = counts.get('fall_hold_hands') ?? 0;
    const ropeSwing = counts.get('fall_rope_swing') ?? 0;
    expect(holdHands).toBeGreaterThan(ropeSwing);

    /* Aber niemand fällt aus: Auch die leichteste Sequenz kommt regelmässig dran. */
    for (const meta of FALL_SEQUENCES) {
      expect(counts.get(meta.id) ?? 0, meta.id).toBeGreaterThan(ROUNDS / 2);
    }
  });

  it('ist bei gleichem Seed reproduzierbar', () => {
    const a = createSequencePicker(4711);
    const b = createSequencePicker(4711);
    for (let i = 0; i < 200; i += 1) {
      expect(a.pickFall(i % 2 === 0 ? 2 : 3)).toBe(b.pickFall(i % 2 === 0 ? 2 : 3));
      expect(a.pickSafe()).toBe(b.pickSafe());
    }
  });
});

describe('Der Katalog', () => {
  it('gibt jeder Fall-Sequenz ein Gewicht und die richtige Mindestgruppe', () => {
    for (const meta of FALL_SEQUENCES) {
      expect(meta.weight, meta.id).toBeGreaterThan(0);
      expect(meta.kind).toBe('fall');
      if (meta.id === 'fall_domino') expect(meta.minGroup).toBe(3);
      else expect(meta.minGroup).toBeUndefined();
    }
  });

  it('lässt auch für Paare genug Auswahl übrig', () => {
    /* Fünf Kandidaten bei einem No-Repeat-Fenster von drei — es bleibt immer etwas übrig. */
    expect(fallCandidates(2).length).toBeGreaterThan(SEQUENCE_NO_REPEAT);
  });
});
