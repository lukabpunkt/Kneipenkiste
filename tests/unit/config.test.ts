/**
 * Konfiguration gegen die Planungsdokumente (Audit A0).
 *
 * Wenn jemand eine Balancing-Zahl aendert, ohne das GDD anzufassen, faellt es hier auf.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  fixedShowMs,
  LAST_CARD_FACTOR,
  MAX_SHOW_MS,
  NO_REPEAT_WINDOW,
  PACE_HOLD_MS,
  SKIP_FROM_CARD_INDEX,
  STALLS_LAST,
  STALLS_NORMAL,
  stallsFor,
  TEMPO_CURVE,
} from '@/config/choreo';
import {
  BANK_FEE_SIPS,
  DEFAULT_SETTINGS,
  HARDNESS_LEVELS,
  HIGHROLLER,
  MAX_PLAYERS,
  MIN_PLAYERS,
  DEFAULT_MODES,
  MODE_IDS,
  MOLE_PENALTY_DIVISOR,
  NEGOTIATION_SECONDS,
  NIGHT_SHIFT_SILENCE_SEC,
  PERJURY_MULTI_FACTOR,
  PERJURY_SOLO_SIPS,
  REVEAL_PACES,
  THINK_TIMER_OPTIONS,
  hardnessSpec,
} from '@/config/rules';
import {
  ANIM,
  cardScaleFor,
  colorById,
  COLOR_IDS,
  crookHeightFor,
  FACE_IDS,
  hex,
  PARTICLE_BUDGET,
  PLAYER_COLORS,
  STAGE,
  textColorOn,
  UI_COLORS,
} from '@/config/theme';

/* ------------------------------------------------------------------ */
/* Regeln (GDD §3)                                                     */
/* ------------------------------------------------------------------ */

describe('rules.ts gegen GDD §3', () => {
  it('3 bis 8 Spieler (ADR-5)', () => {
    expect(MIN_PLAYERS).toBe(3);
    expect(MAX_PLAYERS).toBe(8);
  });

  it('V_0 3/4/6, Wachstum +2/+2/+3, Deckel 12/16/20', () => {
    expect(HARDNESS_LEVELS.map((h) => [h.id, h.startVault, h.growth, h.cap])).toEqual([
      ['soft', 3, 2, 12],
      ['normal', 4, 2, 16],
      ['hard', 6, 3, 20],
    ]);
  });

  it('Bankgebuehr 1 Schluck (ADR-2)', () => {
    expect(BANK_FEE_SIPS).toBe(1);
  });

  it('Highroller: V_0 6, Wachstum +4, Jackpot bei 24', () => {
    expect(HIGHROLLER).toEqual({ startVault: 6, growth: 4, jackpotAt: 24 });
  });

  it('Meineid: 2 Schluecke solo, doppelt im Duo; Maulwurf halbiert', () => {
    expect(PERJURY_SOLO_SIPS).toBe(2);
    expect(PERJURY_MULTI_FACTOR).toBe(2);
    expect(MOLE_PENALTY_DIVISOR).toBe(2);
  });

  it('Verhandlung 15/30/60 s, Nachtschicht 10 s Stille, Bedenkzeit 0/5 s', () => {
    expect(NEGOTIATION_SECONDS).toEqual([15, 30, 60]);
    expect(NIGHT_SHIFT_SILENCE_SEC).toBe(10);
    expect(THINK_TIMER_OPTIONS).toEqual([0, 5]);
  });

  it('kennt die vier Modi aus GDD §3.7, dazu den Kronzeugen aus dem Backlog', () => {
    // Reihenfolge ist die der Lobby — die vier aus dem GDD zuerst, Nachzuegler hinten.
    expect([...MODE_IDS]).toEqual(['oath', 'mole', 'nightShift', 'highroller', 'witness']);
    // Jeder Modus ist aus: Klassik ist der Default (GDD §3.7).
    for (const id of MODE_IDS) expect(DEFAULT_MODES[id]).toBe(false);
  });

  it('Default: Klassik, normal, 30 s, normale Show, keine Bedenkzeit', () => {
    expect(DEFAULT_SETTINGS.hardness).toBe('normal');
    expect(DEFAULT_SETTINGS.negotiationSec).toBe(30);
    expect(DEFAULT_SETTINGS.revealPace).toBe('normal');
    expect(DEFAULT_SETTINGS.thinkTimerSec).toBe(0);
    expect(Object.values(DEFAULT_SETTINGS.modes).every((on) => !on)).toBe(true);
  });

  it('kennt nur die drei Haerten', () => {
    expect(() => hardnessSpec('brutal' as never)).toThrow(/Unbekannte Haerte/);
  });
});

