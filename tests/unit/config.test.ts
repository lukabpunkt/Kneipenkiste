/**
 * Konfiguration (A0-Audit: `rules.ts` enthaelt die GDD-Werte, Tokens sind synchron).
 *
 * Diese Datei ist die Bruecke zwischen `docs/` und Code: Aendert jemand eine Zahl im
 * Balancing, faellt hier auf, dass das GDD nicht mitgeaendert wurde.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BONUS_ALL_CAUGHT,
  BONUS_GOOD_INSTINCT,
  CAUGHT_SIPS_PER_ITEM,
  DIPLOMAT_SIPS,
  HARASSMENT_SIPS,
  HINT_TRUTH_PROBABILITY,
  HINT_TYPES,
  INTERROGATION_PRESETS,
  ITEM_SETS,
  MAX_AMOUNT,
  MAX_AMOUNT_HIGH_SEASON,
  MAX_BRIBE,
  MAX_HINTS,
  MAX_PLAYERS,
  MIN_AMOUNT,
  MIN_BRIBE,
  MIN_HINTS,
  MIN_PLAYERS,
} from '@/config/rules';
import { XRAY, XRAY_LABELS, GATE, HINTS } from '@/config/choreo';
import { PLAYER_COLORS, UI_COLORS, colorById, textColorOn } from '@/config/theme';

describe('rules.ts enthaelt die GDD-Werte', () => {
  it('Spielerzahl 4–8', () => {
    expect(MIN_PLAYERS).toBe(4);
    expect(MAX_PLAYERS).toBe(8);
  });

  it('Menge 0–6, Hochsaison bis 10', () => {
    expect(MIN_AMOUNT).toBe(0);
    expect(MAX_AMOUNT).toBe(6);
    expect(MAX_AMOUNT_HIGH_SEASON).toBe(10);
  });

  it('p_true = 0.6', () => {
    expect(HINT_TRUTH_PROBABILITY).toBe(0.6);
  });

  it('Trinkwerte 2a / 2 / 3 und Boni +2 / +1', () => {
    expect(CAUGHT_SIPS_PER_ITEM).toBe(2);
    expect(HARASSMENT_SIPS).toBe(2);
    expect(DIPLOMAT_SIPS).toBe(3);
    expect(BONUS_ALL_CAUGHT).toBe(2);
    expect(BONUS_GOOD_INSTINCT).toBe(1);
  });

  it('haelt mehr Hinweis-Typen bereit, als eine Runde braucht', () => {
    /* Nur so kann `pickType` jedem Hinweis einen eigenen Typ geben (GDD §3.3). */
    expect(MAX_HINTS).toBeLessThan(HINT_TYPES.length);
    expect(MIN_HINTS).toBeGreaterThanOrEqual(1);
  });

  it('sechs Hinweis-Typen und acht Item-Sets (ADR-5)', () => {
    expect(HINT_TYPES).toHaveLength(6);
    expect(new Set(HINT_TYPES).size).toBe(6);
    expect(ITEM_SETS).toHaveLength(8);
    expect(new Set(ITEM_SETS).size).toBe(8);
  });

  it('Bestechung 1–3, Verhoer 30/45/90 s', () => {
    expect([MIN_BRIBE, MAX_BRIBE]).toEqual([1, 3]);
    expect(INTERROGATION_PRESETS).toEqual([30, 45, 90]);
  });
});

describe('choreo.ts', () => {
  it('setzt Scan-Dauer 1.2 s mit Stall von 400 ms bei 50 %', () => {
    expect(XRAY.scanDuration).toBe(1.2);
    expect(XRAY.stallAt).toBe(0.5);
    expect(XRAY.stallDuration).toBe(0.4);
  });

  it('haelt die Sequenz-Obergrenzen der Audits ein', () => {
    expect(XRAY.maxSequenceDuration).toBeLessThanOrEqual(5);
    expect(GATE.maxSequenceDuration).toBeLessThanOrEqual(3);
    expect(HINTS.duration).toBeLessThanOrEqual(1.8);
  });

  it('kennt die Labels, auf denen die Sequenz-Tests aufbauen', () => {
    /* "Scanline ist heilig": `revealed` muss spaeter liegen als `scanComplete`. */
    expect(XRAY_LABELS.scanComplete).toBe('scanComplete');
    expect(XRAY_LABELS.revealed).toBe('revealed');
    /* Reaktion vor Konsequenz. */
    expect(Object.keys(XRAY_LABELS)).toContain('face');
    expect(Object.keys(XRAY_LABELS)).toContain('verdict');
  });

  it('inszeniert das Banner erst nach dem Scan', () => {
    expect(XRAY.travelIn + XRAY.powerUp + XRAY.scanDuration + XRAY.stallDuration).toBeLessThan(
      XRAY.maxSequenceDuration
    );
  });
});

describe('theme.ts und tokens.css bleiben synchron', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

  it('haelt acht Spielerfarben mit eigenen Symbolen bereit', () => {
    expect(PLAYER_COLORS).toHaveLength(8);
    expect(new Set(PLAYER_COLORS.map((c) => c.symbol)).size).toBe(8);
    expect(colorById('red').hex).toBe(0xff4757);
    expect(() => colorById('lila' as 'red')).toThrow();
  });

  it('gibt hellen Farben dunklen Text', () => {
    expect(textColorOn('yellow')).toBe(UI_COLORS.ink);
    expect(textColorOn('cyan')).toBe(UI_COLORS.ink);
    expect(textColorOn('red')).toBe(UI_COLORS.paper);
  });

  it('fuehrt jede Spielerfarbe auch im CSS', () => {
    for (const color of PLAYER_COLORS) {
      expect(css).toContain(`--c-player-${color.id}: ${hex(color.hex)}`);
    }
  });

  it('fuehrt die Buehnen- und Ergebnisfarben auch im CSS', () => {
    const pairs: [string, number][] = [
      ['--c-customs', UI_COLORS.customs],
      ['--c-hall-floor', UI_COLORS.hallFloor],
      ['--c-xray-bg', UI_COLORS.xrayBg],
      ['--c-xray-glow', UI_COLORS.xrayGlow],
      ['--c-alarm', UI_COLORS.alarm],
      ['--c-ok', UI_COLORS.ok],
      ['--c-busted', UI_COLORS.busted],
      ['--c-carpet', UI_COLORS.carpet],
    ];
    for (const [token, value] of pairs) {
      expect(css).toContain(`${token}: ${hex(value)}`);
    }
  });

  it('haelt die Koffer-Tippflaeche bei mindestens 56 px (CLAUDE.md)', () => {
    expect(css).toContain('--touch-suitcase: 56px');
  });
});
