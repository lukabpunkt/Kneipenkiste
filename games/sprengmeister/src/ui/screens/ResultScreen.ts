/**
 * Result (GDD §5, Screen 7, §3.7).
 *
 * Der zweite grosse Moment einer Runde ist nicht das Banner, sondern das **Feld-Replay**:
 * Jetzt klappen alle Platten auf, und man sieht, wo die Minen lagen, auf die niemand
 * getreten ist. "DA lag deine Mine? Direkt neben meinem Zug!" — das ist der Satz, der
 * die naechste Runde motiviert (GDD §7). Deshalb steht das Feld hier oben und nicht
 * unter den Zahlen.
 */

import { t } from '@/core/i18n';
import { colorById, hex, UI_TIMING } from '@/config/theme';
import { cowards, masterBonuses } from '@/core/modes';
import { countUp, growBar } from '@/ui/animate';
import { totalSips } from '@/core/payout';
import { deadliestLayer, mostBlasted, sessionStats } from '@/core/session';
import { createPlayerBadge } from '@/ui/components/badge';
import { createButton } from '@/ui/components/button';
import { createStageHost } from '@/ui/components/stageHost';
import { openSheet } from '@/ui/components/sheet';
import { showToast } from '@/ui/components/toast';
import { share, shareText } from '@/ui/share';
import type { ScreenFactory } from '@/ui/router';
import type { PlayerId } from '@/core/types';

