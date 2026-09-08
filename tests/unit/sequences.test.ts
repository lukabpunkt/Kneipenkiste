/**
 * Das Sequenz-System (Audit A3).
 *
 * Zwei Dinge werden hier festgehalten, und beide sind Verträge, keine Details:
 *
 * 1. **Katalog und Registry passen zusammen.** Der Choreographer wählt in M0 aus dem
 *    Katalog; gebaut wird in M3/M4. Wählt er etwas, das es nicht gibt, bliebe die Show
 *    stehen — deshalb sagt `missingImplementations()` jederzeit, was fehlt.
 * 2. **Jede Fall-Sequenz trägt `eyeContact` < `snap` < `climbedBack`.** Das ist die
 *    Signatur des Spiels als prüfbare Zusicherung (ADR-3, Architektur §7).
 *
 * Was hier **nicht** geprüft wird, ist das Aussehen. Dafür gibt es den Look-Check.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_SEQUENCE_IDS,
  FALL_SEQUENCES,
  MISC_SEQUENCES,
  OVERLAY_SEQUENCES,
  SAFE_SEQUENCES,
} from '@/config/sequences';
import { PREVIEW_SCENARIOS } from '@/dev/sequencePreview';

/*
 * Die Sequenzen selbst ziehen PIXI und GSAP nach. In jsdom lässt sich das laden, aber
 * eine Timeline zu **bauen** bräuchte eine Bühne. Deshalb wird hier gegen die Quelltexte
 * geprüft: Was eine Datei registriert und welche Labels sie setzt, steht darin.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SEQUENCE_ROOT = 'src/game/sequences';

function sequenceFiles(dir = SEQUENCE_ROOT, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sequenceFiles(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('Sequence.ts') && !full.endsWith('context.ts') && !full.endsWith('index.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = sequenceFiles();
const sources = new Map(files.map((file) => [file, readFileSync(file, 'utf8')]));

/** Welche ID registriert diese Datei? */
function idOf(source: string): string | undefined {
  return /id:\s*'([a-z0-9_]+)'/.exec(source)?.[1];
}

const built = new Map<string, string>();
for (const [file, source] of sources) {
  const id = idOf(source);
  if (id) built.set(id, file);
}

describe('Registry', () => {
  it('registriert jede Datei genau einmal', () => {
    expect(built.size).toBe(files.length);

    /* Jede Datei ruft `registerSequence` — sonst wird sie nie gefunden. */
    for (const [file, source] of sources) {
      expect(source, file).toContain('registerSequence(');
    }
  });

  it('bindet jede gebaute Sequenz an einen Katalog-Eintrag', () => {
    const known = new Set<string>([...ALL_SEQUENCE_IDS, 'basic_fall']);
    for (const [id, file] of built) {
      expect(known.has(id), `${file} registriert "${id}", das steht nicht im Katalog`).toBe(true);
    }
  });

  it('hat in M3 alle Sicher-, Misc- und Overlay-Sequenzen gebaut', () => {
    for (const meta of SAFE_SEQUENCES) expect(built.has(meta.id), meta.id).toBe(true);
    for (const id of Object.values(MISC_SEQUENCES)) expect(built.has(id), id).toBe(true);
    for (const id of Object.values(OVERLAY_SEQUENCES)) expect(built.has(id), id).toBe(true);
  });

  it('lässt die sechs Fall-Sequenzen offen — sie kommen in M4', () => {
    /*
     * Bewusst als Test und nicht als Kommentar: Wenn M4 sie baut, schlägt genau dieser
     * Test fehl und erinnert daran, ihn umzudrehen.
     */
    for (const meta of FALL_SEQUENCES) {
      expect(built.has(meta.id), `${meta.id} ist gebaut — dann gehört dieser Test angepasst`).toBe(false);
    }
    expect(built.has('basic_fall')).toBe(true);
  });

  it('meldet jede Sequenz in `index.ts` an', () => {
    const index = readFileSync(`${SEQUENCE_ROOT}/index.ts`, 'utf8');
    for (const file of files) {
      const relative = file.replace(`${SEQUENCE_ROOT}/`, './').replace(/\.ts$/, '');
      expect(index, `${file} fehlt in index.ts`).toContain(`'${relative}'`);
    }
  });
});

describe('Die Signatur in der Fall-Sequenz (ADR-3)', () => {
  const fallFiles = files.filter((file) => file.includes('/fall/'));

  it('gibt es überhaupt', () => {
    expect(fallFiles.length).toBeGreaterThan(0);
  });

  it('setzt in jeder Fall-Sequenz `eyeContact` < `snap` < `climbedBack`', () => {
    for (const file of fallFiles) {
      const source = sources.get(file)!;
      const eye = source.indexOf("addLabel('eyeContact'");
      const snap = source.indexOf("addLabel('snap'");
      const back = source.indexOf("addLabel('climbedBack'");

      expect(eye, `${file}: eyeContact fehlt`).toBeGreaterThanOrEqual(0);
      expect(snap, `${file}: snap fehlt`).toBeGreaterThanOrEqual(0);
      expect(back, `${file}: climbedBack fehlt`).toBeGreaterThanOrEqual(0);

      /* Die Reihenfolge im Quelltext ist die Reihenfolge auf der Timeline. */
      expect(eye, `${file}: eyeContact muss vor snap stehen`).toBeLessThan(snap);
      expect(snap, `${file}: snap muss vor climbedBack stehen`).toBeLessThan(back);
    }
  });

  it('lässt jede Fall-Sequenz mit einem Aufstieg enden — kein Hiker verschwindet', () => {
    for (const file of fallFiles) {
      expect(sources.get(file)!, file).toContain('wetClimb');
    }
  });
});

describe('Sequenzen greifen nicht an der Projektion vorbei', () => {
  it('keine Sequenz kennt die Runde, nur den Reveal', () => {
    for (const [file, source] of sources) {
      /* `ctx.reveal` ist erlaubt, `round` und `choices` sind es nicht (Architektur §4). */
      expect(source, `${file}: greift auf choices zu`).not.toMatch(/\.choices\b/);
      expect(source, `${file}: greift auf die Runde zu`).not.toMatch(/context\.round\b/);
    }
  });

  it('holt jeden sichtbaren Text über i18n (CLAUDE.md)', () => {
    for (const [file, source] of sources) {
      /* Sprechblasen und Schilder bekommen ihren Text über `ctx.t`, nie als Literal. */
      const literals = [...source.matchAll(/text:\s*'([^']+)'/g)].map((match) => match[1]!);
      for (const literal of literals) {
        expect(literal, `${file}: "${literal}" steht hart im Code`).toMatch(/^\$\{|^$/);
      }
      if (source.includes('bubbles.show') || source.includes('signs.')) {
        expect(source, file).toContain('ctx.t(');
      }
    }
  });
});

describe('Dev-Preview', () => {
  it('hat für jede gebaute Sequenz ein Szenario', () => {
    const covered = new Set(PREVIEW_SCENARIOS.map((scenario) => scenario.id));
    for (const id of built.keys()) {
      expect(covered.has(id), `${id} ist im Preview nicht erreichbar`).toBe(true);
    }
  });

  it('beschreibt jedes Szenario vollständig', () => {
    for (const scenario of PREVIEW_SCENARIOS) {
      expect(scenario.picks.length, scenario.id).toBe(scenario.players);
      expect(scenario.label.length, scenario.id).toBeGreaterThan(3);
    }
  });
});
