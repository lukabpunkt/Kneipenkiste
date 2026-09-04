# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig (⏳ 3 manuelle Checks offen) | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (DOM-Halle) | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.1.0` | A1 bestanden |
| M2 PIXI-Halle, Koffer, Charaktere | ⬜ offen | – | – |
| M3 Hinweise, Schranke, Audio | ⬜ offen | – | – |
| M4 Röntgen-Sequenzen | ⬜ offen | – | – |
| M5 Polish, Modi, A11y | ⬜ offen | – | – |
| M6 Playtest & Release | ⬜ offen | – | – |

## Audit-Reports

_(werden von Claude Code nach jedem Meilenstein angehängt — Vorlage in `05-AUDITS.md`)_

## Audit A0 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 3 Checks brauchen Lukas Gerät bzw. GitHub)

| Check | Status | Notiz |
|---|---|---|
| Struktur nach Architektur §2 | ✅ | `src/{config,core,ui,game,audio,i18n,styles}`, `tests/{unit,e2e}`, `assets-src/svg/*`, `scripts/`, `.github/workflows/` angelegt. `ui/`, `game/` und `audio/` sind bis M1/M2 leer. |
| `rules.ts` enthält die GDD-Werte | ✅ | 4–8 Spieler; Menge 0–6 (Hochsaison 0–10); k = 1/2/3; h = ⌊(n−1)/2⌋ ∈ [1,3]; p_true 0.6; 2a / 2 / 3; Boni +2 / +1; Bestechung 1–3; Verhör 30/45/90 s. Geprüft in `config.test.ts` (15 Tests). |
| `hints.test.ts`: Verschiedenheit, 0-Schmuggler, p_true, Typ-Vielfalt, Spürhund | ✅ | 14 Tests. p_true über **20 000 Runden**: 0.600 (Grenze ±0.03). Zusätzlich der Test „verrät die Menge nicht": Hinweise bei 1 und bei 6 Stück sind bei gleichem Seed identisch. |
| `round.test.ts`: inspect alle Fälle, gateOrder, Rotation, PASS überspringt Beamten | ✅ | 31 Tests: caught / clean / diplomat / bereits offen / bribed / Limit erreicht → jeweils Fehler; gateOrder sauber → Schmuggler über 100 Seeds; Rotation über 12 Runden. |
| `payout.test.ts`: Trinkwerte, Tokens, Gate, Bestechung, Boni, alle 5 Banner | ✅ | 20 Tests. Alle fünf Banner einzeln plus der Sonderfall „Diplomat-Öffnung ist keine Belästigung". |
| `publicView.test.ts`: keine Mengen, kein `truthful`, keine Diplomat-ID | ✅ | 15 Tests. Geprüft wird die **Serialisierung**: jeder Zahlenwert im View wird eingesammelt, die Mengen dürfen nicht darunter sein. Plus Lint-Test über `src/ui/` und `src/game/`. |
| Property-Test 10 000 Runden | ✅ | `property.test.ts`, 1.5 s: Hinweis-Invarianten, Diplomat nie „caught", gesperrte Koffer nie geöffnet, `openings ≤ maxOpenings`, jeder Koffer genau einmal (geöffnet oder Schranke), Token-Summe stimmt, keine negativen Schlücke, alle 5 Banner kommen vor, p_true 0.6 ± 0.03. |
| `Math.random` in `src/core/` → 0 Treffer | ✅ | `rng.test.ts` (Kommentare vorher entfernt, damit der Doc-Comment in `rng.ts` nicht fälschlich anschlägt) + ESLint-Regel `no-restricted-properties` + eigener CI-Schritt. |
| Hinweise, Diplomat, Item-Set nur über `crypto` | ✅ | ADR-8: `RandomSource`/`SECURE_RNG`; Test prüft, dass die Default-Parameter in `hints.ts` und `round.ts` `SECURE_RNG` sind. |
| FSM-Branch-Coverage 100 % | ✅ | `fsm.ts`: 100 % Statements / Branches / Functions / Lines (26 Tests). Zwei unerreichbare Invarianten-Guards sind mit `/* v8 ignore */` und Begründung markiert, statt sie mit künstlichen Tests zu erzwingen. |
| `core/` ≥ 95 % | ✅ | 99.44 % Statements, **97.53 % Branch**, 100 % Functions. `hints.ts`, `fsm.ts`, `payout.ts`, `modes.ts`, `store.ts` je 100 % Branch. |
| CI grün | ✅ | `typecheck` + `lint` (0 Warnings) + 181 Unit-Tests + 12 E2E auf iPhone 12 (WebKit) und Pixel 5 (Chromium) lokal grün. Build: 24.1 KB JS → **9.5 KB gzip** (Budget 450 KB). |
| Titel auf dem Handy | ⏳ manuell | Läuft im Emulator; echtes Gerät fehlt. |
| PWA installierbar | ⏳ manuell | Manifest wird ausgeliefert und vom E2E-Test validiert (Name, `standalone`, 3 Icons), Service Worker wird gebaut (11 Einträge, 149 KB precache). Der Installations-Dialog braucht ein echtes Gerät. |
| CI auf GitHub grün | ⏳ manuell | Workflows liegen bereit; das Repo ist noch nicht gepusht. |

