/**
 * Aufdeckung — **Platzhalter** (Roadmap M1.5).
 *
 * Die echte Show ist eine PIXI-Buehne mit Tempo-Kurve, Stalls und Slow-Mo (M3). Hier
 * dreht sich stattdessen eine schlichte DOM-Kartenreihe um, eine Karte pro Sekunde.
 *
 * Zwei Dinge sind aber schon jetzt richtig, weil sie Gesetz sind (CLAUDE.md):
 *
 * 1. Die Reihenfolge kommt aus `result.revealOrder` — Teiler zuerst, Diebe zuletzt,
 *    Maulwurf als letzter Dieb.
 * 2. Tap-to-Skip gilt ab der zweiten Karte und **nie** bei der letzten.
 *
 * Damit ist das Spiel ab hier party-tauglich: Die Spannung entsteht aus der Reihenfolge,
 * nicht aus den Effekten.
 */

import { colorById, hex, textColorOn } from '@/config/theme';
import { SKIP_FROM_CARD_INDEX } from '@/config/choreo';
import { t } from '@/core/i18n';
import type { Choice, RoundResult } from '@/core/types';
import { symbolSvg } from '@/ui/components/badge';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';
import { acquireWakeLock, releaseWakeLock } from '@/ui/wakeLock';

/** Abstand zwischen zwei Karten im Platzhalter (M3 ersetzt das durch die Tempo-Kurve). */
const STEP_MS = 1000;
/** Die letzte Karte darf laenger stehen — sie ist der Moment. */
const LAST_CARD_MS = 1600;
/** Pause, bevor es zum Ergebnis geht. */
const OUTRO_MS = 900;

export function createRevealScreen(ctx: ScreenContext): ScreenInstance {
  const result = ctx.fsm.context.result;

  const el = document.createElement('section');
  el.className = 'screen screen--reveal';

  const headline = document.createElement('p');
  headline.className = 'reveal__note';
  headline.textContent = t('kassel.cardsPlease');

  const table = document.createElement('div');
  table.className = 'reveal__table';

  const hint = document.createElement('p');
  hint.className = 'reveal__hint';
  hint.textContent = t('reveal.skipHint');

  el.append(headline, table, hint);

  if (!result) {
    // Kann nur passieren, wenn der Screen ohne Runde betreten wird (Reload mitten drin).
    return { el };
  }

  const cards = result.revealOrder.map((playerId, index) =>
    buildCard(ctx, result, playerId, index === result.revealOrder.length - 1)
  );
  for (const card of cards) table.append(card.el);

  /* ---------------------------------------------------------------- */

  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const isLast = (i: number): boolean => i === cards.length - 1;

  /** Deckt Karte `i` auf und plant die naechste. */
  const step = (): void => {
    if (finished || index >= cards.length) return;
    const card = cards[index]!;
    card.reveal();

    if (isLast(index)) {
      vibrate('lastCard');
      el.classList.add('is-final');
    } else if (card.choice === 'steal') {
      // Der erste Dieb loest den Alarm aus (GDD §4.3) — hier als roter Blitz.
      vibrate('alarm');
      el.classList.add('is-alarmed');
    }

    index += 1;
    const wait = isLast(index - 1) ? LAST_CARD_MS : STEP_MS;
    timer = globalThis.setTimeout(index >= cards.length ? finish : step, wait);
  };

  const finish = (): void => {
    if (finished) return;
    finished = true;
    hint.hidden = true;
    globalThis.setTimeout(() => {
      if (!ctx.fsm.send({ type: 'showFinished' })) return;
      void ctx.router.go(ctx.fsm.state === 'DISTRIBUTE' ? 'distribute' : 'result');
    }, OUTRO_MS);
  };

  /**
   * Tap-to-Skip: Ab der zweiten Karte darf getippt werden, nie bei der letzten und nie
   * nach dem Ende (GDD §4.3). `index` zeigt auf die naechste Karte, die dran waere.
   */
  const onTap = (): void => {
    if (finished) return;
    const currentCard = index - 1;
    if (currentCard < SKIP_FROM_CARD_INDEX) return;
    if (isLast(currentCard) || index >= cards.length) return;
    if (timer !== undefined) clearTimeout(timer);
    step();
  };

  el.addEventListener('click', onTap);

  return {
    el,
    activate() {
      void acquireWakeLock();
      timer = globalThis.setTimeout(step, 500);
    },
    destroy() {
      finished = true;
      if (timer !== undefined) clearTimeout(timer);
      void releaseWakeLock();
    },
  };
}

interface RevealCard {
  el: HTMLElement;
  choice: Choice;
  reveal(): void;
}

function buildCard(ctx: ScreenContext, result: RoundResult, playerId: string, last: boolean): RevealCard {
  const player = ctx.session.playerById(playerId);
  const colorId = player?.colorId ?? 'red';
  const color = colorById(colorId);
  const choice = result.choices[playerId] ?? 'share';

  const el = document.createElement('div');
  el.className = 'revealCard';
  if (last) el.classList.add('revealCard--last');
  el.style.setProperty('--card-color', hex(color.hex));
  el.style.setProperty('--card-shade', hex(color.shade));

  const inner = document.createElement('div');
  inner.className = 'revealCard__inner';

  const back = document.createElement('div');
  back.className = 'revealCard__face revealCard__face--back';
  back.innerHTML = symbolSvg(color.symbol, hex(textColorOn(colorId)));
  if (result.oaths.includes(playerId) && ctx.fsm.context.settings.modes.oath) {
    // Wachssiegel auf der Rueckseite: Wer geschworen hat, sieht man schon vor dem Flip.
    back.classList.add('has-seal');
  }

  const front = document.createElement('div');
  front.className = `revealCard__face revealCard__face--front is-${choice}`;
  front.textContent = t(`common.${choice}`);

  inner.append(back, front);

  const name = document.createElement('span');
  name.className = 'revealCard__name';
  name.textContent = player?.name ?? '';

  el.append(inner, name);

  return {
    el,
    choice,
    reveal() {
      el.classList.add('is-revealed');
      el.classList.add(`is-${choice}`);
      // Der Maulwurf bekommt seinen Helm (GDD §4.4) — im Platzhalter als Markierung.
      if (result.moleId === playerId) el.classList.add('is-mole');
      if (result.perjurers.includes(playerId)) el.classList.add('is-perjury');
    },
  };
}
