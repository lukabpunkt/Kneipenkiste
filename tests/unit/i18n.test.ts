/**
 * i18n (CLAUDE.md: kein hardcodierter UI-String).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { MODE_IDS } from '@/config/rules';
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

describe('Modi-Anleitung ist vollständig', () => {
  /*
   * Jeder Modus braucht eine Erklaerung, in beiden Sprachen. Wer einen sechsten Modus
   * ergaenzt und die Anleitung vergisst, faellt hier auf — und nicht erst am Tisch, wo
   * jemand fragt, was der Modus eigentlich macht.
   */
  for (const locale of LOCALES) {
    it(`${locale}: erklärt jeden Modus aus MODE_IDS`, () => {
      setLocale(locale);
      for (const id of MODE_IDS) {
        const title = t(`modeGuide.${id}.title`);
        expect(title.startsWith('[missing:'), `${id}: Titel fehlt`).toBe(false);

        const lines = tList(`modeGuide.${id}.lines`);
        // Ein Satz reicht nicht — dafuer gibt es den Einzeiler in der Lobby.
        expect(lines.length, `${id}: zu wenige Zeilen`).toBeGreaterThanOrEqual(2);
        for (const line of lines) {
          expect(line.trim().length, `${id}: leere Zeile`).toBeGreaterThan(0);
        }

        const note = t(`modeGuide.${id}.note`);
        expect(note.startsWith('[missing:'), `${id}: Fussnote fehlt`).toBe(false);
      }
      setLocale('de');
    });
  }
});

describe('DE und EN sind deckungsgleich (DoD M5)', () => {
  /*
   * "EN vollstaendig" laesst sich nicht durch Hinsehen pruefen — bei ueber 200 Keys
   * faellt ein fehlender erst auf, wenn im Spiel "[missing: …]" steht. Also drei
   * maschinelle Fragen: Gibt es jeden Key in beiden Sprachen? Ist keiner leer? Und
   * benutzen beide dieselben Platzhalter?
   */
  it('kennt in beiden Sprachen exakt dieselben Keys', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('hat in keiner Sprache einen leeren Text', () => {
    for (const locale of LOCALES) {
      setLocale(locale);
      for (const key of flatKeys(locale)) {
        const single = t(key);
        // Listen liefert `t()` nicht — die pruefen wir ueber `tList`.
        const lines = tList(key);
        if (lines.length > 0) {
          expect(lines.every((line) => line.trim().length > 0), `${locale}:${key}`).toBe(true);
        } else {
          expect(single.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
          expect(single.startsWith('[missing:'), `${locale}:${key}`).toBe(false);
        }
      }
    }
    setLocale('de');
  });

  it('benutzt in beiden Sprachen dieselben Platzhalter', () => {
    const holes = (text: string): string[] =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();

    for (const key of flatKeys('de')) {
      setLocale('de');
      const de = tList(key).length > 0 ? tList(key).join(' ') : t(key);
      setLocale('en');
      const en = tList(key).length > 0 ? tList(key).join(' ') : t(key);
      /*
       * Ein Platzhalter, der nur in einer Sprache steht, ist ein stiller Fehler: Der
       * Satz bleibt lesbar, aber der Name oder die Zahl fehlt genau dort, wo sie die
       * Pointe traegt.
       */
      expect(holes(en), key).toEqual(holes(de));
    }
    setLocale('de');
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
