/**
 * Der Schluck-Zähler (Playtest-Finding 01, ADR-27).
 *
 * „Es gibt keine Konsequenzen, wenn man eine Bombe erwischt" — der Playtester hatte
 * recht, obwohl die Konsequenz da war: als Banner, 2,2 Sekunden lang, am oberen Bildrand,
 * während der Blick unten am Krater klebte. Danach war sie spurlos weg.
 *
 * Geprüft wird deshalb genau das, was den Unterschied macht: Die Zahl **bleibt** stehen,
 * sie summiert sich über die Runde, und sie ist nicht vor Screenreadern versteckt.
 */

import { describe, expect, it } from 'vitest';
import { setLocale } from '@/core/i18n';
import { createSipCounter } from '@/ui/components/sipCounter';

const COLORS: Record<string, 'red' | 'blue' | 'green'> = { p1: 'red', p2: 'blue', p3: 'green' };
const NAMES: Record<string, string> = { p1: 'Rudi', p2: 'Anna', p3: 'Bo' };

function makeCounter(): ReturnType<typeof createSipCounter> {
  setLocale('de');
  return createSipCounter({
    colorOf: (id) => COLORS[id],
    nameOf: (id) => NAMES[id],
  });
}

const chips = (counter: ReturnType<typeof createSipCounter>): string[] =>
  [...counter.el.querySelectorAll('.sip-chip')].map((chip) => chip.textContent ?? '');

describe('Schluck-Zaehler', () => {
  it('faengt leer an', () => {
    expect(chips(makeCounter())).toHaveLength(0);
  });

  it('zeigt Name und Zahl nach der ersten Explosion', () => {
    const counter = makeCounter();
    counter.add('p1', 2);

    expect(chips(counter)).toHaveLength(1);
    expect(chips(counter)[0]).toContain('Rudi');
    expect(chips(counter)[0]).toContain('2');
  });

  it('summiert ueber die Runde, statt zu ueberschreiben', () => {
    /*
     * Der eigentliche Punkt: Nach der dritten Grabung soll dastehen, was jemand
     * **insgesamt** trinken muss — nicht, was die letzte Mine gekostet hat.
     */
    const counter = makeCounter();
    counter.add('p1', 2);
    counter.add('p1', 4);

    expect(chips(counter)).toHaveLength(1);
    expect(chips(counter)[0]).toContain('6');
  });

  it('haelt mehrere Spieler auseinander und sortiert den Haertesten nach vorn', () => {
    const counter = makeCounter();
    counter.add('p1', 2);
    counter.add('p2', 6);
    counter.add('p3', 4);

    // Am Tisch fragt man zuerst, wer am meisten trinken muss.
    const order = chips(counter).map((text) => text.replace(/\D+/g, ''));
    expect(order).toEqual(['6', '4', '2']);
  });

  it('ignoriert Grabungen ohne Schluecke', () => {
    /*
     * Ein Blindgaenger kostet nichts, ein leeres Feld auch nicht — und ein Eintrag mit
     * einer Null waere schlimmer als keiner: Er sieht aus wie eine Konsequenz.
     */
    const counter = makeCounter();
    counter.add('p1', 0);
    expect(chips(counter)).toHaveLength(0);
  });

  it('ist fuer Screenreader vorhanden — anders als der Token-Stapel', () => {
    const counter = makeCounter();
    expect(counter.el.getAttribute('aria-hidden')).toBeNull();
    // Hoeflich, nicht unterbrechend: Das Banner meldet sich `assertive`, dieser Zaehler nicht.
    expect(counter.el.getAttribute('aria-live')).toBe('polite');
  });

  it('kommt mit einem unbekannten Spieler klar, statt zu werfen', () => {
    const counter = makeCounter();
    expect(() => counter.add('weg', 2)).not.toThrow();
    expect(chips(counter)).toHaveLength(0);
  });
});
