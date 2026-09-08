/**
 * Das Sequenz-System, von aussen betrachtet (Audit A3/A4).
 *
 * Hier stehen die Prüfungen, die man am **Quelltext** machen muss, weil sie von einer
 * laufenden Timeline nicht zu beantworten sind: Ist jede Datei angemeldet? Greift eine
 * Sequenz an der Projektion vorbei? Steht irgendwo Text hart im Code?
 *
 * Was die Sequenzen **tun** — Labels, Dauer, Zustand nach dem Zurücksetzen — prüft
 * `fallSequences.test.ts` an der echten Timeline auf einer Bühne ohne Renderer. Das ist
 * die stärkere Aussage, und sie hat in M3 nur gefehlt, weil es den Harnisch noch nicht gab.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_SEQUENCE_IDS,
  FALL_SEQUENCES,
  MISC_SEQUENCES,
  OVERLAY_SEQUENCES,
  SAFE_SEQUENCES,
} from '@/config/sequences';
import { PREVIEW_SCENARIOS, fullPicks } from '@/dev/sequencePreview';

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
    else if (
      full.endsWith('.ts') &&
      /* Interface, Kontext, Anmeldung und die geteilten Bausteine sind keine Sequenzen. */
      !full.endsWith('Sequence.ts') &&
      !full.endsWith('context.ts') &&
      !full.endsWith('index.ts') &&
      !full.endsWith('fallKit.ts')
    ) {
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

  it('hat seit M4 alle sechs Fall-Sequenzen gebaut', () => {
    /*
     * In M3 stand hier das Gegenteil — der Test war die Erinnerung, ihn umzudrehen,
     * sobald M4 die Sequenzen baut. Genau das ist passiert.
     */
    for (const meta of FALL_SEQUENCES) {
      expect(built.has(meta.id), `${meta.id} fehlt`).toBe(true);
    }
    /* Der Rückfall bleibt: Ein Tippfehler im Katalog soll die Show nicht anhalten. */
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

describe('Die geteilten Bausteine', () => {
  const fallFiles = files.filter((file) => file.includes('/fall/'));

  it('gibt es überhaupt', () => {
    expect(fallFiles.length).toBeGreaterThan(0);
  });

  it('baut jede Fall-Sequenz aus denselben Teilen (Roadmap M4.3)', () => {
    /*
     * Blickkontakt, Bruch, Platsch und Aufstieg kommen aus `fallKit` — nicht weil es
     * kürzer ist, sondern weil es die einzige Art ist, die Signatur (ADR-3) und "jeder
     * klettert wieder hoch" (Art Direction §7) sechsmal gleich zu bekommen.
     *
     * **Dass** sie richtig laufen, prüft `fallSequences.test.ts` an der echten Timeline.
     */
    for (const file of fallFiles) {
      const source = sources.get(file)!;
      for (const part of ['eyeContact(', 'snap(', 'splash(', 'climbBack(']) {
        expect(source, `${file}: benutzt ${part} nicht`).toContain(part);
      }
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

  it('füllt jedes Szenario auf die Spielerzahl der Lobby auf', () => {
    /*
     * Ohne das bleibt die Runde in CHOOSE stehen, sobald die Lobby mehr Leute hat als das
     * Szenario nennt — genau so ist der Preview beim ersten Versuch hängengeblieben.
     */
    for (const scenario of PREVIEW_SCENARIOS) {
      for (const playerCount of [3, 5, 8]) {
        const planks = Array.from({ length: playerCount + 2 }, (_, i) => i + 1);
        const picks = fullPicks(scenario, playerCount, planks);

        expect(picks.length, `${scenario.id} bei n = ${playerCount}`).toBe(playerCount);
        for (const pick of picks) {
          if (pick !== 'rope') expect(planks, scenario.id).toContain(pick);
        }
      }
    }
  });
});
