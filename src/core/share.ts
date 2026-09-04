/**
 * Der Teilen-Text (GDD §3.8, Roadmap M5.3).
 *
 * "Marc hat bei 12 Schluecken im Tresor gestohlen. Allein. 🔓" — ein Satz, der ohne die
 * App verstaendlich ist und niemanden blossstellt, der nicht selbst am Tisch sass.
 *
 * Bewusst eine **reine Funktion** im Regelkern und nicht im Screen: Der Satz haengt an
 * Regelbegriffen (wer war Dieb, wie voll war der Tresor, war es Meineid), und der wird
 * getestet wie jede andere Regel. Der Screen reicht ihn nur an die Web-Share-API weiter.
 *
 * Kein Backend, keine Analytics — geteilt wird ueber das Betriebssystem, und was der
 * Nutzer damit macht, geht die App nichts an (CLAUDE.md).
 */

import { t } from './i18n';
import type { Player, RoundResult } from './types';

export interface ShareTextOptions {
  result: RoundResult;
  players: readonly Player[];
}

/** Namen in Reveal-Reihenfolge; unbekannte IDs fallen weg. */
function namesOf(ids: readonly string[], players: readonly Player[]): string[] {
  return ids
    .map((id) => players.find((player) => player.id === id)?.name)
    .filter((name): name is string => !!name);
}

/**
 * Baut den Satz zum Rundenergebnis.
 *
 * Die Faelle stehen in derselben Reihenfolge wie im GDD, und der Meineid schlaegt alles:
 * Ein gebrochener Eid ist die bessere Schlagzeile als die Zahl der Diebe.
 */
export function shareText(options: ShareTextOptions): string {
  const { result, players } = options;
  const vault = result.vault;
  const thieves = namesOf(result.thieves, players);
  const perjurers = namesOf(result.perjurers, players);

  if (perjurers.length > 0) {
    return t('share.perjury', { name: perjurers[0]!, vault });
  }

  switch (result.outcome) {
    case 'jackpot':
      return t('share.jackpot', { vault });
    case 'allShare':
      return t('share.allShare', { vault });
    case 'soloSteal':
      return t('share.soloSteal', { name: thieves[0] ?? '', vault });
    case 'multiSteal':
      return t('share.multiSteal', { count: thieves.length, vault });
    case 'allSteal':
      return t('share.allSteal', { vault });
  }
}
