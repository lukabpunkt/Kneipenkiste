# 🛃 Der Zoll

Ein Mobile-First Pass-the-Phone-Bluffspiel für 4–8 Personen. Alle sind Reisende mit einem Koffer — bis auf den Zollbeamten. Jeder packt heimlich saubere Ware oder 1–6 Stück Schmuggelware. Der Beamte bekommt unzuverlässige Hinweise, verhört alle, öffnet zwei Koffer im Röntgengerät. Erwischt: doppelt trinken. Durchgekommen: verteilen. Unschuldig belästigt: der Beamte trinkt.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot), [Der Tresor](https://github.com/lukabpunkt/Tresor) und [Sprengmeister](https://github.com/lukabpunkt/Sprengmeister) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** M3 fertig (`v0.3.0`) — die sechs Hinweise, die vier Schranken-Sequenzen und der komplette Ton laufen. Die Röntgen-Sequenzen sind noch Platzhalter; sie kommen in M4.

## Planung

| Dokument | Inhalt |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Arbeitsanweisungen für Claude Code |
| [`docs/01-GDD.md`](docs/01-GDD.md) | Game Design Document — Rollen, Packen, Hinweis-Modell, Verhör, Kontrolle, Schranke, Modi, Sequenzen |
| [`docs/02-ART-DIRECTION.md`](docs/02-ART-DIRECTION.md) | Art Direction — Retro-Flughafen, Tokens, Koffer, Röntgenmonitor, Charaktere |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Architektur — Stack, Struktur, FSM, Datenmodell, Regelkern, Directors |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) | Meilensteine M0–M6 |
| [`docs/05-AUDITS.md`](docs/05-AUDITS.md) | Audits A0–A6 |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Fortschritt · ADR-Log |

## Stack

Vite 6 · TypeScript · PixiJS v8 · GSAP 3 · howler.js · vite-plugin-pwa · Vitest · Playwright

## Loslegen

```
npm install
npm run dev          # Vite --host
npm test             # typecheck + lint + 240 Unit-Tests
npm run test:e2e     # Playwright, iPhone 12 + Pixel 5
npm run test:perf    # Render- und Interaktions-Audit (A2)
npm run build:atlas  # SVG → Atlas (@1x/@2x)
```

Läuft auf Port 4173 schon etwas anderes: `PREVIEW_PORT=4183 npm run test:e2e`.

**Dev-Modus:** `?dev=1` blendet ein Panel mit Zustand, Seed und „reveal" ein (deckt Mengen, Diplomat und die Wahrheit hinter den Hinweisen auf). `?dev=1&seed=123` macht eine Runde reproduzierbar — produktiv würfeln Hinweise, Diplomat und Item-Set immer über `crypto`. `?dev=1&panel=sequences` blendet die Sequenz-Preview ein: jede Animation auf Knopfdruck, auf der echten Bühne.

### Nächster Meilenstein

```
cd /Users/lukabloemendal/Documents/Zoll
claude
> Lies CLAUDE.md und docs/. Setze Milestone M4 aus docs/04-ROADMAP.md vollständig um, führe danach Audit A4 aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md.
```
