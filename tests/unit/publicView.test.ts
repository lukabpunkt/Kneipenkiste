/**
 * **Der wichtigste Test des Projekts** (CLAUDE.md, ADR-2, Audit A0).
 *
 * Eine aufgegrabene eigene Mine muss von einem leeren Feld ununterscheidbar sein — in
 * Daten, Bild und Ton. Hier steht die Datenseite:
 *
 * 1. Die beiden `OpenedCell`s sind **strukturell identisch** (bis auf `critter`, der aus
 *    dem Seed kommt).
 * 2. `publicView` enthaelt nie eine ungeoeffnete Mine und nie die Kistenposition.
 * 3. Auch die abgeleiteten Zahlen verraten nichts — insbesondere `minesRemaining` (ADR-8).
 * 4. Kein Screen greift auf `board.mines` oder `board.treasure` zu (Lint-Test).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { debugRevealAll, dig, placeView, publicView, replayView } from '@/core/board';
import { buildBoard, modes } from './helpers';

const seed = 4711;

describe('ADR-2: die eigene Mine ist ein leeres Feld', () => {
  /**
   * Die Frage, die dieser Test stellt, ist die Frage am Tisch: `p1` graebt eine Platte
   * auf — liegt dort seine eigene Mine, oder liegt sie ganz woanders? Fuer alle anderen
   * muss das ununterscheidbar sein.
   *
   * Deshalb tragen **beide** Felder dieselbe Anzahl Minen; sie liegen nur verschieden.
   * (Zwei Felder mit unterschiedlich vielen Minen zu vergleichen, waere kein fairer Test:
   * Im Spiel vergraebt jeder immer sein volles Kontingent.)
   */
  const ELSEWHERE = 22;

  function bothViews(cell = 6, chest = 0) {
    const plain = buildBoard({ playerCount: 4, mines: { [ELSEWHERE]: ['p1'] }, treasure: [chest] });
    const mined = buildBoard({ playerCount: 4, mines: { [cell]: ['p1'] }, treasure: [chest] });

    return {
      plain: dig(plain, cell, 'p1', { modes: modes(), seed }),
      mined: dig(mined, cell, 'p1', { modes: modes(), seed }),
    };
  }

  it('erzeugt strukturell identische OpenedCells', () => {
    const { plain, mined } = bothViews();
    expect(publicView(mined.board).opened[6]).toEqual(publicView(plain.board).opened[6]);
  });

  it('erzeugt denselben publicView — Zeichen fuer Zeichen', () => {
    const { plain, mined } = bothViews();
    // Serialisiert vergleichen: Auch ein zusaetzliches `undefined`-Feld faellt hier auf.
    expect(JSON.stringify(publicView(mined.board))).toBe(JSON.stringify(publicView(plain.board)));
  });

  it('liefert dasselbe Fundstueck — es haengt am Seed, nicht am Inhalt', () => {
    const { plain, mined } = bothViews();
    expect(mined.board.opened[6]?.critter).toBe(plain.board.opened[6]?.critter);
    expect(mined.board.opened[6]?.critter).toBeDefined();
  });

  it('haelt `minesRemaining` stabil, wenn ein Trittstein benutzt wird (ADR-8)', () => {
    /*
     * Wuerde die Zahl beim stummen Trittstein sinken, koennte jeder am Tisch an dieser
     * einen Ziffer ablesen, was das Spiel gerade verschweigt. Sie faellt deshalb nur,
     * wenn eine Explosion **gezeigt** wurde.
     */
    const board = buildBoard({
      playerCount: 4,
      mines: { 6: ['p1'], 8: ['p2'], 18: ['p3'] },
      treasure: [0],
    });
    expect(publicView(board).minesRemaining).toBe(3);

    const stone = dig(board, 6, 'p1', { modes: modes(), seed });
    expect(publicView(stone.board).minesRemaining).toBe(3);

    const boom = dig(stone.board, 8, 'p1', { modes: modes(), seed });
    expect(publicView(boom.board).minesRemaining).toBe(2);
  });

  it('haelt `minesRemaining` auch beim eigenen Blindgaenger stabil', () => {
    const m = modes({ doubleAgent: true });
    const board = buildBoard({
      playerCount: 4,
      mines: { 8: ['p2'] },
      duds: { 6: ['p1'] },
      treasure: [0],
      modes: m,
    });
    const before = publicView(board).minesRemaining;
    const after = dig(board, 6, 'p1', { modes: m, seed }).board;
    expect(publicView(after).minesRemaining).toBe(before);
  });

  it('bleibt auch dann ununterscheidbar, wenn die Kiste unter der eigenen Mine liegt', () => {
    // "Preis der Gier" gibt es nur bei **fremden** Minen — der eigene Trittstein macht
    // aus dem Fund keinen anderen Fund.
    const { plain, mined } = bothViews(12, 12);
    expect(plain.result.kind).toBe('treasure');
    expect(mined.result.kind).toBe('treasure');
    expect(publicView(mined.board).opened[12]).toEqual(publicView(plain.board).opened[12]);
  });

  it('meldet den Trittstein nur intern', () => {
    const { plain, mined } = bothViews();
    expect(mined.result.ownMineConsumed).toBe(true);
    expect(plain.result.ownMineConsumed).toBe(false);
    // ... und das schlaegt sich in nichts nieder, was ein Screen zu sehen bekommt:
    expect(mined.result.kind).toBe(plain.result.kind);
    expect(mined.result.hint).toBe(plain.result.hint);
    expect(mined.result.foreignMines).toEqual(plain.result.foreignMines);
  });
});

