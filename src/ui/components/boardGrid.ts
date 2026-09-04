/**
 * Das Feld als DOM-Grid (Roadmap M1.3/M1.4/M1.5).
 *
 * Platzhalter fuer die PIXI-`BoardView` aus M2 — mit denselben Modi (`place` | `dig` |
 * `replay`), demselben `tileTap`-Vertrag und derselben Sperre waehrend einer laufenden
 * Inszenierung (ADR-6). Ab M2 wird diese Datei durch `game/BoardView.ts` ersetzt; der
 * Rest der Screens bleibt unveraendert.
 *
 * **Diese Komponente sieht das private Board nie.** Sie bekommt ausschliesslich, was
 * `core/board.ts` herausgibt: `PublicView` beim Graben, `PlaceView` beim Legen,
 * `ReplayView` am Rundenende (CLAUDE.md, ADR-2). Ein Lint-Test prueft das.
 */

import { TOUCH, colorById, hex, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { Cell, OpenedCell, PlaceView, PlayerId, PublicView, ReplayView } from '@/core/types';
import type { Hint } from '@/config/rules';
import { badgeSymbolSvg } from './badge';

/**
 * Die Hinweis-Icons. Bewusst auf hellem Kreis (Art Direction §2): Spielerfarben sind
 * Ringe, Temperaturen sind Icons — zwei Formensprachen, damit `temp.hot` und
 * Spielerfarbe Rot ueber demselben Krater nicht verwechselt werden.
 */
const HINT_ICON: Record<Hint, string> = {
  hot: '🔥',
  warm: '☀️',
  cold: '❄️',
  none: '',
};

/** Die Fundstuecke im leeren Loch (Art Direction §5.1). */
const CRITTER_ICON = {
  worm: '🪱',
  beetle: '🪲',
  bone: '🦴',
  boot: '🥾',
} as const;

export type BoardGridMode = 'place' | 'dig' | 'replay';

export interface BoardGridOptions {
  size: 5 | 6;
  mode: BoardGridMode;
  /** Ein Tap auf eine noch geschlossene Platte. Im Replay-Modus nie. */
  onTileTap?: (cell: Cell) => void;
  /** Farbe je Spieler — fuer Krater-Ringe und Minen im Replay. */
  colorOf: (playerId: PlayerId) => ColorId | undefined;
  /** Name je Spieler — nur fuer die Screenreader-Beschriftung. */
  nameOf?: (playerId: PlayerId) => string | undefined;
}

export interface BoardGrid {
  /** Der Wiesen-Rahmen mit dem Grid darin — das ist, was ein Screen einhaengt. */
  el: HTMLElement;
  /** Grabphase und Result: zeigt, was oeffentlich ist. */
  renderPublic(view: PublicView): void;
  /** Minenphase: leeres Feld plus die eigenen Sprengkoerper. */
  renderPlace(view: PlaceView, tool: 'mine' | 'dud'): void;
  /** Rundenende: alles aufgedeckt, auch die nie ausgeloesten Minen (GDD §4.4). */
  renderReplay(view: ReplayView): void;
  /**
   * Sperrt das Feld waehrend einer Inszenierung. Taps werden **ignoriert, nicht
   * gepuffert** (Architektur §3) — sonst prasseln nach einer Explosion drei
   * nachgereichte Grabungen herein.
   */
  setLocked(locked: boolean): void;
  readonly locked: boolean;
  /** Die Platte einer Zelle — fuer Effekte und Tests. */
  tileAt(cell: Cell): HTMLButtonElement | undefined;
}

export function createBoardGrid(options: BoardGridOptions): BoardGrid {
  const { size } = options;
  const cellCount = size * size;

  const el = document.createElement('div');
  el.className = 'board-field';

  const grid = document.createElement('div');
  grid.className = `board board--${size}`;
  grid.style.setProperty('--board-size', String(size));
  grid.style.setProperty('--touch-gap', `${TOUCH.minGapPx}px`);
  grid.setAttribute('role', 'grid');
  grid.dataset['mode'] = options.mode;
  el.append(grid);

  let locked = false;

  const tiles: HTMLButtonElement[] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.dataset['cell'] = String(cell);
    // Deko-Variante: vier Grashalm-Varianten, damit das Feld nicht gestempelt wirkt.
    tile.dataset['deco'] = String(cell % 4);
    tile.setAttribute('role', 'gridcell');

    tile.addEventListener('click', () => {
      if (locked || tile.disabled) return;
      options.onTileTap?.(cell);
    });

    tiles.push(tile);
    grid.append(tile);
  }

  /** Setzt eine Platte komplett zurueck, bevor sie neu beschrieben wird. */
  const reset = (tile: HTMLButtonElement): void => {
    tile.className = 'tile';
    tile.replaceChildren();
    tile.disabled = false;
    tile.removeAttribute('aria-label');
  };

  /** Der Ring einer Legerfarbe ueber dem Krater (Design-Prioritaet 2). */
  const colorRing = (playerId: PlayerId): HTMLElement | null => {
    const colorId = options.colorOf(playerId);
    if (!colorId) return null;
    const ring = document.createElement('span');
    ring.className = 'tile__ring';
    ring.style.setProperty('--ring-color', hex(colorById(colorId).hex));
    // Das Symbol laeuft mit: Acht Farben allein sind nicht deuteranopie-fest (Audit A2).
    ring.innerHTML = badgeSymbolSvg(colorId);
    return ring;
  };

  const hintIcon = (hint: Hint): HTMLElement | null => {
    if (hint === 'none') return null;
    const icon = document.createElement('span');
    icon.className = `tile__hint tile__hint--${hint}`;
    icon.textContent = HINT_ICON[hint];
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  };

  const namesOf = (ids: readonly PlayerId[]): string =>
    ids.map((id) => options.nameOf?.(id) ?? '?').join(', ');

  /** Eine aufgegrabene Zelle darstellen — der einzige Ort, an dem `kind` interpretiert wird. */
  const paintOpened = (tile: HTMLButtonElement, opened: OpenedCell, index: number): void => {
    reset(tile);
    tile.disabled = true;
    tile.classList.add('tile--open', `tile--${opened.kind}`);
    if (opened.byChain) tile.classList.add('tile--chained');

    switch (opened.kind) {
      /*
       * `empty` ist auch der stumme eigene Trittstein (ADR-2). Es gibt hier bewusst
       * keinen Zweig dafuer — die Daten geben gar nicht her, welcher Fall es war.
       */
      case 'empty': {
        if (opened.critter) {
          const critter = document.createElement('span');
          critter.className = 'tile__critter';
          critter.textContent = CRITTER_ICON[opened.critter];
          critter.setAttribute('aria-hidden', 'true');
          tile.append(critter);
        }
        tile.setAttribute(
          'aria-label',
          t('a11y.plateEmpty', { index: index + 1, hint: t(`hint.${opened.hint}`) })
        );
        break;
      }

      case 'crater':
      case 'greed': {
        for (const layer of opened.blamed) {
          const ring = colorRing(layer);
          if (ring) tile.append(ring);
        }
        tile.setAttribute(
          'aria-label',
          t('a11y.plateCrater', { index: index + 1, names: namesOf(opened.blamed) })
        );
        break;
      }

      case 'dud': {
        const puff = document.createElement('span');
        puff.className = 'tile__puff';
        puff.textContent = '💨';
        puff.setAttribute('aria-hidden', 'true');
        tile.append(puff);
        for (const layer of opened.blamed) {
          const ring = colorRing(layer);
          if (ring) tile.append(ring);
        }
        tile.setAttribute(
          'aria-label',
          t('a11y.plateCrater', { index: index + 1, names: namesOf(opened.blamed) })
        );
        break;
      }

      case 'treasure': {
        tile.setAttribute('aria-label', t('a11y.plateTreasure', { index: index + 1 }));
        break;
      }
    }

    // "Preis der Gier": Krater **und** Kiste — beide Zeichen muessen zu sehen sein.
    if (opened.kind === 'treasure' || opened.kind === 'greed') {
      const chest = document.createElement('span');
      chest.className = 'tile__chest';
      chest.textContent = '🍺';
      chest.setAttribute('aria-hidden', 'true');
      tile.append(chest);
    }

    const hint = hintIcon(opened.hint);
    if (hint) tile.append(hint);
  };

  const api: BoardGrid = {
    el,

    renderPublic(view) {
      grid.dataset['mode'] = 'dig';
      for (let cell = 0; cell < cellCount; cell++) {
        const tile = tiles[cell]!;
        const opened = view.opened[cell];
        if (opened) {
          paintOpened(tile, opened, cell);
        } else {
          reset(tile);
          tile.classList.add('tile--covered');
          tile.setAttribute('aria-label', t('a11y.plateCovered', { index: cell + 1 }));
        }
      }
    },

    renderPlace(view, tool) {
      grid.dataset['mode'] = 'place';
      grid.dataset['tool'] = tool;
      for (let cell = 0; cell < cellCount; cell++) {
        const tile = tiles[cell]!;
        reset(tile);
        tile.classList.add('tile--covered');

        const isMine = view.ownMines.includes(cell);
        const isDud = view.ownDuds.includes(cell);
        if (isMine || isDud) {
          tile.classList.add('tile--armed', isMine ? 'tile--mine' : 'tile--dud-placed');
          const bomb = document.createElement('span');
          bomb.className = 'tile__bomb';
          bomb.textContent = isMine ? '💣' : '🧨';
          bomb.setAttribute('aria-hidden', 'true');
          tile.append(bomb);
        }
        tile.setAttribute('aria-label', t('a11y.plateCovered', { index: cell + 1 }));
      }
    },

    renderReplay(view) {
      grid.dataset['mode'] = 'replay';
      for (const replayCell of view.cells) {
        const tile = tiles[replayCell.cell]!;

        if (replayCell.opened) {
          paintOpened(tile, replayCell.opened, replayCell.cell);
        } else {
          reset(tile);
          tile.classList.add('tile--covered');
        }
        tile.disabled = true;

        // Jetzt darf alles sichtbar werden — der Aha-Moment der Runde (GDD §4.4).
        for (const owner of replayCell.mineOwners) {
          const ring = colorRing(owner);
          if (!ring) continue;
          ring.classList.add('tile__ring--revealed');
          tile.append(ring);
        }
        for (const owner of replayCell.dudOwners) {
          const ring = colorRing(owner);
          if (!ring) continue;
          ring.classList.add('tile__ring--revealed', 'tile__ring--dud');
          tile.append(ring);
        }

        if (replayCell.neverTriggered) {
          tile.classList.add('tile--phew');
          const phew = document.createElement('span');
          phew.className = 'tile__phew';
          phew.textContent = t('result.phew');
          tile.append(phew);
          tile.setAttribute(
            'aria-label',
            t('a11y.plateMine', { index: replayCell.cell + 1, name: namesOf(replayCell.mineOwners) })
          );
        }

        if (replayCell.treasure && !replayCell.opened) {
          const chest = document.createElement('span');
          chest.className = 'tile__chest';
          chest.textContent = '🍺';
          chest.setAttribute('aria-hidden', 'true');
          tile.append(chest);
        }
      }
    },

    setLocked(value) {
      locked = value;
      grid.classList.toggle('is-locked', value);
      grid.setAttribute('aria-busy', String(value));
    },

    get locked() {
      return locked;
    },

    tileAt(cell) {
      return tiles[cell];
    },
  };

  return api;
}