export const createResultScreen: ScreenFactory = ({ fsm, session, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--result';

  const result = fsm.context.result;
  /** Laufende Count-Ups — beim Verlassen abbrechen, sonst tickt ein toter Screen weiter. */
  const stopCountUps: (() => void)[] = [];
  const playerById = (id: PlayerId) => fsm.context.players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => playerById(id)?.name;

  /* --- Banner --------------------------------------------------- */

  const banner = document.createElement('h1');
  banner.className = 'result__banner';
  if (result) {
    const finders = result.finderIds.map((id) => nameOf(id) ?? '').filter(Boolean);
    const greedy = result.digs.some((dig) => dig.kind === 'greed');
    banner.textContent = greedy
      ? t('result.greed')
      : finders.length > 1
        ? t('result.doubleFind')
        : t('result.finder', { name: finders[0] ?? '' });
  }

  /* --- Feld-Replay ---------------------------------------------- */

  const stage = createStageHost();

  /* --- Trinker und Kill-Feed ------------------------------------ */

  const drinkers = document.createElement('section');
  drinkers.className = 'result__section';
  if (result) {
    const heading = document.createElement('h2');
    heading.className = 'result__section-title';
    heading.textContent = t('result.drinkers');
    drinkers.append(heading);

    const list = document.createElement('ul');
    list.className = 'result__drinkers';

    /*
     * Die Zeilen sind nach Schlucken sortiert, und der laengste Balken ist der
     * Spitzenreiter. Ein Balken sagt in einem Blick, was eine Zahlenkolonne erst nach
     * dem Lesen sagt — und am Tisch schaut man hier hoechstens zwei Sekunden hin.
     */
    const sips = Object.entries(totalSips(result))
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    const worst = sips[0]?.[1] ?? 0;

    sips.forEach(([playerId, count], index) => {
      const player = playerById(playerId);
      if (!player) return;

      const row = document.createElement('li');
      row.className = 'result__drinker';
      row.append(createPlayerBadge({ colorId: player.colorId, size: 'sm' }));

      const name = document.createElement('span');
      name.className = 'result__drinker-name';
      name.textContent = player.name;

      const bar = document.createElement('span');
      bar.className = 'result__bar';
      bar.style.setProperty('--bar-color', hex(colorById(player.colorId).hex));

      const value = document.createElement('span');
      value.className = 'result__drinker-sips';

      row.append(name, bar, value);
      list.append(row);

      // Balken und Zahl laufen versetzt an — von oben nach unten, wie man liest.
      const delay = index * UI_TIMING.staggerMs;
      growBar(bar, worst === 0 ? 0 : Math.round((count / worst) * 100), delay);
      stopCountUps.push(countUp(value, count, { delayMs: delay }));
    });

    if (list.childElementCount > 0) drinkers.append(list);
  }

  /* --- Sprengmeister und Feigling (GDD §3.6) --------------------- */

  /**
   * Die beiden Titel des Sprengmeister-Bonus.
   *
   * Sie stehen **ueber** den Trinkern, nicht in der Statistik: Wer zwei Leute erwischt
   * hat, soll das sofort sehen, und wer sich durch die eigene Runde geschlichen hat,
   * auch. Ohne den Modus ist der Block leer und faellt weg.
   */
  const titles = document.createElement('div');
  titles.className = 'result__titles';
  if (result) {
    const modes = fsm.context.settings.modes;
    for (const [playerId] of Object.entries(masterBonuses(result.digs, modes))) {
      const player = playerById(playerId);
      if (!player) continue;
      titles.append(titleChip(t('result.masterBonus', { name: player.name }), 'master'));
    }
    for (const playerId of cowards(result.digs, modes)) {
      const player = playerById(playerId);
      if (!player) continue;
      titles.append(titleChip(t('result.coward', { name: player.name }), 'coward'));
    }
  }

  /** Der gefaehrlichste Leger der ganzen Session — ein Abzeichen, keine Tabellenzeile. */
  const deadliest = deadliestLayer(session.state);
  if (deadliest) {
    const player = playerById(deadliest);
    if (player) titles.append(titleChip(`${t('result.deadliest')}: ${player.name}`, 'deadliest'));
  }

  const killFeed = document.createElement('section');
  killFeed.className = 'result__section';
  if (result && result.kills.length > 0) {
    const heading = document.createElement('h2');
    heading.className = 'result__section-title';
    heading.textContent = t('result.killFeed');
    killFeed.append(heading);

    const list = document.createElement('ul');
    list.className = 'result__kills';

    for (const kill of result.kills) {
      const layer = playerById(kill.layer);
      const victim = playerById(kill.victim);
      if (!layer || !victim) continue;

      const row = document.createElement('li');
      row.className = 'kill-feed';
      row.append(createPlayerBadge({ colorId: layer.colorId, size: 'sm' }));

      const text = document.createElement('span');
      text.className = 'kill-feed__text';
      text.textContent = t('dig.killFeed', { layer: layer.name, victim: victim.name });
      row.append(text);

      row.append(createPlayerBadge({ colorId: victim.colorId, size: 'sm' }));
      list.append(row);
    }
    killFeed.append(list);
  }

  /* --- Aktionen -------------------------------------------------- */

  const actions = document.createElement('div');
  actions.className = 'result__actions';

  actions.append(
    createButton({
      label: t('result.nextRound'),
      variant: 'primary',
      className: 'btn--wide',
      onClick: () => {
        if (!fsm.send({ type: 'nextRound' })) return;
        void router.go('pass');
      },
    }),
    createButton({
      label: t('result.stats'),
      variant: 'secondary',
      onClick: () => openStatsSheet(),
    }),
    createButton({
      label: t('result.changePlayers'),
      variant: 'ghost',
      onClick: () => {
        if (!fsm.send({ type: 'changePlayers' })) return;
        void router.go('lobby', { direction: 'back' });
      },
    })
  );

  /*
   * Der Teilen-Knopf erscheint nur, wenn es etwas zu erzaehlen gibt — hat niemand
   * jemanden erwischt, waere der Satz leer und der Knopf eine Enttaeuschung.
   */
  const story = result ? shareText(result, (id) => nameOf(id)) : undefined;
  if (story) {
    actions.append(
      createButton({
        label: t('result.shareButton'),
        variant: 'ghost',
        onClick: () => {
          void share(story).then((outcome) => {
            if (outcome === 'copied') showToast(t('result.shareCopied'), { variant: 'info' });
            else if (outcome === 'unavailable') showToast(story, { variant: 'info' });
          });
        },
      })
    );
  }

  el.append(banner, stage.el, titles, drinkers, killFeed, actions);

  /* ---------------------------------------------------------------- */

  /** Ein Titel-Abzeichen. `kind` steuert nur die Farbe, nicht den Inhalt. */
  function titleChip(text: string, kind: 'master' | 'coward' | 'deadliest'): HTMLElement {
    const chip = document.createElement('p');
    chip.className = `result__title result__title--${kind}`;
    chip.textContent = text;
    return chip;
  }

  /** Session-Statistik (GDD §3.7) — aufklappbar, damit sie den Moment nicht zerredet. */
  function openStatsSheet(): void {
    const content = document.createElement('div');
    content.className = 'stats';

    const stats = sessionStats(session.state);
    if (stats.every((row) => row.digs === 0 && row.sips === 0)) {
      const empty = document.createElement('p');
      empty.textContent = t('stats.empty');
      content.append(empty);
    } else {
      const table = document.createElement('ul');
      table.className = 'stats__list';

      for (const row of stats) {
        const player = playerById(row.playerId);
        if (!player) continue;

        const item = document.createElement('li');
        item.className = 'stats__row';
        item.append(createPlayerBadge({ colorId: player.colorId, name: player.name, size: 'sm' }));

        const numbers = document.createElement('div');
        numbers.className = 'stats__numbers';
        for (const [label, value] of [
          [t('stats.sips'), row.sips],
          [t('stats.blastsCaused'), row.blastsCaused],
          [t('stats.blastsTaken'), row.blastsTaken],
          [t('stats.chestsFound'), row.chestsFound],
        ] as [string, number][]) {
          const cell = document.createElement('span');
          cell.className = 'stats__cell';
          cell.textContent = `${label}: ${value}`;
          numbers.append(cell);
        }

        item.append(numbers);
        table.append(item);
      }
      content.append(table);

      const titles = document.createElement('div');
      titles.className = 'stats__titles';
      for (const [label, playerId] of [
        [t('stats.mostBlasted'), mostBlasted(session.state)],
        [t('stats.deadliestLayer'), deadliestLayer(session.state)],
      ] as [string, PlayerId | undefined][]) {
        if (!playerId) continue;
        const holder = playerById(playerId);
        if (!holder) continue;

        const chip = document.createElement('p');
        chip.className = 'stats__title';
        chip.textContent = `${label}: ${holder.name}`;
        titles.append(chip);
      }
      if (titles.childElementCount > 0) content.append(titles);
    }

    openSheet({ title: t('result.stats'), content });
  }

  return {
    el,

    activate() {
      /*
       * `fsm.replay()` ist der einzige Board-Ausgang, der alles zeigt — und hier ist er
       * erlaubt: Die Runde ist vorbei, es gibt nichts mehr zu verraten. Das ist der
       * zweite grosse Moment (GDD §4.4, §7).
       */
      void stage.mount(fsm, 'replay').then((board) => {
        board.renderReplay(fsm.replay());
      });
    },

    destroy() {
      for (const stop of stopCountUps) stop();
      stage.unmount();
    },
  };
};
