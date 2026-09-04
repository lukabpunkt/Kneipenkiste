# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig (⏳ 3 manuelle Checks offen) | `v0.0.1` | A0 bestanden |
| M1 UI-Flow | ⬜ offen | – | – |
| M2 Bühne, Crooks, Tresor | ⬜ offen | – | – |
| M3 Reveal-Show | ⬜ offen | – | – |
| M4 Inszenierungen | ⬜ offen | – | – |
| M5 Polish, Modi, A11y | ⬜ offen | – | – |
| M6 Playtest & Release | ⬜ offen | – | – |

## Audit-Reports

## Audit A0 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 3 Checks brauchen Lukas Gerät bzw. GitHub)

| Check | Status | Notiz |
|---|---|---|
| Struktur entspricht Architektur §2 | ✅ | Alle Ordner und Dateien aus §2 vorhanden. Ergänzt um `src/core/types.ts` (ADR-6), `scripts/build-icons.mjs` (ADR-10) und Standard-Tooling (`vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc.json`, `src/vite-env.d.ts`). Noch leere Ordner (`assets-src/svg/*`, `public/atlas`, `public/audio`, `audio-src`) sind per `.gitkeep` sichtbar; die Dateien in `src/ui/`, `src/game/` und `src/audio/` entstehen in M1–M3. Architektur §2/§3/§4 wurden entsprechend nachgezogen. |
| `rules.ts`/`choreo.ts` enthalten die GDD-Werte | ✅ | `tests/unit/config.test.ts` (51 Tests) rechnet die Tabellen gegen die Dokumente: V_0 3/4/6, Wachstum +2/+2/+3, Deckel 12/16/20, Gebühr 1, Highroller 6/+4/Jackpot 24, Meineid 2 bzw. ×2, Maulwurf ÷2, Verhandlung 15/30/60 s, Nachtschicht 10 s, Bedenkzeit 0/5 s; Presets 1.8/2.8/3.8 s, Tempo-Kurve 100→70 %, letzte Karte 160 %, Stalls, 40-s-Deckel, No-Repeat-Fenster 3. Zusätzlich wird geprüft, dass `tokens.css` dieselben 17 UI-Farben und 8 Spielerfarben führt wie `theme.ts` — die beiden können nicht mehr auseinanderlaufen. |
| `payout.ts`-Matrix: n 3–8 × k 0–n × Härte × Modi grün | ✅ | `tests/unit/payout.test.ts`: 3 Härten × 6 Spielerzahlen × k 0–n = 162 Matrix-Tests, dazu alle 16 Modus-Kombinationen × k 0–5 = 96 Tests. |
| Property-Test 10 000 Runden ohne Invarianten-Verletzung | ✅ | Ein Lauf über 10 000 zufällige Runden (Spielerzahl, Härte, alle vier Modi, Tresorstand, Wahlen, Schwüre, Maulwurf) prüft: nie negative oder gebrochene Schlücke, jede Karte genau einmal in `revealOrder`, Teiler vor Dieben, Maulwurf letzter Dieb und nie Meineidiger, `nextVault` im erlaubten Bereich, Summe der Verteilung == Budget. Alle fünf Outcomes treten dabei auf. **Fund:** Der erste Lauf schlug fehl, weil der Generator Tresorstände unterhalb von V_0 erzeugte — ein im Spiel unerreichbarer Zustand. Domäne auf erreichbare Stände eingeschränkt und begründet. |
| Beispiele aus GDD §3.5 als explizite Tests | ✅ | n=4, V=8: k=1 → verteilt 8; k=2 → je 4; k=4 → je 2; k=0 → je 1 Gebühr, V→10. Wörtlich als eigener `describe`-Block. |
| Eid: Alleindieb mit Meineid trinkt 2 und verteilt V−2; Mit-Dieb doppelt | ✅ | Inklusive Randfall V=1 (Budget 0, nie negativ), „geschworen und geteilt ist kein Meineid" und „ohne Eid-Modus kein Meineid, auch mit gefüllten `oaths`". |
| Maulwurf: immer in `thieves`, halbe Strafe, nie Meineidiger, Zuweisung nutzt `crypto` | ✅ | `resolveRound` erzwingt die Wahl des Maulwurfs, unabhängig von der UI — die Invariante hält damit per Konstruktion. `assignMole` ist über 40 000 Ziehungen gleichverteilt (Abweichung < 1 Prozentpunkt) und ruft nachweislich `crypto.getRandomValues`, nie `Math.random`. Kombination Eid + Maulwurf: volle Strafe für den anderen Dieb, halbe für den Maulwurf, keine Meineid-Strafe für ihn. |
| Jackpot: bei V == V_max und k == 0 → jeder ⌈V/n⌉, Reset | ✅ | Für alle drei Härten plus Highroller (kein Deckel, Wachstum über 24 hinaus, platzt ab 24). Gegenprobe: voller Tresor mit Dieb ist kein Jackpot. |
| Choreographer: Teiler zuerst, Diebe zuletzt, Maulwurf letzter Dieb, deterministisch, 40-s-Deckel, Stalls | ✅ | `tests/unit/choreographer.test.ts` (38 Tests). Der 40-s-Deckel wird für jede Kombination aus 3–8 Spielern, k 0–n und allen drei Presets geprüft. **Befund:** Die Raffung greift im echten Spiel nie — 8 Spieler auf „Lang" landen bei 37,8 s. Sie ist ein Sicherheitsnetz und wird deshalb separat mit synthetischen Kartenzahlen (20 und 60) getestet; ein Test hält fest, dass die realen Spielerzahlen ungerafft bleiben. Tap-to-Skip: nie bei Intro/Alarm/Outcome/Outro, nie bei der ersten und nie bei der letzten Karte. |
| `Math.random` in `src/core/` → 0 Treffer | ✅ | Doppelt abgesichert: ESLint-Regel `no-restricted-properties` für `src/core/**` und ein Unit-Test in `guards.test.ts`, der die Dateien ohne Kommentare durchsucht. |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | ✅ | v8-Coverage: `fsm.ts` 100 % Statements/Branches/Functions/Lines, `core/` gesamt 99,7 % Statements und 97,6 % Branches. Beide Schwellen sind in `vitest.config.ts` erzwungen, CI bricht sonst ab. 58 FSM-Tests decken jeden Pfeil des Diagramms ab, dazu die Guards (≥ 3 Spieler), jedes unzulässige Event je State und die Zusicherung „`resolveRound` genau einmal pro Runde" (über drei Runden gezählt; wer aus SEALED abbricht, löst nie auf). |
| PWA installierbar | ✅ | Chrome DevTools Protocol gegen den Preview-Build (Pixel-5-Emulation): `Page.getAppManifest` → `errors: []`, `Page.getInstallabilityErrors` → `installabilityErrors: []`. Service Worker aktiv mit Scope `/Tresor/`. Icons aus `assets-src/svg/app-icon.svg` gebaut (192, 512, maskable 512 mit 20 % Safe Zone, Apple-Touch 180). |
| Desktop zeigt Portrait-Frame | ✅ | Screenshot `docs/screens/m0-desktop.png`: 9:16-Rahmen, max. 480 px, 32 px Radius, Gold-/Samt-Hintergrund. |
| E2E: App startet ohne Console-Fehler, keine externen Requests | ✅ | `tests/e2e/flow.spec.ts`, 4 Szenarien × iPhone 12 (WebKit) und Pixel 5 (Chromium): Titel sichtbar, Tresorstand 4, null Console-Errors, null Requests außerhalb von localhost/data:/blob: (Architektur §9), Landscape-Overlay erscheint im Querformat. |
| App auf Handy im WLAN erreichbar (`--host`), Titel sichtbar | ⏳ manuell | `npm run dev` bindet über `server.host: true` auf alle Interfaces und gibt eine Network-URL aus. Gegen den Preview-Build mit iPhone-12- und Pixel-5-Emulation geprüft — der Test auf einem echten Gerät fehlt. |
| CI läuft grün auf GitHub | ⏳ manuell | `ci.yml` und `deploy.yml` liegen vor und bilden lokal grüne Schritte ab (typecheck, lint, coverage, build, Bundle-Budget, E2E, perf). Das Repo ist lokal initialisiert, aber noch nicht gepusht — der erste CI-Lauf steht aus. |

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M1:**

- [ ] `npm run dev` starten und die Network-URL auf einem echten iPhone und einem echten Android öffnen: Titel „DER TRESOR" sichtbar, Schrift geladen, keine Verzerrung, Safe-Areas passen.
- [ ] Auf demselben Gerät „Zum Home-Bildschirm hinzufügen" ausprobieren: Icon (Tresortür) korrekt, App startet ohne Browser-Leiste im Portrait.
- [ ] Repo nach `github.com/lukabpunkt/Tresor` pushen und den ersten CI- und Pages-Lauf grün sehen (Pages aktiviert sich beim ersten Deploy selbst).

**Zahlen:** 511 Unit-Tests · 8 E2E-Tests · Coverage `core/` 99,7 % Statements / 97,6 % Branches, `fsm.ts` 100 % · Bundle 6,8 KB JS gzip (ohne PIXI, das ab M2 dazukommt) · Build 159 ms.
