# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Board-Logik | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (DOM-Feld) | ✅ fertig | `v0.1.0` | A1 bestanden |
| M2 PIXI-Feld, Tiles, Diggers | ⬜ offen | – | – |
| M3 Sequenzen Teil 1 | ⬜ offen | – | – |
| M4 Hit-Sequenzen | ⬜ offen | – | – |
| M5 Polish, Modi, A11y | ⬜ offen | – | – |
| M6 Playtest & Release | ⬜ offen | – | – |

## Audit-Reports

## Audit A1 — 2026-09-04

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| E2E-Szenarien aus M1.7 grün (iPhone 12 + Pixel 5 Emulation) | ✅ | 16 Tests: zwei Runden mit Explosion, Kistenfund und Preis der Gier; Doppelagent; Kettenreaktion; Verteilung; Replay; Statistik über zwei Runden. Zur Ausführung siehe „Was dabei aufgefallen ist" (5). |
| Place: Limit erzwungen, Toggle funktioniert, kein Ergebnis vorheriger Spieler sichtbar, Bedenkzeit-Fallback | ✅ | Der Place-Screen bekommt `placeViewFor(spieler)` — die Minen der Vorgänger existieren dort nicht einmal als Datenstruktur. Der Bedenkzeit-Fallback läuft über `fsm.fillPlacements()` und damit über `crypto`. |
| Dig: nur geschlossene Platten tippbar; Board gesperrt während Banner; Turn-Banner zeigt korrekten Spieler; Rundenende bei Kiste | ✅ | Offene Platten sind `disabled`, das Feld trägt während der Inszenierung `aria-busy` und `pointer-events: none`. Taps werden ignoriert, nicht gepuffert (Architektur §3). |
| Eigene Mine sieht im Dig-Grid exakt wie leer aus (Vergleich im E2E) | ✅ | Der E2E-Test vergleicht die Klassenliste beider Platten und prüft, dass kein Banner erscheint und `minesRemaining` nicht sinkt (ADR-8). Das ist schärfer als ein Screenshot-Vergleich, der an einem zufälligen Fundstück scheitern würde. |
| Distribute: Iteration über alle Token-Besitzer in korrekter Reihenfolge; nicht an sich selbst; Summe stimmt | ✅ | Finder zuerst, dann Leger in Explosionsreihenfolge. Das eigene Badge ist `disabled`, „Auszahlen" bleibt gesperrt, solange etwas übrig ist; `validateDistribution` aus `core/payout.ts` hat das letzte Wort. |
| Replay zeigt alle Minen mit Legerfarbe, auch nicht ausgelöste | ✅ | E2E: eine Runde, in der **keine** Mine hochgeht — alle acht tragen im Replay Ring und „Puh"-Schild. |
| Statistik nach mehreren Testrunden korrekt | ✅ | E2E über zwei Runden; die Zahlen selbst sind in `session.test.ts` abgedeckt. |
| Grid-Touch-Ziele ≥ 56 px, Abstand ≥ 6 px, kein Doppeltap-Zoom | ✅ | Gemessen im E2E auf dem engen Fall (6 × 6 auf 390 px): 58 px. Siehe (2) — das war zuerst nicht erfüllt. |
| Keine hardcodierten Strings | ✅ | Alles über `t()`; ein E2E-Test durchsucht Lobby, Regeln- und Einstellungs-Sheet nach `[missing:`. |
| Unbeteiligte Person versteht jeden Screen ohne Erklärung | ⏳ manuell | Steht aus — das ist der eigentliche M1-Test (siehe manuelle Checks). |
| Safe-Areas, Reload-Persistenz, Back-Dialog | ✅ | Safe-Areas über `env(safe-area-inset-*)`; die Session liegt nach jeder Änderung im `localStorage`; der Zurück-Knopf fängt `popstate` ab und fragt nach. Auf echter Hardware noch nicht gesehen. |

**Zahlen:** 244 Unit-Tests · 16 E2E-Tests · `core/` 99,4 % Statements / 100 % Functions, FSM 100 % Branches · Build 69,7 KB JS (23,5 KB gzip; Budget 450 KB) · 0 Lint-Warnings.

