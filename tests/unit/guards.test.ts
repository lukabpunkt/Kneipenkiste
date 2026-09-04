/**
 * Projektweite Zusicherungen (CLAUDE.md, Audit A0 / Standing Audit).
 *
 * - `Math.random` ist in `src/core/` verboten.
 * - Kein hardcodierter UI-Text im Code.
 * - DE und EN kennen dieselben Keys.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
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
  /**
   * Ein Literal ist Text, sobald ausserhalb der `${}`-Loecher ein Wort steht.
   * Reines Markup zaehlt nicht: Die Icons in `choiceCard.ts` und `badge.ts` sind
   * Inline-SVG und enthalten keine Copy.
   */
  const looksLikeCopy = (literal: string): boolean => {
    const withoutHoles = literal.replace(/\$\{[^}]*\}/g, '');
    if (withoutHoles.trim().startsWith('<')) return false;
    return /[A-Za-zÄÖÜäöüß]{3,}/.test(withoutHoles);
  };

  it('setzt textContent und innerHTML nie auf einen uebersetzbaren Text', () => {
    const files = [join(root, 'src/main.ts')];
    try {
      files.push(...walk(join(root, 'src/ui')));
    } catch {
      // src/ui/ hat in M0 noch keine .ts-Dateien.
    }

    const offenders: string[] = [];
    for (const file of files) {
      /*
       * `src/ui/dev/` ist ausgenommen: Die Inszenierungs-Preview (`?dev=1&panel=outcomes`)
       * beschriftet ihre Knoepfe mit Sequenz-IDs und wird nie ausgeliefert. Sie zu
       * uebersetzen hiesse, Entwickler-Werkzeug in die Sprachdateien zu schreiben.
       */
      if (file.includes(`${sep}ui${sep}dev${sep}`)) continue;
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(
        /\.(?:textContent|innerText|innerHTML)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/gs
      )) {
        const literal = match[1] ?? match[2] ?? match[3] ?? '';
        if (looksLikeCopy(literal)) offenders.push(`${file.slice(root.length)}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('Reduzierte Bewegung (Standing Audit, A5)', () => {
  /**
   * Jede **Endlos**-Animation muss bei `prefers-reduced-motion: reduce` abschaltbar sein.
   *
   * Einmaliges Aufploppen ist in Ordnung — es ist vorbei, bevor es stoert. Was dauerhaft
   * laeuft, ist etwas anderes: Ein wackelnder Knopf oder eine schleichende Figur machen
   * die Seite fuer Menschen mit vestibulaeren Beschwerden unbenutzbar. Genau so ist
   * `btn-wobble` durchgerutscht — der E2E-Test hat es gefunden, dieser hier haelt es fest.
   *
   * Geprueft wird auf **Keyframe-Namen**: Der Test liest, welche Animationen `infinite`
   * laufen, und verlangt, dass jeder dieser Namen irgendwo in einem
   * `prefers-reduced-motion`-Block auf `none` gesetzt wird — ueber den Selektor, der ihn
   * gesetzt hat.
   */
  it('schaltet jede Endlos-Animation bei reduzierter Bewegung ab', () => {
    const files = ['src/styles/components.css', 'src/styles/base.css'];

    for (const file of files) {
      // Kommentare raus: Sonst zieht der Selektor-Match den Kommentarblock davor mit.
      const css = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

      /* Alle Regeln, die etwas endlos animieren — Selektor plus Keyframe-Name. */
      const endless: { selector: string; name: string }[] = [];
      for (const match of css.matchAll(
        /([^{}]+)\{[^{}]*animation:\s*([\w-]+)[^;}]*\binfinite\b[^;}]*;/g
      )) {
        endless.push({ selector: match[1]!.trim(), name: match[2]! });
      }
      expect(endless.length, `${file}: keine Endlos-Animation gefunden?`).toBeGreaterThan(0);

      /* Alles, was in einem reduced-motion-Block steht. */
      const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{/g)]
        .map((match) => blockAt(css, match.index! + match[0].length - 1))
        .join('\n');

      for (const rule of endless) {
        /*
         * Der Selektor muss im Block vorkommen — nicht der Keyframe-Name: Man schaltet
         * `animation: none` auf dem Element, nicht auf der Keyframe-Regel.
         */
        const last = rule.selector.split(',').pop()!.trim();
        expect(reduced, `${file}: "${last}" (${rule.name}) laeuft auch bei reduzierter Bewegung`).toContain(last);
      }
    }
  });
});

/** Liest den Inhalt eines Blocks ab der oeffnenden Klammer — inklusive verschachtelter. */
function blockAt(css: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(openIndex + 1, i);
    }
  }
  return '';
}
