/**
 * Distribute-Schnellmodus (ADR-5, Art Direction §4.6).
 *
 * Wenn fünf Leute je einen Schluck verteilen, wäre die Einzel-Iteration mit Pass-Screens
 * länger als die ganze Show. Also öffentlich: oben die Reihe der Verteiler, unten das
 * Badge-Grid der Empfänger. Wer dran ist, leuchtet; ein Tap setzt sein Ziel und schaltet
 * weiter. Kein Pass-Screen, kein Geheimnis — verteilt wird ohnehin vor aller Augen.
 */

import { t } from '@/core/i18n';
import { createBadge } from './badge';
import { createTokenStack } from './tokenStack';
import type { ColorId } from '@/config/theme';
import type { Distribution, PlayerId } from '@/core/types';

export interface QuickDistributePlayer {
  id: PlayerId;
  name: string;
  colorId: ColorId;
}

export interface QuickDistributeOptions {
  /** Wer verteilt, in Reihenfolge — jeder mit seinem Guthaben. */
  givers: (QuickDistributePlayer & { sips: number })[];
  /** Alle Spieler; ein Verteiler kann nicht sich selbst wählen. */
  players: QuickDistributePlayer[];
  onComplete: (distribution: Distribution[]) => void;
}

export interface QuickDistribute {
  el: HTMLElement;
}

export function createQuickDistribute(options: QuickDistributeOptions): QuickDistribute {
  const distribution: Distribution[] = [];
  let index = 0;

  const el = document.createElement('div');
  el.className = 'quick';

  const headline = document.createElement('h2');
  headline.className = 'quick__headline';
  headline.textContent = t('distribute.quickHeadline');

  const givers = document.createElement('div');
  givers.className = 'quick__givers';

  const prompt = document.createElement('p');
  prompt.className = 'quick__prompt';
  prompt.setAttribute('aria-live', 'polite');

  const grid = document.createElement('div');
  grid.className = 'quick__targets';

  el.append(headline, givers, prompt, grid);

  const renderGivers = (): void => {
    givers.replaceChildren();
    options.givers.forEach((giver, i) => {
      const row = document.createElement('div');
      row.className = 'quick__giver';
      row.dataset.state = i < index ? 'done' : i === index ? 'active' : 'waiting';

      row.append(createBadge({ name: giver.name, colorId: giver.colorId, small: true }));
      row.append(createTokenStack({ count: giver.sips, colorId: giver.colorId, small: true }));

      const target = distribution.find((d) => d.from === giver.id);
      const arrow = document.createElement('span');
      arrow.className = 'quick__arrow';
      arrow.textContent = target
        ? `→ ${options.players.find((p) => p.id === target.to)?.name ?? target.to}`
        : '→ ?';
      row.append(arrow);

      givers.append(row);
    });
  };

  const renderTargets = (): void => {
    grid.replaceChildren();
    const current = options.givers[index];
    if (!current) return;

    prompt.textContent = `${current.name}: ${t('distribute.prompt')}`;

    for (const player of options.players) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick__target';
      /* An sich selbst geht nicht — sonst wäre Verteilen folgenlos (Audit A1). */
      button.disabled = player.id === current.id;
      button.append(createBadge({ name: player.name, colorId: player.colorId, small: true }));
      button.addEventListener('click', () => choose(player.id));
      grid.append(button);
    }
  };

  const choose = (to: PlayerId): void => {
    const current = options.givers[index];
    if (!current) return;

    distribution.push({ from: current.id, to, sips: current.sips });
    index += 1;
    renderGivers();

    if (index >= options.givers.length) {
      grid.replaceChildren();
      prompt.textContent = '';
      options.onComplete(distribution);
      return;
    }
    renderTargets();
  };

  renderGivers();
  renderTargets();

  return { el };
}
