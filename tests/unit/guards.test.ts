/**
 * Projektweite Zusicherungen (CLAUDE.md, Audit A0 / Standing Audit).
 *
 * - `Math.random` ist in `src/core/` verboten.
 * - Kein hardcodierter UI-Text im Code.
 * - DE und EN kennen dieselben Keys.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flatKeys } from '@/core/i18n';

// Unter jsdom ist `import.meta.url` keine file-URL — Vitest laeuft im Projekt-Root.
const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Kommentare raus, damit "Math.random" in einer Erklaerung nicht falsch anschlaegt. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Fairness (CLAUDE.md)', () => {
  it('src/core/ enthaelt kein Math.random', () => {
    const offenders = walk(join(root, 'src/core'))
      .filter((file) => /Math\s*\.\s*random/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(root.length));
    expect(offenders).toEqual([]);
  });

  it('die Maulwurf-Zuweisung laeuft ueber crypto', () => {
    const modes = readFileSync(join(root, 'src/core/modes.ts'), 'utf8');
    expect(modes).toMatch(/secureRandomInt/);
    const rng = readFileSync(join(root, 'src/core/rng.ts'), 'utf8');
    expect(rng).toMatch(/crypto\.getRandomValues/);
  });
});

describe('i18n', () => {
  it('DE und EN kennen dieselben Keys', () => {
    expect(flatKeys('en')).toEqual(flatKeys('de'));
  });

  it('hat die Kernsaetze aus der Art Direction §9', () => {
    const de = readFileSync(join(root, 'src/i18n/de.json'), 'utf8');
    expect(de).toContain('Tresor öffnen');
    // Der Satz steht im Screen als Headline + Body, deshalb zwei Haelften.
    expect(de).toContain('Alle Karten versiegelt.');
    expect(de).toContain('Handy in die Mitte');
    expect(de).toContain('Zu zweit ist das kein Dilemma');
    expect(de).toContain('Ehre unter Dieben');
    expect(de).toContain('Du bist der Maulwurf.');
  });
});

describe('Kein hardcodierter UI-Text (Standing Audit)', () => {
  /*
   * Nur `src/ui/` und `src/main.ts` sind betroffen — Screens duerfen Text ausschliesslich
   * ueber `t()` beziehen. In M0 gibt es noch keine Screens; der Test waechst mit.
   */
  /** Ein Literal ist Text, sobald ausserhalb der `${}`-Loecher ein Wort steht. */
  const looksLikeCopy = (literal: string): boolean =>
    /[A-Za-zÄÖÜäöüß]{3,}/.test(literal.replace(/\$\{[^}]*\}/g, ''));

  it('setzt textContent nie auf einen uebersetzbaren Text', () => {
    const files = [join(root, 'src/main.ts')];
    try {
      files.push(...walk(join(root, 'src/ui')));
    } catch {
      // src/ui/ hat in M0 noch keine .ts-Dateien.
    }

    const offenders: string[] = [];
    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(
        /\.(?:textContent|innerText)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g
      )) {
        const literal = match[1] ?? match[2] ?? match[3] ?? '';
        if (looksLikeCopy(literal)) offenders.push(`${file.slice(root.length)}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
