import { describe, expect, it, beforeEach } from 'vitest';
import { detectLocale, flatKeys, getLocale, LOCALES, plural, setLocale, t, tList } from '@/core/i18n';

beforeEach(() => setLocale('de'));

describe('Vollstaendigkeit', () => {
  it('DE und EN haben exakt dieselben Keys', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('kein Wert ist leer', () => {
    for (const locale of LOCALES) {
      setLocale(locale);
      for (const key of flatKeys(locale)) {
        /* Listen-Keys (Geier-Kommentare) liest `tList`, nicht `t`. */
        const list = tList(key);
        if (list.length > 0) {
          for (const entry of list) expect(entry.length, `${locale}: ${key}`).toBeGreaterThan(0);
          continue;
        }
        const value = t(key);
        expect(value.length, `${locale}: ${key}`).toBeGreaterThan(0);
        expect(value, `${locale}: ${key}`).not.toContain('[missing:');
      }
    }
  });

  it('kennt die sechs Banner aus GDD §3.7', () => {
    for (const banner of ['allSafe', 'crash', 'massCollision', 'deathZone', 'desertion', 'badLuck']) {
      expect(t(`banner.${banner}`)).not.toContain('[missing:');
    }
  });

  it('kennt alle fuenf Modi mit Erklaerung', () => {
    for (const mode of ['flags', 'rotten', 'weights', 'fog', 'rope']) {
      expect(t(`modes.${mode}`)).not.toContain('[missing:');
      expect(t(`modes.${mode}Hint`)).not.toContain('[missing:');
    }
  });
});

describe('t()', () => {
  it('interpoliert Platzhalter', () => {
    expect(t('common.plank', { n: 4 })).toBe('Balken 4');
    expect(t('step.deathZoneSign', { count: 3 })).toBe('NUR 3 BALKEN');
  });

  it('laesst unbekannte Platzhalter stehen, statt "undefined" zu schreiben', () => {
    expect(t('common.plank')).toBe('Balken {n}');
  });

  it('meldet fehlende Keys erkennbar', () => {
    expect(t('gibt.es.nicht')).toBe('[missing:gibt.es.nicht]');
  });

  it('faellt von EN auf DE zurueck, wenn ein Key nur dort existiert', () => {
    setLocale('en');
    expect(t('app.title')).toBe('The Rope Bridge');
    expect(t('gibt.es.nicht')).toBe('[missing:gibt.es.nicht]');
  });
});

describe('plural()', () => {
  it('unterscheidet Einzahl und Mehrzahl', () => {
    expect(plural('common.sips', 1)).toBe('Schluck');
    expect(plural('common.sips', 3)).toBe('Schlücke');

    setLocale('en');
    expect(plural('common.sips', 1)).toBe('sip');
    expect(plural('common.sips', 2)).toBe('sips');
  });
});

describe('tList()', () => {
  it('liest die Geier-Kommentare', () => {
    const comments = tList('result.vulture');
    expect(comments.length).toBeGreaterThanOrEqual(3);
    expect(comments[0]).toContain('5');
  });

  it('gibt bei fehlenden oder falschen Keys eine leere Liste', () => {
    expect(tList('gibt.es.nicht')).toEqual([]);
    expect(tList('app.title')).toEqual([]);
  });
});

describe('Locale', () => {
  it('setzt und liest die Sprache', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('erkennt die Browsersprache und faellt sonst auf DE zurueck', () => {
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('de-AT')).toBe('de');
    expect(detectLocale('fr-FR')).toBe('de');
  });
});
