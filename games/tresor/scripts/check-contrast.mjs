/**
 * Kontrast-Prüfung der Textfarben (Audit A5: ≥ 4.5:1, grosser Text ≥ 3:1).
 *
 * **Herkunft:** übernommen aus dem Schwesterprojekt Drinkshot
 * (`scripts/check-contrast.mjs`) und für den Tresor angepasst — Klassennamen, Tokens und
 * ein Auflöser für halbtransparente Farben (siehe unten). Dort gebaut, hier gebraucht:
 * Audit A5 verlangt den Nachweis, Lighthouse liefert ihn nur für die eine Seite, die es
 * gerade sieht.
 *
 * Liest die CSS-Dateien, löst `var(--token)` gegen `tokens.css` auf und prüft jede Regel,
 * die Vorder- und Hintergrundfarbe setzt. Absichtlich ohne Browser: So läuft die Prüfung
 * in der CI mit, statt einmalig in axe.
 *
 * **Die Tresor-Ergänzung:** Diese Codebasis schreibt gedimmten Text als
 * `rgb(255 248 231 / 62%)` — 62 solcher Deklarationen. Die Vorlage übersprang sie und
 * hielt stattdessen eine handgepflegte Tabelle abgelesener Hexwerte vor. Das ist genau
 * die Sorte Kopie, die auseinanderläuft (ADR-37). Hier wird stattdessen gerechnet: Die
 * Farbe wird über den Hintergrund gelegt, und wo der Hintergrund nicht in derselben Regel
 * steht, gegen **beide** Flächen geprüft, auf denen sie vorkommen kann — es zählt die
 * schlechtere.
 *
 * `npm run check:contrast`
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/* --- Farbrechnung (WCAG 2.1) --- */

const parseHex = (h) => {
  const v = h.replace('#', '');
  const full = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = parseHex(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Halbtransparente Farbe über einen Hintergrund legen — sonst ist sie nicht messbar. */
const over = (front, alpha, back) => {
  const f = parseHex(front);
  const b = parseHex(back);
  return toHex(f.map((c, i) => c * alpha + b[i] * (1 - alpha)));
};

/* --- Tokens --- */

const tokens = new Map();
for (const [, name, value] of read('src/styles/tokens.css').matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
  tokens.set(name, value);
}

/**
 * Die beiden Flächen, auf denen im Tresor Text steht: der App-Hintergrund und die
 * Panels (Sheets, Karten, Zeilen). Wo eine Regel ihren Hintergrund nicht selbst setzt,
 * wird gegen beide geprüft — es zählt die schlechtere.
 */
const SURFACES = [
  ['Deep-BG', tokens.get('--c-bg-deep')],
  ['Panel', tokens.get('--c-bg-panel')],
];

/**
 * Löst einen CSS-Farbwert auf. `backdrop` wird für halbtransparente Farben gebraucht.
 * Verläufe, `currentColor` und alles Unbekannte ergeben `null` und werden übersprungen.
 */
function resolve(value, backdrop) {
  const trimmed = value.trim();

  const varMatch = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(trimmed);
  if (varMatch) {
    const token = tokens.get(varMatch[1]);
    if (token) return token;
    return varMatch[2] ? resolve(varMatch[2], backdrop) : null;
  }

  if (/^#[0-9a-fA-F]{3,6}$/.test(trimmed)) return trimmed;

  // `rgb(255 248 231 / 62%)` — die Schreibweise dieser Codebasis für gedimmten Text.
  const alphaMatch = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)$/.exec(trimmed);
  if (alphaMatch && backdrop) {
    const front = toHex([Number(alphaMatch[1]), Number(alphaMatch[2]), Number(alphaMatch[3])]);
    return over(front, Number(alphaMatch[4]) / 100, backdrop);
  }

  return null;
}

/* --- Regeln einsammeln --- */

const FILES = ['src/styles/base.css', 'src/styles/components.css'];

/** Grosser Text (≥ 24 px oder ≥ 19 px fett) darf auf 3:1 (WCAG 1.4.3). */
const LARGE_TEXT =
  /title__logo|__headline|result__banner|ring__value|flip__digits|score__awardText|__number|distribute__headline|onboarding|modes__name|sheet__title|witness__headline|card__face|revealCard__face/;

/**
 * Regeln, die kein lesbarer Text sind: Dekoration, Icons, Platzhalter. Sie tragen keine
 * Information, die jemand lesen muss — die Kontrastregel gilt für Text (WCAG 1.4.3).
 */
const NOT_TEXT = /::(before|after)|__bar|__seal|__icon|svg|wipe|vault__|nightClock|titleLoop/;

/**
 * Welche Klassen irgendwo eine eigene Flaeche setzen — Modifikatoren zusammengefasst.
 *
 * Eine Regel wie `.card__face--front` setzt nur die Schriftfarbe; ihren Hintergrund
 * bekommt sie von `.card--steal .card__face--front`, das Banner seinen von
 * `.result__banner--allShare`. Eine statische Pruefung kann die beiden nicht
 * zusammenbringen — sie darf dann aber auch nicht den Screen-Hintergrund unterstellen,
 * sonst meldet sie Tinte auf Fast-Schwarz und begraebt die echten Funde darunter.
 *
 * Zusammengefasst wird bis **Block + Element** (`card__face--front` → `card__face`), nicht
 * bis zum Block: Sonst faellt `.score__name` mit heraus, nur weil `.score__bar` eine
 * Flaeche hat — und das ist echter Bildschirmtext, der geprueft gehoert.
 */
const baseClass = (cls) => cls.split('--')[0];
const SELF_SURFACED = new Set();
for (const file of FILES) {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(?:^|[;\s])(background(?:-color)?|--btn-face):\s*[^;]+/.test(body)) continue;
    for (const [, cls] of selector.matchAll(/\.([\w-]+)/g)) SELF_SURFACED.add(baseClass(cls));
  }
}

