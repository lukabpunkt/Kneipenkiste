# 🌉 Die Hängebrücke

Ein Mobile-First Pass-the-Phone-Trinkspiel für 3–8 Personen über Anti-Koordination. Eine morsche Brücke mit mehr Balken als Spielern — aber jeder Balken trägt nur eine Person. 20 Sekunden Absprache, dann wählt jeder geheim, dann treten alle gleichzeitig. Allein = sicher. Zu zweit = Sturz. Und jede friedliche Runde verliert die Brücke einen Balken.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot), [Der Tresor](https://github.com/lukabpunkt/Tresor), [Sprengmeister](https://github.com/lukabpunkt/Sprengmeister) und [Der Zoll](https://github.com/lukabpunkt/Zoll) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** M4 abgeschlossen (`v0.4.0`) — die sechs großen Stürze sind da: Händchenhalten, Coyote-Pause, Wippe, Seilschwung, Domino, Wandkicker. Alle unter fünf Sekunden, alle mit Blickkontakt davor, und jeder klettert wieder hoch. Als Nächstes M5: Polish, Modi, Accessibility.

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
npm run build:atlas      # SVG → Atlas (world + chars)
npm run capture:screens  # Bühnen-Screenshots für den Look-Check
npm run check:colorblind # Deuteranopie-Simulation auf dem Bühnenbild
npm run build:audio      # 32 Klänge synthetisieren und zum Sprite bauen
npm run preview:sequences # Sequenz-Preview (?dev=1&panel=sequences)
npm run capture:falls    # fünf Momente je Fall-Sequenz nach docs/screens/falls/
npm run test:perf        # JS-Budget und Draw-Batches (Audit A2)
```

`?dev=1` blendet das Dev-Panel ein (aktueller State, Balkenzahl, Todeszone erzwingen),
`?seed=123` macht Sequenzwahl und Bruch-Reihenfolge reproduzierbar.

## Nächster Meilenstein

```
cd /Users/lukabloemendal/Documents/Hängebrücke
claude
> Lies CLAUDE.md und docs/. Setze Milestone M5 aus docs/04-ROADMAP.md vollständig um, führe danach Audit A5 aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md.
```
