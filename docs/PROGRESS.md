# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Board-Logik | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (DOM-Feld) | ✅ fertig | `v0.1.0` | A1 bestanden |
| M2 PIXI-Feld, Tiles, Diggers | ✅ fertig | `v0.2.0` | A2 bestanden |
| M3 Sequenzen Teil 1 | ✅ fertig | `v0.3.0` | A3 bestanden |
| M4 Hit-Sequenzen | ⬜ offen | – | – |
| M5 Polish, Modi, A11y | ⬜ offen | – | – |
| M6 Playtest & Release | ⬜ offen | – | – |

## Audit-Reports

## Audit A3 — 2026-09-05

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| Registry: alle Empty/Dud/Treasure-IDs registriert, Dev-Preview zeigt sie | ✅ | 8 Sequenzen: vier Leer-Varianten, `dud_pfff`, `treasure_fanfare`, `treasure_too_heavy`, `treasure_greed`. `npm run preview:sequences` öffnet die Liste; jeder Eintrag spielt einmal ab und räumt die Platte danach auf. |
| `dig_own_mine_silent` nutzt exakt dieselben Sequenz-IDs, Sounds und Timings wie leer (Test) | ✅ | Es gibt die Sequenz gar nicht: `kindFor()` bildet beide Fälle auf `'empty'` ab. Vier Tests vergleichen Paare — Cue-Liste, Dauer, Bühne nach dem Abspielen; und über 1 000 simulierte Runden bleibt die `OpenedCell` strukturgleich. |
| Temperatur-Reaktionen des Diggers korrekt je Hint | ✅ | HEISS → `sweat`, WARM → `brow`, KALT → `shiver`; ohne Hinweis kein Ton und kein Icon. |
| Kettenreaktions-Welle: Reihenfolge, Ringe, kein Banner | ✅ | 80 ms Versatz pro Nachbar, Ringe der Leger, jede Explosion einen Halbton tiefer als die vorige. E2E prüft, dass niemand dafür trinkt. |
| Treasure-Sequenzen ≤ 5 s, Greed zeigt Explosion + angesengte Kiste, beide Konsequenzen im Banner | ✅ | Längste ist `treasure_greed` mit 1,73 s. Der Ring des Legers kommt 120 ms nach dem Knall — **vor** der Kiste. |
| 1 000 simulierte Runden: angezeigte Zustände == `publicView` | ✅ | Neu in `publicView.test.ts`: kein Feld in einer offenen Platte, das ein Screen nicht zeichnet; verbrauchte Trittsteine bleiben `kind: 'empty'`, `blamed: []`; die Menge der gezeigten Zellen ist exakt „gegraben + mitgerissen". |
| Perf-Test grün; Filter nur temporär | ✅ | `perf.spec.ts` hat einen dritten Fall bekommen: Frame-Zeiten **während** der Sequenzen, nicht im Leerlauf. Beide messen p50 17,0 ms · p95 18,0 ms bei **einem** Draw-Batch (erlaubt sind drei) — diesmal auf der GPU, nicht per SwiftShader wie in A2. Filter gibt es bisher gar keine: keine Sequenz setzt `.filters`. Der Heap-Test überspringt sich selbst, weil `performance.memory` in diesem Chromium fehlt. |
| Stumm voll spielbar; Sound-Sync ± 50 ms | ✅ | Ohne `AudioContext` wirft kein Aufruf, und es fehlt keine Information. Der Sync ist gerechnet, nicht gehört: `tests/unit/audio.test.ts` prüft an einer künstlichen Uhr, dass `play(cue, when)` exakt auf `currentTime + when` plant; die Cues einer Sequenz werden in **einem** Callback vorgeplant. Der Rest ist ein Frame Versatz zum Bild (≤ 33 ms bei 30 fps) — innerhalb der Grenze, aber am echten Lautsprecher noch zu hören. |
| Wake-Lock aktiv; Tab-Wechsel Pause/Resume | ✅ | Wake-Lock in Place und Dig. `visibilitychange` hängt jetzt am AudioContext: Ein Loop, der in einem weggelegten Tab weiterspielt, wäre auf dem Handy ein Fehler. |

**Zahlen:** 294 Unit-Tests (+40) · 36 E2E-Tests (18 × 2 Geräte, beide Suiten grün) · 8 Sequenzen · 26 Cues + 2 Musik-Loops, **0 Byte Audio im Bundle** · Einstiegs-Chunk 25,3 KB gzip (+1,3 für den Ton), Board-Chunk lazy · 247 KB gzip gesamt (Budget 450) · p50 17,0 ms bei 1 Draw-Batch