### Was dabei aufgefallen ist

**(1) Ein Leck, das nicht im Spiel war, sondern im Build.** Der Test-Seed `?seed=`, mit dem die E2E-Tests die Kistenposition steuern, landete im **Deploy-Build**. Damit hätte jeder `?seed=1` an die Live-URL hängen und die einzige Information ausrechnen können, die sonst niemand am Tisch hat — das Spiel wäre kaputt gewesen. Ursache: `import.meta.env['VITE_E2E']` in Bracket-Notation; Vite ersetzt nur die Punkt-Notation zur Bauzeit, alles andere bleibt als Laufzeit-Lookup stehen und hält den Zweig im Bundle. Jetzt Punkt-Notation, eigene `vite-env.d.ts`, und ein CI-Schritt durchsucht `dist/` nach `?seed=` — denn ob der Zweig verschwindet, entscheidet der Bundler und nicht der Quelltext (→ **ADR-11**).

**(2) Die Touch-Ziele waren zu klein — genau im engen Fall.** Bei 6 × 6 auf 390 px kamen 54 px heraus statt der geforderten 56 px (GDD §5). Das fällt beim Ausprobieren nicht auf und ist trotzdem der Unterschied zwischen „tippbar, während das Handy auf dem Tisch liegt" und „danebengetippt". Das Feld holt sich jetzt das Screen-Padding per negativem Margin zurück: 58 px bei 390 px, 56 px noch bei 375 px. Der E2E-Test misst nach.

**(3) Zwei Dinge, die der Screen dem Spieler abnehmen sollte.** Der Title navigierte in die Lobby, ohne der FSM `start` zu senden — die Runde ließ sich dann gar nicht eröffnen. Und im Doppelagent-Modus musste man nach der ersten Platte selbst auf den anderen Werkzeug-Chip tippen; der zweite Tap aufs Feld lief sonst wortlos ins Leere. Beides ist Buchhaltung, keine Entscheidung — das nimmt jetzt der Screen ab (Design-Priorität 5).

**(4) Das Trink-Banner verdeckte im Moment der Explosion das Feld.** `min-height` in einer Flex-Spalte erlaubt Schrumpfen bis genau auf diesen Wert; das Banner lief über die oberste Plattenreihe. Mit `flex: none` steht es jetzt darüber statt darauf — ausgerechnet im Moment, in dem der Krater und der Farbring des Legers zu sehen sein müssen.

**(5) Die E2E-Suite läuft hier nur in Teilläufen.** Diese Umgebung beendet den Vite-Preview-Server reproduzierbar nach etwa 60 Sekunden. Alle 16 Tests sind grün — verifiziert in vier Läufen à 4–8 Tests. In CI (`e2e`-Job) läuft die Suite am Stück; das ist dort der verbindliche Nachweis.

### Abweichungen von der Planung

- **`ui/components/boardGrid.ts` ist der Platzhalter für die PIXI-`BoardView`** (M2) und trägt bereits deren Vertrag: dieselben Modi (`place` | `dig` | `replay`), dasselbe `tileTap`, dieselbe Sperre. Ab M2 wird die Datei ersetzt; die Screens bleiben unverändert.
- **`fsm.replay()` ist neu.** Der Result-Screen brauchte das Feld-Replay und hätte sonst `fsm.context.board` anfassen müssen. Jetzt gibt es genau drei Board-Ausgänge — `view()`, `placeViewFor()`, `replay()` — und die Lint-Regel verbietet `.board` außerhalb von `core/` komplett. Das greift eine Ebene früher als das Verbot von `board.mines` und ist damit schwerer zu umgehen.
- **`ui/devSeed.ts` steht unter Coverage-Pflicht**, obwohl es in `ui/` liegt: Es entscheidet, ob die Kistenposition vorhersagbar ist.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M2:**