const pairs = [];
for (const file of FILES) {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');

  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const name = selector.trim().split('\n').join(' ');
    if (name.startsWith('@') || NOT_TEXT.test(name)) continue;

    const fgRaw =
      /(?:^|[;\s])color:\s*([^;]+)/.exec(body) ?? /(?:^|[;\s])--btn-text:\s*([^;]+)/.exec(body);
    if (!fgRaw) continue;

    const bgRaw =
      /(?:^|[;\s])background(?:-color)?:\s*([^;]+)/.exec(body) ??
      /(?:^|[;\s])--btn-face:\s*([^;]+)/.exec(body);

    const large = LARGE_TEXT.test(name);
    const label = `${file.split('/').pop()} · ${name}`;

    if (bgRaw) {
      // Regel setzt beides: genau ein Paar, kein Raten.
      const back = resolve(bgRaw[1], null);
      const front = back ? resolve(fgRaw[1], back) : null;
      if (back && front) pairs.push({ label, front, back, large });
      continue;
    }

    /*
     * Nur Textfarbe: Der Hintergrund kommt vom Screen darunter. Beide möglichen Flächen
     * prüfen — wer nur gegen die dunklere prüft, macht sich die Antwort schön.
     *
     * Ausgenommen sind Komponenten, die ihre Fläche selbst mitbringen (`SELF_SURFACED`) —
     * dort wäre der Screen-Hintergrund die falsche Annahme.
     */
    const classes = [...name.matchAll(/\.([\w-]+)/g)].map(([, cls]) => baseClass(cls));
    if (classes.some((cls) => SELF_SURFACED.has(cls))) continue;

    for (const [surface, back] of SURFACES) {
      const front = resolve(fgRaw[1], back);
      if (front) pairs.push({ label: `${label}  [auf ${surface}]`, front, back, large });
    }
  }
}

/* --- Ausgabe --- */

let failures = 0;
let worst = { ratio: Infinity, label: '' };

for (const { label, front, back, large } of pairs) {
  const ratio = contrast(front, back);
  const min = large ? 3 : 4.5;
  const ok = ratio >= min;
  if (!ok) failures++;
  if (ratio < worst.ratio) worst = { ratio, label };
  if (!ok || process.env.VERBOSE) {
    console.log(`${ok ? '✅' : '❌'} ${ratio.toFixed(2)}:1 (min ${min})  ${front} auf ${back}  ${label}`);
  }
}

console.log(`\n${pairs.length} Paare geprüft · schlechtestes ${worst.ratio.toFixed(2)}:1 (${worst.label})`);
if (failures > 0) {
  console.error(`${failures} Paar(e) unter der Grenze.`);
  process.exit(1);
}
console.log('Alle Textfarben erfüllen WCAG AA.');
