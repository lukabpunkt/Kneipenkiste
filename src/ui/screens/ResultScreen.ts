/**
 * Result (GDD §3.8, §5 Screen 8).
 *
 * Banner je Fall, eine Zeile pro Trinker, die Tresor-Vorschau fuer die naechste Runde
 * und — aufklappbar — die Statistik, die das Spiel ueber den Abend traegt: Scoreboard,
 * Vertrauens-Index, Verrats-Streak, "Meistbetrogen" (GDD §7).
 */

import { t } from '@/core/i18n';
import { mostBetrayed, traitorOfTheEvening } from '@/core/session';
import { shareText } from '@/core/share';
import type { Drinker, RoundResult } from '@/core/types';
import { vaultSpec } from '@/core/vault';
import { countUp, growBar, safeAnimate } from '@/ui/animate';
import { colorById, hex } from '@/config/theme';
import { createPlayerBadge } from '@/ui/components/badge';
import { createButton } from '@/ui/components/button';
import { INSTALL_PROMPT_AFTER_ROUNDS } from '@/config/rules';
import { canOfferInstall, offerInstall } from '@/ui/install';
import { openSheet } from '@/ui/components/sheet';
import { showToast } from '@/ui/components/toast';
import { createVaultWidget } from '@/ui/components/vaultWidget';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

