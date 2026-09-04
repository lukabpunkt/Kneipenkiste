/**
 * i18n — Punkt-Notation, Interpolation, Pluralisierung.
 * CLAUDE.md: **kein hardcodierter UI-String** im Code, alles laeuft ueber `t()`.
 *
 * Fehlende Keys liefern `[missing:key]` — dieser Marker wird im A5-Audit gegrept.
 */

import de from '@/i18n/de.json';
import en from '@/i18n/en.json';
import type { Locale } from '@/config/rules';

/* `questions` ist eine Liste von Fragevorschlaegen — `tList()` liest sie. */
type Dict = { [key: string]: string | string[] | Dict };

const DICTS: Record<Locale, Dict> = { de, en };

export const LOCALES: readonly Locale[] = ['de', 'en'];

let current: Locale = 'de';

export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function getLocale(): Locale {
  return current;
}

/** Startsprache: Browser-Sprache, sonst DE. */
export function detectLocale(navigatorLanguage?: string): Locale {
  const lang = (navigatorLanguage ?? globalThis.navigator?.language ?? 'de').slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'de';
}

function lookup(dict: Dict, path: readonly string[]): string | undefined {
  let node: string | string[] | Dict | undefined = dict;
  for (const segment of path) {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

export type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

/**
 * Uebersetzt `key` (z. B. `pack.risk`).
 * Fallback-Kette: aktuelle Sprache → DE → `[missing:key]`.
 */
export function t(key: string, params?: TranslationParams): string {
  const path = key.split('.');
  const template = lookup(DICTS[current], path) ?? lookup(DICTS.de, path);
  if (template === undefined) return `[missing:${key}]`;
  return interpolate(template, params);
}

/**
 * Pluralisierung ueber die Suffixe `_one` / `_other`.
 * Beispiel: `plural('common.sips', 3)` → "Schlücke".
 */
export function plural(keyBase: string, count: number, params?: TranslationParams): string {
  const suffix = Math.abs(count) === 1 ? '_one' : '_other';
  return t(`${keyBase}${suffix}`, { count, ...params });
}

/** Alle Keys eines Dictionaries flach — fuer den Vollstaendigkeits-Test DE/EN. */
export function flatKeys(locale: Locale): string[] {
  const out: string[] = [];
  const walk = (node: Dict, prefix: string): void => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      /* Listen zaehlen als ein Key — DE und EN muessen dieselben Listen haben, nicht dieselbe Laenge. */
      if (typeof value === 'string' || Array.isArray(value)) out.push(path);
      else walk(value, path);
    }
  };
  walk(DICTS[locale], '');
  return out.sort();
}

/**
 * Liste von Strings (z. B. `questions` — die Fragevorschlaege des Beamten).
 * Fehlt der Key oder ist er keine Liste, kommt ein leeres Array zurueck; die Sprechblase
 * bleibt dann leer, statt `[missing:…]` auf die Buehne zu schreiben.
 */
export function tList(key: string): string[] {
  const path = key.split('.');
  const read = (dict: Dict): string[] | undefined => {
    let node: string | string[] | Dict | undefined = dict;
    for (const segment of path) {
      if (typeof node !== 'object' || node === null || Array.isArray(node)) return undefined;
      node = node[segment];
    }
    return Array.isArray(node) ? node : undefined;
  };
  return read(DICTS[current]) ?? read(DICTS.de) ?? [];
}
