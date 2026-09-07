/**
 * Baut die komplette Kneipenkiste nach `site/`:
 * den Launcher aus `hub/` und jedes Spiel unter seinem eigenen Unterpfad.
 *
 * Der einzige Knopf ist SITE_BASE — der Pfad, unter dem die Seite später liegt.
 *   GitHub Pages (Beta):  SITE_BASE=/Kneipenkiste/   (Default)
 *   Eigene Domain:        SITE_BASE=/
 * Jedes Vite-Spiel bekommt daraus `${SITE_BASE}<slug>/` als Base-Pfad über die
 * Umgebungsvariable, die seine vite.config.ts ohnehin schon liest. Die Defaults
 * in den Spielen (`/Drinkshot/` usw.) bleiben unangetastet, damit deren eigene
 * Tests und Playwright-Configs weiter funktionieren.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_BASE = normalizeBase(process.env.SITE_BASE ?? '/Kneipenkiste/');
const out = join(root, 'site');

/**
 * Die Spiele. `kind: 'vite'` baut per `npm run build` mit gesetztem Base-Pfad;
 * `kind: 'static'` kopiert die genannten Dateien unverändert — das Spiel ist
 * dann selbst dafür verantwortlich, nur relative Pfade zu verwenden.
 */
const games = [
  { id: 'drinkshot', kind: 'vite', envKey: 'DRINKSHOT_BASE' },
  { id: 'sprengmeister', kind: 'vite', envKey: 'SPRENGMEISTER_BASE' },
  { id: 'tresor', kind: 'vite', envKey: 'TRESOR_BASE' },
  { id: 'zoll', kind: 'vite', envKey: 'ZOLL_BASE' },
  {
    id: 'pferderennen',
    kind: 'static',
    files: ['index.html', 'manifest.webmanifest', 'sw.js', 'src', 'assets'],
  },
];

const only = process.argv.slice(2); // `node scripts/build-site.mjs zoll` baut nur Zoll
const selected = only.length ? games.filter((g) => only.includes(g.id)) : games;

console.log(`\nKneipenkiste → site/  (SITE_BASE=${SITE_BASE})\n`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. Launcher
cpSync(join(root, 'hub'), out, { recursive: true });
console.log('✓ hub/ → site/');

// 2. Spiele
for (const game of selected) {
  const src = join(root, 'games', game.id);
  const dest = join(out, game.id);
  if (!existsSync(src)) {
    console.warn(`! games/${game.id} fehlt — übersprungen`);
    continue;
  }

  if (game.kind === 'vite') {
    const base = `${SITE_BASE}${game.id}/`;
    console.log(`→ ${game.id}: vite build (base ${base})`);
    execSync(`npm run build -w games/${game.id}`, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, [game.envKey]: base },
    });
    cpSync(join(src, 'dist'), dest, { recursive: true });
  } else {
    console.log(`→ ${game.id}: statisch kopieren`);
    for (const f of game.files) {
      cpSync(join(src, f), join(dest, f), { recursive: true });
    }
  }
  console.log(`✓ ${game.id} → site/${game.id}/`);
}

// 3. games.json um Versionen aus den package.json ergänzen
const catalogPath = join(root, 'hub', 'games.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
for (const entry of catalog.games) {
  const pkgPath = join(root, 'games', entry.id, 'package.json');
  if (existsSync(pkgPath)) {
    entry.version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  }
}
catalog.base = SITE_BASE;
catalog.builtAt = new Date().toISOString();
writeFileSync(join(out, 'games.json'), JSON.stringify(catalog, null, 2) + '\n');

// 4. GitHub Pages: kein Jekyll, sonst verschwinden Dateien mit Unterstrich.
writeFileSync(join(out, '.nojekyll'), '');

console.log('\nFertig. Vorschau: npm run preview:site\n');

function normalizeBase(b) {
  let base = b.trim();
  if (!base.startsWith('/')) base = '/' + base;
  if (!base.endsWith('/')) base += '/';
  return base;
}