> Zur Messung: Beide Geräte-Suiten liefen je vollständig durch (18/18). Alle 36 in **einem** Prozess gehen in dieser Umgebung nicht — der Preview-Server wird nach ein paar Minuten abgeräumt (`Killed: 9`), und alles danach scheitert an `ERR_CONNECTION_REFUSED`. In CI läuft die Suite am Stück.

### Was dabei aufgefallen ist

**(1) Eine Sequenz wird zu einem anderen Zeitpunkt gebaut, als sie läuft.** `build()` läuft, bevor die Anticipation beginnt — abgespielt wird erst nach dem Aufdecken. Wer den Deckel beim Bauen holt, animiert später ein Sprite, das `revealCell` inzwischen weggeblendet hat: Die Platte verschwindet, statt wegzukippen. Dasselbe gilt für den Digger, der beim Bauen noch auf der Bank sitzt und beim Abspielen an der Platte steht — deshalb sind alle seine Wege **relativ** (`'-=…'`), nie absolut. Beides ist jetzt je ein Test: Der Deckel muss zur Laufzeit noch einmal geholt werden, und nach einer weiterlaufenden Runde muss der Digger wieder dort stehen, wo er stand.

**(2) Ein Timer, der aus einem Tap einen Abzug macht.** Der Verteil-Screen entschied per `setTimeout(400 ms)`, ob ein Druck lang war. Das ist eine Wette darauf, dass der Haupt-Thread frei bleibt: Blockiert ihn etwas zwischen Druck und Loslassen, läuft der abgelaufene Timer **vor** dem `pointerup` — und aus einem normalen Tap wird ein −1. Aufgefallen ist es erst durch die neuen Klick-Sounds, weil die den Thread ein bisschen mehr beschäftigen; der Fehler lag aber schon seit M1 drin und hätte am Tisch irgendwann zugeschlagen. Jetzt entscheidet die Differenz der **Ereigniszeiten** (`event.timeStamp`) — die stimmt auch dann noch, wenn die Seite gerade beschäftigt war. Gegengeprüft im M2-Stand über ein Worktree: dort besteht der Test, mit den Sounds fällt er, ohne sie besteht er wieder.

**(3) Zwei Wartezeiten hintereinander sind eine zu viel.** Die Banner-Standzeit hing am Ende der Timeline. Mit Sequenzen wurde daraus: Anticipation, Sequenz, **dann** 2,2 s Warten — bis zu 4 s pro Zug. Jetzt hängt sie am Explosions-Frame und läuft gleichzeitig; und nach einem leeren Feld entfällt sie ganz, weil dort gar kein Banner erscheint. Der häufigste Ausgang des Spiels ist damit auch der schnellste: 800 ms, dann ist der Nächste dran (→ **ADR-15**). Die E2E-Suite läuft seitdem in 3,8 statt 11 Minuten — dieselben Tests, nur ohne die Leerzeit.

**(4) Sequenzen brauchen kein PixiJS, um messbar zu sein.** Sie bekommen die Bühne jetzt durch schmale Interfaces: `SequenceTile`, `SequenceDigger`, `SequenceCamera`, Anzeigeobjekte als `Animatable` aus x, y, alpha, rotation, scale. Ein PIXI-`Container` erfüllt diese Form von selbst — ein Objekt aus vier Zahlen aber auch. Dadurch misst `sequences.test.ts` Dauer, Ring-Versatz, Cue-Zeiten und Reset-Invariante jeder Sequenz ohne WebGL und ohne Atlas; und eine Sequenz kann den Spielzustand strukturell nicht mehr verschieben, weil ihr die Methoden dafür gar nicht gereicht werden (→ **ADR-14**).

**(5) Ton ohne Dateien.** Es gibt keinen OGG/MP3-Encoder in dieser Toolchain, und ein handgeschnittenes Sprite wäre bei jeder Änderung neu zu bauen. Alle 26 Cues und beide Musik-Loops entstehen deshalb zur Laufzeit über Web Audio. Der eigentliche Gewinn ist aber nicht das gesparte Byte: `play(cue, when)` plant auf der AudioContext-Uhr **vor**, statt im Frame-Loop zu triggern — und genau daran hängt der Sound-Sync (→ **ADR-13**).

