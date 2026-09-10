/**
 * Die Brücke von oben (Art Direction §4.1, ADR-4).
 *
 * Ein Inline-SVG, kein PIXI: Wahl und Übersicht sind Buttons und Listen, kein
 * Rendering-Problem. Dieselbe Komponente steht in Negotiation, Choose und Result — nur
 * mit anderen Zuständen pro Balken. Das ist Absicht: Wer in der Absprache auf die 3
 * schaut, soll im Result denselben Balken wiedererkennen.
 *
 * Zustände je Balken (Art Direction §4.1):
 *   normal · selected · flagged · flaggedConflict · resultSafe · resultCollision · resultRotten · removed
 *
 * Die Lücke eines abgefaulten Balkens bleibt sichtbar — sonst rutschen die Nummern
 * zusammen und "Balken 4 ist abgefault" ergibt nächste Runde keinen Sinn mehr.
 */

import { LAYOUT, colorById, hex, plankHeightFor, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { PlankId, PlayerId } from '@/core/types';

export type PlankState =
  | 'normal'
  | 'selected'
  | 'flagged'
  /** Zwei oder mehr Fahnen auf demselben Balken — der Streit, um den es geht (GDD §3.2). */
  | 'flaggedConflict'
  | 'resultSafe'
  | 'resultCollision'
  | 'resultRotten';

export interface PlankMarker {
  playerId: PlayerId;
  colorId: ColorId;
  /** Nur ein Umriss: die Fahne steht neben der tatsächlichen Wahl, nicht auf ihr. */
  flag?: boolean;
}

export interface PlankModel {
  id: PlankId;
  state: PlankState;
  /** Hiker-Köpfe bzw. Fahnen, die auf diesem Balken sitzen. */
  markers?: PlankMarker[];
  /** Als Button bedienbar? Nur im Choose-Screen. */
  onSelect?: () => void;
  disabled?: boolean;
}

export interface BridgeTopOptions {
  planks: PlankModel[];
  /** Abgefaulte Balken — sie erscheinen als Lücke mit Schild. */
  removed?: PlankId[];
  /** Höhe pro Balken; ohne Angabe aus der Gesamtzahl abgeleitet (≥ 56 px, ≥ 48 eng). */
  plankHeightPx?: number;
  /**
   * Nur ansehen, nicht antippen (Negotiation, Result, Step). Dann gilt die
   * Touch-Ziel-Regel nicht — und die Brücke passt komplett auf den Screen.
   */
  display?: boolean;
  /** Nummernschilder anzeigen. Im Result verdecken sie sonst die Köpfe. */
  showSigns?: boolean;
  /**
   * Die Balken klappen nacheinander auf (Result, Roadmap M5.3). Das ist kein Schmuck:
   * Die Welle läuft von Balken 1 nach rechts und zwingt den Blick, die Brücke einmal
   * ganz abzugehen — statt sofort auf der eigenen Farbe zu landen.
   */
  wave?: boolean;
  ariaLabel?: string;
}

const SIGN_TILTS = [-4, 3, -2, 4, -3, 2, -4, 3, -2, 4] as const;

/**
 * Baut die Brücke.
 *
 * Reihenfolge im DOM = Reihenfolge auf der Brücke: Ein Screenreader liest sie von
 * Balken 1 nach rechts durch, genauso wie ein Auge.
 */
export function createBridgeTop(options: BridgeTopOptions): HTMLElement {
  const removed = options.removed ?? [];
  const rows = [...options.planks.map((p) => ({ kind: 'plank' as const, plank: p })), ...removed.map((id) => ({ kind: 'gap' as const, id }))];

  /* Lücken stehen an ihrer Nummer, nicht am Ende — sonst wandert die Brücke. */
  rows.sort((a, b) => (a.kind === 'plank' ? a.plank.id : a.id) - (b.kind === 'plank' ? b.plank.id : b.id));

  const height =
    options.plankHeightPx ?? (options.display === true ? LAYOUT.plankDisplayHeightPx : plankHeightFor(options.planks.length));

  const el = document.createElement('div');
  el.className = 'bridge';
  el.style.setProperty('--plank-height', `${height}px`);
  if (options.ariaLabel) {
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', options.ariaLabel);
  }

  /* Die beiden Seile: im Leerlauf schwingen sie leicht (CSS, 4 s). */
  for (const side of ['left', 'right'] as const) {
    const rope = document.createElement('span');
    rope.className = `bridge__rope bridge__rope--${side}`;
    rope.setAttribute('aria-hidden', 'true');
    el.append(rope);
  }

  const list = document.createElement('div');
  list.className = 'bridge__planks';
  if (options.wave === true) list.dataset.wave = 'true';
  el.append(list);

  rows.forEach((row, index) => {
    const node = row.kind === 'gap' ? createGap(row.id) : createPlank(row.plank, options.showSigns !== false, index);
    if (options.wave === true) node.style.setProperty('--row-index', String(index));
    list.append(node);
  });

  return el;
}

function createGap(id: PlankId): HTMLElement {
  const gap = document.createElement('div');
  gap.className = 'plank plank--removed';
  gap.setAttribute('role', 'presentation');

  const sign = document.createElement('span');
  sign.className = 'plank__rot-sign';
  sign.textContent = t('step.rotSign', { plank: id });
  gap.append(sign);
  return gap;
}

function createPlank(model: PlankModel, showSign: boolean, index: number): HTMLElement {
  const interactive = typeof model.onSelect === 'function';

  const el = document.createElement(interactive ? 'button' : 'div');
  el.className = `plank plank--${model.state}`;
  el.dataset.plank = String(model.id);
  el.dataset.state = model.state;

  if (interactive) {
    const button = el as HTMLButtonElement;
    button.type = 'button';
    button.disabled = model.disabled === true;
    button.setAttribute('aria-label', t('choose.plankLabel', { n: model.id }));
    button.addEventListener('click', () => model.onSelect?.());
  } else {
    el.setAttribute('aria-label', describe(model));
  }

  /* Holz-Textur: zwei Streifen, mehr braucht der Cartoon-Look nicht. */
  const grain = document.createElement('span');
  grain.className = 'plank__grain';
  grain.setAttribute('aria-hidden', 'true');
  el.append(grain);

  if (showSign) {
    const sign = document.createElement('span');
    sign.className = 'plank__sign';
    sign.style.setProperty('--sign-tilt', `${SIGN_TILTS[index % SIGN_TILTS.length]}deg`);
    sign.setAttribute('aria-hidden', 'true');
    sign.textContent = String(model.id);
    el.append(sign);
  }

  const markers = model.markers ?? [];
  if (markers.length > 0) {
    const strip = document.createElement('span');
    strip.className = 'plank__markers';
    strip.setAttribute('aria-hidden', 'true');

    for (const marker of markers) {
      const color = colorById(marker.colorId);
      const dot = document.createElement('span');
      dot.className = marker.flag ? 'plank__flag' : 'plank__hiker';
      dot.style.setProperty('--marker-color', hex(color.hex));
      dot.style.setProperty('--marker-shade', hex(color.shade));
      strip.append(dot);
    }
    el.append(strip);
  }

  return el;
}

/** Was ein Screenreader auf diesem Balken vorfindet. */
function describe(model: PlankModel): string {
  const base = t('common.plank', { n: model.id });
  const count = (model.markers ?? []).filter((m) => !m.flag).length;

  if (model.state === 'flaggedConflict') {
    return `${base}: ${t('negotiation.flagConflictShort', { count: (model.markers ?? []).filter((m) => m.flag).length })}`;
  }
  if (model.state === 'resultCollision') return `${base}: ${t('banner.crash')}`;
  if (model.state === 'resultRotten') return `${base}: ${t('banner.badLuck')}`;
  if (model.state === 'resultSafe') return `${base}: ${t('result.givers')}`;
  return count > 0 ? `${base} (${count})` : base;
}

/** Reicht die Höhe für die Touch-Ziele? Der A1-Audit misst genau das. */
export function plankTouchHeight(plankCount: number): number {
  return Math.max(
    plankCount >= LAYOUT.plankTightThreshold ? LAYOUT.plankMinHeightTightPx : LAYOUT.plankMinHeightPx,
    LAYOUT.plankMinHeightTightPx
  );
}
