/**
 * i18n (Standing Audit: kein hardcodierter UI-Text; DE und EN vollstaendig).
 */

import { describe, expect, it } from 'vitest';
import { detectLocale, flatKeys, getLocale, plural, setLocale, t, tList } from '@/core/i18n';

describe('Wörterbücher', () => {
  it('hat in EN dieselben Keys wie in DE', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('enthaelt keinen leeren Wert', () => {
    setLocale('de');
    for (const key of flatKeys('de')) {
      if (key === 'questions') continue;
      expect(t(key).length).toBeGreaterThan(0);
    }
  });
});

describe('t()', () => {
  it('loest Punkt-Notation auf und interpoliert', () => {
    setLocale('de');
    expect(t('app.title')).toBe('Der Zoll');
    expect(t('officerIntro.headline', { name: 'Rudi' })).toBe('Rudi ist Zollbeamter.');
  });

  it('laesst unbekannte Platzhalter stehen', () => {
    expect(t('officerIntro.headline', { falsch: 'x' })).toContain('{name}');
  });

  it('meldet fehlende Keys als `[missing:…]`', () => {
    expect(t('gibt.es.nicht')).toBe('[missing:gibt.es.nicht]');
    /* Ein Zweig, der auf ein Objekt zeigt, ist auch kein Text. */
    expect(t('app')).toBe('[missing:app]');
  });

  it('faellt von EN auf DE zurueck', () => {
    setLocale('en');
    expect(t('app.title')).toBe('Customs');
    setLocale('de');
  });
});

describe('plural()', () => {
  it('waehlt Ein- und Mehrzahl', () => {
    setLocale('de');
    expect(plural('common.sips', 1)).toBe('Schluck');
    expect(plural('common.sips', 3)).toBe('Schlücke');
    expect(plural('common.sips', 0)).toBe('Schlücke');
  });
});

describe('tList()', () => {
  it('liefert die Fragevorschlaege des Beamten', () => {
    setLocale('de');
    const questions = tList('questions');
    expect(questions.length).toBeGreaterThanOrEqual(6);
    expect(questions[0]).toBe('Hast du etwas zu verzollen?');
  });

  it('liefert bei fehlendem oder falschem Key eine leere Liste', () => {
    expect(tList('gibt.es.nicht')).toEqual([]);
    expect(tList('app.title')).toEqual([]);
    expect(tList('app.title.zu.tief')).toEqual([]);
  });
});

describe('Locale', () => {
  it('erkennt die Browser-Sprache und faellt sonst auf DE', () => {
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('de-CH')).toBe('de');
    expect(detectLocale('fr-FR')).toBe('de');
  });

  it('merkt sich die gesetzte Sprache', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    setLocale('de');
    expect(getLocale()).toBe('de');
  });
});