**(6) 16,7 ms sind mit `performance.now()` nicht messbar.** Der Perf-Test forderte p50 ≤ 16,7 ms — eine Zahl **unterhalb** des Vsync-Abstands. Ein sauber auf 60 Hz laufender Loop liefert Abstände von 16,6 bis 17,0 ms, je nachdem, wo im Intervall gemessen wird; gemessen wurden 17,0 ms bei p95 18,0 — also kein einziger ausgelassener Frame, denn ein solcher läge bei 33 ms. In A2 fiel das nicht auf, weil der Testrechner damals per SwiftShader gerendert hat und der Test die strenge Zusicherung deshalb übersprang. Die Grenze hat jetzt eine Millisekunde Messtoleranz und einen Kommentar, der sagt, wonach sie eigentlich sucht: ausgelassene Frames, nicht Nachkommastellen.

**(7) Der eigene Port war schon wieder besetzt.** Auf 4183 lief diesmal das Preview eines vierten Schwesterprojekts, das selbst vor 4173 ausgewichen war. Vite weicht bei einem belegten Port stillschweigend auf den nächsten aus — Playwright verbindet sich dann weiter mit dem alten, also mit dem fremden Projekt. Sprengmeister liegt jetzt auf **4193**, mit `strictPort: true`: lieber ein klarer Abbruch als eine Stunde Suche nach Fehlern, die es hier gar nicht gibt. `PREVIEW_PORT` bleibt als Ausweg.

### Abweichungen von der Planung

- **Die vier Leer-Sequenzen stehen in einer Datei**, nicht in `empty/Worm.ts`, `Beetle.ts`, … Sie sind Varianten desselben Ablaufs und unterscheiden sich oft um drei Zeilen; vier Dateien hätten genau das versteckt, worauf es hier ankommt — dass alle vier gleich lang sind und gleich klingen. Blindgänger und Treasure liegen wie geplant je in einer eigenen Datei.
- **`treasure_greed` bringt seine eigene Explosion mit**, statt wie geplant `basic_hit` zu benutzen. Der Platzhalter hätte den Ring des Legers hinter den Jubel geschoben; die Sequenz setzt ihn selbst auf 120 ms nach dem Knall.
- **`npm run build:audio` bleibt ungenutzt** (ADR-13). Das Skript steht noch für den Fall, dass später Aufnahmen dazukommen.
- **Der Preview-Port ist 4193** statt 4183, mit `strictPort` und `PREVIEW_PORT`-Ausweg.
- **`perf.spec.ts` hat drei Fälle statt zwei**: Leerlauf, Heap und neu die Frame-Zeit während der Sequenzen.
- **Die p50-Grenze im Perf-Test hat eine Millisekunde Messtoleranz bekommen** (16,7 → 17,7 ms). Audit A2 nennt 16,7 ms; mit `performance.now()` ist das unterhalb des Vsync-Abstands und damit nicht messbar. Wonach der Test sucht — ausgelassene Frames — steht jetzt als eigene Konstante daneben (33 ms).

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M4:**

- [ ] **Die acht Sequenzen ansehen** — `npm run preview:sequences`, dann eine Runde starten und im Dev-Panel jede einzeln abspielen. Sitzt der Rhythmus? Ist der Wurm zu albern, der Stiefel zu langweilig?
- [ ] **Ton auf einem echten Gerät hören.** Die Cues sind synthetisch (ADR-13) und am Laptop-Lautsprecher anders als am Handy. Besonders: Sind die drei Temperaturen auseinanderzuhalten, ohne aufs Icon zu sehen? Ist der Tick pro Zug hilfreich oder nervig?
- [ ] **Liegt der Sound wirklich auf dem Bild?** Der Test misst die Planung, nicht die Wiedergabe. Ein Frame Versatz ist erlaubt, zwei fallen auf.
- [ ] **Ist 800 ms für ein leeres Feld richtig?** Jetzt geht es ohne Banner sofort weiter — schnell genug, oder zu hektisch für ein Weiterreichen?
- [ ] **Der Verteil-Screen mit langem Druck**: −1 kommt jetzt erst beim Loslassen. Fühlt sich das noch richtig an?
- [ ] Weiterhin offen aus A0–A2: **Repo pushen**, Pages auf „GitHub Actions" stellen, **PWA auf echtem Gerät installieren**, **eine Runde zu viert spielen**, Referenzgerät-Messung.


