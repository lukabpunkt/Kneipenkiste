# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig (⏳ 3 manuelle Checks offen) | `v0.0.1` | A0 bestanden |
| M1 UI-Flow | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.1.0` | A1 bestanden |
| M2 Bühne, Crooks, Tresor | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.2.0` | A2 bestanden |
| M3 Reveal-Show | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.3.0` | A3 bestanden |
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

## Audit A1 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen echte Menschen)

| Check | Status | Notiz |
|---|---|---|
| E2E-Szenarien aus M1.7 grün (Mobile-Emulation iPhone 12 + Pixel 5) | ✅ | 15 Szenarien × 2 Geräte = 30 Tests grün. Darunter der geforderte Dreirunden-Durchlauf (allShare → soloSteal mit Verteilung → multiSteal), eine Eid-Runde mit Meineid, eine Maulwurf-Runde und eine Nachtschicht-Runde. Alle Wartebedingungen hängen an Zuständen, nicht an Uhrzeiten — `tests/e2e/helpers.ts`. |
| Auszahlungstabelle im Negotiation-Screen stimmt mit `payout` überein | ✅ | Der Screen ruft `previewPayouts()` auf, dieselbe Funktion, die `tests/unit/payout.test.ts` gegen das echte `resolveRound()` für k = 0/1/2/n prüft. Die Tabelle kann damit gar nicht abweichen. |
| Choice-Screen: Wahl nach Versiegeln nirgends sichtbar; kein Zurück; Bedenkzeit → auto TEILEN | ✅ | E2E prüft das Markup des Folge-Screens auf „TEILEN"/„STEHLEN" → nichts. Der Screen hat keinen Zurück-Weg, und der Bedenkzeit-Timer wählt bei Ablauf TEILEN mit Toast-Hinweis. |
| Distribute: „Auszahlen" erst bei 0 Rest; Summe == V (bzw. V−2 bei Meineid); alles auf eine Person erlaubt | ✅ | Der Button hängt am Restzähler; die Summe erzwingt `applyDistribution()` (Invariante aus A0). E2E verteilt in Runde 2 alle 6 Schlücke auf eine Person — erlaubt (ADR-4) — und in der Eid-Runde nur die verbleibenden 2. |
| Result-Banner je Outcome korrekt; Tresor-Vorschau zeigt `nextVault` | ✅ | E2E prüft „Ehre unter Dieben" → „Der Alleingang" → „Zu viele Köche" → „MEINEID!" und die Zeilen „Der Tresor wächst auf 6" bzw. „Der Tresor wurde geleert". Das Widget zeigt beim Betreten den alten Stand und klappt nach 420 ms sichtbar auf den neuen. |
| Statistik: Vertrauens-Index, Streak, Meistbetrogen nach 5 Testrunden korrekt | ✅ | `tests/unit/session.test.ts` rechnet fünf konstruierte Runden durch (Scoreboard, Vertrauens-Index 40/80/100/100 %, aktuelle und längste Streak, Meistbetrogen). E2E prüft zusätzlich, dass das Sheet nach drei echten Runden die Abschnitte zeigt. |
| Touch-Ziele ≥ 48 px, Safe-Areas, Reload-Persistenz, Back-Dialog | ✅ | E2E misst alle sichtbaren Buttons in einem Rutsch (keiner unter 48 px), lädt die Lobby neu und findet Name und Härte-Einstellung wieder, und prüft den „Runde abbrechen?"-Dialog in beide Richtungen. Safe-Areas laufen über die `env()`-Tokens aus `base.css`. |
| Countdown letzte 10 s rot, letzte 5 s Tick | ✅ | `countdownRing.ts` setzt `is-warning` ab 10 s und `is-ticking` ab 5 s; die Ziffer bekommt in der Tick-Phase einen Punch, damit der Takt auch stumm sichtbar ist (GDD §6). Der Ton kommt in M3. |
| Keine hardcodierten Strings | ✅ | `tests/unit/guards.test.ts` durchsucht `src/ui/` und `src/main.ts` nach `textContent`/`innerText`/`innerHTML`-Zuweisungen mit echtem Text (Inline-SVG ausgenommen) → 0 Treffer. `tests/unit/ui.test.ts` prüft zusätzlich, dass alle 110 von den Screens benutzten Keys in DE **und** EN existieren. |
| Keine `console.error` im E2E-Flow | ✅ | Der Dreirunden-Test und der Titel-Test sammeln `console`-Errors und `pageerror` → beide leer. |
| Eine unbeteiligte Person versteht jeden Screen ohne Erklärung | ⏳ manuell | Screenshots liegen in `docs/screens/m1-*.png`. Braucht echte Menschen. |
| Party-tauglich mit Platzhalter (DoD) | ⏳ manuell | Zwei vollständige Runden laufen sauber durch; die Reveal-Reihenfolge trägt die Spannung schon ohne Effekte (ADR-12). Ob es am Tisch trägt, entscheidet der Playtest. |

**Befunde während der Umsetzung**

- **Die Idle-Animation lag auf dem Tap-Ziel.** Die Wahl-Karten wippten als Ganzes, der Button wanderte also ständig. Auf dem Handy trifft man ein wanderndes Ziel schlechter — und Playwright wartete ewig auf ein „stabiles" Element. Die Bewegung sitzt jetzt auf einem inneren Element, der Button steht still.
- **Der Münzpegel im Tresor war nie sichtbar.** Die Geometrie schob den Stapel in die falsche Richtung: Selbst bei vollem Tresor lag er unter dem Fensterrand. Neu gezeichnet — in Ruhelage füllt der Stapel das Fenster, `--vault-fill` schiebt ihn nach unten heraus.
- **Der Countdown-Ring schnitt die Anzeige.** Die Zahl schwebte losgelöst über dem Ring, und der Ring lief quer durch den Flip-Counter. Die Zahl sitzt jetzt als dunkler Chip auf dem oberen Ringrand, Tür und Zähler stehen vollständig innerhalb des Rings — dadurch passt auch die Auszahlungstabelle wieder auf den ersten Bildschirm.
- **Die TEILEN-Illustration war unlesbar.** Ein Handschlag wird bei 60 px Kantenlänge zu Matsch; im Test las er sich als Korb. Ersetzt durch zwei anstoßende Gläser (ADR-11), GDD und Art Direction nachgezogen.
- **Die verriegelte Maulwurf-Karte war tot.** `aria-disabled="true"` nahm ihr die Rückmeldung — dabei ist das Rütteln plus „Nicht für dich" genau die Information, die der Maulwurf braucht (ADR-13).
- **Die Lobby baute sich erst nach dem Wipe auf.** `ensureMinimumPlayers()` lief in `activate()`, die Liste erschien also sichtbar verzögert. Läuft jetzt beim Bau des Screens.
- **Die letzte Reveal-Karte war breiter und rutschte dadurch in eine eigene Zeile.** Sah nach Layoutfehler aus. Sie hebt sich jetzt über einen Goldrahmen ab statt über Extrabreite.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M2:**

- [ ] Eine Runde mit echten Menschen am Tisch spielen (3–5 Personen, ein Handy): Versteht jeder jeden Screen ohne Erklärung? Ist die Verhandlungsphase lang genug? Trägt die Reveal-Reihenfolge die Spannung schon ohne Effekte?
- [ ] Auf einem echten Gerät prüfen, ob das Handy während Verhandlung und Aufdeckung wach bleibt (Wake-Lock; auf iOS erst ab Safari 16.4) und ob die Vibration beim Versiegeln und bei der letzten Karte spürbar ist.

**Zahlen:** 534 Unit-Tests · 30 E2E-Tests (15 × 2 Geräte) · Coverage `core/` 99,7 % Statements / 97,1 % Branches, `fsm.ts` 100 % · Bundle 24,3 KB JS gzip (PIXI kommt ab M2 dazu) · 10 Screens, 8 Komponenten.

## Audit A2 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen Lukas Gerät bzw. Auge)

| Check | Status | Notiz |
|---|---|---|
| 8 Crooks + Raum + Laser 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms | ✅ | Gemessen über 60 s mit acht Crooks, wandernden Lasern und sprechendem Kassel: **p50 16,7 ms · p95 16,7 ms · 60 fps**, vsync-gebunden. Automatisiert in `tests/e2e/perf.spec.ts` (20-s-Fenster, gleiche Schwellen). Gerät: Chromium/Metal auf Apple M1 — das Referenzgerät steht noch aus (⏳ unten). |
| Draw-Batches ≤ 3 | ✅ | **2 Draw-Calls**, auch während Kassel spricht. Erreicht über ADR-14 (drei Atlanten entlang der Zeichenreihenfolge) und ADR-16 (Sprechblase als 9-Slice statt `Graphics`). Der Test zählt echte `drawElements`/`drawArrays`-Aufrufe im WebGL-Kontext, keine interne Batch-Liste, und triggert Kassels Blase gezielt mit. |
| Heap flach über 30 s | ✅ | 9,5 MB → 9,5 MB über 60 s. Automatisiert als eigener Fall (10 % Toleranz, weil der GC seine eigene Taktung hat). |
| Look-Check gegen Art Direction §1/§5/§6 | ✅ (⏳ Lukas Auge) | Screenshots `docs/screens/m2-3spieler-ruhe.png`, `m2-8spieler-ruhe.png`, `m2-8spieler-aufgedeckt.png`. Vorhanden und erkennbar: Domino-Masken in Spielerfarbe, Ringelshirts auf der Hälfte der Crooks, Symbol auf dem Torso, Samttisch, Stahl-Tresor mit Goldrad, Spotlight-Kegel, wandernde Laser, Vignette, Herr Kassel mit Monokel, Schnurrbart, Sakko und Kassenbuch. |
| Alle 8 Farben + Symbole auf dem dunklen Samt unterscheidbar (Deuteranopie-Simulation) | ✅ | Neues Skript `npm run check:colors` (Brettel/Viénot über LMS, ΔE76 in CIE Lab). Bei normalem Sehen sind alle 28 Paare deutlich getrennt. **Befund:** Unter Deuteranopie rücken vier Paare zusammen (rot/grün ΔE 15, lila/cyan ΔE 13, blau/lila ΔE 22, grün/orange ΔE 22), unter Protanopie zwei (blau/lila ΔE 4, grün/orange ΔE 21). Genau dafür trägt jede Farbe ihr Symbol (GDD §3.1) — auf Torso und Kartenrückseite. Das Skript listet die betroffenen Paare namentlich auf, statt sie durchzuwinken. |
| Halbkreis-Layout bei 3 und bei 8 Spielern ohne Überlappung | ✅ | `layoutStage()` ist eine reine Funktion, der Check damit ein Unit-Test statt eines Blicks (`tests/unit/layout.test.ts`, 11 Tests): Plätze im Bild, Crooks hinter ihren Karten, kein Paar näher als eine Kartenhöhe, Karten-Scale 0.8 ab sieben Spielern bei gleichbleibendem Bogen. |
| Tresor open/close/grow/drain/burst laufen sauber mit Sound-Hooks | ✅ | Alle fünf geben eine GSAP-Timeline zurück, damit der `RevealDirector` (M3) sie einhängen kann statt sie nur anzustoßen. Jeder Schritt ruft `onSound(...)` mit der ID aus GDD §6 — der AudioManager hängt sich in M3 ein. Im Dev-Panel von Hand prüfbar. |
| Preload während NEGOTIATION: kein Nachladen beim Betreten von REVEAL | ✅ | Negotiation- und Silence-Screen stoßen `preloadStageAssets()` per dynamischem `import()` an; `loadStageAssets()` teilt sich eine Promise, ein zweiter Aufruf lädt nichts nach. Der Bühnen-Chunk (92 KB gzip) liegt damit vor dem ersten Kartenflip im Speicher. |
| Low-Effects greift bei CPU-Throttle | ✅ | Zweistufig wie in Architektur §9: Geräte-Vorabschätzung (`deviceMemory`, `hardwareConcurrency`) plus gemessener Frame-Median über die ersten 2 s. Greift die Regel, verschwinden Laser, Schatten und Vignette. Im Dev-Panel schaltbar. |
| Dev-Panel: Spieleranzahl, Tresor auf/zu, Karte umdrehen, Alarm, FPS | ✅ | `?dev=1` blendet Bildrate, ms/Frame, Draw-Calls und Crook-Zahl ein, dazu sechs Knöpfe (Tresor auf/zu, Karte umdrehen, Alarm, Kassel, Low-Effects, Kamera zurück). `?dev=1&hold=1` hält den Karten-Takt an — so lässt sich die Bühne ansehen und messen, ohne dass die Runde weiterläuft. Die Spieleranzahl stellt man in der Lobby ein, wo sie ohnehin hingehört. |
| Kein Nachladen, keine Console-Fehler im Flow | ✅ | Die 30 E2E-Tests aus A1 laufen unverändert grün, jetzt gegen die PIXI-Bühne. Fällt PIXI aus (kein WebGL, kaputter Atlas), übernimmt die DOM-Kartenreihe aus M1 — ein Trinkspiel darf nicht am Renderer sterben. |
| Referenzgerät iPhone 11 / Pixel 4a: 60 fps | ⏳ manuell | Alle Messungen stammen von einem M1-Mac. Ein Gerät der Zielklasse hat niemand hier. |
| „Sieht das nach Ocean's Eleven als Samstagmorgen-Cartoon aus?" | ⏳ manuell | Braucht ein Auge, keinen Test. |

**Befunde während der Umsetzung**

- **Sechs Atlanten hätten das Draw-Budget gesprengt.** Thematisch geschnitten (crooks, cards, vault, room, props, kassel) wechselt die Textur pro Frame bis zu sechsmal. Neu geschnitten entlang der Zeichenreihenfolge — und zwei Assets liegen dafür bewusst „falsch": die Farbsymbole doppelt und das Licht bei den Karten (ADR-14).
- **PIXI lag im Einstiegs-Chunk.** Ein einziger statischer Import im Negotiation-Screen zog 170 KB gzip in den Start. Alle `game/`-Module werden jetzt dynamisch geladen; der Einstieg ist wieder bei 25 KB (ADR-15).
- **Die Sprechblase kostete zwei Draw-Calls.** Als `Graphics` gezeichnet stieg die Zahl auf 4, sobald Kassel den Mund aufmachte. Jetzt ein 9-Slice-Sprite aus dem Atlas (ADR-16).
- **Die Weltskalierung stimmte nicht fürs Hochformat.** Mit Drinkshots `Math.max`-Regel lag im Portrait der halbe Halbkreis außerhalb des Bildes — die äußeren Karten waren schlicht nicht da. Jetzt auf die Breite skaliert, Wand und Boden reichen über die Weltgrenzen hinaus (ADR-17).
- **Der Überlappungstest maß die falsche Kante.** Er prüfte gegen die Karten*breite* und war grün, während sich die Karten an den Bogenenden sichtbar schnitten: Dort liegen zwei Nachbarn fast übereinander, und da entscheidet die *Höhe*. Bogen und Kartengröße wurden daraufhin gemeinsam neu gerechnet.
- **Die Tresortür schwang um den falschen Punkt.** Das Blatt saß eine halbe Türbreite zu weit links, Zahlenrad und Griffrad blieben auf dem offenen Loch liegen. Scharnier auf die linke Kante gesetzt; das Öffnen ist jetzt eine Stauchung, keine Drehung — in 2D ist das der einzige Weg, der wie eine Tür aussieht.
- **Kassel verschwand nach der ersten Runde.** Er hing in derselben Ebene wie die Crooks, und die räumt `populate()` zwischen zwei Runden ab. Eigene Ebene, gleiche Textur, kein zusätzlicher Draw-Call.
- **Die Kamera fuhr pro Karte heran.** Das ist Regie und gehört in den `RevealDirector` (M3); in M2 zerstörte es die Komposition — man sah zwei von acht Crooks. Für diesen Meilenstein bleibt die Totale stehen.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M3:**

- [ ] Die Bühne auf einem echten iPhone 11 / Pixel 4a öffnen und 60 s laufen lassen: Bleiben es 60 fps? Ruckelt etwas beim Kartenflip? (`?dev=1&hold=1` zeigt Bildrate und Draw-Calls direkt auf dem Gerät.)
- [ ] Look-Check gegen Art Direction §1: Sieht der Raum nach „Ocean's Eleven als Samstagmorgen-Cartoon" aus? Sind Maske, Ringelshirt und Symbol auf Anhieb dem richtigen Spieler zuzuordnen?

**Zahlen:** 545 Unit-Tests · 30 E2E-Tests · 3 Perf-Tests · 68 Atlas-Frames in 3 Texturen (739 KB @2x) · Einstiegs-Chunk 25 KB gzip, Bühnen-Chunk 92 KB gzip · 2 Draw-Calls · 60 fps mit 8 Crooks.

## Audit A3 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen echte Menschen)

| Check | Status | Notiz |
|---|---|---|
| 1 000 simulierte Runden: aufgedeckte Karten == `choices`, Reihenfolge == `revealOrder`, Outcome == `result.outcome` | ✅ | `tests/unit/director.test.ts`: 1 000 Runden über 3–8 Spieler, alle drei Härten, alle Modus-Kombinationen und alle drei Presets. Geprüft wird pro Runde: jede Karte genau einmal, in der Reihenfolge des Ergebnisses; auf jeder Karte steht die getroffene Wahl; Teiler vor Dieben; Maulwurf als letzte Karte; genau eine `isLast`; Alarm genau dann, wenn es einen Dieb gibt. Alle fünf Outcomes kommen dabei vor. |
| Timing-Presets ± 1 s; 8 Spieler „Lang" ≤ 40 s | ✅ | 18 Fälle (3 Presets × 6 Spielerzahlen) gegen die aus `choreo.ts` errechnete Soll-Dauer, Abweichung ≤ 1 s. Acht Spieler auf „Lang" landen bei 37,8 s. Gemessen im Browser: 5 Spieler, „Normal" → 22,7 s geplante Timeline, 24,3 s bis zum Result inklusive Outro und Wipe. |
| Tap-to-Skip funktioniert ab Karte 2, nie bei letzter Karte/Outcome | ✅ | Die Regel liegt im Director (`skip()`), nicht im Screen: Er kennt den laufenden Beat und dessen Karten-Index. E2E deckt drei Karten auf, tippt dann **zwanzigmal** — die letzte Karte rückt nicht vor, und die Show läuft trotzdem vollständig zu Ende. |
| Alarm nach erstem STEHLEN; Laser rot; letzte Karte mit 2 Stalls + Slow-Mo + Herzschlag | ✅ | Alarm-Beat sitzt im Skript direkt hinter der ersten offenen Diebeskarte (Unit-Test über 1 000 Runden). Die letzte Karte bekommt `STALLS_LAST` = [0.6, 0.85], `timeScale` 0.55, ein auf 55 % zusammenziehendes Spotlight, und der Herzschlag zieht über ihre Verweildauer von 70 auf 132 bpm an, während die Musik auf 25 % gedückt wird. |
| Perf-Test grün | ✅ | Neuer Fall in `perf.spec.ts` misst **während** die Show läuft — acht Karten mit Stalls, Kamerafahrten, Alarm, Zähler: **p50 16,7 ms · p95 16,7 ms · 2 Draw-Calls**. Die stehende Bühne aus A2 bleibt als eigener Fall bestehen. |
| Filter nur temporär aktiv | ✅ | Es gibt keine. Der Alarm-Blitz und der Meineid-Blitz laufen über einen getinteten Sprite aus dem `front`-Atlas, nicht über einen `ColorMatrixFilter` — das kostet keinen zusätzlichen Draw-Call und keine Render-Textur. |
| Stumm voll spielbar; Sound-Sync Karten-Flip ± 50 ms | ✅ | Der `AudioManager` ist ohne entsperrten Kontext ein No-op und wirft nie (Unit-Test). Die Cues hängen als `.call()` an derselben GSAP-Timeline wie die Animation, nicht an einem eigenen Timer — sie können gar nicht auseinanderlaufen (ADR-19). Jedes Stocken bekommt seinen eigenen Tick; ohne ihn hört man das Zögern nicht. |
| Tab-Wechsel → Pause/Resume ohne Sprung; Wake-Lock aktiv | ✅ | Der Screen hängt an `visibilitychange` und pausiert die Timeline samt Trommelwirbel und Herzschlag; `StageApp` stoppt zusätzlich Ticker und GSAP-Root. Wake-Lock läuft ab dem Sealed-Screen. |
| Haptik bei letzter Karte | ✅ | Der Director meldet jede offene Karte mit `isLast`; der Screen vibriert dann mit dem `lastCard`-Muster statt mit dem normalen Tap. |
| Spannungs-Test: 3 Personen sehen 5 Reveals | ⏳ manuell | Braucht Menschen, keinen Test. Screenshots der vier Momente in `docs/screens/m3-*.png`. |
| „Zieht die letzte Karte wirklich an?" | ⏳ manuell | Dasselbe. |

**Befunde während der Umsetzung**

- **Die Kamerafahrt legte die Wandkante frei.** Beim Zoom auf eine Randkarte schiebt sich der Raum seitlich weg — die Wand deckte aber nur die Weltbreite ab, und am Bildrand stand ein schwarzer Streifen. Wand und Tisch reichen jetzt nach beiden Seiten über die Weltgrenzen hinaus.
- **Zwei Tests, die die falsche Frage stellten.** Der Skip-Test erwartete nach einem einzelnen Dieb den Result-Screen — richtig wäre die Verteil-UI; und er las das Aufdeck-Protokoll, nachdem der Screen samt Protokoll schon ausgetauscht war. Beides Testfehler, kein Spielfehler: Die Skip-Regel selbst hat auf Anhieb gehalten.
- **PixiJS lärmte in der Unit-Suite.** Jeder Test, der ein Modul mit PIXI-Berührung importiert, produzierte einen mehrzeiligen jsdom-Stacktrace. Canvas-Stub im Setup (ADR-21).
- **Die Outcome-Auswahl saß am falschen Ort.** Architektur §5 sieht sie in `resolveRound()` vor — dann müsste der Regelkern die Registry kennen, und die liegt im Bühnen-Chunk. Sie ist in den Director gewandert; deterministisch bleibt es über denselben Seed (ADR-20).

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M4:**

- [ ] Spannungs-Test aus A3: Drei Personen sehen fünf Aufdeckungen mit unbekanntem Ergebnis. Sagen mindestens zwei, dass sie bei der letzten Karte angespannt waren? Gibt es bei einem Doppel-Dieb-Twist eine hörbare Reaktion?
- [ ] Auf einem echten Gerät mit Ton: Trägt der Herzschlag bei der letzten Karte? Sind die synthetisierten Platzhalter-Sounds gut genug, um bis M6 zu bleiben — oder braucht es echte Samples?

**Zahlen:** 582 Unit-Tests · 32 E2E-Tests · 3 Perf-Tests · Show 22,7 s bei 5 Spielern („Normal") · p50 16,7 ms während der Show · 2 Draw-Calls · 26 Sound-Cues, synthetisiert.

## M4 — Ergebnis-Inszenierungen — 2026-09-04 (Tag `v0.4.0`)

**Stand:** 11 Inszenierungen + 2 Overlays gebaut, registriert, getestet und einzeln in der Dev-Preview abspielbar. Kassel kommentiert jeden Ausgang aus einem i18n-Array. Der Trinker-Zähler-Moment schließt jede Sequenz ab.

**Was neu ist**

- `src/game/outcomes/<typ>/*.ts` — die elf Sequenzen aus GDD §4.4.
- `src/game/outcomes/juice.ts` — `hitStop()`, das siebte Animationsprinzip (ADR-22).
- `src/game/outcomes/registry.ts` — `ALL_OUTCOMES`, `ALL_OVERLAYS`, `registerAll()`.
- `src/game/Crook.ts` — `growNose()` und `stamp()` für den Meineid; `assets-src/svg/crooks/nose.svg` ist neu.
- `src/ui/dev/outcomePreview.ts` — `npm run preview:outcomes` spielt jede Sequenz und jedes Overlay einzeln ab, ohne eine Runde durchzuspielen.
- `tests/unit/stageDouble.ts` — Bühnen-Attrappe: echte GSAP-Timelines, gefälschte Figuren. So laufen alle elf Sequenzen ohne Renderer durch.
- `tests/unit/outcomeRegistry.test.ts` — 64 Fälle.

## Audit A4 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; Lesbarkeit und „Lustig-Test" brauchen Menschen)

**Pro Sequenz** (Dauer über die Bühnen-Attrappe, 4 Spieler; auf der echten Bühne kommen je nach Spielerzahl ein bis zwei Zehntel dazu):

| ID | Dauer | Zähler | Reset | Hit-Stop | Notiz |
|---|---|---|---|---|---|
| `share_group_hug` | 4,6 s | ✅ | ✅ | ✅ | Anticipation in den Knien, Overshoot beim Ankommen, Halt in der Umarmung, Kassels Träne, dann die Rechnung. |
| `share_toast` | 4,5 s | ✅ | ✅ | ✅ | Gläser hoch, Halt oben im Klirren, ein einzelner Crook bekommt Schluckauf. |
| `steal_solo_getaway` | 3,7 s | ✅ | ✅ | ✅ | Zugriff mit Halt, Fluchtauto, Reifenqualm, Kinnladen der Teiler, das Schild „WIR HATTEN EINEN DEAL". |
| `steal_solo_moonwalk` | 3,8 s | ✅ | ✅ | ✅ | Anticipation gegen die Laufrichtung, Gleiten mit Körperwippe, Halt im Moment des Groschens. |
| `steal_solo_magician` | 4,2 s | ✅ | ✅ | ✅ | Tuch über den Tresor, Halt auf dem leeren Tresor, Applaus, der mitten im Takt kippt. |
| `steal_multi_tugofwar` | 5,3 s | ✅ | ✅ | ✅ | Popcorn-Publikum, dreimal härteres Ziehen, Sack platzt, Halt, Münzen fliegen in die Münder. |
| `steal_multi_anvil` | 5,2 s | ✅ | ✅ | ✅ | Amboss in der Farbe des Gegenspielers, Anticipation oben, Squash, Halt, Follow-Through per Bounce. |
| `steal_multi_standoff` | 4,3 s | ✅ | ✅ | ✅ | Kameraschwenk die Reihe ab, alle spritzen gleichzeitig, Reaktion kommt eine Spur zu spät. |
| `steal_all_brawl` | 5,1 s | ✅ | ✅ | ✅ | Staubwolke aus neun Puffs (ADR-24), genau ein Schuh fliegt raus, Halt vor der Pointe, Kassel mit der Kelle. |
| `steal_all_alarm` | 4,5 s | ✅ | ✅ | ✅ | Alle greifen zu, Sirene, Gitter fällt in einem Zug, Halt beim Einrasten, dann federt es nach. |
| `jackpot_burst` | 4,6 s | ✅ | ✅ | ✅ | Tresor bläht sich, platzt, Halt mitten im Knall, 90 Konfetti + 40 Münzen, alle tanzen. |
| `perjury_seal_break` (Overlay) | 1,2 s | — | ✅ | — | Blitz, drei Scherben, Lügennase in drei Schüben, MEINEID-Stempel auf die Brust. |
| `mole_reveal` (Overlay) | 0,7 s | — | ✅ | — | Bergbauhelm fällt auf die Karte, Schulterzucken: Befehl ist Befehl. |

| Check | Status | Notiz |
|---|---|---|
| Dauer 2–8 s | ✅ | Alle elf zwischen 3,7 s und 5,3 s — Testfall pro Sequenz gegen `ANIM.outcomeMinMs`/`outcomeMaxMs`. |
| Endet mit dem Trinker-Zähler-Moment | ✅ | Jede Sequenz ruft `buildSipCounters()`; der Test spielt sie bis ans Ende und prüft, dass eine Zahl fällt, sobald jemand trinkt. Beim Alleingang bleibt der Zähler leer — dort entscheidet erst DISTRIBUTE, wer trinkt (GDD §3.6), und die Übergabe „Handy an {Dieb}" steht im E2E-Durchlauf. |
| Reset-Invariante | ✅ | Der Test bricht jede Sequenz bei 60 % ab — dort räumt eine Inszenierung am schlechtesten auf — und prüft danach Alpha, Rotation, Skalierung, Requisiten, Geldsack und Sitzposition jeder Figur. |
| Alle sieben Animationsprinzipien | ✅ / ⏳ | Der Hit-Stop wird erzwungen: Ein Test lehnt jede Sequenzdatei ohne `hitStop()` ab (ADR-22). Anticipation, Squash & Stretch, Overshoot, Follow-Through, Staffelung und Sound-Sync stehen in jeder Sequenz und sind im Code kommentiert — ob sie *wirken*, ist Augenmaß und bleibt manuell. |
| Alle IDs registriert, in Dev-Preview abspielbar | ✅ | `registerAll()` nimmt alle elf plus `basic_outcome` als Rückfall; `npm run preview:outcomes` zeigt für jede einen Knopf, dazu beide Overlays und `reset`. |
| No-Repeat-Fenster 3 pro Typ, 1 000 Runden | ✅ | Test zieht 1 000-mal für jeden der fünf Typen; keine Wiederholung im Fenster, sobald es mehr Alternativen als das Fenster gibt. Beim Jackpot mit nur einer Sequenz darf und muss dieselbe wiederkommen. Über 1 000 Runden kommt jede Sequenz dran. |
| Gewichte | ✅ | Alle elf mit Gewicht 1 — bewusst gleich verteilt, bis die Spieltests zeigen, welche Inszenierung trägt und welche nervt. Der Test lehnt Gewicht ≤ 0 ab. |
| Overlays kombinierbar mit jeder Dieb-Sequenz | ✅ | Beide Overlays werden gegen jede der acht Dieb-Sequenzen gebaut; jedes bleibt unter dem Outcome-Budget. |
| Kassel-Kommentare pro Outcome | ✅ | Fünf i18n-Arrays à drei Sätze plus drei für den Meineid, gezogen mit dem Runden-Seed — dieselbe Runde klingt beim Nachspielen gleich (ADR-23). |
| Kein Frame-Drop während der Sequenzen | ✅ | `perf.spec.ts` misst über die komplette Show inklusive Auszahlung: **p50 16,7 ms · p95 16,7 ms · 2 Draw-Calls** auf iPhone 12 und Pixel 5 (emuliert). |
| Partikel-Budget | ✅ | Alle Effekte laufen über `FxKit` und die Pools; ist das Budget aus Art Direction §8 erschöpft, gibt der Pool `undefined` zurück und der Partikel entfällt. Der Jackpot fordert mit 90 Konfetti + 40 Münzen am meisten an. |
| In 1 s auf 5,8" lesbar, wer trinkt und warum | ⏳ manuell | Screenshots in `docs/screens/m4-*.png`. Braucht ein Auge und eine Stoppuhr. |
| „Lustig-Test": ≥ 2 von 3 grinsen | ⏳ manuell | Braucht drei Menschen. |
| Video `docs/screens/m4-outcomes.mp4` | ⏳ offen (SOLL) | Sechs Standbilder statt Video; ein Bildschirmmitschnitt der Dev-Preview ist in einer Minute gemacht, aber besser mit echtem Ton. |

**Befunde während der Umsetzung**

- **`props/sign_deal` gab es nicht.** Das Schild lag im crooks-Atlas, `spawnProp()` sucht im front-Atlas — der Alleingang wäre zur Laufzeit gestorben. Gefunden hat es kein Auge, sondern ein neuer Test, der jeden Frame-Namen in `src/game/` gegen die Atlas-Manifeste abgleicht (ADR-25).
- **Zehn von elf Sequenzen hatten keinen Hit-Stop.** Sie waren flüssig und lasen sich trotzdem weich: Ohne den Moment, in dem nichts passiert, ist ein Amboss nur ein fallendes Objekt. Nachgezogen und per Test abgesichert (ADR-22).
- **Kassel hätte sich selbst ins Wort gefallen.** Der Director warf seinen Satz pauschal am Anfang der Auszahlung ein, jede neue Sequenz noch einen an ihrer Pointe — der zweite wäre ausgerechnet über den Trinkzahlen gelandet (ADR-23).
- **Die Prügelwolke zeigte ihren eigenen Rahmen.** Fünf Rauchsprites auf 4,4-facher Größe: Der Atlas trimmt auf die Silhouette, die weiche Kante liegt auf dem Frame-Rand, und beim Vergrößern sampelt PIXI darüber hinaus (ADR-24).
- **Die Bühnen-Attrappe war die eigentliche Arbeit.** Elf Sequenzen ohne Renderer prüfbar zu machen hieß, Crooks, Tresor, Kamera und FX durch Objekte zu ersetzen, die mitschreiben — die Timelines selbst laufen echt. Ohne sie wäre „Dauer 2–8 s" eine Behauptung geblieben.
- **Das Dev-Panel verdeckte die Bühne.** Als Raster mit großen Knöpfen nahm es zwei Drittel des Bildes ein. Jetzt eine seitlich schiebbare Zeile am unteren Rand.

**Offene SOLL-Follow-ups:** Video `docs/screens/m4-outcomes.mp4`.

**Manuelle Checks für Luka vor M5:**

- [ ] `npm run preview:outcomes` auf dem Handy öffnen und jede der elf Sequenzen einmal ansehen: Ist in einer Sekunde klar, wer trinkt und warum? Welche zieht, welche nervt beim dritten Mal?
- [ ] „Lustig-Test" aus A4: Drei Personen sehen die Inszenierungen. Grinsen mindestens zwei?
- [ ] Gewichte: Alle elf stehen auf 1. Nach dem ersten echten Abend entscheiden, welche häufiger kommen soll — Balancing gehört nach `rules.ts`, die Gewichte stehen in `registry.ts`.
- [ ] Weiterhin offen aus M2/M3: echtes iPhone 11 / Pixel 4a (60 fps), Look-Check gegen Art Direction §1, Spannungs-Test mit drei Personen, Urteil über die synthetisierten Platzhalter-Sounds.

**Zahlen:** 646 Unit-Tests · 32 E2E-Tests · 3 Perf-Tests · 11 Inszenierungen (3,7–5,3 s) + 2 Overlays · 89 Atlas-Frames in 3 Texturen · p50 16,7 ms während der Show · 2 Draw-Calls.
