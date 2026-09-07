/**
 * Die Config ist die einzige Balancing-Quelle (CLAUDE.md). Dieser Test haelt sie an den
 * GDD-Werten fest — und `theme.ts` an `tokens.css`, damit Buehne und Menue nie
 * auseinanderlaufen.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COLLISION_SIPS_PER_PERSON,
  DEFAULT_MODES,
  DEFAULT_SETTINGS,
  DESERTER_SIP_FACTOR,
  GAME_MODES,
  GIVING_SAFE,
  GIVING_SAFE_DEATH_ZONE,
  MAX_PLAYERS,
  MAX_WEIGHT,
  MIN_PLAYERS,
  MIN_WEIGHT,
  NEGOTIATION_PRESETS,
  PLANK_THIEF_BONUS,
  ROPE_FEE_SIPS,
  ROPE_USES_PER_SESSION,
  ROTTEN_SIPS,
  THINK_TIMER_PRESETS,
  initialPlankCount,
  minPlankCount,
} from '@/config/rules';
import { LAYOUT, PLAYER_COLORS, UI_COLORS, colorById, plankHeightFor, textColorOn } from '@/config/theme';
import { CREAK_AMPLITUDE, MAX_STEP_MS, PACE_TIMINGS } from '@/config/choreo';
import { ALL_SEQUENCE_IDS, FALL_SEQUENCES, MISC_SEQUENCES, OVERLAY_SEQUENCES, SAFE_SEQUENCES, fallCandidates } from '@/config/sequences';

describe('rules.ts traegt die GDD-Werte', () => {
  it('3 bis 8 Spieler (GDD §3.1)', () => {
    expect(MIN_PLAYERS).toBe(3);
    expect(MAX_PLAYERS).toBe(8);
  });

  it('B_0 = n + 2 und B_min = n - 1 (GDD §3.2)', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      expect(initialPlankCount(n)).toBe(n + 2);
      expect(minPlankCount(n)).toBe(n - 1);
    }
  });

  it('Trinkwerte und Verteilen (GDD §3.5)', () => {
    expect(COLLISION_SIPS_PER_PERSON).toBe(1);
    expect(ROTTEN_SIPS).toBe(1);
    expect(ROPE_FEE_SIPS).toBe(1);
    expect(GIVING_SAFE).toBe(1);
    expect(GIVING_SAFE_DEATH_ZONE).toBe(2);
    expect(DESERTER_SIP_FACTOR).toBe(2);
    expect(PLANK_THIEF_BONUS).toBe(2);
  });

  it('kennt die fuenf Modi aus GDD §3.6', () => {
    expect([...GAME_MODES]).toEqual(['flags', 'rotten', 'weights', 'fog', 'rope']);
    expect(Object.values(DEFAULT_MODES).every((on) => on === false)).toBe(true);
    expect(MIN_WEIGHT).toBe(1);
    expect(MAX_WEIGHT).toBe(3);
    expect(ROPE_USES_PER_SESSION).toBe(1);
  });

  it('Timer-Presets wie im GDD (§3.3 / §3.4)', () => {
    expect([...NEGOTIATION_PRESETS]).toEqual([10, 20, 40]);
    expect([...THINK_TIMER_PRESETS]).toEqual([0, 5]);
    expect(DEFAULT_SETTINGS.negotiationSec).toBe(20);
    expect(DEFAULT_SETTINGS.modes).toEqual(DEFAULT_MODES);
  });
});

describe('theme.ts', () => {
  it('hat die acht Spielerfarben aus Drinkshot, jede genau einmal', () => {
    expect(PLAYER_COLORS).toHaveLength(8);
    expect(new Set(PLAYER_COLORS.map((c) => c.hex)).size).toBe(8);
    expect(new Set(PLAYER_COLORS.map((c) => c.symbol)).size).toBe(8);
    expect(colorById('red').nickname).toBe('Rudi');
    expect(() => colorById('taupe' as never)).toThrow();
  });

  it('setzt Text auf Spielerfarben immer auf ink', () => {
    for (const color of PLAYER_COLORS) expect(textColorOn(color.id)).toBe(UI_COLORS.ink);
  });

  it('haelt Balken-Buttons ueber dem Touch-Ziel (CLAUDE.md)', () => {
    expect(LAYOUT.plankMinHeightPx).toBeGreaterThanOrEqual(56);
    expect(LAYOUT.plankMinHeightTightPx).toBeGreaterThanOrEqual(48);

    /* Bis 8 Balken die volle Hoehe, ab 9 (n = 8 plus Reserve) die enge Variante. */
    expect(plankHeightFor(7)).toBe(56);
    expect(plankHeightFor(10)).toBe(48);
    expect(plankHeightFor(10)).toBeGreaterThanOrEqual(48);
  });

  it('ist deckungsgleich mit tokens.css', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const cssVar = (name: string): string => {
      const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
      expect(match, `--${name} fehlt in tokens.css`).not.toBeNull();
      return match![1]!.toLowerCase();
    };
    const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

    const pairs: [string, number][] = [
      ['bg-deep', UI_COLORS.bgDeep],
      ['bg-panel', UI_COLORS.bgPanel],
      ['ink', UI_COLORS.ink],
      ['paper', UI_COLORS.paper],
      ['canyon', UI_COLORS.canyon],
      ['canyon-shade', UI_COLORS.canyonShade],
      ['sky-top', UI_COLORS.skyTop],
      ['sky-horizon', UI_COLORS.skyHorizon],
      ['rock', UI_COLORS.rock],
      ['rock-dark', UI_COLORS.rockDark],
      ['wood', UI_COLORS.wood],
      ['wood-dark', UI_COLORS.woodDark],
      ['wood-rotten', UI_COLORS.woodRotten],
      ['rope', UI_COLORS.rope],
      ['mist', UI_COLORS.mist],
      ['river', UI_COLORS.river],
      ['safe', UI_COLORS.safe],
      ['danger', UI_COLORS.danger],
    ];
    for (const [name, value] of pairs) expect(cssVar(name), name).toBe(hex(value));

    for (const color of PLAYER_COLORS) {
      expect(cssVar(`player-${color.id}`), color.id).toBe(hex(color.hex));
    }
  });
});

