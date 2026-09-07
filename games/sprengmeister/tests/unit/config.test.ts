/**
 * Konfiguration (Audit A0: "`rules.ts` enthaelt die GDD-Werte").
 *
 * Dieser Test ist die Bruecke zwischen Dokument und Code: Er schreibt die Zahlen aus
 * `docs/01-GDD.md` noch einmal wortwoertlich hin. Wer eine davon aendert, ohne das GDD
 * zu aendern, faellt hier auf — und wer beide aendert, sieht sofort, welche Stellen
 * betroffen sind.
 *
 * Dazu: `theme.ts` und `styles/tokens.css` muessen dieselben Farben nennen, und alle
 * i18n-Keys muessen in beiden Sprachen existieren.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANTICIPATION, ANTICIPATION_TOTAL_MS, EMPTY_SEQUENCE, REPLAY } from '@/config/choreo';
import {
  BIG_BOARD_FROM_PLAYERS,
  COWARD_SIPS,
  DEFAULT_MODES,
  HINT_THRESHOLDS,
  MASTER_BONUS_TOKENS,
  MASTER_BONUS_VICTIMS,
  MAX_PLAYERS,
  MINES_PER_PLAYER,
  MIN_PLAYERS,
  MODE_IDS,
  SIPS_PER_FOREIGN_MINE,
  TOKENS_PER_LAYER,
  TREASURE_TOKENS,
  TWO_CHESTS_TOKENS,
  boardSizeFor,
  cellCount,
  hintForDistance,
} from '@/config/rules';
import { ANIM, PLAYER_COLORS, TEMP_COLORS, TOUCH, UI_COLORS, hex } from '@/config/theme';
import { flatKeys } from '@/core/i18n';

describe('rules.ts traegt die GDD-Werte', () => {
  it('Spielerzahl 3-8 (GDD §3.1)', () => {
    expect(MIN_PLAYERS).toBe(3);
    expect(MAX_PLAYERS).toBe(8);
  });

  it('Feld 5 × 5 bis 5 Spieler, 6 × 6 ab 6 (GDD §3.2)', () => {
    expect(BIG_BOARD_FROM_PLAYERS).toBe(6);
    expect(boardSizeFor(5)).toBe(5);
    expect(boardSizeFor(6)).toBe(6);
    expect(cellCount(5)).toBe(25);
    expect(cellCount(6)).toBe(36);
  });

  it('2 Minen pro Spieler (GDD §3.2)', () => {
    expect(MINES_PER_PLAYER).toBe(2);
  });

  it('bleibt in der spielbaren Zone: nie mehr als zwei Drittel des Feldes vermint (GDD §7)', () => {
    for (let playerCount = MIN_PLAYERS; playerCount <= MAX_PLAYERS; playerCount++) {
      const size = boardSizeFor(playerCount);
      const mines = playerCount * MINES_PER_PLAYER;
      expect(mines / cellCount(size)).toBeLessThan(0.67);
    }
  });

  it('2 Schluecke pro fremder Mine, 1 Token je Leger (GDD §3.4)', () => {
    expect(SIPS_PER_FOREIGN_MINE).toBe(2);
    expect(TOKENS_PER_LAYER).toBe(1);
  });

  it('Kisten-Tokens 4 / 6, bei zwei Kisten die Haelfte (GDD §3.4/§3.6)', () => {
    expect(TREASURE_TOKENS).toEqual({ 5: 4, 6: 6 });
    expect(TWO_CHESTS_TOKENS).toEqual({ 5: 2, 6: 3 });
    expect(TWO_CHESTS_TOKENS[5] * 2).toBe(TREASURE_TOKENS[5]);
    expect(TWO_CHESTS_TOKENS[6] * 2).toBe(TREASURE_TOKENS[6]);
  });

  it('Hinweis-Schwellen 1 und 2 (ADR-3)', () => {
    expect(HINT_THRESHOLDS).toEqual({ hot: 1, warm: 2 });
    expect(hintForDistance(0)).toBe('hot');
    expect(hintForDistance(1)).toBe('hot');
    expect(hintForDistance(2)).toBe('warm');
    expect(hintForDistance(3)).toBe('cold');
    expect(hintForDistance(9)).toBe('cold');
  });

  it('Sprengmeister-Bonus: 2 Opfer → 1 Token, Feigling trinkt 1 (GDD §3.6)', () => {
    expect(MASTER_BONUS_VICTIMS).toBe(2);
    expect(MASTER_BONUS_TOKENS).toBe(1);
    expect(COWARD_SIPS).toBe(1);
  });

  it('kennt genau die fuenf Modi aus dem GDD (§3.6)', () => {
    expect([...MODE_IDS]).toEqual([
      'doubleAgent',
      'nightDigger',
      'twoChests',
      'chainReaction',
      'masterBonus',
    ]);
    // Klassik ist die Abwesenheit aller Modi.
    expect(Object.values(DEFAULT_MODES).every((on) => on === false)).toBe(true);
  });
});

describe('choreo.ts traegt die Timings der Art Direction', () => {
  it('Anticipation: 250 + 3 × 120 + 200 ms ≈ die Jenga-Sekunde (Art Direction §6)', () => {
    expect(ANTICIPATION.walkMs).toBe(250);
    expect(ANTICIPATION.shovelStrokes).toBe(3);
    expect(ANTICIPATION.shovelStrokeMs).toBe(120);
    expect(ANTICIPATION.holdMs).toBe(200);
    expect(ANTICIPATION_TOTAL_MS).toBe(810);
  });

  it('Leer-Sequenz 800 ms, Replay-Welle 40 ms pro Ring (GDD §4.3/§4.4)', () => {
    expect(EMPTY_SEQUENCE.totalMs).toBe(800);
    expect(REPLAY.ringStepMs).toBe(40);
    expect(REPLAY.maxTotalMs).toBe(2000);
  });

  it('ColorRing spaetestens 300 ms nach der Explosion (CLAUDE.md, Design-Prioritaet 2)', () => {
    expect(ANIM.colorRingMaxDelayMs).toBe(300);
  });

  it('Sequenzen bleiben unter 3.5 s, Treasure unter 5 s (Audit A3/A4)', () => {
    expect(ANIM.sequenceMaxMs).toBe(3500);
    expect(ANIM.treasureMaxMs).toBe(5000);
  });
});

describe('theme.ts und tokens.css bleiben synchron', () => {
  const css = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');

  /** Liest `--name: #rrggbb;` aus der CSS-Datei. */
  function cssVar(name: string): string | undefined {
    return new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]?.toLowerCase();
  }

  it('nennt dieselben Spielerfarben', () => {
    for (const color of PLAYER_COLORS) {
      expect(cssVar(`color-${color.id}`)).toBe(hex(color.hex));
    }
  });

  it('nennt dieselben UI- und Feldfarben', () => {
    const pairs: [string, number][] = [
      ['bg-deep', UI_COLORS.bgDeep],
      ['bg-panel', UI_COLORS.bgPanel],
      ['bg-panel-raised', UI_COLORS.bgPanelRaised],
      ['paper', UI_COLORS.paper],
      ['ink', UI_COLORS.ink],
      ['hazard', UI_COLORS.hazard],
      ['hazard-shade', UI_COLORS.hazardShade],
      ['grass', UI_COLORS.grass],
      ['grass-dark', UI_COLORS.grassDark],
      ['plate-top', UI_COLORS.plateTop],
      ['plate-side', UI_COLORS.plateSide],
      ['plate-hole', UI_COLORS.plateHole],
      ['crater', UI_COLORS.crater],
      ['soot', UI_COLORS.soot],
      ['treasure', UI_COLORS.treasure],
      ['smoke', UI_COLORS.smoke],
      ['temp-hot', TEMP_COLORS.hot],
      ['temp-warm', TEMP_COLORS.warm],
      ['temp-cold', TEMP_COLORS.cold],
    ];

    for (const [name, value] of pairs) {
      expect(cssVar(name), `--${name}`).toBe(hex(value));
    }
  });

  it('nennt dieselben Touch-Mindestmasse (GDD §5)', () => {
    expect(TOUCH.minTargetPx).toBe(56);
    expect(TOUCH.minGapPx).toBe(6);
    expect(css).toContain(`--touch-min: ${TOUCH.minTargetPx}px`);
    expect(css).toContain(`--touch-gap: ${TOUCH.minGapPx}px`);
  });

  it('haelt Temperatur- und Spielerfarben durch zwei Formensprachen auseinander', () => {
    /*
     * `temp.hot` ist derselbe Wert wie Spielerfarbe Rot, `temp.cold` wie Tuerkis
     * (Art Direction §2). Das ist Absicht — deshalb sind Temperaturen **Icons auf
     * hellem Kreis** und Spielerfarben **Ringe mit Symbol**. Der Test haelt die
     * Doppelbelegung fest, damit sie beim naechsten Farbwechsel nicht unbemerkt
     * zu einer echten Verwechslung wird.
     */
    expect(TEMP_COLORS.hot).toBe(PLAYER_COLORS[0].hex);
    expect(TEMP_COLORS.cold).toBe(PLAYER_COLORS[7].hex);
  });

  it('gibt jeder Spielerfarbe ein eigenes Symbol (Deuteranopie, Audit A2)', () => {
    expect(new Set(PLAYER_COLORS.map((c) => c.symbol)).size).toBe(PLAYER_COLORS.length);
    expect(PLAYER_COLORS).toHaveLength(MAX_PLAYERS);
  });
});

describe('i18n ist vollstaendig', () => {
  it('kennt in EN genau dieselben Keys wie in DE', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('hat fuer jeden Modus einen Namen und eine Erklaerung', () => {
    const keys = flatKeys('de');
    for (const id of MODE_IDS) {
      expect(keys).toContain(`modes.${id}.name`);
      expect(keys).toContain(`modes.${id}.hint`);
    }
  });

  it('hat fuer jede Hinweis-Stufe ein Label', () => {
    const keys = flatKeys('de');
    for (const hint of ['hot', 'warm', 'cold', 'none']) {
      expect(keys).toContain(`hint.${hint}`);
    }
  });
});