describe('publicView verraet nichts Ungeoeffnetes', () => {
  const board = buildBoard({
    playerCount: 4,
    mines: { 3: ['p2'], 9: ['p3', 'p4'], 20: ['p1'] },
    duds: { 15: ['p2'] },
    treasure: [17],
    modes: modes({ doubleAgent: true }),
  });

  it('enthaelt weder Minen noch Kistenposition', () => {
    const view = publicView(board);
    const serialised = JSON.stringify(view);

    expect(Object.keys(view)).toEqual(['size', 'opened', 'minesRemaining', 'chestsRemaining']);
    expect(serialised).not.toContain('"mines"');
    expect(serialised).not.toContain('"treasure"');
    expect(serialised).not.toContain('"duds"');
  });

  it('nennt nur Zahlen, keine Orte', () => {
    const view = publicView(board);
    expect(view.minesRemaining).toBe(4);
    expect(view.chestsRemaining).toBe(1);
  });

  it('zeigt eine Zelle erst, nachdem sie aufgegraben wurde', () => {
    expect(publicView(board).opened[3]).toBeUndefined();
    const after = dig(board, 3, 'p1', { modes: modes(), seed }).board;
    expect(publicView(after).opened[3]?.blamed).toEqual(['p2']);
  });

  it('gibt eine Kopie heraus — ein Screen kann das private Board nicht veraendern', () => {
    const after = dig(board, 3, 'p1', { modes: modes(), seed }).board;
    const view = publicView(after);
    delete view.opened[3];
    expect(publicView(after).opened[3]).toBeDefined();
  });
});

describe('placeView zeigt nur die eigenen Sprengkoerper', () => {
  const m = modes({ doubleAgent: true });
  const board = buildBoard({
    playerCount: 4,
    mines: { 3: ['p1'], 9: ['p2'] },
    duds: { 15: ['p1'], 20: ['p2'] },
    treasure: [17],
    modes: m,
  });

  it('nennt die eigenen und verschweigt die fremden', () => {
    const view = placeView(board, 'p1');
    expect(view).toEqual({ size: 5, ownMines: [3], ownDuds: [15] });
    expect(JSON.stringify(view)).not.toContain('17');
  });

  it('liefert einem Spieler ohne Platzierung ein leeres Feld', () => {
    expect(placeView(board, 'p9')).toEqual({ size: 5, ownMines: [], ownDuds: [] });
  });
});