**Zusätzlich geprüft (über den Audit-Katalog hinaus):**
- `i18n.test.ts`: DE und EN haben identische Keys (132), kein Wert ist leer, `[missing:…]`-Fallback funktioniert.
- `config.test.ts`: `theme.ts` und `tokens.css` sind synchron (alle 8 Spielerfarben + Bühnen-/Ergebnisfarben), Choreo-Timings halten die Sequenz-Obergrenzen der Audits A3/A4 ein.
- E2E: keine externen Requests (CLAUDE.md), kein horizontales Scrollen, Sprach-Erkennung DE/EN.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M1:**
- [ ] Titel auf iPhone 11/12 (Safari) und Pixel 4a/5 (Chrome) öffnen: Schrift lädt, Portrait-Frame sitzt, Safe-Areas passen.
- [ ] PWA installieren („Zum Home-Bildschirm") und offline starten.
- [ ] Repo nach `github.com/lukabpunkt/Zoll` pushen und prüfen, dass CI und Pages-Deploy durchlaufen (`base: '/Zoll/'`).

### Was in M0 entschieden wurde
Drei ADRs (`docs/DECISIONS.md`): ADR-7 (ungeöffneter Diplomat passiert die Schranke normal), ADR-8 (`RandomSource` für crypto/Seed), ADR-9 (Tap auf gesperrten Koffer wird still verworfen).

### Aus Drinkshot übernommen
`core/store.ts`, `core/rng.ts` (um `RandomSource`/`SECURE_RNG` erweitert), `core/i18n.ts` (um `tList()` für die Fragevorschläge erweitert), `styles/base.css`, Fonts, Icons, ESLint-/Prettier-/TS-Konfiguration, CI-Grundgerüst.

## Audit A1 — 2026-09-04

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen echte Menschen bzw. Lukas Gerät)

