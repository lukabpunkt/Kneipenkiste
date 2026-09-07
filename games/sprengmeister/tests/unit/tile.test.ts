/**
 * Die drei geöffneten Plattenzustände (Playtest-Finding 01, ADR-25/ADR-26).
 *
 * Ein Playtester hat zwei Dinge gesagt: „Es wird nicht klar, wann man eine Bombe
 * anklickt" und „es wird nicht ersichtlich, was Blindgänger sind." Beides hatte dieselbe
 * Ursache auf dem Feld: **Krater, Blindgänger und leeres Feld sahen fast gleich aus.**
 * Der Krater war ein Loch mit einem Farbton weniger — und leerer als ein leeres Feld, das
 * immerhin einen Wurm zeigt. Der Blindgänger nutzte dieselbe Bodentextur wie ein leeres
 * Feld und dieselben Farbringe wie ein Krater.
 *
 * Dieser Test hält fest, dass es jetzt drei unterscheidbare Bilder sind — **und** dass
 * dabei der stumme eigene Trittstein unangetastet bleibt (ADR-2). Der zweite Teil ist der
 * wichtigere: Wer den Krater lesbarer macht, darf dem leeren Feld nichts hinzufügen.
 *
 * PixiJS läuft in jsdom ohne Renderer; für Texturnamen und Kinderzahlen reicht das.
 */

import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS } from '@/config/theme';
import { Tile } from '@/game/Tile';

/** Jeder Frame bekommt eine eigene Textur, damit sich die Bodentexturen unterscheiden lassen. */
const FRAMES = [
  'plates/plate_top',
  'plates/plate_pressed',
  'plates/hole',
  'plates/crater',
  'plates/treasure_glow',
  'plates/deco_0',
  'plates/deco_1',
  'plates/deco_2',
  'plates/deco_3',
  'mines/bomb',
  'mines/bomb_lit',
  'mines/dud_sign',
  'fx/ring',
  'fx/phew',
  'fx/dirt',
  'fx/smoke_s',
  'fx/temp_hot',
  'fx/temp_warm',
  'fx/temp_cold',
  'critters/worm',
  'treasure/crate_open',
  'treasure/crate_singed',
  ...PLAYER_COLORS.map((color) => `symbols/${color.symbol}`),
];

function fakeSheet(): { textures: Record<string, Texture> } {
  const textures: Record<string, Texture> = {};
  for (const frame of FRAMES) {
    // Eigene Instanz je Frame: So verrät `texture === textures['plates/hole']` den Boden.
    textures[frame] = new Texture({ source: Texture.EMPTY.source, label: frame });
  }
  return { textures };
}

function makeTile(): { tile: Tile; sheet: ReturnType<typeof fakeSheet> } {
  const sheet = fakeSheet();
  return { tile: new Tile({ sheet: sheet as never, cell: 0, size: 185, deco: 0 }), sheet };
}

/** Der Boden, den die Platte gerade zeigt — das erste Kind ihrer Ansicht. */
function groundLabel(tile: Tile): string {
  const ground = tile.view.children[0] as { texture?: { label?: string } };
  return ground.texture?.label ?? '';
}

/** Wieviele Sprites in Inhalt und Markierungen liegen. */
function counts(tile: Tile): { content: number; marks: number } {
  return { content: tile.contentView.children.length, marks: tile.marksView.children.length };
}

describe('Krater, Blindgaenger und leeres Feld sind drei verschiedene Bilder', () => {
  it('gibt dem Krater eine eigene Bodentextur **und** Inhalt', () => {
    const { tile } = makeTile();
    tile.crater(['red'], 'warm');

    expect(tile.state).toBe('crater');
    expect(groundLabel(tile)).toBe('plates/crater');
    /*
     * Der Punkt aus dem Playtest: Ein Krater darf nicht leerer sein als ein leeres Feld.
     * Restrauch plus drei Truemmerstuecke.
     */
    expect(counts(tile).content).toBeGreaterThanOrEqual(4);
  });

  it('gibt dem Blindgaenger Bombe und Schild', () => {
    const { tile } = makeTile();
    tile.dud(['blue'], 'cold');

    expect(tile.state).toBe('dud');
    // Kein Krater — es hat ja nicht geknallt.
    expect(groundLabel(tile)).toBe('plates/hole');

    const labels = tile.marksView.children.map(
      (child) => (child as { texture?: { label?: string } }).texture?.label ?? 'text'
    );
    expect(labels).toContain('mines/bomb');
    expect(labels).toContain('mines/dud_sign');
    // Und das Wort steht darauf — als Text, nicht als eingebrannte Textur.
    expect(labels).toContain('text');
  });

  it('laesst das leere Feld unangetastet (ADR-2)', () => {
    /*
     * **Der wichtigste Test dieser Datei.** Wer den Krater lesbarer macht, darf dem
     * leeren Feld nichts hinzufuegen — sonst waere der stumme eigene Trittstein plötzlich
     * an seiner Ausstattung zu erkennen.
     */
    const { tile } = makeTile();
    tile.openEmpty('worm', 'hot');

    expect(tile.state).toBe('open_empty');
    expect(groundLabel(tile)).toBe('plates/hole');
    // Genau ein Fundstueck, keine Markierung ausser dem Temperatur-Icon im eigenen Slot.
    expect(counts(tile)).toEqual({ content: 1, marks: 0 });
    expect(tile.hintView.children).toHaveLength(1);
  });

  it('unterscheidet die drei Zustaende in jedem messbaren Merkmal', () => {
    const empty = makeTile().tile;
    const crater = makeTile().tile;
    const dud = makeTile().tile;

    empty.openEmpty('worm', 'warm');
    crater.crater(['red'], 'warm');
    dud.dud(['red'], 'warm');

    const fingerprint = (tile: Tile): string =>
      `${groundLabel(tile)}|${counts(tile).content}|${counts(tile).marks}`;

    const prints = [fingerprint(empty), fingerprint(crater), fingerprint(dud)];
    expect(new Set(prints).size, prints.join(' · ')).toBe(3);
  });

  it('raeumt beim Zuruecksetzen alles weg', () => {
    const { tile } = makeTile();
    tile.dud(['red'], 'warm');
    tile.reset();

    expect(tile.state).toBe('covered');
    expect(counts(tile)).toEqual({ content: 0, marks: 0 });
    expect(tile.hintView.children).toHaveLength(0);
  });
});