- [ ] **Eine echte Runde zu viert spielen** — das ist der eigentliche M1-Test. Versteht jemand, der nichts weiß, jeden Screen ohne Erklärung? Kommt der „DU warst das?!"-Moment?
- [ ] **Auf dem Handy prüfen**, ob sich das Feld einhändig tippen lässt, während das Gerät auf dem Tisch liegt — die 58 px sind gemessen, nicht gefühlt.
- [ ] **Screenshots gegenlesen** (`docs/screens/m1-*.png`): Wiese unter dem Feld, Bomben beim Legen, Krater mit Farbring plus Temperatur-Icon auf hellem Kreis. Die zwei Formensprachen aus Art Direction §2 sind der Punkt — sind sie auseinanderzuhalten?
- [ ] **Entscheiden, ob die Emoji bleiben.** Wurm, Bierkrug, Bombe und Rauchwölkchen sind Platzhalter bis zum Atlas in M2. Auf iOS und Android sehen sie unterschiedlich aus.
- [ ] Weiterhin offen aus A0: **Repo pushen** und Pages auf „GitHub Actions" stellen; **PWA auf einem echten Gerät installieren**.

## Audit A0 — 2026-09-04

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| Struktur nach Architektur §2; `rules.ts` enthält GDD-Werte (5×5 ≤ 5 Spieler, 6×6 ab 6; 2 Minen; 2 Schlücke/Mine; Tokens 4/6; Hints 1/2; Modi-Parameter) | ✅ | `tests/unit/config.test.ts` schreibt jede Zahl aus dem GDD noch einmal hin — wer eine ändert, ohne das GDD zu ändern, fällt dort auf. |
| `board.test.ts`: alle `kind`-Fälle inkl. Stapel, Greed, Greed+Stapel, eigene Mine stumm, Dud, Nachtgräber-Hint `'none'` | ✅ | 49 Tests. Zusätzlich abgedeckt: eigener Trittstein unter fremdem Blindgänger, Kiste auf eigener Mine, fremde Mine schlägt fremden Dud. |
| `publicView.test.ts`: eigene aufgegrabene Mine ≡ leeres Feld; nie ungeöffnete Minen/Kisten im View | ✅ | 20 Tests, inkl. Zeichen-für-Zeichen-Vergleich der serialisierten Views. Siehe „Was dabei aufgefallen ist" (1). |
| Kiste kann auf verminter Zelle liegen (Test erzwingt es per Seed) | ✅ | `board.test.ts` → „darf die Kiste auf ein vermintes Feld legen (ADR-4)". |
| Kettenreaktion öffnet genau die 8 Nachbarn mit Minen, niemand trinkt, Leger sichtbar | ✅ | 8 Tests. Drei offene Fragen des GDD entschieden und dokumentiert → **ADR-7**. |
| Payout: 2 × fremde Minen; Token je Leger; Finder 4/6; Zwei Kisten 2/3; Sprengmeister-Bonus beide Fälle | ✅ | 24 Tests in `payout.test.ts`, 12 in `modes.test.ts`. |
| Turn: Startspieler rotiert; Timer-Fallback wählt geschlossene Zelle mit `crypto` | ✅ | 9 Tests. Rotation zusätzlich end-to-end über die FSM geprüft. |
| Property-Test 10 000 Runden: endet immer, keine negativen Schlücke, Token-Summe stimmt | ✅ | 4 Modus-Kombinationen × Spielerzahl 3–8, sechs Invarianten pro Runde. |
| `Math.random` in `src/core/` → 0 Treffer; Kiste nur über `crypto` | ✅ | ESLint-Regel + eigener CI-Job. `placeTreasure` nimmt ausschließlich eine `SecureRandom` entgegen. |
| Kein Screen referenziert `board.mines` (Lint-Test) | ✅ | Test über alle Dateien außerhalb `core/` + ESLint-`no-restricted-syntax` + CI-Job. In M0 noch ohne Screens — deshalb prüft der Test sich selbst mit („beißt, wenn ein Screen doch zugreift"). |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | ✅ | FSM 100 % Statements und Branches; `core/` gesamt 99,43 % Statements, 95,87 % Branches, 100 % Functions. Siehe (3). |
| CI grün | ✅ lokal | Alle CI-Schritte lokal durchlaufen: typecheck, lint (0 Warnings), Coverage, Build, E2E 6/6 auf iPhone 12 + Pixel 5, beide Informationssicherheits-Greps. Auf GitHub noch nicht gelaufen — das Repo ist noch nicht gepusht. |
| Titel auf Handy | ⏳ manuell | Boot-Screen gebaut, im E2E auf iPhone-12- und Pixel-5-Emulation grün (kein Querscrollen, keine Konsolenfehler). Auf einem echten Gerät noch nicht gesehen. |
| PWA installierbar | ⏳ manuell | Manifest, Service Worker und alle vier Icons werden gebaut und im E2E validiert (`standalone`, `portrait`, `any` + `maskable`). Installation auf einem echten Gerät steht aus. |

**Zahlen:** 237 Unit-Tests · 6 E2E-Tests · `core/` 99,43 % Statements / 95,87 % Branches / 100 % Functions · Build 15,7 KB JS (6,7 KB gzip; Budget 450 KB) · 0 Lint-Warnings · 0 Produktions-Vulnerabilities.

### Was dabei aufgefallen ist

**(1) Ein Informationsleck, das nicht im Datenmodell stand.** Architektur §4 gibt dem `publicView` die „Anzahl verbleibender Minen gesamt". Zählt man die ehrlich, sinkt sie bei jedem stumm aufgegrabenen eigenen Trittstein um eins — und jeder am Tisch kann an dieser einen Ziffer ablesen, was das Spiel gerade verschweigt. ADR-2 wäre durch die Hintertür ausgehebelt gewesen. `minesRemaining` zählt jetzt über die **gezeigten** Explosionen; verbrauchte eigene Minen bleiben in der Zahl stehen. → **ADR-8**, Test in `publicView.test.ts`.

**(2) Drei Lücken in der Kettenreaktions-Spezifikation.** Das GDD sagt „alle Minen auf den 8 Nachbarfeldern explodieren mit" und lässt offen, ob das kaskadiert, was mit einer Kiste im Nachbarfeld passiert und ob eigene Minen des Gräbers gezeigt werden. Entschieden: keine Kaskade; Kisten bleiben zu (sonst könnte die Runde enden, ohne dass jemand die Kiste gefunden hat — kein Finder, keine Tokens, kein Moment); eigene Minen werden gezeigt (der Modus soll Leger verraten, und der Trittstein ist ohnehin verbraucht). → **ADR-7**.

**(3) Drei unerreichbare Zweige in der FSM.** Die geforderten 100 % Branch-Coverage stehen. Drei Zweige sind allerdings defensive Absicherungen, die per Konstruktion nicht erreichbar sind: fehlendes Ergebnis in DISTRIBUTE, niemand hat Tokens am Rundenende, volles Feld beim Timer-Fallback. Sie sind mit `/* v8 ignore next */` und je einer Begründung markiert, statt künstliche Tests dafür zu bauen — die 100 % sind damit echt für alles, was ein Spieler auslösen kann.

**(4) Der erste Balancing-Blick — und warum die naheliegende Zahl täuscht.** Der Rundensimulator, den der Property-Test braucht, trägt später auch das Balancing (M6.2). Mit rein zufälligen Zügen liegt der Median bei 13 Grabungen — das ist aber nur der Erwartungswert für blindes Suchen, kein Balancing-Fehler. Mit einer Strategie, die die Temperatur-Hinweise liest (→ **ADR-10**), ergibt sich über je 5 000 Runden:

| Setup | Grabungen (Median) | min–max | Explosionen ⌀ | Preis der Gier |
|---|---|---|---|---|
| Klassik, 3–5 Spieler (5×5) | 4 | 1–7 | 0,54–1,01 | 15–28 % |
| Klassik, 6–8 Spieler (6×6) | 4 | 1–8 | 0,98–1,31 | 25–33 % |
| Doppelagent | 4 | 1–8 | 0,27–0,71 | 7–18 % |
| Kettenreaktion | 3–4 | 1–8 | 0,52–1,14 | 15–33 % |

Gemessen an den Zielwerten aus Audit A6 heißt das:

- **Rundenlänge passt** — Median 4 im Zielband 4–8, wenn auch an dessen unterem Rand.
- **Explosionen liegen unter dem Ziel** (0,5–1,3 statt 1–3): Die Runden sind so kurz, dass selten jemand hineintritt.
- **Die Preis-der-Gier-Rate liegt deutlich über dem Ziel** (15–33 % statt 5–15 %), und zwar strukturell — sie entspricht ungefähr dem Anteil verminter Zellen, und der steht über `MINES_PER_PLAYER` und der Feldgröße fest.

Das ist kein Fehler in M0, sondern die erste belastbare Zahlengrundlage für den Balancing-Pass in M6.2 — und sie sagt schon jetzt, an welchen Schrauben dort zu drehen wäre: Minen pro Spieler, Feldgröße, Hinweis-Schwellen. **Vor dem Playtest wird nichts geändert** (Roadmap M6.2).

**(5) Zwei Prüfungen, die an ihren eigenen Kommentaren gescheitert wären.** Der Lint-Test und der CI-Grep gegen `board.mines` hätten ab M1 jede Zeile Dokumentation über ADR-2 als Verstoß gemeldet. Beide entfernen jetzt Kommentare, bevor sie suchen — verboten ist der Zugriff, nicht die Erklärung.

### Abweichungen von der Planung

- **`src/core/simulate.ts` ist neu** und stand nicht in Architektur §2. Der Property-Test aus M0.5 braucht einen Rundensimulator, und Architektur §8 verlangt für das Dev-Panel ohnehin ein „Simulate 10 000 rounds". Statt beides doppelt zu bauen, liegt es als reine Funktion in `core/` — mit derselben Coverage-Pflicht wie alles dort.
- **`src/core/types.ts`** ist aus der Coverage-Messung ausgenommen: Die Datei enthält ausschließlich Interfaces und Typ-Aliase; nach dem Transpilieren bleibt keine ausführbare Zeile übrig.
- **`.prettierignore` schützt `docs/`, `README.md` und `CLAUDE.md`.** Prettier formatiert Markdown-Tabellen um und hätte die Planungsdokumente bei jedem Lauf angefasst. Sie werden von Hand gepflegt.
- **Deployment** läuft wie in CLAUDE.md auf GitHub Pages (`base: '/Sprengmeister/'`); ein Host, der aus dem Root serviert, baut mit `SPRENGMEISTER_BASE=/` — dasselbe Muster wie bei Drinkshot.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M1:**

- [ ] **Titel auf dem echten Handy ansehen** — `npm run dev`, im WLAN die angezeigte Netzwerk-Adresse aufrufen. Sitzt der Portrait-Frame? Stimmen die Safe-Areas auf einem Gerät mit Notch?
- [ ] **PWA installieren** — auf iOS über „Zum Home-Bildschirm", auf Android über den Installations-Prompt. Startet sie standalone, im Portrait, mit dem Bomben-Icon?
- [ ] **Repo anlegen und pushen** — `git init` und die Commits sind lokal gemacht, **gepusht wurde nicht**. `https://github.com/lukabpunkt/Sprengmeister` als Remote setzen, pushen, dann in den Repo-Settings GitHub Pages auf „GitHub Actions" stellen. Danach laufen CI und Deploy von selbst.
- [ ] **Icon abnicken** — `public/icons/icon-512.png`: Cartoon-Bombe mit glimmender Lunte, die eine Erdplatte anhebt. Passt es neben Drinkshot und Tresor in die Icon-Reihe auf dem Homescreen?
- [ ] **ADR-7 gegenlesen** — die drei Entscheidungen dort sind Spielregeln, die das GDD offengelassen hat. Besonders (c): Im Kettenreaktions-Modus werden auch die eigenen Minen des Gräbers mit seiner Farbe gezeigt. Das ist der einzige Ort im Spiel, an dem ADR-2 nicht greift.
