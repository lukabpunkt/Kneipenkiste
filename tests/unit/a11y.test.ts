/**
 * Zugänglichkeit und "kein hardcodierter Text" (Standing Audit, Audit A1).
 *
 * Der zweite Teil ist kein Stilcheck: Ein deutscher String im Code ist ein Screen, den
 * es auf Englisch nicht gibt — und der Fehler fällt erst beim Sprachwechsel auf.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flatKeys } from '@/core/i18n';

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) filesUnder(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

function stripCommentsAndSvg(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    /* Inline-SVG ist Grafik, kein Text — Pfaddaten enthalten keine Sprache. */
    .replace(/`\s*\n?<svg[\s\S]*?<\/svg>\s*`/g, '``');
}

describe('Kein hardcodierter UI-Text (CLAUDE.md)', () => {
  /*
   * Nur `src/ui`. Das Dev-Panel hinter `?dev=1` bleibt bewusst draussen: Es ist Werkzeug,
   * kein Spieler-UI, und seine Beschriftungen in die Sprachdateien zu heben hiesse, sie
   * zweimal zu pflegen, damit niemand sie je liest.
   */
  it('kein Screen und keine Komponente schreibt deutschen Text direkt ins DOM', () => {
    const offenders: string[] = [];

    for (const file of filesUnder('src/ui')) {
      const source = stripCommentsAndSvg(readFileSync(file, 'utf8'));

      /* Zuweisungen an sichtbaren Text mit einem String-Literal darin. */
      const matches = source.matchAll(/\.(textContent|innerText)\s*=\s*(['"])(.*?)\2/g);
      for (const match of matches) {
        const value = match[3] ?? '';
        /* Leerstring und reine Symbole sind kein Text. */
        if (value.trim().length === 0) continue;
        if (!/[A-Za-zÄÖÜäöüß]/.test(value)) continue;
        offenders.push(`${file}: "${value}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('alle in den Screens benutzten i18n-Keys existieren', () => {
    const known = new Set(flatKeys('de'));
    const missing: string[] = [];

    for (const file of filesUnder('src/ui')) {
      const source = stripCommentsAndSvg(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(/\bt(?:List)?\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        const key = match[1]!;
        if (!known.has(key)) missing.push(`${file}: ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('das Dev-Panel bleibt hinter ?dev=1 und taucht in keinem Screen auf', () => {
    for (const file of filesUnder('src/ui')) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('devPanel');
    }
    /* Und es prüft die Flagge selbst, statt sich darauf zu verlassen, dass jemand es tut. */
    expect(readFileSync('src/dev/devPanel.ts', 'utf8')).toContain("has('dev')");
  });
});

describe('Informationssicherheit (Standing Audit)', () => {
  it('kein Screen greift an publicView vorbei auf die Runde zu', () => {
    const offenders: string[] = [];

    for (const file of filesUnder('src/ui')) {
      const source = stripCommentsAndSvg(readFileSync(file, 'utf8'));
      /*
       * `fsm.context.round` ist der private Rundenzustand — inklusive fremder Wahlen und
       * des morschen Balkens. Screens bekommen `view()`, `ownChoice()`, `reveal()` und
       * `stepScript()`, sonst nichts (Architektur §4).
       */
      if (/context\.round\b/.test(source)) offenders.push(`${file}: context.round`);
      /* `.choices` gehört ausschließlich in den Kern. */
      if (/\.choices\b/.test(source)) offenders.push(`${file}: choices`);
      /*
       * Der morsche Balken darf **nur** aus dem Reveal kommen. `reveal.rottenPlank` im
       * Result-Screen ist genau der vorgesehene Weg — `round.bridge.rottenPlank` wäre
       * der Bruch.
       */
      for (const match of source.matchAll(/(\w+)\.rottenPlank\b/g)) {
        if (match[1] !== 'reveal') offenders.push(`${file}: ${match[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