export function createResultScreen(ctx: ScreenContext): ScreenInstance {
  const result = ctx.fsm.context.result;

  const el = document.createElement('section');
  el.className = 'screen screen--result';

  if (!result) return { el };

  /* --- Banner --- */
  const banner = document.createElement('h1');
  banner.className = `result__banner result__banner--${result.outcome}`;
  banner.textContent = bannerText(result);

  // Meineid ueberlagert alles: Er ist die bessere Schlagzeile (GDD §3.8).
  if (result.perjurers.length > 0) {
    banner.classList.add('result__banner--perjury');
    banner.textContent = t('result.perjury');
  }

  const sub = document.createElement('p');
  sub.className = 'result__sub';
  sub.textContent = subLine(ctx, result);

  /* --- Trinker --- */
  const drinkers = document.createElement('ul');
  drinkers.className = 'result__drinkers';

  for (const drinker of mergeDrinkers(result.drinkers)) {
    const player = ctx.session.playerById(drinker.playerId);
    if (!player) continue;

    const row = document.createElement('li');
    row.className = `result__drinker result__drinker--${drinker.reason}`;
    row.append(createPlayerBadge({ colorId: player.colorId, size: 'sm' }));

    const text = document.createElement('span');
    text.className = 'result__drinkerText';
    text.textContent = t('result.drinks', { name: player.name, count: drinker.sips });
    row.append(text);

    if (drinker.reason === 'fee' || drinker.reason === 'perjury') {
      const tag = document.createElement('span');
      tag.className = 'result__tag';
      tag.textContent = drinker.reason === 'fee' ? t('result.fee') : t('result.perjury');
      row.append(tag);
    }

    drinkers.append(row);
  }

  if (result.drinkers.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'result__drinker';
    empty.textContent = t('result.noStatsYet');
    drinkers.append(empty);
  }

  /* --- Tresor-Vorschau --- */
  const preview = document.createElement('div');
  preview.className = 'result__vault';

  const widget = createVaultWidget({
    vault: result.vault,
    spec: vaultSpec(ctx.fsm.context.settings),
    size: 'sm',
  });

  const vaultNote = document.createElement('p');
  vaultNote.className = 'result__vaultNote';
  vaultNote.textContent =
    result.outcome === 'jackpot'
      ? t('result.vaultBurst')
      : result.nextVault > result.vault
        ? t('result.vaultGrows', { vault: result.nextVault })
        : t('result.vaultReset');

  preview.append(widget.el, vaultNote);

  /* --- Aktionen --- */
  const actions = document.createElement('div');
  actions.className = 'result__actions';

  const stats = createButton({
    label: t('result.stats'),
    variant: 'secondary',
    onClick: () => openStats(),
  });

  const share = createButton({
    label: t('share.cta'),
    variant: 'ghost',
    onClick: () => void shareRound(),
  });

  const changePlayers = createButton({
    label: t('result.changePlayers'),
    variant: 'ghost',
    onClick: () => {
      if (!ctx.fsm.send({ type: 'changePlayers' })) return;
      void ctx.router.go('lobby', { direction: 'back' });
    },
  });

  const next = createButton({
    label: t('result.nextRound'),
    variant: 'primary',
    className: 'btn--block',
    wobble: true,
    onClick: () => {
      ctx.fsm.setVault(ctx.session.state.vault);
      if (!ctx.fsm.send({ type: 'nextRound' })) return;
      void ctx.router.go(ctx.fsm.state === 'SILENCE' ? 'silence' : 'negotiation');
    },
  });

  actions.append(stats, share, changePlayers);
  el.append(banner, sub, drinkers, preview, actions, next);

  /*
   * Das Installationsangebot haengt unten am Result und nur dort: Es ist die einzige
   * Stelle im Spiel, an der gerade niemand auf etwas wartet (Roadmap M6.3).
   */
  const installRow = document.createElement('div');
  installRow.className = 'result__install';
  installRow.hidden = true;

  const installButton = createButton({
    label: t('install.cta'),
    variant: 'ghost',
    onClick: () => {
      void offerInstall().then(() => {
        installRow.hidden = true;
      });
    },
  });

  const installHint = document.createElement('p');
  installHint.className = 'result__installHint';
  installHint.textContent = t('install.hint');

  installRow.append(installButton, installHint);
  el.append(installRow);

  /* ---------------------------------------------------------------- */

  /**
   * Teilt den Satz zur Runde ueber das Betriebssystem (GDD §3.8).
   *
   * Drei Stufen, weil die Web-Share-API nur auf dem Handy und nur im sicheren Kontext
   * existiert: teilen, sonst kopieren, sonst den Satz wenigstens zeigen. Ein Knopf, der
   * kommentarlos nichts tut, ist schlimmer als keiner.
   */
  async function shareRound(): Promise<void> {
    const text = shareText({ result: result!, players: ctx.session.state.players });

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: t('share.title'), text });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast(t('share.copied'));
        return;
      }
    } catch {
      /*
       * Abbrechen ist der Normalfall, kein Fehler: Wer das Share-Blatt zumacht, hat sich
       * entschieden. Wir zeigen den Satz trotzdem — dann war der Tap nicht umsonst.
       */
    }
    showToast(text, { durationMs: 6000 });
  }

  function openStats(): void {
    const content = document.createElement('div');
    content.className = 'score';

    const session = ctx.session.state;
    const board = ctx.session.stats();
    const max = Math.max(1, ...board.map((entry) => entry.sips));

    const title = document.createElement('p');
    title.className = 'score__title';
    title.textContent = t('result.scoreboard');
    content.append(title);

    board.forEach((entry, index) => {
      const player = ctx.session.playerById(entry.playerId);
      if (!player) return;
      const row = document.createElement('div');
      row.className = 'score__row';

      const name = document.createElement('span');
      name.className = 'score__name';
      name.textContent = player.name;

      const bar = document.createElement('span');
      bar.className = 'score__bar';
      bar.style.setProperty('--score-color', hex(colorById(player.colorId).hex));

      const value = document.createElement('span');
      value.className = 'score__value';

      row.append(name, bar, value);
      content.append(row);

      growBar(bar, (entry.sips / max) * 100, index * 60);
      countUp(value, entry.sips, { delayMs: index * 60 });
    });

    const trustTitle = document.createElement('p');
    trustTitle.className = 'score__title';
    trustTitle.textContent = t('result.trustIndex');
    content.append(trustTitle);

    for (const entry of board) {
      const player = ctx.session.playerById(entry.playerId);
      if (!player) continue;
      const row = document.createElement('div');
      row.className = 'score__row score__row--trust';

      const name = document.createElement('span');
      name.className = 'score__name';
      name.textContent = player.name;

      const bar = document.createElement('span');
      bar.className = 'score__bar';
      bar.style.setProperty('--score-color', hex(colorById(player.colorId).hex));

      const value = document.createElement('span');
      value.className = 'score__value';
      value.textContent = entry.trustIndex === null ? '–' : `${entry.trustIndex}%`;

      row.append(name, bar, value);
      content.append(row);
      growBar(bar, entry.trustIndex ?? 0, 0);
    }

    const footer = document.createElement('div');
    footer.className = 'score__footer';

    const streakLeader = [...board].sort((a, b) => b.longestBetrayalStreak - a.longestBetrayalStreak)[0];
    if (streakLeader && streakLeader.longestBetrayalStreak > 0) {
      footer.append(
        note(
          t('result.betrayalStreak'),
          `${ctx.session.playerById(streakLeader.playerId)?.name ?? ''} · ${streakLeader.longestBetrayalStreak}`
        )
      );
    }

    const betrayedId = mostBetrayed(session);
    if (betrayedId) {
      footer.append(note(t('result.mostBetrayed'), ctx.session.playerById(betrayedId)?.name ?? ''));
    }

    /*
     * Der Titel des Abends steht als Abzeichen da, nicht als Zeile: Er ist die einzige
     * Auszeichnung im Spiel, und Auszeichnungen sehen anders aus als Statistik.
     */
    const traitorId = traitorOfTheEvening(session);
    const traitor = traitorId ? ctx.session.playerById(traitorId) : undefined;
    if (traitor) {
      const award = document.createElement('div');
      award.className = 'score__award';
      award.append(createPlayerBadge({ colorId: traitor.colorId, size: 'sm' }));

      const text = document.createElement('span');
      text.className = 'score__awardText';
      text.textContent = `${t('result.traitor')}: ${traitor.name}`;
      award.append(text);
      footer.append(award);
    }

    if (footer.childElementCount > 0) content.append(footer);

    openSheet({ title: t('result.stats'), content });
  }

  return {
    el,
    activate() {
      /*
       * Das Banner faehrt von links ein (Art Direction §4.6). Es steht schon im DOM,
       * bevor der Wipe aufgeht — die Bewegung startet deshalb hier und nicht beim Bau,
       * sonst waere sie hinter dem Wipe schon vorbei.
       */
      void safeAnimate(
        banner,
        [
          { transform: 'translateX(-115%) rotate(-4deg)', opacity: 0 },
          { transform: 'translateX(4%) rotate(1deg)', opacity: 1, offset: 0.72 },
          { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
        ],
        { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' }
      );

      // Die Vorschau zeigt erst den alten Stand und wechselt dann sichtbar auf den neuen —
      // sonst merkt niemand, dass der Tresor gewachsen oder geleert wurde.
      globalThis.setTimeout(() => {
        widget.set(result.nextVault, result.nextVault > result.vault ? 'grow' : 'drain');
      }, 420);
      /*
       * Erst ab der zweiten gespielten Runde fragen — und nur, wenn der Browser ueberhaupt
       * ein Angebot gemacht hat. Safari kennt `beforeinstallprompt` nicht; dort bleibt die
       * Zeile aus, statt eine Anleitung auf einen Ergebnis-Screen zu schreiben.
       */
      if (
        ctx.session.state.rounds.length >= INSTALL_PROMPT_AFTER_ROUNDS &&
        canOfferInstall()
      ) {
        installRow.hidden = false;
      }

      next.focus({ preventScroll: true });
    },
  };
}

function note(label: string, value: string): HTMLElement {
  const row = document.createElement('p');
  row.className = 'score__note';
  row.textContent = `${label}: ${value}`;
  return row;
}

function bannerText(result: RoundResult): string {
  return t(`result.${result.outcome}`);
}

/**
 * Die Zeile unter dem Banner nennt Namen — das Banner nennt nur den Fall.
 *
 * Beides kann gleichzeitig gelten: Der Maulwurf kann der Alleindieb sein. Dann stehen
 * die Verteilung **und** die Enthuellung da, sonst faellt die Pointe unter den Tisch.
 */
function subLine(ctx: ScreenContext, result: RoundResult): string {
  const parts: string[] = [];

  if (result.outcome === 'soloSteal') {
    const thief = ctx.session.playerById(result.distributorId ?? '');
    const detail = result.drinkers
      .filter((d) => d.reason === 'distributed')
      .map((d) => `${ctx.session.playerById(d.playerId)?.name ?? ''} ${d.sips}`)
      .join(', ');
    parts.push(t('result.distributionLine', { name: thief?.name ?? '', detail }));
  }

  if (result.moleId && ctx.fsm.context.settings.modes.mole) {
    parts.push(`${t('result.mole')}: ${ctx.session.playerById(result.moleId)?.name ?? ''}`);
  }

  return parts.join(' · ');
}

/** Ein Spieler kann aus zwei Gruenden trinken (Meineid + Verteilung) — eine Zeile je Grund. */
function mergeDrinkers(drinkers: readonly Drinker[]): Drinker[] {
  return drinkers.filter((drinker) => drinker.sips > 0);
}
