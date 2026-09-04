/**
 * i18n (CLAUDE.md: kein hardcodierter UI-String).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { detectLocale, flatKeys, getLocale, LOCALES, plural, setLocale, t, tList } from '@/core/i18n';

afterEach(() => {
  setLocale('de');
});

describe('Sprachen', () => {
  it('kennt DE und EN', () => {
    expect([...LOCALES]).toEqual(['de', 'en']);
  });

  it('startet auf Deutsch und laesst sich umschalten', () => {
    expect(getLocale()).toBe('de');
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('erkennt die Browsersprache, faellt sonst auf DE zurueck', () => {
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('de-AT')).toBe('de');
    expect(detectLocale('fr-FR')).toBe('de');
    expect(detectLocale()).toBe(detectLocale(globalThis.navigator?.language));
  });
});

describe('t()', () => {
  it('loest Punkt-Notation auf', () => {
    expect(t('app.title')).toBe('Der Tresor');
    setLocale('en');
    expect(t('app.title')).toBe('The Vault');
  });

  it('interpoliert Parameter', () => {
    expect(t('pass.headline', { name: 'Anna' })).toBe('Handy an Anna.');
  });

  it('laesst unbekannte Platzhalter stehen', () => {
    expect(t('pass.headline')).toBe('Handy an {name}.');
  });

  it('faellt von EN auf DE zurueck', () => {
    setLocale('en');
    expect(t('app.title')).not.toContain('[missing');
  });

  it('markiert fehlende Keys', () => {
    expect(t('gibt.es.nicht')).toBe('[missing:gibt.es.nicht]');
    expect(t('app')).toBe('[missing:app]');
  });
});

describe('plural()', () => {
  it('waehlt Singular und Plural', () => {
    expect(plural('common.sipsCount', 1)).toBe('1 Schluck');
    expect(plural('common.sipsCount', 3)).toBe('3 Schlücke');
    expect(plural('common.sipsCount', 0)).toBe('0 Schlücke');
    expect(plural('common.sipsCount', -1)).toBe('-1 Schluck');
  });
});

describe('Kassels Listen (Roadmap M4.5/M5.2)', () => {
  /*
   * Die Saetze zu jedem Ausgang liegen als Arrays vor, damit sich Kassel ueber einen
   * Abend nicht wiederholt. Ein Array, das in einer Sprache fehlt, faellt sonst erst
   * auf der Buehne auf — als stumme Sprechblase.
   */
  const LIST_KEYS = [
    'kassel.negotiation',
    'kassel.negotiationLate',
    'kassel.perjury',
    'kassel.allShare',
    'kassel.soloSteal',
    'kassel.multiSteal',
    'kassel.allSteal',
    'kassel.jackpot',
  ] as const;

  for (const locale of LOCALES) {
    it(`${locale}: hat zu jedem Ausgang mindestens zwei Saetze`, () => {
      setLocale(locale);
      for (const key of LIST_KEYS) {
        const lines = tList(key);
        expect(lines.length, key).toBeGreaterThanOrEqual(2);
        expect(lines.every((line) => line.trim().length > 0), key).toBe(true);
      }
      setLocale('de');
    });
  }
});

describe('tList()', () => {
  it('liefert Kassels Sprueche als Liste (Art Direction §9)', () => {
    const lines = tList('kassel.negotiation');
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines).toContain('Die Karten, bitte.');
  });

  it('gibt fuer Nicht-Listen ein leeres Array zurueck', () => {
    expect(tList('app.title')).toEqual([]);
    expect(tList('gibt.es.nicht')).toEqual([]);
  });

  it('interpoliert auch in Listen', () => {
    setLocale('en');
    expect(tList('kassel.negotiation')).toContain('Cards, please.');
  });
});

describe('flatKeys()', () => {
  it('listet Keys sortiert und behandelt Listen als Blatt', () => {
    const keys = flatKeys('de');
    expect(keys).toContain('kassel.negotiation');
    expect(keys).toContain('app.title');
    expect([...keys].sort()).toEqual(keys);
  });
});