| Check | Status | Notiz |
|---|---|---|
| E2E-Szenarien aus M1.7 grün (iPhone 12 + Pixel 5) | ✅ | 20 E2E auf beiden Geräten. Runde 1: Fang (8 Schlücke) + Belästigung + Gate-Schmuggler → Banner `gotThrough`. Runde 2: ehrliche Runde durchgewunken → `honestRound`, niemand trinkt, alle Hinweise gelogen. Runde 3: Bestechung angenommen (Koffer nicht mehr tippbar) + Diplomat geöffnet (Beamter trinkt 3). |
| Pack: Stepper 0–6, Risiko-Zeile korrekt, kein fremdes Ergebnis sichtbar, Bedenkzeit → 0 | ✅ | Risiko-Zeile im E2E geprüft (`Erwischt = 8 Schlücke · Durch = 4 verteilen`); der Screen bekommt nur `ownPack()`. Bedenkzeit-Fallback packt 0 und zeigt einen Toast. |
| Hall: Hinweis-Icons an den richtigen Koffern, ohne Menge/Truthful; Countdown; „Nochmal ansehen" max 1×; Bestechung sperrt | ✅ | Hinweise werden einzeln freigeschaltet; `publicView` enthält weder Menge noch `truthful`. Replay-Zähler aus `HINT_REPLAY_LIMIT`. |
| Inspect: max k Öffnungen; gesperrte/offene Koffer nicht tippbar; „Durchwinken" jederzeit; Banner korrekt | ✅ | k=2 bei 5 Spielern im E2E geprüft; bezahlter Koffer ist im DOM kein Button mehr. |
| Gate: Reihenfolge sauber → Schmuggler; Mengen erst hier sichtbar | ✅ | Reihenfolge in `round.test.ts` über 100 Seeds; im E2E erscheint das `DURCHGEKOMMEN`-Banner erst an der Schranke. |
| Distribute: Beamter zuerst; nicht an sich selbst; Summe stimmt | ✅ | `ownersInOrder()` setzt den Beamten an Position 1 (Test in `fsm.test.ts`); der eigene Eintrag fehlt in der Liste; „Fertig" bleibt gesperrt, bis alle Tokens vergeben sind. |
| Result: Banner, Koffer-Übersicht, Hinweis-Auflösung, Statistik nach 5 Runden | ✅ | Screenshot `docs/screens/m1-result.png`. Statistik-Test über fünf Runden mit von Hand nachgerechneten Erwartungen (`session.test.ts`). |
| Koffer-Touch-Ziele ≥ 56 px | ✅ | Eigener E2E-Test misst jede Karte auf beiden Geräten. |
| Safe-Areas, Reload-Persistenz, Back-Dialog | ✅ | Safe-Areas über Tokens; Session (Spieler, Namen, Farben, Modi) überlebt den Neustart (`session.test.ts`); Zurück-Taste öffnet „Runde abbrechen?". |
| Kein hardcodierter UI-Text | ✅ | Alle Strings über `t()`/`tList()`; DE und EN haben identische Keys (150), kein Wert leer. |
| Unbeteiligte Person versteht jeden Screen; erkennt, dass nur der Beamte tippen darf | ⏳ manuell | Alle Knöpfe des Beamten tragen seine Farbe **und** sein Symbol (`createOfficerButton`); braucht trotzdem echte Menschen. |
| Party-Tauglichkeit auf echtem Gerät | ⏳ manuell | Läuft in der Emulation beider Referenzgeräte. |

### Was in M1 gefunden und behoben wurde
Sechs Fehler, die nur beim echten Durchspielen auffielen:
1. **Nach der ersten Öffnung war kein Koffer mehr tippbar.** Bei `INSPECT → INSPECT` wechselt der Router den Screen nicht, und `render()` lief nach dem Freigeben des Boards nicht erneut — der Beamte hätte seine zweite Öffnung nie nutzen können.
2. **Die Countdown-Zahl war unsichtbar**, weil der `::after`-Kreis des Rings sie überdeckte.
3. **Die Status-Zeile der Halle** war gebaut, aber nie ins DOM gehängt.
4. **Das Dev-Panel wurde bei jedem Screenwechsel weggeräumt** (`mount()` leert den Host) und fing außerdem Klicks auf den darunterliegenden Knöpfen ab.
5. **Eine frische Session erzwang Deutsch**, statt der Browsersprache zu folgen.
6. **„Der tickt Koffer war sauber"** — die Hinweis-Auflösung setzte das Icon-Label (ein Verb) in eine Nominalphrase. Jetzt gibt es `hintSubject.*` und der Satz liest sich wie im GDD.

Dazu eine Regression aus dem Umräumen der Stylesheets: Die `.screen`-Basisregel ging verloren, wodurch Screens den Rahmen überliefen.

### Bundle
JS 77,2 KB → **24,8 KB gzip**, CSS 24,6 KB → 5,6 KB gzip (Budget 450 KB JS). Die PIXI-Halle kommt erst in M2 und wird als eigener Chunk nachgeladen.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M2:**
- [ ] Eine Runde zu fünft auf einem echten Handy spielen: Versteht der Tisch die Screens ohne Erklärung? Ist klar, dass nur der Beamte tippt?
- [ ] Ist das Verhör mit 45 s zu lang oder zu kurz? (Wert steht in `rules.ts`, Änderung braucht nur einen ADR.)
