# 🍺 Kneipenkiste

Trinkspiele fürs Handy — ein Gerät, alle spielen mit. Kein Download, kein Konto, kein Server.

**Spielen (Beta):** https://lukabpunkt.github.io/Kneipenkiste/

| Spiel | Personen | Was passiert |
| --- | --- | --- |
| [Drinkshot](games/drinkshot/) | 2–8 | Setzen, zittern, trinken — der Scharfschütze trifft, wer viel setzt |
| [Sprengmeister](games/sprengmeister/) | 3–8 | Schatzsuche auf einem Minenfeld, das deine Freunde gelegt haben |
| [Pferderennen](games/pferderennen/) | 2–∞ | Sechs Cartoon-Pferde, eine Bahn voller Blödsinn |
| [Der Tresor](games/tresor/) | 3–8 | Verhandeln, dann geheim: Teilen oder Stehlen |
| [Der Zoll](games/zoll/) | 4–8 | Koffer packen, Grenze passieren, nicht auffliegen |
| [Die Hängebrücke](games/haengebruecke/) | 3–8 | Zwei auf einem Balken, und der Balken trägt nur einen |

## Aufbau

```
hub/            Launcher (HTML/CSS/JS, kein Build) + games.json
games/<spiel>/  Ein Ordner pro Spiel — jedes mit eigener package.json, Tests, Docs, CLAUDE.md
scripts/        build-site.mjs baut alles nach site/, preview-site.mjs serviert es wie GitHub Pages
site/           Build-Output (gitignored)
```

Jedes Spiel ist ein npm-Workspace und wird unter `/<slug>/` ausgeliefert. Die fünf Vite-Spiele lesen ihren Base-Pfad aus einer Umgebungsvariable (`DRINKSHOT_BASE` usw.), die `build-site.mjs` aus `SITE_BASE` ableitet. Pferderennen ist Vanilla JS ohne Build und wird kopiert.

## Loslegen

```bash
npm install                 # einmal im Root — installiert alle Spiele
npm run build:site          # baut Launcher + 6 Spiele nach site/
npm run preview:site        # http://localhost:4300/Kneipenkiste/

npm run dev -w games/zoll   # ein einzelnes Spiel entwickeln (wie bisher)
npm run test -w games/zoll  # Typecheck · Lint · Unit für ein Spiel
```

## Deploy

`main` → CI (nur geänderte Spiele werden getestet) → bei Grün: Deploy nach GitHub Pages.
Für eine eigene Domain: Repository-Variable `SITE_BASE=/` setzen, `hub/CNAME` anlegen, DNS auf `lukabpunkt.github.io`.

## Ein neues Spiel hinzufügen

1. `games/<slug>/` anlegen (Vite-Vorlage von einem Schwesterspiel; `base: process.env.<SLUG>_BASE ?? '/<Slug>/'`).
2. In `scripts/build-site.mjs` eine Zeile im `games`-Array.
3. In `hub/games.json` eine Karte (Titel, Tagline, Personen, Icon, Akzentfarbe).
4. In `.github/workflows/ci.yml` den Pfadfilter ergänzen.
5. Pushen.

## Herkunft

Die Spiele sind per `git subtree` mit vollständiger Historie aus ihren früheren Repos übernommen: [Drinkshot](https://github.com/lukabpunkt/Drinkshot), [Sprengmeister](https://github.com/lukabpunkt/Sprengmeister), [Pferderennen](https://github.com/lukabpunkt/Pferderennen), [Tresor](https://github.com/lukabpunkt/Tresor), [Zoll](https://github.com/lukabpunkt/Zoll). Die Hängebrücke kam direkt hierher — sie hatte nie ein eigenes Remote.