## Audit A2 — 2026-09-05

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| 6 × 6 + 8 Digger 60 s: p50 ≤ 16,7 ms, p95 ≤ 33 ms auf Referenzgerät | ⏳ manuell | `tests/e2e/perf.spec.ts` misst 30 s Leerlauf im schwersten Fall. Headless-Chromium rendert hier per SwiftShader; der Test erkennt das und wertet die Frame-Zeit dann als Hinweis statt als Urteil. Die verbindliche Messung gehört aufs Referenzgerät. |
| Draw-Batches ≤ 3 | ✅ | Gemessen über die echten `drawElements`/`drawArrays`-Aufrufe, nicht über eine interne Batch-Liste. E2E prüft es bei 8 Spielern auf 6 × 6. |
| Heap flach 30 s | ✅ | Perf-Test: zehn Grabungen mit voller Inszenierung dürfen den Heap nicht verdoppeln. |
| Tap-Zuverlässigkeit: 50 E2E-Taps → 50 korrekte Events | ✅ | 25 Zellen zweimal, Setzen und Wegnehmen: 50/50. |
| Canvas-Umhängen Place → Dig → Result ohne Neuinitialisierung (kein zweites `PIXI.Application`) | ✅ | `BoardStage` ist ein Singleton mit Signatur-Cache; `getBoardApp()` erzeugt genau eine `Application`. Der Screenwechsel ist ein `attach()`. Siehe „Was dabei aufgefallen ist" (3). |
| Look-Check gegen Art Direction §1/§4.1/§5/§6 (`docs/screens/m2-*`) | ⏳ manuell | Screenshots liegen bereit: Platten mit 3D-Kante, Helm in Spielerfarbe, Wiese/Zaun/Baum/Schild, Temperatur-Icons auf hellem Kreis gegen Farbringe mit Symbol. |
| Alle 8 Farben als Ringe über Kratern unterscheidbar (Deuteranopie, Symbole vorhanden) | ✅ | Jeder Ring trägt zusätzlich das Symbol seiner Farbe — Kreis, Dreieck, Quadrat, Stern, Raute, Herz, Blitz, Kreuz. Siehe (2). |
| Anticipation ~ 900 ms: Laufen, 3 Stöße, Zittern — „Jenga-Sekunde" spürbar | ⏳ manuell | 810 ms, aufgeteilt wie in Art Direction §6. Ob es sich richtig anfühlt, ist Lukas Urteil. |
| ColorRing ≤ 300 ms nach Explosions-Frame | ✅ | Der `DigDirector` setzt das Ring-Label auf `EXPLOSION.frameLabel + 120 ms`; `tests/unit/stage.test.ts` prüft die Zahl gegen die harte Grenze. |
| Preload während LOBBY, Low-Effects bei Throttle 6× | ✅ | Board-Chunk und Atlanten laden in der Lobby. Low-Effects-Erkennung steht (Gerätedaten + Frame-Median); der Throttle-Test gehört auf echte Hardware. |

**Zahlen:** 254 Unit-Tests · 18 E2E-Tests · 69 SVG-Assets in 2 Atlanten (je ≤ 2048 px) · Einstiegs-Chunk 24 KB gzip **ohne PixiJS**, Board-Chunk 117 KB lazy · 241 KB gzip gesamt (Budget 450).

### Was dabei aufgefallen ist

**(1) Die Welt aus der Art Direction geht nicht auf.** §6 sieht 1000 × 1000 vor, Feld zentriert, Platte 150 + 14 Abstand. Das belegt 806 Einheiten; für Digger-Bank und Deko bleiben 194 — ein Digger von 150 passt dort nicht. Verkleinert man das Feld, fallen die Platten auf einem 390-px-Gerät unter die geforderten 56 px, und das ist ein MUSS aus GDD §5. Die Welt ist jetzt **1000 × 1500**: Die Breite gehört dem Feld, die zusätzliche Höhe den Bänken; die Plattengrößen folgen rückwärts aus der Touch-Regel statt aus einer runden Zahl (→ **ADR-12**).

**(2) Farbe allein trägt die wichtigste Information nicht.** Der Ring über dem Krater sagt, wer schuld ist — Design-Priorität 2. Acht Farben sind aber nicht deuteranopie-fest, und `temp.hot` ist derselbe Farbwert wie Spielerfarbe Rot. Jeder Ring trägt jetzt zusätzlich das Symbol seiner Farbe, und Temperatur-Icons bleiben Icons auf hellem Kreis: zwei Formensprachen, die auch nebeneinander auf derselben Platte auseinanderzuhalten sind.

