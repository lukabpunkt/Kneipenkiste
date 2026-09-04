/**
 * i18n (Roadmap M0.7).
 * CLAUDE.md: kein hardcodierter UI-String — also muss `t()` alles koennen, was die
 * Screens brauchen: Punkt-Notation, Interpolation, Plural, Listen, Fallbacks.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { detectLocale, flatKeys, getLocale, plural, setLocale, t, tList } from '@/core/i18n';

afterEach(() => {
  setLocale('de');
});

describe('Sprache waehlen', () => {
  it('setzt Sprache und `lang`-Attribut', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('erkennt die Browsersprache und faellt sonst auf DE zurueck', () => {
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('de-AT')).toBe('de');
    expect(detectLocale('fr-FR')).toBe('de');
    expect(detectLocale()).toBeDefined();
  });
});

describe('t()', () => {
  it('loest Punkt-Notation auf', () => {
    expect(t('lobby.cta')).toBe('Feld verminen');
    expect(t('rules.dig.title')).toBe('Graben');
  });

  it('interpoliert Platzhalter', () => {
    expect(t('dig.turn', { name: 'RUDI' })).toBe('RUDI GRÄBT');
    expect(t('dig.drinks', { name: 'ANNA', count: 2 })).toBe('ANNA TRINKT 2');
  });

  it('laesst unbekannte Platzhalter stehen, statt sie zu leeren', () => {
    // Besser ein sichtbares `{name}` im UI als ein stiller Textausfall.
    expect(t('dig.turn')).toBe('{name} GRÄBT');
  });

  it('faellt von EN auf DE zurueck und markiert fehlende Keys', () => {
    setLocale('en');
    expect(t('lobby.cta')).toBe('Mine the field');
    expect(t('gibtesnicht.wirklich')).toBe('[missing:gibtesnicht.wirklich]');
  });

  it('meldet auch einen Zwischenknoten als fehlend', () => {
    // `rules` ist ein Objekt, kein String — es darf nie als Text im UI landen.
    expect(t('rules')).toBe('[missing:rules]');
    expect(t('rules.dig.title.zuTief')).toBe('[missing:rules.dig.title.zuTief]');
  });
});

describe('plural()', () => {
  it('waehlt Singular und Plural', () => {
    expect(plural('common.sips', 1)).toBe('1 Schluck');
    expect(plural('common.sips', 3)).toBe('3 Schlücke');
    expect(plural('common.sips', 0)).toBe('0 Schlücke');
    expect(plural('common.mines', 1)).toBe('1 Mine');
    expect(plural('common.mines', 2)).toBe('2 Minen');
  });

  it('nimmt zusaetzliche Platzhalter mit', () => {
    setLocale('en');
    expect(plural('common.sips', 2)).toBe('2 sips');
  });
});

describe('tList()', () => {
  it('liefert bei einem Nicht-Listen-Key ein leeres Array statt zu werfen', () => {
    expect(tList('lobby.cta')).toEqual([]);
    expect(tList('gibtesnicht')).toEqual([]);
  });
});

describe('flatKeys()', () => {
  it('liefert alle Keys sortiert und flach', () => {
    const keys = flatKeys('de');
    expect(keys).toContain('rules.dig.title');
    expect(keys).toEqual([...keys].sort());
    expect(keys.length).toBeGreaterThan(50);
  });
});
