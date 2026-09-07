# 🌉 Die Hängebrücke

Ein Mobile-First Pass-the-Phone-Trinkspiel für 3–8 Personen über Anti-Koordination. Eine morsche Brücke mit mehr Balken als Spielern — aber jeder Balken trägt nur eine Person. 20 Sekunden Absprache, dann wählt jeder geheim, dann treten alle gleichzeitig. Allein = sicher. Zu zweit = Sturz. Und jede friedliche Runde verliert die Brücke einen Balken.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot), [Der Tresor](https://github.com/lukabpunkt/Tresor), [Sprengmeister](https://github.com/lukabpunkt/Sprengmeister) und [Der Zoll](https://github.com/lukabpunkt/Zoll) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** M1 abgeschlossen (`v0.1.0`) — **ab hier auf einer Party spielbar.** Kompletter Flow von der Lobby bis zum Result, alle fünf Modi, Schritt als DOM-Platzhalter mit echtem Timing. Als Nächstes M2: die Schlucht in PixiJS.

## Planung

| Dokument | Inhalt |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Arbeitsanweisungen für Claude Code |
| [`docs/01-GDD.md`](docs/01-GDD.md) | Game Design Document — Brücke, Absprache, Wahl, Auszahlung, Schrumpfen, Modi, Inszenierungen |
| [`docs/02-ART-DIRECTION.md`](docs/02-ART-DIRECTION.md) | Art Direction — Canyon-Abenteuer, Tokens, Brücke, Hikers, Geier, Zimmermann |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Architektur — Stack, Struktur, FSM, Datenmodell, Regelkern, Choreographer |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) | Meilensteine M0–M6 |
| [`docs/05-AUDITS.md`](docs/05-AUDITS.md) | Audits A0–A6 |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Fortschritt · ADR-Log |

## Stack

Vite 6 · TypeScript · PixiJS v8 · GSAP 3 · howler.js · vite-plugin-pwa · Vitest · Playwright

## Entwickeln

```
npm install
npm run dev              # Vite --host
npm test                 # typecheck + lint + unit
npm run test:coverage    # core/ >= 95 % (A0)
npm run test:e2e         # iPhone 12 (WebKit) + Pixel 5 (Chromium)
npm run build            # tsc --noEmit + vite build + PWA
npm run balance -- 20000 # Kollisionsraten je n/B (M6)
```

`?dev=1` blendet das Dev-Panel ein (aktueller State, Balkenzahl, Todeszone erzwingen),
`?seed=123` macht Sequenzwahl und Bruch-Reihenfolge reproduzierbar.

## Nächster Meilenstein

```
cd /Users/lukabloemendal/Documents/Hängebrücke
claude
> Lies CLAUDE.md und docs/. Setze Milestone M2 aus docs/04-ROADMAP.md vollständig um, führe danach Audit A2 aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md.
```