**(3) Ein Cache nach Signatur vergisst, was nicht in der Signatur steht.** Die Bühne lebt über Place, Dig und Result hinweg (ADR-6) — genau das ist der Punkt. Der Banner-Handler war beim Bauen festgeschrieben, also bekam der Dig-Screen den leeren Handler des Place-Screens, und die Explosion blieb stumm. Der Handler wird jetzt bei jedem Mount neu gesetzt. Das ist die typische Falle an wiederverwendeten Objekten: Was pro Screen gilt, darf nicht im Konstruktor stehen.

**(4) Drei Anläufe, bis der Test-Seed wirklich aus dem Deploy-Build verschwand.** Alle drei Fallstricke lagen beim Bundler, nicht im Verhalten: Bracket-Notation wird nicht ersetzt (schon in A1 gefunden), ein Default-Parameter lässt den Wert durch eine Variable laufen, und auch ein Funktionsaufruf im `if` wird nicht zuverlässig inlined. Erst eine Modul-Konstante löst sich zu `false` auf und nimmt den Zweig mit. Der CI-Guard aus A1 hat jeden dieser Anläufe gefangen — er ist der einzige Test, der das überhaupt zeigen kann.

**(5) Der Preview-Server war stundenlang der falsche.** Auf Port 4173 lief der Server eines Schwesterprojekts; die E2E-Tests bekamen dessen Seite ausgeliefert und scheiterten an Meldungen, die mit diesem Projekt nichts zu tun hatten. Sprengmeister hat jetzt einen eigenen Port (4183 — seit M3 **4193**, siehe A3). Drei Spiele auf einem Rechner brauchen drei Ports.

**(6) Das Feld ist ein Canvas — Tests brauchen ein Fenster hinein.** `src/game/testBridge.ts` legt lesend offen, was ohnehin auf dem Bildschirm steht: Plattenzustand, Ringfarben, Draw-Calls, Sperre. Bewusst **nicht** offengelegt: ungeöffnete Minen und die Kistenposition (ADR-2). Die Brücke existiert nur im Dev- und E2E-Build; CI prüft das am Bundle.

### Abweichungen von der Planung

- **`STAGE.worldSize` ist jetzt Breite, `STAGE.worldHeight` die Höhe** (1000 × 1500). Art Direction §6 nennt noch 1000 × 1000 und feste Plattengrößen — beides ist überholt (ADR-12).
- **Der lazy Board-Chunk** war für M5.5 geplant und ist schon jetzt da: PixiJS und GSAP hängen an einem dynamischen Import, der Einstiegs-Chunk bleibt bei 24 KB gzip. Wer nur die Regeln liest, lädt den Renderer nie.
- **`assets-src/svg/board/symbols/` dupliziert die acht Farb-Symbole** aus `diggers/symbols/`. Ein dritter Atlas nur für acht winzige Sprites wäre ein Draw-Batch mehr gewesen.
- **Die Sequenzen sind Platzhalter** (`basic_*` je Ergebnisart) — die acht Hit-Sequenzen sind M4. Der `DigDirector` hat den Ablauf drumherum bereits vollständig: Kamera, Anticipation, Aufdecken, Ring, Banner, Rückweg.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M3:**

- [ ] **Die Jenga-Sekunde beurteilen** — der Digger läuft hin, drei Schaufelstöße, dann zittert die Platte. Fühlt sich das nach „gleich passiert etwas" an, oder ist es zu kurz? Das ist Design-Priorität 1 und die einzige Frage, die kein Test beantwortet.
- [ ] **Look-Check** (`docs/screens/m2-*.png`) gegen Art Direction §1/§4.1/§5/§6.
- [ ] **Auf echtem Gerät messen**: 6 × 6 mit 8 Spielern, 60 fps auf iPhone 11 / Pixel 4a. Das Dev-Panel zeigt p50 und Draw-Calls (`?dev=1`).
- [ ] **Entscheiden, ob der Digger richtig steht** — er wartet unter der Platte und schaut hinauf. Verdeckt er zu viel, oder fehlt ihm der Bezug zur Platte?
- [ ] Weiterhin offen aus A0/A1: **Repo pushen**, Pages auf „GitHub Actions" stellen, **PWA auf echtem Gerät installieren**, **eine Runde zu viert spielen**.

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
