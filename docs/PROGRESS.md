# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig (⏳ 3 manuelle Checks offen) | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (DOM-Halle) | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.1.0` | A1 bestanden |
| M2 PIXI-Halle, Koffer, Charaktere | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.2.0` | A2 bestanden |
| M3 Hinweise, Schranke, Audio | ✅ fertig (⏳ 2 manuelle Checks offen) | `v0.3.0` | A3 bestanden |
| M4 Röntgen-Sequenzen | ✅ fertig (⏳ 1 manueller Check offen) | `v0.4.0` | A4 bestanden |
| M5 Polish, Modi, A11y | ✅ fertig (⏳ 1 manueller Check offen) | `v0.5.0` | A5 bestanden |
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

## Audit A2 — 2026-09-05

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen Lukas Auge bzw. Gerät)

| Check | Status | Notiz |
|---|---|---|
| 8 Spieler, HALL: p50 ≤ 16.7 ms, p95 ≤ 33 ms | ✅ | Gemessen: **p50 16.7 ms** (vsync-gelockte 60 fps), **p95 18.6 ms** über 240 Frames. Der Test erkennt Software-Rendering und bewertet Frame-Zeiten dann nicht — sonst misst er SwiftShader statt das Spiel. |
| Draw-Batches ≤ 3 | ✅ | **3** echte WebGL-Draw-Calls, gezählt über umschlossene `drawElements`/`drawArrays`. Ein Batch je sichtbarer Atlas. |
| Heap flach über 30 s | ✅ | 10.0 MB → 10.0 MB. |
| Bloom nur während des Scans | ✅ | `XrayMonitor.scan()` setzt den Blur beim Start und `filters = []` im `onComplete`. |
| Tap-Zuverlässigkeit: 50 Taps → 50 korrekte `suitcaseTap` | ✅ | 50 von 50, in der richtigen Reihenfolge. Gemessen wird der Hit-Test: Die Sonde trennt dafür die Bühne vom Screen, weil im Spiel schon der erste Tap das Board sperrt und k höchstens drei Öffnungen zulässt. |
| DOM-HUD blockiert keine Koffer-Taps | ✅ | Eigener Test: Alle Koffer liegen innerhalb des HUD-Rechtecks, jeder Tap kommt trotzdem an (`pointer-events: none` auf dem HUD, `auto` nur auf Bedienelementen). |
| Canvas-Umhängen Hall → Inspect → Gate ohne Neuinitialisierung | ✅ | Der Aufbau-Zähler bleibt über alle drei Screens bei **1** (ADR-6). |
| Scan-Ergebnis erst ab 100 %; Stall bei 50 % | ✅ | Label-Test `revealed ≥ scanComplete` plus die Prüfung, dass der Stall wirklich in der Mitte liegt. Im E2E steht während des ganzen Scans nur „Röntgen läuft …". Screenshot `docs/screens/m2-xray-scanning.png`. |
| Alle 8 Farben als Koffer + Anhänger unterscheidbar | ✅ | Jede Farbe trägt ihr eigenes Symbol auf Anhänger und Torso (`symbolSvg`), acht verschiedene Formen — die Unterscheidung hängt nicht an der Farbe. Screenshot `docs/screens/m2-hall-8.png`. |
| Layout 3–7 Koffer ohne Überlappung | ✅ | `layoutSuitcases` ist reine Geometrie und ohne Renderer testbar: Trefferflächen ≥ 56 px **und** garantiert überlappungsfrei, für 1 bis 7 Koffer, gerechnet für das schmalste Referenzgerät. |
| Koffer-Tippfläche ≥ 56 px | ✅ | Im Browser gemessen, engster Fall (7 Koffer). Führte zu ADR-13. |
| Preload während der Lobby | ✅ | `preloadStage()` in `LobbyScreen.activate()`; Einstiegs-Chunk 26 KB gzip, Hall-Chunk 149 KB lädt im Hintergrund (ADR-14). |
| Low-Effects | ✅ | `detectLowEffects()` (Speicher/Kerne) plus die Einstellung; schaltet Bloom, Atmen und Blinzeln ab. |
| Look-Check gegen Art Direction §1/§4/§5/§6 | ⏳ manuell | Screenshots liegen in `docs/screens/m2-*.png`. |
| Deuteranopie-Simulation | ⏳ manuell | Symbole sind da und unterscheidbar; die Simulation selbst braucht Lukas Auge. |

### Was gebaut wurde
- **98 SVGs**, sechs Atlanten (@1x/@2x, größter 2048×1024): Shotling-Rig aus Drinkshot plus 11 Zoll-Gesichter, Reisenden-Zubehör (Sonnenhut, Kamera, Hawaiihemd), Beamter (Mütze, Jacke, Klemmbrett, Pfeife, Schnurrbart), Waldi, Koffer, Halle, 8 Schmuggelware-Sets mit Gesichtern, saubere und peinliche Ware, 14 Röntgen-Silhouetten.
- **Rendering:** `HallApp` (Singleton, Canvas-Umhängen, eine Uhr, Draw-Call-Zähler), `Hall`, `Suitcase`, `XrayMonitor`, `Shotling`/`Traveler`/`Officer`, `Waldi`, `Camera`, `HallView` mit fünf Modi.
- **Directors** in der M2-Fassung: `HintDirector` (Einrollen, Hinweis-Bewegung, Waldi), `InspectDirector` (Fahrt ins Gerät, Scan, Reaktion vor Konsequenz, Banner), `GateDirector` (Stall, Stempel-Reaktionen).

### Was gefunden und behoben wurde
Sechs Fehler, alle erst am Bild sichtbar:
1. **Sieben Tippflächen à 56 px passen nicht in eine Reihe** (gemessen: 26 px). Führte zu ADR-13.
2. **Die Dev-Sonde merkte sich den ersten Canvas-Host** — nach dem Screenwechsel lieferte sie (0, 0), und kein Tap traf.
3. **Ein weißes Band unter dem Hallenboden**, weil die Welt den Host nicht ganz füllt. Wand und Boden zeichnen jetzt über die Welt hinaus.
4. **Die Sprechblase war unsichtbar** (paper auf paper), seit der Screen seinen Text hell färbt.
5. **Die Kamera hielt den Zielpunkt fest, statt ihn zu zentrieren** — der Röntgenmonitor hing halb aus dem Bild (ADR-15).
6. **Die Gepäckanhänger waren abgeschnitten** und lagen unter den Hinweis-Icons; jetzt kürzen lange Namen auf ein Kürzel, und die Icons sitzen über dem Koffer.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M3:**
- [ ] Look-Check: Sieht die Halle nach Art Direction §1 aus („Cartoon der 60er, ein Farbklecks: der Röntgenmonitor")? Screenshots in `docs/screens/m2-*.png`.
- [ ] Deuteranopie-Simulation über `m2-hall-8.png`: Sind alle acht Koffer unterscheidbar?

**Hinweis zur Testumgebung:** Auf diesem Rechner (8 GB, parallel laufende VM) beendet macOS den Preview-Server während langer E2E-Läufe per SIGKILL. Die Suiten laufen deshalb lokal in Blöcken; in der CI mit mehr Speicher läuft `npm run test:e2e` in einem Stück.

## Audit A3 — 2026-09-05

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; 2 Checks brauchen echte Ohren bzw. echte Menschen)

| Check | Status | Notiz |
|---|---|---|
| 6 Hinweis-Sequenzen + Bark registriert, Dev-Preview, ≤ 1.8 s | ✅ | Eine Sequenz je Hinweis-Typ (`hint_wobble` … `hint_dog`), Dauer 1.5 s. Waldis Bellen ist ein eigener Beat im `HintDirector`. Preview unter `?dev=1&panel=sequences`. |
| **Nach der Animation sehen Koffer mit/ohne Hinweis identisch aus** | ✅ | Kein Screenshot-Diff von außen, sondern ein Silhouetten-Vergleich im Browser: Der Bildausschnitt beider Koffer wird zur Bitmaske (dunkle Outline gegen Rest) und Pixel für Pixel verglichen — **97,9 % Übereinstimmung**. Farbe und Name unterscheiden sich zwangsläufig; ein systematischer Unterschied (Neigung, Versatz, anderer Ton) schlüge hier sofort durch. |
| 4 Schranken-Sequenzen ≤ 3 s; Schmuggler-Stall 600 ms; Skip ab Koffer 2, nie beim letzten | ✅ | `gate_clean_wave`, `gate_clean_relief`, `gate_smuggler_moonwalk`, `gate_smuggler_bow`. Der Stall hält die Ampel auf **gelb** — grün wäre gelogen, rot verriete das Ergebnis. Skip-Regel im `GateScreen` (`data-skippable`). |
| Bestechungs-Inszenierung korrekt (Schloss, Tokens) | ✅ | Sprechblase auf der Bühne (ADR-17), Vorhängeschloss mit Overshoot, Tokens fliegen einzeln zum Beamten. Screenshots `m3-bribe-offer.png`, `m3-bribe-accepted.png`. |
| Angezeigte Zustände == `publicView` je Phase | ✅ | Die Bühne bekommt weiterhin nur `publicView`; der Sequenz-Kontext enthält Menge und Item-Set erst, wenn das Röntgenbild sie gezeigt hat. Hinweis-Sequenzen bekommen `amount: 0` — sie **dürfen** die Menge nicht kennen. Der Lint-Test aus dem Standing Audit deckt `src/game/` mit ab. |
| Perf-Test grün | ✅ | Unverändert trotz Partikeln und Sequenzen: p50 **16,7 ms**, p95 17,7 ms, **3 Draw-Calls**, Update p50 0 ms. |
| Sound-Sync ± 50 ms | ✅ | Cues werden auf der AudioContext-Uhr geplant (`play(cue, when)`), nicht per `setTimeout` — ADR-16 erklärt, warum das der eigentliche Grund ist, dass die Toleranz haltbar ist. |
| Stumm voll spielbar | ✅ | Eigener Test: Ohne `AudioContext` (jsdom) laufen alle 32 Cues, alle Schleifen und alle Regler still durch, ohne zu werfen. |
| Wake-Lock; Tab-Wechsel Pause/Resume | ✅ | Wake-Lock aus M1; neu: `visibilitychange` hält Audio an und weckt es wieder, damit die Uhr nicht in der Hosentasche weitertickt. |
| Hinweis-Test (3 Personen sehen 5 Hall-Phasen) | ⏳ manuell | Braucht echte Menschen. |
| Klingt es gut? | ⏳ manuell | Braucht echte Ohren — die Rezepte sind auf einen Handylautsprecher in einer lauten Runde ausgelegt. |

### Was gebaut wurde
- **`Sequence.ts` + Registry:** gewichtete Auswahl mit einem Sperrfenster von 3. Ist alles gesperrt, wird die Sperre für einen Zug ignoriert — lieber eine Wiederholung als gar keine Sequenz.
- **6 Hinweis-Sequenzen**, jede mit eigenem Ton und eigenem Effekt (Tropfen, Federn, Waldi), jede mit vollständigem Reset.
- **4 Schranken-Sequenzen** inklusive Item-Fontäne, Konfetti und Stempel-Slam; danach verlassen Reisender und Koffer die Bühne (ADR-18).
- **`FxKit`** mit `ParticlePool`: Sprites werden wiederverwendet, jeder Pool hat eine harte Obergrenze und recycelt statt zu wachsen.
- **`AudioManager`** mit allen 32 Cues aus GDD §6, Band-Schleife und Uhr-Tick.
- **`BribeDirector`** + `SpeechBubble`, **Sequenz-Preview** unter `?dev=1&panel=sequences`.

### Was gefunden und behoben wurde
1. **Die Sprechblase lief über den Bühnenrand** — beim ersten und letzten Koffer war das Angebot halb abgeschnitten und damit nicht mehr öffentlich lesbar. Jetzt wird sie in die Bühne geklemmt.
2. **Die Bestechungs-Chips überlappten sich** ab fünf Koffern, weil sie ein Wortlabel trugen. Das Label steckt jetzt nur noch in `aria-label` und `title`.
3. **Die Reisenden stapelten sich an der Schranke** (ADR-18).
4. **Die Kamera an der Schranke stand zu eng** — Koffer und Reisender passten nicht zusammen ins Bild.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M4:**
- [ ] Ton anhören: Sind die sechs Hinweise auseinanderzuhalten, ohne hinzusehen? Hebt sich Waldis Bellen ab (es ist der einzige Hinweis, der nie lügt)?
- [ ] Hinweis-Test aus A3: Drei Personen sehen fünf Hall-Phasen — sagen mindestens zwei, sie hätten den Hinweisen „eher geglaubt"?

## Audit A4 — 2026-09-05

**Ergebnis:** BESTANDEN (alle automatisierbaren MUSS-Checks grün; der „Lustig-Test" braucht drei Menschen)

### Pro Sequenz

Gemessen auf der echten Bühne, nicht an den Konstanten aus `choreo.ts` — ein vertauschter Beat versteckt sich in einer Timeline, nicht in einer Zahl.

| Sequenz | Dauer | Gesicht → Urteil | Lesbar in 1 s | Prinzipien |
|---|---|---|---|---|
| `caught_alarm_burst` | 3,28 s | 0,00 → 0,20 s | Sirene, Rotlicht, Ware fliegt — „erwischt" ohne Text | Anticipation (Koffer duckt sich), Squash, Overshoot, Follow-Through (Kopf ruckt nach), Sound-Sync |
| `caught_sweat_flood` | 3,39 s | 0,00 → 0,20 s | Pfütze wächst, er rutscht aus — verrät sich selbst | Anticipation (Beine weg), **Hit-Stop** in der Luft, Squash beim Aufprall, Overshoot |
| `caught_slow_zip` | 3,04 s | 0,00 → 0,20 s | Zeitlupe, dann Springteufel — die Verzögerung ist der Gag | Anticipation (drei immer schnellere Stufen), Squash vor dem Aufspringen, Sound-Sync |
| `clean_teddy` | 3,12 s | 0,00 → 0,20 s | Teddy an der Brust, Beamter wird rot | Overshoot (Arme), Squash (Beamter schrumpft vor Scham), Follow-Through (Wiegen) |
| `clean_mug` | 3,40 s | 0,00 → 0,20 s | Er starrt, zittert, trinkt | **Pause als Timing** (0,28 s Starren), Zittern in 45-ms-Takt, Follow-Through |
| `clean_duck_bow` | 2,84 s | 0,00 → 0,20 s | Eine Ente mit Schleife — legal, weil nur eine | Overshoot (Kopf), Halten, Sound-Sync (zweimal Quietschen) |
| `diplomat_pass` | 2,42 s | 0,00 → 0,20 s | Sirene setzt an und **bricht ab**, Teppich rollt aus | Der Bruch selbst ist das Timing; Overshoot (Salut), Follow-Through (Arm bleibt zu lange oben) |

### Gesamt

| Check | Status | Notiz |
|---|---|---|
| 6 Röntgen-Sequenzen + Diplomat-Overlay | ✅ | Alle sieben registriert, jede einzeln über die Dev-Sonde vermessbar. |
| Scanline-Aufbau + Stall; `revealed` ≥ `scanComplete` | ✅ | Label-Test aus M0 gilt weiter; dazu im E2E: Über den gesamten Scan zeigt das Banner **nur** „Röntgen läuft" — durchgehend gemessen, nicht stichprobenartig, denn ein einzelnes aufblitzendes Frame wäre genau der Fehler. |
| Gesicht → Alarm/Stempel → Banner in dieser Reihenfolge | ✅ | Über die Timeline-Labels jeder gebauten Sequenz. Das Gesicht bekommt in allen sieben exakt 200 ms allein. |
| Dauer ≤ 5 s | ✅ | Längste: `clean_mug` mit 3,40 s. Kürzeste: `diplomat_pass` mit 2,42 s. |
| Reset-Invariante | ✅ | `HallView.reset()` stellt Figuren, Koffer und Effekte in die Ruhelage; die Dev-Sonde baut jede Sequenz und räumt danach auf. |
| Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Sound-Sync | ✅ | Pro Sequenz in der Tabelle oben belegt. |
| ≤ 2 Long-Tasks; Perf grün | ✅ | Unverändert nach M4: p50 **16,7 ms**, p95 17,7 ms, **3 Draw-Calls**, Update p50 0 ms. |
| Diplomat-Overlay ersetzt caught/clean korrekt | ✅ | Es taucht in 200 Ziehungen aus `xrayCaught` nie auf und ist die einzige Sequenz in `xrayOverlay` — es **ersetzt**, statt zu ergänzen. Ein Diplomat wird nie erwischt, das ist eine Regelkern-Invariante. |
| No-Repeat über 1 000 Runden | ✅ | Je Kategorie 1 000 Ziehungen: nie zweimal dieselbe hintereinander, und jede kommt vor. Führte zu ADR-20. |
| Silhouetten-Layouts aller 8 Item-Sets | ✅ | Aus M2; neu ist, dass die Silhouette der sauberen Ware zur gezogenen Sequenz passt (ADR-19). |
| Item-Fontäne fliegt wirklich | ✅ | Eigener Test misst lebende Partikel während der Sequenz (> 0) und hält das Budget aus Art Direction §8 ein (≤ 200). |
| „Lustig-Test": ≥ 2 von 3 grinsen | ⏳ manuell | Braucht drei Menschen. |
| Video `docs/screens/m4-xray.mp4` | ⏳ SOLL | Stattdessen sieben Screenshots, einer je Sequenz. |

### Was gefunden und behoben wurde
1. **Die Registry konnte dieselbe Sequenz zweimal hintereinander ziehen** — bei Zug 9 im 1000er-Test. Der Fallback ignorierte die gesamte Historie statt nur das Fenster (ADR-20).
2. **Das Röntgenbild hätte lügen können:** Die Sequenz wurde nach dem Scan gezogen, also konnte der Monitor einen Teddy zeigen und die Sequenz eine Tasse auspacken (ADR-19).
3. **Das Alarmlicht war zu stark** (Alpha 0,34) — die ganze Halle ertrank in Rosa, und weder die fliegende Ware noch das Gesicht des Reisenden waren zu sehen. Jetzt 0,22.
4. **Die Koffer sprangen nicht sichtbar auf.** Das Asset `lid_open` lag ungenutzt herum; jetzt klappt der Deckel nach hinten weg — beim Fang mit Overshoot, beim sauberen Koffer ruhig. Der Unterschied ist in einer Sekunde lesbar, und genau darum geht es.

**Offene SOLL-Follow-ups:** Video (1).

**Manueller Check für Luka vor M5:**
- [ ] „Lustig-Test" aus A4: Drei Personen sehen die sieben Sequenzen (`?dev=1&panel=sequences`) — grinsen mindestens zwei?

## Audit A5 — 2026-09-05

**Ergebnis:** BESTANDEN (alle MUSS-Checks grün; ein manueller Check offen)

| Check | Status | Notiz |
|---|---|---|
| Lighthouse Mobile: Performance / A11y / Best Practices ≥ 90 | ✅ | **99 / 100 / 100.** FCP 1,3 s, LCP 2,0 s, TBT 0 ms, CLS 0. Als eigenes Gate (`npm run check:lighthouse`) mit den Schwellen an einer Stelle, dazu ein CI-Job. |
| PWA installierbar | ✅ | Manifest mit `standalone`, 192er, 512er und maskierbarem Icon; Service Worker wird ausgeliefert. Eigener E2E-Test. |
| JS ≤ 450 KB gzip; Hall-Chunk lazy | ✅ | **251 KB gzip gesamt**, Einstiegs-Chunk **30,3 KB**. Geprüft, dass weder PIXI noch GSAP im Einstieg landen. |
| Kontrast ≥ 4,5:1 | ✅ | `npm run check:contrast` prüft **22 echte Paarungen** — nicht alle möglichen, sondern die, die im Spiel wirklich übereinanderliegen. Führte zu ADR-21. |
| Reduced-Motion | ✅ | Kein Kamera-Schütteln, kein Blinken, kein Title-Loop; GSAP-Eases werden zu `steps(1)`, damit die **Reihenfolge** der Beats bleibt und nur der Weg verschwindet. E2E: eine ganze Runde läuft damit durch. |
| Tastatur (SOLL) | ✅ | Die Koffer haben ein unsichtbares, fokussierbares Gegenstück im DOM (ADR-23) — dieselbe Runde, kein Ersatzspiel. |
| EN vollständig | ✅ | 163 Keys in beiden Sprachen, kein leerer Wert, kein `[missing:]`, gleich viele Fragevorschläge. Dazu ein Test, der deutsche Wörter im englischen Wörterbuch findet. |
| Alle Modus-Kombinationen spielbar | ✅ | Alle **16** Kombinationen × 5 Spielerzahlen: immer ≥ 1 Öffnung, nie mehr Öffnungen als Reisende, immer gültige Mengen. |
| Title-Loop 10 min ohne Leak | ✅ | 45 s / ~19 Silhouetten-Wechsel ohne ein einziges nachgewachsenes Element; beim Verlassen des Titels bleibt nichts zurück. Zehn Minuten wären hier nur zehn Minuten Wartezeit. |
| Share-Text | ✅ | Web Share API, Knopf nur wenn das Gerät sie hat. Der Text erzählt die Pointe, nicht die Statistik: „Rudi hat 4 Ananas über die Grenze gebracht 🛃". |
| Fehlerfälle | ✅ | Scheitert der Start, steht eine lesbare Meldung statt einer weißen Seite — und der zweite Versuch wirft die gespeicherte Session weg, weil kaputte Daten im `localStorage` der häufigste Grund sind. |
| Onboarding-Tooltips | ✅ | Zwei Sätze, einmal pro Gerät. Der Hall-Hinweis kommt **nach** den Animationen: davor wäre er eine Behauptung, danach eine Einordnung. |
| Modi im UI erklärt | ✅ | Ein Satz je Modus in der Lobby, plus die konkrete Auswirkung („Der Beamte öffnet 2"), sobald er an ist. Am Öffnungs-Chip steht „Waldi kostet eine" — die Regel ist ein Tausch, kein Malus. |
| Result-Juice | ✅ | Aufklapp-Welle über die Koffer-Übersicht, „stimmte/log" als gedrehte Stempel, Statistik-Balken relativ zum Besten, Auszeichnungen als Badges. |

### Was gebaut wurde
`check-contrast.mjs` und `check-lighthouse.mjs` als Gates · Title-Loop (SVG, ADR-22) · Onboarding-Hinweise · Web-Share · Tastatur-Gegenstück der Koffer (ADR-23) · Reduced-Motion durchgängig · Fehlerseite · Result-Juice · Modus-Auswirkungen im UI.

### Was gefunden und behoben wurde
1. **Fünf von acht Spielerfarben hatten zu wenig Kontrast** — gemessen zwischen 2,4:1 und 3,5:1, verlangt 4,5:1 (ADR-21). Das war seit M1 im Spiel und wäre ohne Messung nicht aufgefallen.
2. **GSAP war in den Einstiegs-Chunk gerutscht** (26 → 59 KB gzip), weil das neue `ui/motion.ts` es importierte. Der GSAP-Teil liegt jetzt unter `src/game/`, wo er hingehört — 30,3 KB.
3. **Der Spürhund-Malus war unsichtbar.** Er sah aus wie ein Fehler, statt wie der Tausch, der er ist.
4. **Ein Regel-Randfall, den ich beim Testen fand:** Bei vier Spielern kann der Spürhund keine Öffnung abziehen (Untergrenze 1) — Hochsaison legt aber trotzdem eine drauf. Kein Fehler, sondern zwei einzeln richtige Regeln; jetzt als Test dokumentiert.

**Offene SOLL-Follow-ups:** keine.

**Manueller Check für Luka vor M6:**
- [ ] Auf einem echten Gerät installieren und offline starten; dann Systemeinstellung „Bewegung reduzieren" einschalten und eine Runde spielen.