describe('replayView deckt am Rundenende alles auf (GDD §4.4)', () => {
  const board = buildBoard({
    playerCount: 4,
    mines: { 3: ['p2'], 9: ['p3'] },
    duds: { 15: ['p4'] },
    treasure: [17],
    modes: modes({ doubleAgent: true }),
  });

  it('zeigt auch die Minen, auf die nie jemand getreten ist', () => {
    const cells = replayView(board).cells;
    expect(cells).toHaveLength(25);

    const untouched = cells[3]!;
    expect(untouched.mineOwners).toEqual(['p2']);
    expect(untouched.neverTriggered).toBe(true);
    expect(untouched.opened).toBeUndefined();

    expect(cells[15]!.dudOwners).toEqual(['p4']);
    expect(cells[17]!.treasure).toBe(true);
  });

  it('ist im Dev-Panel unter eigenem Namen zu haben (Architektur §8)', () => {
    // `debugRevealAll` heisst absichtlich so: Wer es in einem Screen aufruft, faellt
    // beim Lesen des Diffs sofort auf.
    expect(debugRevealAll(board)).toEqual(replayView(board));
  });

  it('setzt "Phew" nur fuer scharfe, nie ausgeloeste Minen', () => {
    const after = dig(board, 3, 'p1', { modes: modes(), seed }).board;
    const cells = replayView(after).cells;

    expect(cells[3]!.neverTriggered).toBe(false);
    expect(cells[3]!.opened?.kind).toBe('crater');
    expect(cells[9]!.neverTriggered).toBe(true);
    // Ein Blindgaenger ist nichts Scharfes — er bekommt kein "Phew".
    expect(cells[15]!.neverTriggered).toBe(false);
    expect(cells[0]!.neverTriggered).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Lint-Test: kein Screen sieht das private Board (CLAUDE.md)          */
/* ------------------------------------------------------------------ */

describe('Informationssicherheit im Code', () => {
  const srcRoot = resolve(__dirname, '../../src');

  function filesUnder(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...filesUnder(full));
      else if (entry.endsWith('.ts')) out.push(full);
    }
    return out;
  }

  /**
   * Alles ausserhalb von `src/core/` ist "Screen-Seite": UI, Buehne, Sequenzen, Audio.
   * Dort darf das private Board nicht auftauchen — auch nicht versehentlich ueber eine
   * Destrukturierung.
   */
  const outsideCore = filesUnder(srcRoot).filter((file) => !file.includes(`${'src'}/core/`));

  it('findet ueberhaupt Dateien ausserhalb von core/ (der Test muss beissen koennen)', () => {
    expect(outsideCore.length).toBeGreaterThan(0);
  });

  /**
   * Kommentare raus, Strings bleiben. Ueber ADR-2 **muss** man in den Screens schreiben
   * duerfen — verboten ist der Zugriff, nicht die Erklaerung.
   */
  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  }

  /**
   * Drei Muster, die zusammen jeden realistischen Weg zum privaten Board abdecken:
   *
   * 1. `.board` — der Zugriff auf das Board selbst. Das ist die schaerfste der drei:
   *    Wer `fsm.context.board` nicht anfassen kann, kommt an `mines` gar nicht heran.
   * 2. `board.mines` / `board.treasure` — falls doch einmal ein Board hereingereicht wird.
   * 3. `{ mines` / `{ treasure` — dieselben Felder ueber eine Destrukturierung.
   *
   * Bewusst **nicht** verboten ist ein blosses `.treasure`: `ReplayCell.treasure` kommt
   * aus `replayView()` und darf am Rundenende gelesen werden (GDD §4.4).
   */
  const FORBIDDEN: readonly [RegExp, string][] = [
    [/\.board\b/, 'Zugriff auf das private Board'],
    [/\b[Bb]oard\.(mines|treasure)\b/, 'board.mines / board.treasure'],
    [/\{\s*(mines|treasure)\s*[,}]/, 'Destrukturierung von mines / treasure'],
  ];

  it('referenziert nirgends das private Board', () => {
    const offenders: string[] = [];

    for (const file of outsideCore) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const [pattern, what] of FORBIDDEN) {
        if (pattern.test(code)) offenders.push(`${relative(srcRoot, file)} — ${what}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('beisst, wenn ein Screen doch zugreift', () => {
    // Der Test oben ist nur so viel wert wie seine Muster — hier steht, dass sie treffen.
    const hits = (code: string): number =>
      FORBIDDEN.filter(([pattern]) => pattern.test(stripComments(code))).length;

    expect(hits('const stack = board.mines[cell];')).toBeGreaterThan(0);
    expect(hits('const cells = fsm.context.board;')).toBeGreaterThan(0);
    expect(hits('const { mines, treasure } = someBoard;')).toBeGreaterThan(0);

    // ... und dass sie das Erlaubte in Ruhe lassen:
    expect(hits('// ADR-2: niemand liest hier board.mines')).toBe(0);
    expect(hits('if (replayCell.treasure) show();')).toBe(0);
    expect(hits('const view = fsm.replay();')).toBe(0);
  });

  it('haelt die einzigen Board-Ausgaenge in core/board.ts', () => {
    const board = readFileSync(join(srcRoot, 'core/board.ts'), 'utf8');
    for (const exported of ['publicView', 'placeView', 'replayView']) {
      expect(board).toContain(`export function ${exported}`);
    }
  });
});
