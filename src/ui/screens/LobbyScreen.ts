/**
 * Lobby (GDD §5, Screen 1).
 *
 * Spieler 3-8, Modus-Chips (kombinierbar, je mit einem Satz Erklaerung), Haerte, Dauern.
 * Unter drei Spielern startet nichts — und der Fehlertext sagt auch, warum (ADR-5).
 */

import {
  HARDNESS_IDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MODE_IDS,
  NEGOTIATION_SECONDS,
  REVEAL_PACES,
  THINK_TIMER_OPTIONS,
  type Hardness,
  type ModeId,
  type NegotiationSec,
  type RevealPace,
  type ThinkTimerSec,
} from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { createPlayerBadge } from '@/ui/components/badge';
import { showToast } from '@/ui/components/toast';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';

const REMOVE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';

export function createLobbyScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--lobby';

  /* --- Kopf --- */
  const header = document.createElement('div');
  header.className = 'lobby__header';

  const headline = document.createElement('h1');
  headline.className = 'lobby__headline';
  headline.textContent = t('lobby.headline');

  const count = document.createElement('span');
  count.className = 'lobby__count';

  header.append(headline, count);

  /* --- Spielerliste --- */
  const list = document.createElement('ul');
  list.className = 'lobby__list';

  const addButton = createButton({
    label: t('lobby.addPlayer'),
    variant: 'secondary',
    className: 'btn--block',
    onClick: () => {
      const player = ctx.session.addPlayer((index) => `${t('lobby.namePlaceholder')} ${index}`);
      if (!player) {
        showToast(t('lobby.tooManyPlayers'), { variant: 'danger' });
        return;
      }
      vibrate('tap');
      renderPlayers();
    },
  });

  /* --- Einstellungen --- */
  const options = document.createElement('div');
  options.className = 'lobby__options';

  const modes = document.createElement('div');
  modes.className = 'modes';

  const chips = document.createElement('div');
  chips.className = 'lobby__chips';

  options.append(modes, chips);

  /* --- Fuss --- */
  const footer = document.createElement('div');
  footer.className = 'lobby__footer';

  const hint = document.createElement('p');
  hint.className = 'lobby__hint';

  const cta = createButton({
    label: t('lobby.cta'),
    variant: 'primary',
    className: 'btn--block',
    wobble: true,
    onClick: () => {
      if (!ctx.session.canStart()) {
        showToast(t('lobby.tooFewPlayers'), { variant: 'danger' });
        return;
      }
      vibrate('tap');
      open();
    },
  });

  footer.append(hint, cta);
  el.append(header, list, addButton, options, footer);

  /* ---------------------------------------------------------------- */

  function renderPlayers(): void {
    const players = ctx.session.state.players;
    list.replaceChildren();

    for (const player of players) {
      const row = document.createElement('li');
      row.className = 'lobby__row';

      const badge = createPlayerBadge({ colorId: player.colorId, size: 'sm' });

      const field = document.createElement('div');
      field.className = 'lobby__field';

      const name = document.createElement('input');
      name.className = 'lobby__name';
      name.type = 'text';
      name.value = player.name;
      name.maxLength = 12;
      name.setAttribute('aria-label', t('lobby.namePlaceholder'));
      name.addEventListener('input', () => ctx.session.renamePlayer(player.id, name.value));
      field.append(name);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'lobby__remove';
      remove.innerHTML = REMOVE_ICON;
      remove.setAttribute('aria-label', `${t('common.close')} ${player.name}`);
      remove.addEventListener('click', () => {
        ctx.session.removePlayer(player.id);
        renderPlayers();
      });

      row.append(badge, field, remove);
      list.append(row);
    }

    addButton.disabled = players.length >= MAX_PLAYERS;
    count.textContent = `${players.length}/${MAX_PLAYERS}`;

    const enough = players.length >= MIN_PLAYERS;
    cta.disabled = !enough;
    hint.textContent = enough ? '' : t('lobby.tooFewPlayers');
    hint.classList.toggle('is-visible', !enough);
  }

  function renderModes(): void {
    modes.replaceChildren();
    const active = ctx.session.state.settings.modes;

    const title = document.createElement('p');
    title.className = 'settings__sectionTitle';
    title.textContent = t('modes.headline');
    modes.append(title);

    for (const id of MODE_IDS) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'modes__option';
      option.classList.toggle('is-active', active[id]);
      option.setAttribute('aria-pressed', String(active[id]));

      const name = document.createElement('span');
      name.className = 'modes__name';
      name.textContent = t(`modes.${id}`);

      // Ein Satz pro Modus — niemand liest in der Lobby einen Absatz (GDD Pfeiler 4).
      const explain = document.createElement('span');
      explain.className = 'modes__hint';
      explain.textContent = t(`modes.${id}Hint`);

      option.append(name, explain);
      option.addEventListener('click', () => {
        ctx.session.setModes({ [id]: !ctx.session.state.settings.modes[id] } as Partial<
          Record<ModeId, boolean>
        >);
        vibrate('tap');
        renderModes();
      });
      modes.append(option);
    }
  }

  /** Ein Chip pro Einstellung; Tap schaltet auf den naechsten Wert weiter. */
  function cycleChip<T>(
    label: string,
    values: readonly T[],
    current: T,
    format: (value: T) => string,
    onPick: (value: T) => void
  ): HTMLButtonElement {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';

    const labelEl = document.createElement('span');
    labelEl.className = 'chip__label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'chip__value';
    valueEl.textContent = format(current);

    chip.append(labelEl, valueEl);
    chip.addEventListener('click', () => {
      const next = values[(values.indexOf(current) + 1) % values.length]!;
      onPick(next);
      vibrate('tap');
      renderChips();
    });
    return chip;
  }

  function renderChips(): void {
    const settings = ctx.session.state.settings;
    chips.replaceChildren(
      cycleChip<Hardness>(
        t('lobby.hardness'),
        HARDNESS_IDS,
        settings.hardness,
        (id) => t(`lobby.hardness${id[0]!.toUpperCase()}${id.slice(1)}`),
        (hardness) => ctx.session.setSettings({ hardness })
      ),
      cycleChip<NegotiationSec>(
        t('lobby.negotiationTime'),
        NEGOTIATION_SECONDS,
        settings.negotiationSec,
        (sec) => t('lobby.seconds', { count: sec }),
        (negotiationSec) => ctx.session.setSettings({ negotiationSec })
      ),
      cycleChip<RevealPace>(
        t('lobby.revealPace'),
        REVEAL_PACES,
        settings.revealPace,
        (pace) => t(`lobby.pace${pace[0]!.toUpperCase()}${pace.slice(1)}`),
        (revealPace) => ctx.session.setSettings({ revealPace })
      ),
      cycleChip<ThinkTimerSec>(
        t('lobby.thinkTimer'),
        THINK_TIMER_OPTIONS,
        settings.thinkTimerSec,
        (sec) => (sec === 0 ? t('common.off') : t('lobby.seconds', { count: sec })),
        (thinkTimerSec) => ctx.session.setSettings({ thinkTimerSec })
      )
    );
  }

  function open(): void {
    ctx.fsm.setPlayers([...ctx.session.state.players]);
    ctx.fsm.setSettings(ctx.session.state.settings);
    // Der Tresor der Session ist die Wahrheit — die FSM uebernimmt ihn.
    ctx.fsm.setVault(ctx.session.state.vault);
    if (!ctx.fsm.send({ type: 'open' })) return;
    void ctx.router.go(ctx.fsm.state === 'SILENCE' ? 'silence' : 'negotiation');
  }

  /*
   * Beim Bau, nicht erst in `activate()`: Der Screen wird waehrend des Wipes schon
   * angezeigt: Eine Lobby, die erst leer ist und dann Zeilen nachschiebt, sieht kaputt aus.
   */
  ctx.session.ensureMinimumPlayers((index) => `${t('lobby.namePlaceholder')} ${index}`);
  renderPlayers();
  renderModes();
  renderChips();

  return {
    el,
    activate() {
      cta.focus({ preventScroll: true });
    },
  };
}
