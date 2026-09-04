/**
 * Sequenzen und Registry (Audit A3).
 *
 * Die Sequenzen selbst bauen GSAP-Timelines auf PIXI-Objekten — die brauchen einen
 * Renderer und laufen deshalb erst im E2E. Hier wird geprüft, was ohne Renderer prüfbar
 * ist und trotzdem trägt: dass alle Sequenzen registriert sind, dass die Auswahl nicht
 * wiederholt, und dass die Dauern die Obergrenzen der Audits einhalten.
 */

import { describe, expect, it } from 'vitest';
import { GATE, HINTS, XRAY } from '@/config/choreo';
import { HINT_TYPES } from '@/config/rules';
import { createSeededRng } from '@/core/rng';
import { NO_REPEAT_WINDOW, SequenceRegistry, type Sequence } from '@/game/sequences/Sequence';
import { HINT_SEQUENCES, hintSequenceFor } from '@/game/sequences/hints';
import { GATE_SEQUENCES } from '@/game/sequences/gate';

/** Eine Sequenz ohne Inszenierung — die Registry interessiert nur die Metadaten. */
function stub(id: string, kind: Sequence['kind'], weight = 1): Sequence {
  return { id, kind, weight, build: () => ({}) as gsap.core.Timeline };
}

describe('Registrierte Sequenzen', () => {
  it('hat für jeden Hinweis-Typ genau eine Sequenz', () => {
    expect(HINT_SEQUENCES).toHaveLength(HINT_TYPES.length);
    for (const type of HINT_TYPES) {
      expect(hintSequenceFor(type).id).toBe(`hint_${type}`);
    }
  });

  it('wirft bei einem unbekannten Hinweis-Typ', () => {
    expect(() => hintSequenceFor('gibt-es-nicht' as 'wobble')).toThrow();
  });

  it('hat vier Schranken-Sequenzen: zwei saubere, zwei Schmuggler', () => {
    expect(GATE_SEQUENCES).toHaveLength(4);
    expect(GATE_SEQUENCES.filter((s) => s.kind === 'gateClean')).toHaveLength(2);
    expect(GATE_SEQUENCES.filter((s) => s.kind === 'gateSmuggler')).toHaveLength(2);
  });

  it('vergibt jede ID nur einmal', () => {
    const ids = [...HINT_SEQUENCES, ...GATE_SEQUENCES].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gibt jeder Sequenz ein Gewicht > 0', () => {
    for (const sequence of [...HINT_SEQUENCES, ...GATE_SEQUENCES]) {
      expect(sequence.weight).toBeGreaterThan(0);
    }
  });
});

describe('SequenceRegistry', () => {
  it('weist doppelte IDs und ungültige Gewichte ab', () => {
    const registry = new SequenceRegistry().register(stub('a', 'gateClean'));
    expect(() => registry.register(stub('a', 'gateClean'))).toThrow(/doppelt/);
    expect(() => registry.register(stub('b', 'gateClean', 0))).toThrow(RangeError);
  });

  it('wirft, wenn eine Kategorie leer ist', () => {
    const registry = new SequenceRegistry();
    expect(() => registry.pick('gateClean', createSeededRng(1))).toThrow(/Keine Sequenz/);
  });

  it('wiederholt sich nicht, solange es Alternativen gibt', () => {
    /*
     * Vier Kandidaten, Sperrfenster 3: Die nächsten drei Züge müssen andere sein.
     * Genau das ist der Punkt — ein Gag, den man zweimal hintereinander sieht, ist keiner.
     */
    const registry = new SequenceRegistry().register(
      stub('a', 'gateClean'),
      stub('b', 'gateClean'),
      stub('c', 'gateClean'),
      stub('d', 'gateClean')
    );
    const rng = createSeededRng(42);

    const picks = Array.from({ length: 4 }, () => registry.pick('gateClean', rng).id);
    expect(new Set(picks).size).toBe(4);
  });

  it('nimmt lieber eine Wiederholung als gar nichts', () => {
    /* Zwei Kandidaten, Sperrfenster 3: Ab dem dritten Zug ist alles gesperrt. */
    const registry = new SequenceRegistry().register(
      stub('a', 'gateSmuggler'),
      stub('b', 'gateSmuggler')
    );
    const rng = createSeededRng(7);

    const picks = Array.from({ length: 10 }, () => registry.pick('gateSmuggler', rng).id);
    expect(picks).toHaveLength(10);
    expect(picks.every((id) => id === 'a' || id === 'b')).toBe(true);
    /* Die ersten beiden sind trotzdem verschieden. */
    expect(picks[0]).not.toBe(picks[1]);
  });

  it('merkt sich höchstens `NO_REPEAT_WINDOW` Einträge', () => {
    const registry = new SequenceRegistry().register(
      ...['a', 'b', 'c', 'd', 'e'].map((id) => stub(id, 'xrayCaught'))
    );
    const rng = createSeededRng(3);

    for (let i = 0; i < 10; i++) registry.pick('xrayCaught', rng);
    expect(registry.recentOf('xrayCaught').length).toBeLessThanOrEqual(NO_REPEAT_WINDOW);
  });

  it('folgt den Gewichten', () => {
    /* Nur ein Kandidat je Zug wäre trivial — deshalb ohne Sperre messen. */
    const registry = new SequenceRegistry().register(
      stub('leicht', 'hint', 1),
      stub('schwer', 'hint', 9)
    );
    const rng = createSeededRng(11);

    let heavy = 0;
    for (let i = 0; i < 2000; i++) {
      registry.clearHistory();
      if (registry.pick('hint', rng).id === 'schwer') heavy += 1;
    }
    expect(heavy / 2000).toBeGreaterThan(0.85);
  });

  it('findet Sequenzen über ihre ID und listet sie auf', () => {
    const registry = new SequenceRegistry().register(stub('a', 'hint'), stub('b', 'gateClean'));
    expect(registry.get('a')?.kind).toBe('hint');
    expect(registry.get('gibt-es-nicht')).toBeUndefined();
    expect(registry.ids().sort()).toEqual(['a', 'b']);
    expect(registry.all('hint')).toHaveLength(1);
    expect(registry.all('xrayOverlay')).toHaveLength(0);
  });
});

describe('Sequenz-Dauern (Audits A3/A4)', () => {
  it('hält Hinweise unter 1.8 s', () => {
    expect(HINTS.duration).toBeLessThanOrEqual(1.8);
  });

  it('hält eine Schranken-Sequenz unter 3 s', () => {
    /* Anlauf + Stall + Reveal + Stempel — die längste Variante ist die mit Schmuggler. */
    const longest = GATE.walkUp + GATE.smugglerStall + GATE.stamp + GATE.gap;
    expect(longest).toBeLessThanOrEqual(GATE.maxSequenceDuration);
  });

  it('hält eine Röntgen-Sequenz unter 5 s', () => {
    const total =
      XRAY.travelIn + XRAY.powerUp + XRAY.scanDuration + XRAY.stallDuration + XRAY.faceReaction + XRAY.verdict;
    expect(total).toBeLessThanOrEqual(XRAY.maxSequenceDuration);
  });

  it('gibt dem Schmuggler-Stall die 600 ms aus dem GDD', () => {
    expect(GATE.smugglerStall).toBeCloseTo(0.6, 3);
  });
});