describe('choreo.ts', () => {
  it('laesst sichere Balken deutlich leiser knarren, aber knarren (ADR-3)', () => {
    expect(CREAK_AMPLITUDE.safe).toBe(0.7);
    expect(CREAK_AMPLITUDE.collision).toBe(1.0);
    expect(CREAK_AMPLITUDE.safe).toBeLessThan(CREAK_AMPLITUDE.collision);
    expect(CREAK_AMPLITUDE.safe).toBeGreaterThan(0);
    expect(CREAK_AMPLITUDE.rottenStart).toBeLessThan(CREAK_AMPLITUDE.rottenEnd);
  });

  it('skaliert Anlauf und Knarren ueber die Presets, nicht den Hit-Stop', () => {
    expect(PACE_TIMINGS.short.run).toBeLessThan(PACE_TIMINGS.normal.run);
    expect(PACE_TIMINGS.normal.run).toBeLessThan(PACE_TIMINGS.long.run);
    expect(PACE_TIMINGS.short.creak).toBeLessThan(PACE_TIMINGS.long.creak);

    /* Der gemeinsame Hit-Stop ist die Signatur — er ist in jedem Preset gleich hart. */
    const stops = new Set(Object.values(PACE_TIMINGS).map((p) => p.hitStop));
    expect(stops).toEqual(new Set([120]));
  });

  it('deckelt die Show bei 20 Sekunden', () => {
    expect(MAX_STEP_MS).toBe(20_000);
  });
});

describe('sequences.ts', () => {
  it('listet die 14 Inszenierungen aus der DoD (GDD §9.5)', () => {
    expect(FALL_SEQUENCES).toHaveLength(6);
    expect(SAFE_SEQUENCES).toHaveLength(3);
    expect(Object.keys(MISC_SEQUENCES)).toHaveLength(3);
    expect(Object.keys(OVERLAY_SEQUENCES)).toHaveLength(2);
    expect(ALL_SEQUENCE_IDS).toHaveLength(14);
    expect(new Set(ALL_SEQUENCE_IDS).size).toBe(14);
  });

  it('gibt jeder Sequenz ein positives Gewicht', () => {
    for (const meta of [...FALL_SEQUENCES, ...SAFE_SEQUENCES]) {
      expect(meta.weight, meta.id).toBeGreaterThan(0);
    }
  });

  it('haelt fall_domino von Zweiergruppen fern', () => {
    expect(fallCandidates(2).map((s) => s.id)).not.toContain('fall_domino');
    expect(fallCandidates(3).map((s) => s.id)).toContain('fall_domino');
    expect(fallCandidates(8)).toHaveLength(FALL_SEQUENCES.length);
    /* Auch fuer Zweiergruppen bleibt genug Auswahl. */
    expect(fallCandidates(2).length).toBeGreaterThanOrEqual(4);
  });
});