/* ------------------------------------------------------------------ */
/* Choreografie (GDD §4.3, Art Direction §7)                           */
/* ------------------------------------------------------------------ */

describe('choreo.ts gegen GDD §4.3', () => {
  it('Preset-Verweildauern 1.8 / 2.8 / 3.8 s', () => {
    expect(PACE_HOLD_MS).toEqual({ short: 1800, normal: 2800, long: 3800 });
    expect([...REVEAL_PACES]).toEqual(['short', 'normal', 'long']);
  });

  it('Tempo-Kurve 100 % → 70 %, letzte Karte 160 %', () => {
    expect(TEMPO_CURVE).toEqual({ startFactor: 1.0, endFactor: 0.7 });
    expect(LAST_CARD_FACTOR).toBe(1.6);
  });

  it('Stalls [0.6] bzw. [0.6, 0.85]', () => {
    expect(STALLS_NORMAL).toEqual([0.6]);
    expect(STALLS_LAST).toEqual([0.6, 0.85]);
    expect(stallsFor(false)).toEqual(STALLS_NORMAL);
    expect(stallsFor(true)).toEqual(STALLS_LAST);
  });

  it('40-s-Deckel', () => {
    expect(MAX_SHOW_MS).toBe(40_000);
  });

  it('Tap-to-Skip ab der zweiten Karte', () => {
    expect(SKIP_FROM_CARD_INDEX).toBe(1);
  });

  it('No-Repeat-Fenster 3 pro Outcome-Typ', () => {
    expect(NO_REPEAT_WINDOW).toBe(3);
  });

  it('feste Kosten lassen genug Luft fuer die Karten', () => {
    expect(fixedShowMs(true)).toBeGreaterThan(fixedShowMs(false));
    expect(fixedShowMs(true)).toBeLessThan(MAX_SHOW_MS / 2);
  });
});

/* ------------------------------------------------------------------ */
/* Theme (Art Direction §2, §5, §6, §8)                                */
/* ------------------------------------------------------------------ */

