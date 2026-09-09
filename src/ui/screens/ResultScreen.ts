/**
 * Result (GDD §5, Screen 8).
 *
 * Der Screen beantwortet in dieser Reihenfolge: Was ist passiert (Banner)? Wer stand wo
 * (Brücke mit Fahne neben Wahl)? Wer trinkt? Und — die Frage, die die nächste Runde
 * antreibt — wie viele Balken sind noch da?
 */

import { t, tList } from '@/core/i18n';
import { frequentFaller, mountainGoat, topPairing } from '@/core/session';
import { createBadge } from '../components/badge';
import { createBridgeTop, type PlankModel } from '../components/bridgeTop';
import { createButton } from '../components/button';
import { openSheet } from '../components/sheet';
import { createTokenStack } from '../components/tokenStack';
import type { ScreenContext, ScreenInstance } from '../router';

export function createResultScreen(ctx: ScreenContext): ScreenInstance {
  const reveal = ctx.reveal();
  const players = ctx.session.players();

  const el = document.createElement('section');
  el.className = 'screen screen--result';

  /* --- Banner --- */
  const banner = document.createElement('h1');
  banner.className = 'result__banner';
  banner.dataset.banner = reveal.banner;
  banner.textContent = t(`banner.${reveal.banner}`);

  /* --- Die Brücke, wie sie stand --- */
  const planks: PlankModel[] = reveal.planks.map((plank) => ({
    id: plank.id,
    state: plank.collision
      ? 'resultCollision'
      : plank.rotten
        ? 'resultRotten'
        : plank.players.length > 0
          ? 'resultSafe'
          : 'normal',
    markers: [
      ...plank.players.map((playerId) => ({ playerId, colorId: ctx.session.colorOf(playerId) })),
      /* Die Fahne steht **neben** der Wahl, nicht auf ihr: "Rudi: Fahne auf 3, stand auf 5." */
      ...plank.flaggedBy.map((playerId) => ({ playerId, colorId: ctx.session.colorOf(playerId), flag: true })),
    ],
  }));

  const bridgeBox = document.createElement('div');
  bridgeBox.className = 'result__bridge';
  bridgeBox.append(createBridgeTop({
    planks,
    display: true,
    wave: true,
    removed: reveal.removedPlank !== undefined ? [reveal.removedPlank] : [],
  }));

  /* --- Was passiert ist, in Zeilen --- */
  const lines = document.createElement('div');
  lines.className = 'result__lines';

  /*
   * Der Zusammenstoß bekommt ein Bild, keine Zeile: zwei Gesichter und dazwischen der
   * Knall. Das ist die Information, die abends hängenbleibt — wer mit wem (GDD §7). Die
   * Textfassung bleibt als `aria-label` daran, damit ein Screenreader denselben Satz
   * bekommt und nicht drei Farbpunkte vorgelesen kriegt.
   */
  for (const group of reveal.planks.filter((p) => p.collision)) {
    const names = group.players.map((id) => ctx.session.nameOf(id)).join(` ${t('common.and')} `);
    const label = t('result.collisionOn', { plank: group.id, names });

    const crash = document.createElement('div');
    crash.className = 'result__crash';
    crash.dataset.plank = String(group.id);
    crash.setAttribute('role', 'img');
    crash.setAttribute('aria-label', label);

    group.players.forEach((playerId, index) => {
      if (index > 0) {
        const boom = document.createElement('span');
        boom.className = 'result__boom';
        boom.setAttribute('aria-hidden', 'true');
        crash.append(boom);
      }
      crash.append(
        createBadge({ name: ctx.session.nameOf(playerId), colorId: ctx.session.colorOf(playerId), small: true })
      );
    });

    const on = document.createElement('span');
    on.className = 'result__crash-plank';
    on.setAttribute('aria-hidden', 'true');
    on.textContent = t('common.plank', { n: group.id });
    crash.append(on);

    lines.append(crash);
  }

  if (reveal.rottenPlank !== undefined) {
    lines.append(line(t('result.rottenWas', { plank: reveal.rottenPlank }), 'rotten'));
  }

  for (const playerId of reveal.deserters) {
    const flagged = reveal.planks.find((p) => p.flaggedBy.includes(playerId));
    const stood = reveal.planks.find((p) => p.players.includes(playerId));
    if (!flagged) continue;
    lines.append(
      line(
        t('result.flagVsChoice', {
          name: ctx.session.nameOf(playerId),
          flag: flagged.id,
          plank: stood ? stood.id : t('modes.rope'),
        }),
        'desertion'
      )
    );
  }

  for (const theft of reveal.plankThieves) {
    lines.append(
      line(
        t('result.thief', {
          thief: ctx.session.nameOf(theft.thief),
          victim: ctx.session.nameOf(theft.victim),
        }),
        'theft'
      )
    );
  }

  for (const playerId of reveal.ropeUsers) {
    lines.append(line(t('result.ropeUser', { name: ctx.session.nameOf(playerId) }), 'rope'));
  }

  /* --- Trinker und Verteiler --- */
  const drinkers = document.createElement('div');
  drinkers.className = 'result__group';

  if (reveal.drinkers.length > 0) {
    drinkers.append(sectionTitle(t('result.drinkers')));
    for (const drinker of reveal.drinkers) {
      const row = document.createElement('div');
      row.className = 'result__row';
      row.dataset.reason = drinker.reason;
      row.append(
        createBadge({ name: ctx.session.nameOf(drinker.playerId), colorId: ctx.session.colorOf(drinker.playerId), small: true }),
        createTokenStack({ count: drinker.sips, colorId: ctx.session.colorOf(drinker.playerId), small: true })
      );
      drinkers.append(row);
    }
  }

  if (reveal.distribution.length > 0) {
    drinkers.append(sectionTitle(t('result.givers')));
    for (const entry of reveal.distribution) {
      const row = document.createElement('div');
      row.className = 'result__row result__row--gift';
      row.append(
        createBadge({ name: ctx.session.nameOf(entry.from), colorId: ctx.session.colorOf(entry.from), small: true })
      );

      const arrow = document.createElement('span');
      arrow.className = 'result__arrow';
      arrow.textContent = '→';
      row.append(arrow);

      row.append(
        createBadge({ name: ctx.session.nameOf(entry.to), colorId: ctx.session.colorOf(entry.to), small: true }),
        createTokenStack({ count: entry.sips, colorId: ctx.session.colorOf(entry.to), small: true })
      );
      drinkers.append(row);
    }
  }

  /* --- Die Vorschau, die die nächste Runde antreibt --- */
  const preview = document.createElement('p');
  preview.className = 'result__preview';
  preview.dataset.kind = reveal.repaired ? 'repaired' : 'shrunk';

  if (reveal.repaired) {
    preview.textContent = t('result.repaired', { count: reveal.nextPlankCount });
  } else {
    const removedText =
      reveal.removedPlank !== undefined ? `${t('result.removed', { plank: reveal.removedPlank })} ` : '';
    /* Wird es eng, sagt der Screen es deutlich — das ist die Ansage der Todeszone. */
    const next =
      reveal.nextPlankCount <= players.length
        ? t('result.nextRoundTight', { count: reveal.nextPlankCount, players: players.length })
        : t('result.nextRound', { count: reveal.nextPlankCount });
    preview.textContent = `${removedText}${next}`;
  }

  /* --- Gustav kommentiert --- */
  const comments = tList('result.vulture');
  const vulture = document.createElement('p');
  vulture.className = 'result__vulture';
  if (comments.length > 0) {
    vulture.textContent = comments[ctx.fsm.context.roundIndex % comments.length]!;
  }

  /* --- Knöpfe --- */
  const footer = document.createElement('footer');
  footer.className = 'result__footer';
  footer.append(
    createButton({
      label: t('result.again'),
      variant: 'primary',
      onClick: () => ctx.fsm.send({ type: 'nextRound' }),
    }),
    createButton({
      label: t('result.stats'),
      variant: 'secondary',
      onClick: () => openStats(),
    }),
    createButton({
      label: t('result.changePlayers'),
      variant: 'ghost',
      onClick: () => ctx.fsm.send({ type: 'changePlayers' }),
    })
  );

  /*
   * Teilen (Roadmap M5.3) — nur, wenn es etwas zu erzählen gibt und das Gerät es kann.
   * Der Text geht an das Teilen-Blatt des Systems, nicht an uns: kein Netzwerk, kein
   * Backend, keine Analytics (CLAUDE.md). Ohne Web-Share-API steht der Knopf gar nicht
   * erst da — ein Knopf, der nichts tut, ist schlimmer als kein Knopf.
   */
  const pairing = topPairing(ctx.session.get().stats);
  if (pairing && pairing.falls > 1 && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    footer.append(
      createButton({
        label: t('result.share'),
        variant: 'ghost',
        className: 'result__share',
        onClick: () => {
          const text = t('share.pair', {
            a: ctx.session.nameOf(pairing.a),
            b: ctx.session.nameOf(pairing.b),
            count: pairing.falls,
          });
          /* Bricht der Nutzer das Blatt ab, wirft `share()` — das ist kein Fehler. */
          void navigator.share?.({ text }).catch(() => undefined);
        },
      })
    );
  }

  el.append(banner, bridgeBox, lines, drinkers, preview, vulture, footer);
  return { el };

  function openStats(): void {
    openSheet(ctx.host, {
      title: t('result.stats'),
      build: (body) => {
        const stats = ctx.session.get().stats;

        const table = document.createElement('div');
        table.className = 'stats';

        for (const player of players) {
          const entry = stats[player.id];
          if (!entry) continue;

          const row = document.createElement('div');
          row.className = 'stats__row';
          row.append(createBadge({ name: player.name, colorId: player.colorId, small: true }));

          const numbers = document.createElement('span');
          numbers.className = 'stats__numbers';
          numbers.textContent = `${t('result.statSips')} ${entry.sipsDrunk} · ${t('result.statFalls')} ${entry.falls}`;
          row.append(numbers);

          table.append(row);
        }

        const highlights = document.createElement('div');
        highlights.className = 'stats__highlights';

        const goat = mountainGoat(stats);
        if (goat) highlights.append(line(t('result.mountainGoat', { name: ctx.session.nameOf(goat.playerId) }), 'goat'));

        const faller = frequentFaller(stats);
        if (faller) {
          highlights.append(line(t('result.frequentFaller', { name: ctx.session.nameOf(faller.playerId) }), 'faller'));
        }

        /* Die Zeile, um die es abends wirklich geht (GDD §7). */
        const pair = topPairing(stats);
        if (pair) {
          highlights.append(
            line(
              t('result.statPartner', {
                a: ctx.session.nameOf(pair.a),
                b: ctx.session.nameOf(pair.b),
                count: pair.falls,
              }),
              'pair'
            )
          );
        }

        body.append(table, highlights);
      },
    });
  }
}

function line(text: string, kind: string): HTMLElement {
  const el = document.createElement('p');
  el.className = 'result__line';
  el.dataset.kind = kind;
  el.textContent = text;
  return el;
}

function sectionTitle(text: string): HTMLElement {
  const el = document.createElement('h2');
  el.className = 'result__section';
  el.textContent = text;
  return el;
}
