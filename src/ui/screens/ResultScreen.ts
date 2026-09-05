/**
 * Result (GDD §5, Screen 10 / §3.8) — hier wird alles öffentlich.
 *
 * Die wichtigste Zeile ist nicht das Banner, sondern die **Hinweis-Auflösung**: "Der
 * tropfende Koffer war sauber. Reingefallen." Das ist der Lacher, der den Beamten fürs
 * nächste Mal vorsichtiger macht — und die einzige Stelle, an der `truthful` je sichtbar
 * wird (Design-Pfeiler 2).
 */

import { MOTION } from '@/config/theme';
import { t } from '@/core/i18n';
import { biggestRun } from '@/core/payout';
import { bestNose, boldestSmuggler, hitRate } from '@/core/session';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { hintIcon } from '../components/suitcaseCard';
import { openSheet } from '../components/sheet';
import { itemSetName } from './InspectScreen';
import { growBar, prefersReducedMotion, safeAnimate } from '../animate';
import { shareResult, canShare } from '../share';
import type { ScreenContext, ScreenInstance } from '../router';

export function createResultScreen(ctx: ScreenContext): ScreenInstance {
  const view = ctx.reveal();

  const el = document.createElement('main');
  el.className = 'screen screen--result';

  /* --- Banner --- */
  const banner = document.createElement('h1');
  banner.className = 'result__banner';
  banner.dataset.banner = view.banner;
  banner.textContent = bannerText();

  /* --- Wer trinkt --- */
  const drinkers = document.createElement('ul');
  drinkers.className = 'result__drinkers';

  for (const drinker of view.drinkers) {
    const item = document.createElement('li');
    item.className = 'result__drinker';
    item.append(
      createBadge({
        name: ctx.session.nameOf(drinker.playerId),
        colorId: ctx.session.colorOf(drinker.playerId),
        small: true,
      })
    );

    const sips = document.createElement('span');
    sips.className = 'result__sips';
    sips.textContent = t(`result.reason.${drinker.reason}`, { sips: drinker.sips });
    item.append(sips);
    drinkers.append(item);
  }

  /* --- Koffer-Uebersicht: alle offen, mit Menge --- */
  const cases = document.createElement('section');
  cases.className = 'result__section';

  const casesTitle = document.createElement('h2');
  casesTitle.className = 'result__title';
  casesTitle.textContent = t('result.suitcases');
  cases.append(casesTitle);

  const caseList = document.createElement('ul');
  caseList.className = 'result__cases';

  for (const [index, suitcase] of view.suitcases.entries()) {
    const item = document.createElement('li');
    item.className = 'result__case';
    item.dataset.opened = String(suitcase.opened);
    /* Die Welle: jede Zeile klappt etwas später auf als die davor. */
    item.style.setProperty('--row', String(index));

    item.append(
      createBadge({
        name: ctx.session.nameOf(suitcase.playerId),
        colorId: ctx.session.colorOf(suitcase.playerId),
        small: true,
      })
    );

    const amount = document.createElement('span');
    amount.className = 'result__amount';
    amount.textContent =
      suitcase.amount === 0 ? t('pack.clean') : itemSetName(view.itemSet, suitcase.amount);
    amount.dataset.clean = String(suitcase.amount === 0);

    const mark = document.createElement('span');
    mark.className = 'result__mark';
    mark.textContent = suitcase.opened ? t('result.opened') : t('result.passed');

    item.append(amount, mark);

    if (view.diplomatId === suitcase.playerId) {
      const diplomat = document.createElement('span');
      diplomat.className = 'result__diplomat';
      diplomat.textContent = t('modes.diplomat.name');
      item.append(diplomat);
    }

    caseList.append(item);
  }

  cases.append(caseList);

  /* --- Hinweis-Auflösung --- */
  const hints = document.createElement('section');
  hints.className = 'result__section';

  const hintsTitle = document.createElement('h2');
  hintsTitle.className = 'result__title';
  hintsTitle.textContent = t('result.hintResolution');
  hints.append(hintsTitle);

  const hintList = document.createElement('ul');
  hintList.className = 'result__hints';

  for (const hint of view.hintResolutions) {
    const item = document.createElement('li');
    item.className = 'result__hint';
    item.dataset.truthful = String(hint.truthful);

    item.append(hintIcon(hint.type));

    const text = document.createElement('span');
    text.className = 'result__hint-text';
    /*
     * `hintSubject` statt `hints`: Das Icon-Label ist ein Verb ("tropft"), der Satz
     * braucht eine Nominalphrase ("Der tropfende Koffer") — sonst steht dort
     * "Der tropft Koffer war sauber".
     */
    text.textContent = hint.truthful
      ? t('result.hintTrueLine', {
          hint: t(`hintSubject.${hint.type}`),
          amount: itemSetName(view.itemSet, hint.amount),
        })
      : t('result.hintFalseLine', { hint: t(`hintSubject.${hint.type}`) });

    /*
     * Der „stimmte/log"-Stempel. Er ist leicht gedreht wie ein echter Stempel — und der
     * Winkel kommt aus der Position, nicht aus Zufall: So sieht dieselbe Runde bei einem
     * zweiten Blick gleich aus.
     */
    const verdict = document.createElement('span');
    verdict.className = 'result__verdict';
    verdict.textContent = hint.truthful ? t('result.hintTrue') : t('result.hintFalse');
    verdict.style.setProperty('--stamp-tilt', `${((hint.suitcaseOf.length * 7) % 11) - 5}deg`);

    item.append(text, verdict);
    hintList.append(item);
  }

  hints.append(hintList);

  /* --- Aktionen --- */
  const actions = document.createElement('div');
  actions.className = 'result__actions';

  actions.append(
    createButton({
      label: t('result.nextRound'),
      variant: 'primary',
      onClick: () => ctx.fsm.send({ type: 'nextRound' }),
    }),
    createButton({
      label: t('result.stats'),
      variant: 'secondary',
      onClick: () => openStats(),
    })
  );

  /*
   * Teilen nur, wenn das Gerät es kann. Ein Knopf, der beim Tippen nichts tut, ist
   * schlechter als kein Knopf — und auf dem Desktop gibt es die Web Share API meist nicht.
   */
  if (canShare()) {
    actions.append(
      createButton({
        label: t('result.share'),
        variant: 'ghost',
        onClick: () => void shareResult(shareText()),
      })
    );
  }

  actions.append(
    createButton({
      label: t('result.changePlayers'),
      variant: 'ghost',
      onClick: () => ctx.fsm.send({ type: 'changePlayers' }),
    })
  );

  /**
   * Der Text zum Teilen (Roadmap M5.3).
   *
   * Er erzählt die Runde in einem Satz — und zwar die Pointe, nicht die Statistik:
   * „Rudi hat 14 Gartenzwerge über die Grenze gebracht 🛃".
   */
  function shareText(): string {
    const best = biggestRun(view.gate);
    if (best) {
      return t('result.shareThrough', {
        name: ctx.session.nameOf(best.suitcaseOf),
        amount: itemSetName(view.itemSet, best.amount),
      });
    }

    const caught = view.openings.find((o) => o.kind === 'caught');
    if (caught) {
      return t('result.shareCaught', {
        officer: ctx.session.nameOf(view.officerId),
        name: ctx.session.nameOf(caught.suitcaseOf),
        amount: itemSetName(view.itemSet, caught.amount),
      });
    }

    return t('result.shareHonest', { officer: ctx.session.nameOf(view.officerId) });
  }

  el.append(banner, drinkers, cases, hints, actions);

  function bannerText(): string {
    if (view.banner === 'gotThrough') {
      const best = biggestRun(view.gate);
      const name = best ? ctx.session.nameOf(best.suitcaseOf) : ctx.session.nameOf(view.officerId);
      return t('result.banner.gotThrough', { name });
    }
    return t(`result.banner.${view.banner}`);
  }

  /** Session-Statistik als Sheet — sie gehoert nicht in den ersten Blick nach der Runde. */
  function openStats(): void {
    openSheet(el, {
      title: t('result.stats'),
      build: (body) => {
        const stats = ctx.session.get().stats;
        const table = document.createElement('ul');
        table.className = 'stats';

        /*
         * Der Balken zeigt „über die Grenze gebracht" relativ zum Besten der Runde.
         * Eine Zahl allein sagt niemandem, ob 6 viel ist — ein Balken neben dem längsten
         * sagt es sofort.
         */
        const most = Math.max(1, ...Object.values(stats).map((s) => s.smuggledThrough));

        for (const [index, player] of ctx.session.players().entries()) {
          const entry = stats[player.id];
          if (!entry) continue;

          const row = document.createElement('li');
          row.className = 'stats__row';
          row.append(createBadge({ name: player.name, colorId: player.colorId, small: true }));

          const bar = document.createElement('span');
          bar.className = 'stats__bar';
          bar.style.setProperty('--bar-color', `var(--c-player-${player.colorId})`);
          bar.setAttribute('aria-hidden', 'true');
          row.append(bar);
          growBar(bar, (entry.smuggledThrough / most) * 100, index * MOTION.staggerMs);

          const rate = hitRate(entry);
          const values = document.createElement('span');
          values.className = 'stats__values';
          values.textContent = [
            `${t('result.statSmuggled')}: ${entry.smuggledThrough}`,
            `${t('result.statCaught')}: ${entry.caughtAmount}`,
            rate === null ? null : `${t('result.statHitRate')}: ${Math.round(rate * 100)} %`,
            entry.harassed > 0 ? `${t('result.statHarassed')}: ${entry.harassed}` : null,
          ]
            .filter((line): line is string => line !== null)
            .join(' · ');

          row.append(values);
          table.append(row);
        }

        body.append(table);

        /* Die beiden Auszeichnungen als Badges, nicht als Textzeile. */
        const boldest = boldestSmuggler(stats);
        const nose = bestNose(stats);
        const badges = document.createElement('div');
        badges.className = 'stats__badges';

        if (boldest) {
          badges.append(
            award(t('result.boldestSmuggler'), ctx.session.nameOf(boldest.playerId), ctx.session.colorOf(boldest.playerId))
          );
        }
        if (nose) {
          badges.append(
            award(t('result.bestNose'), ctx.session.nameOf(nose.playerId), ctx.session.colorOf(nose.playerId))
          );
        }
        if (badges.childElementCount > 0) body.append(badges);
      },
    });
  }

  return {
    el,

    activate() {
      /*
       * Die Aufklapp-Welle. Sie läuft nach dem Wipe, damit sie nicht mit ihm konkurriert
       * — und sie fällt bei „Bewegung reduzieren" weg, weil sie nichts erzählt, was nicht
       * schon dasteht.
       */
      if (prefersReducedMotion()) return;

      for (const [index, row] of [...el.querySelectorAll<HTMLElement>('.result__case')].entries()) {
        void safeAnimate(
          row,
          [
            { opacity: 0, transform: 'translateY(10px) scaleY(0.86)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: MOTION.base,
            delay: index * MOTION.staggerMs,
            easing: 'cubic-bezier(.2,.9,.3,1.2)',
            fill: 'backwards',
          }
        );
      }
    },
  };
}

/** Eine Auszeichnung im Statistik-Sheet. */
function award(title: string, name: string, colorId: Parameters<typeof createBadge>[0]['colorId']): HTMLElement {
  const el = document.createElement('div');
  el.className = 'award';

  const label = document.createElement('span');
  label.className = 'award__title';
  label.textContent = title;

  el.append(label, createBadge({ name, colorId, small: true }));
  return el;
}