describe('theme.ts gegen Art Direction', () => {
  it('hat die acht Spielerfarben in fester Reihenfolge mit ihren Symbolen', () => {
    expect(PLAYER_COLORS.map((c) => c.id)).toEqual([
      'red',
      'blue',
      'green',
      'yellow',
      'purple',
      'orange',
      'pink',
      'cyan',
    ]);
    expect(PLAYER_COLORS.map((c) => c.symbol)).toEqual([
      'circle',
      'triangle',
      'square',
      'star',
      'diamond',
      'heart',
      'bolt',
      'cross',
    ]);
  });

  it('nutzt dieselben Hex-Werte wie Drinkshot (GDD §3.1)', () => {
    expect(hex(colorById('red').hex)).toBe('#ff4757');
    expect(hex(colorById('blue').hex)).toBe('#3b82f6');
    expect(hex(colorById('green').hex)).toBe('#2ed573');
    expect(hex(colorById('yellow').hex)).toBe('#ffd32a');
    expect(hex(colorById('orange').hex)).toBe('#ff7f50');
    expect(hex(colorById('pink').hex)).toBe('#ff6b9d');
    expect(hex(colorById('cyan').hex)).toBe('#18dcff');
    // ADR-8: Lila folgt Drinkshot, nicht dem Hex im Tresor-GDD.
    expect(hex(colorById('purple').hex)).toBe('#af73ee');
  });

  it('kennt keine erfundene Farbe', () => {
    expect(() => colorById('beige' as never)).toThrow(/Unbekannte ColorId/);
  });

  it('setzt dunklen Text auf helle Flaechen', () => {
    for (const id of ['yellow', 'cyan', 'green'] as const) {
      expect(textColorOn(id)).toBe(UI_COLORS.ink);
    }
    for (const id of ['red', 'blue', 'purple', 'orange', 'pink'] as const) {
      expect(textColorOn(id)).toBe(UI_COLORS.paper);
    }
  });

  it('hat die Tresor-Farbtabelle aus Art Direction §2', () => {
    expect(hex(UI_COLORS.bgDeep)).toBe('#0b0a14');
    expect(hex(UI_COLORS.bgPanel)).toBe('#1a1830');
    expect(hex(UI_COLORS.bgPanelRaised)).toBe('#262345');
    expect(hex(UI_COLORS.paper)).toBe('#fff8e7');
    expect(hex(UI_COLORS.ink)).toBe('#1a1024');
    expect(hex(UI_COLORS.gold)).toBe('#ffc93c');
    expect(hex(UI_COLORS.goldShade)).toBe('#c9961a');
    expect(hex(UI_COLORS.steel)).toBe('#8c93a8');
    expect(hex(UI_COLORS.steelDark)).toBe('#4a506a');
    expect(hex(UI_COLORS.velvet)).toBe('#5b1e3a');
    expect(hex(UI_COLORS.velvetLight)).toBe('#7a2a50');
    expect(hex(UI_COLORS.share)).toBe('#2ed573');
    expect(hex(UI_COLORS.shareShade)).toBe('#1e9e52');
    expect(hex(UI_COLORS.steal)).toBe('#ff2d55');
    expect(hex(UI_COLORS.stealShade)).toBe('#b8163a');
    expect(hex(UI_COLORS.laser)).toBe('#18dcff');
    expect(hex(UI_COLORS.spot)).toBe('#fff1c4');
  });

  it('haelt das Partikel-Budget aus Art Direction §8 ein', () => {
    expect(PARTICLE_BUDGET.coinRain.max).toBe(60);
    expect(PARTICLE_BUDGET.confetti.max).toBe(100);
    expect(PARTICLE_BUDGET.vaultSmoke.max).toBe(8);
    expect(PARTICLE_BUDGET.stars.max).toBe(8);
    expect(PARTICLE_BUDGET.sealShards.max).toBe(3);
    expect(PARTICLE_BUDGET.tireSmoke.max).toBe(10);
    expect(PARTICLE_BUDGET.maxActiveSprites).toBe(200);
  });

  it('erlaubt Inszenierungen 2-8 s (Architektur §7)', () => {
    expect(ANIM.outcomeMinMs).toBe(2000);
    expect(ANIM.outcomeMaxMs).toBe(8000);
    expect(ANIM.hitStopMs).toBe(80);
  });

  it('kennt die vier neuen Gesichter des Tresors', () => {
    for (const face of ['smug', 'jaw_drop', 'guilty', 'innocent'] as const) {
      expect(FACE_IDS).toContain(face);
    }
  });

  it('skaliert Crooks und Karten mit der Spielerzahl (Art Direction §6)', () => {
    expect(crookHeightFor(3)).toBe(STAGE.crookHeight.max);
    expect(crookHeightFor(8)).toBe(STAGE.crookHeight.min);
    expect(crookHeightFor(2)).toBe(crookHeightFor(3));
    expect(crookHeightFor(9)).toBe(crookHeightFor(8));

    expect(cardScaleFor(6)).toBe(1);
    expect(cardScaleFor(7)).toBe(0.8);
    expect(cardScaleFor(8)).toBe(0.8);
  });

  it('rechnet in einer logischen 1000er-Welt', () => {
    expect(STAGE.worldSize).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/* theme.ts und tokens.css muessen synchron bleiben                    */
/* ------------------------------------------------------------------ */

describe('tokens.css spiegelt theme.ts', () => {
  // Unter jsdom ist `import.meta.url` keine file-URL — Vitest laeuft im Projekt-Root.
  const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

  const cssVar = (name: string): string | undefined =>
    new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

  const UI_TO_CSS: Record<string, keyof typeof UI_COLORS> = {
    'c-bg-deep': 'bgDeep',
    'c-bg-panel': 'bgPanel',
    'c-bg-panel-raised': 'bgPanelRaised',
    'c-paper': 'paper',
    'c-ink': 'ink',
    'c-gold': 'gold',
    'c-gold-shade': 'goldShade',
    'c-steel': 'steel',
    'c-steel-dark': 'steelDark',
    'c-velvet': 'velvet',
    'c-velvet-light': 'velvetLight',
    'c-share': 'share',
    'c-share-shade': 'shareShade',
    'c-steal': 'steal',
    'c-steal-shade': 'stealShade',
    'c-laser': 'laser',
    'c-spot': 'spot',
  };

  for (const [name, token] of Object.entries(UI_TO_CSS)) {
    it(`--${name} == UI_COLORS.${token}`, () => {
      expect(cssVar(name)).toBe(hex(UI_COLORS[token]));
    });
  }

  for (const id of COLOR_IDS) {
    it(`--c-player-${id} == PLAYER_COLORS.${id}`, () => {
      expect(cssVar(`c-player-${id}`)).toBe(hex(colorById(id).hex));
      expect(cssVar(`c-player-${id}-shade`)).toBe(hex(colorById(id).shade));
    });
  }
});
