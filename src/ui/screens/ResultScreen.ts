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
import { totalSips } from '@/core/payout';
import { deadliestLayer, mostBlasted, sessionStats } from '@/core/session';
import { createPlayerBadge } from '@/ui/components/badge';
import { createBoardGrid } from '@/ui/components/boardGrid';
import { createButton } from '@/ui/components/button';
import { openSheet } from '@/ui/components/sheet';
import type { ScreenFactory } from '@/ui/router';
import type { PlayerId } from '@/core/types';

export const createResultScreen: ScreenFactory = ({ fsm, session, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--result';

  const result = fsm.context.result;
  const playerById = (id: PlayerId) => fsm.context.players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => playerById(id)?.name;
  const colorOf = (id: PlayerId) => playerById(id)?.colorId;

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

  const grid = createBoardGrid({
    size: fsm.view().size,
    mode: 'replay',
    colorOf,
    nameOf,
  });
  /*
   * `fsm.replay()` ist der einzige Board-Ausgang, der alles zeigt — und hier ist er
   * erlaubt: Die Runde ist vorbei, es gibt nichts mehr zu verraten.
   */
  grid.renderReplay(fsm.replay());

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

    for (const [playerId, sips] of Object.entries(totalSips(result))) {
      const player = playerById(playerId);
      if (!player || sips === 0) continue;

      const row = document.createElement('li');
      row.className = 'result__drinker';
      row.append(createPlayerBadge({ colorId: player.colorId, size: 'sm' }));

      const text = document.createElement('span');
      text.textContent = `${player.name} — ${sips}`;
      row.append(text);
      list.append(row);
    }

    if (list.childElementCount > 0) drinkers.append(list);
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

  el.append(banner, grid.el, drinkers, killFeed, actions);

  /* ---------------------------------------------------------------- */

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

  return { el };
};
