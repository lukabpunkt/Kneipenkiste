/**
 * Zugänglichkeit und Polish (Audit A5).
 *
 * Was hier geprüft wird, lässt sich ohne Browser prüfen und trägt trotzdem: Kontrast,
 * Vollständigkeit der Übersetzungen, das Verhalten bei „Bewegung reduzieren" und die
 * Frage, ob jede Modus-Kombination überhaupt spielbar ist.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { GAME_MODES, MAX_PLAYERS, MIN_PLAYERS } from '@/config/rules';
import { COLOR_IDS, UI_COLORS, textColorOn } from '@/config/theme';
import { flatKeys, setLocale, t, tList } from '@/core/i18n';
import { isValidAmount, maxAmount, maxOpenings, modeFlags } from '@/core/modes';
import { forceReducedMotion, prefersReducedMotion } from '@/ui/motion';
import { canShare } from '@/ui/share';
import { resetCoachmarks, showCoachmark, wasSeen } from '@/ui/components/coachmark';

/* ------------------------------------------------------------------ */
/* Kontrast                                                            */
/* ------------------------------------------------------------------ */

function luminance(value: number): number {
  const channels = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: number, b: number): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe('Kontrast (Audit A5: ≥ 4.5:1)', () => {
  it('setzt auf jede Spielerfarbe lesbaren Text', () => {
    for (const id of COLOR_IDS) {
      const color = Number(
        readFileSync('src/config/theme.ts', 'utf8').match(
          new RegExp(`id: '${id}', hex: (0x[0-9a-f]{6})`)
        )![1]
      );
      expect(contrast(textColorOn(id), color), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('hält den Text auf der hellen Halle lesbar', () => {
    /* Die Halle ist die einzige helle Bühne — hier fällt heller Text zuerst auf. */
    expect(contrast(UI_COLORS.ink, UI_COLORS.hallWall)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(UI_COLORS.ink, UI_COLORS.hallFloor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(UI_COLORS.ink, UI_COLORS.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('hält den Röntgenmonitor lesbar', () => {
    expect(contrast(UI_COLORS.xrayGlow, UI_COLORS.xrayBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('hält die Menüs lesbar', () => {
    expect(contrast(UI_COLORS.paper, UI_COLORS.bgDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(UI_COLORS.paper, UI_COLORS.bgPanel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(UI_COLORS.ink, UI_COLORS.customs)).toBeGreaterThanOrEqual(4.5);
  });
});

/* ------------------------------------------------------------------ */
/* Übersetzungen                                                       */
/* ------------------------------------------------------------------ */

describe('EN ist vollständig (Audit A5)', () => {
  it('hat dieselben Keys wie DE', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('hat keinen deutschen Text im englischen Wörterbuch stehen lassen', () => {
    setLocale('en');
    /* Ein paar Wörter, die in einer englischen Übersetzung nichts zu suchen haben. */
    const german = /\b(Koffer|Beamter|Schluck|Schlücke|Reisende|erwischt|Hinweis)\b/;
    const offenders: string[] = [];

    for (const key of flatKeys('en')) {
      const value = t(key);
      if (german.test(value)) offenders.push(`${key}: ${value}`);
    }

    setLocale('de');
    expect(offenders).toEqual([]);
  });

  it('meldet keinen fehlenden Key in beiden Sprachen', () => {
    for (const locale of ['de', 'en'] as const) {
      setLocale(locale);
      for (const key of flatKeys(locale)) {
        /* Listen liest `tList()`; `t()` gibt für sie berechtigterweise nichts zurück. */
        if (tList(key).length > 0) continue;
        expect(t(key), `${locale}/${key}`).not.toContain('[missing:');
      }
    }
    setLocale('de');
  });

  it('hat in beiden Sprachen gleich viele Fragevorschläge', () => {
    setLocale('de');
    const de = tList('questions').length;
    setLocale('en');
    const en = tList('questions').length;
    setLocale('de');

    expect(de).toBeGreaterThanOrEqual(6);
    expect(en).toBe(de);
  });
});

/* ------------------------------------------------------------------ */
/* Modus-Kombinationen                                                 */
/* ------------------------------------------------------------------ */

describe('Alle Modus-Kombinationen sind spielbar (Audit A5)', () => {
  /** Alle 16 Kombinationen der vier Modi. */
  function allCombinations(): Record<string, boolean>[] {
    const out: Record<string, boolean>[] = [];
    for (let mask = 0; mask < 1 << GAME_MODES.length; mask++) {
      const flags: Record<string, boolean> = {};
      GAME_MODES.forEach((mode, i) => {
        flags[mode] = (mask & (1 << i)) !== 0;
      });
      out.push(flags);
    }
    return out;
  }

  it('lässt in jeder Kombination mindestens eine Öffnung zu', () => {
    for (const combo of allCombinations()) {
      for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
        const k = maxOpenings(players, modeFlags(combo));
        expect(k, `${players} Spieler, ${JSON.stringify(combo)}`).toBeGreaterThanOrEqual(1);
        /* Und nie mehr Öffnungen als Reisende. */
        expect(k).toBeLessThanOrEqual(players - 1);
      }
    }
  });

  it('lässt in jeder Kombination gültige Mengen zu', () => {
    for (const combo of allCombinations()) {
      const flags = modeFlags(combo);
      const max = maxAmount(flags);
      expect(max).toBeGreaterThanOrEqual(6);
      expect(isValidAmount(0, flags)).toBe(true);
      expect(isValidAmount(max, flags)).toBe(true);
      expect(isValidAmount(max + 1, flags)).toBe(false);
    }
  });

  it('hebt Spürhund und Hochsaison ab fünf Spielern gegenseitig auf', () => {
    /* Die Kombination, die das Audit ausdrücklich nennt. */
    for (let players = 5; players <= MAX_PLAYERS; players++) {
      expect(maxOpenings(players, modeFlags({ sniffer: true, highSeason: true })), `${players}`).toBe(
        maxOpenings(players, modeFlags())
      );
    }
  });

  it('lässt bei vier Spielern die Hochsaison gewinnen', () => {
    /*
     * Der Randfall: Bei vier Spielern ist k = 1, und der Spürhund kann nichts abziehen,
     * ohne die letzte Öffnung zu nehmen (`max(1, k-1)`). Hochsaison legt trotzdem eine
     * drauf — der Beamte bekommt also den verlässlichen Hinweis **und** zwei Öffnungen.
     *
     * Das ist keine Panne, sondern die Folge zweier Regeln, die einzeln richtig sind:
     * Die Untergrenze von einer Öffnung ist wichtiger als die Symmetrie der Modi.
     */
    expect(maxOpenings(4, modeFlags({ sniffer: true }))).toBe(1);
    expect(maxOpenings(4, modeFlags({ sniffer: true, highSeason: true }))).toBe(2);
  });

  it('erklärt jeden Modus in einem Satz', () => {
    setLocale('de');
    for (const mode of GAME_MODES) {
      expect(t(`modes.${mode}.name`).length).toBeGreaterThan(2);
      expect(t(`modes.${mode}.hint`).length).toBeGreaterThan(20);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Bewegung reduzieren                                                 */
/* ------------------------------------------------------------------ */

describe('Bewegung reduzieren', () => {
  afterEach(() => forceReducedMotion(undefined));

  it('lässt sich erzwingen und wieder freigeben', () => {
    forceReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    forceReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('fällt ohne matchMedia auf "nicht reduziert" zurück', () => {
    /* jsdom hat matchMedia nicht — und dann darf nichts wegfallen. */
    expect(prefersReducedMotion()).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

describe('Onboarding-Hinweise', () => {
  beforeEach(() => resetCoachmarks());

  it('zeigt jeden Hinweis genau einmal pro Gerät', () => {
    const host = document.createElement('div');

    expect(wasSeen('pack')).toBe(false);
    showCoachmark(host, 'pack', 'Erster Hinweis');
    expect(host.querySelectorAll('.coachmark')).toHaveLength(1);
    expect(wasSeen('pack')).toBe(true);

    showCoachmark(host, 'pack', 'Zweiter Versuch');
    expect(host.querySelectorAll('.coachmark')).toHaveLength(1);
  });

  it('hält die beiden Hinweise auseinander', () => {
    const host = document.createElement('div');
    showCoachmark(host, 'pack', 'A');
    showCoachmark(host, 'hall', 'B');
    expect(host.querySelectorAll('.coachmark')).toHaveLength(2);
  });

  it('kündigt sich als Beobachtung an, nicht als Aufforderung', () => {
    const host = document.createElement('div');
    showCoachmark(host, 'hall', 'Hinweise stimmen nur meistens.');
    expect(host.querySelector('.coachmark')?.getAttribute('role')).toBe('status');
  });
});

/* ------------------------------------------------------------------ */
/* Teilen                                                              */
/* ------------------------------------------------------------------ */

describe('Teilen', () => {
  it('meldet ohne Web Share API, dass es nicht geht', () => {
    /* In jsdom gibt es `navigator.share` nicht — der Knopf darf dann nicht erscheinen. */
    expect(canShare()).toBe(false);
  });
});
