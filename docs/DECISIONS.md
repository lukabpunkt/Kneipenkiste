# Entscheidungen (ADR-Log)

Format: **ADR-{n} · {Datum} · {Titel}** — Kontext · Entscheidung · Konsequenz (max. 5 Zeilen).

## ADR-1 · 2026-09-07 · Gleicher Stack wie die Schwesterspiele, Module per Kopie
Kontext: Fünf Spiele, eine Familie. Entscheidung: Vite/TS/PixiJS/GSAP; Module kopieren (Tresor ist das architektonisch nächste Spiel), Shared-Package erst nach v1.0 aller Spiele. Konsequenz: Keine Monorepo-Komplexität jetzt.

## ADR-2 · 2026-09-07 · Untergrenze n−1 (Todeszone) und Reparatur nach Kollision
Kontext: Ohne Untergrenze schrumpft die Brücke ins Absurde; ohne Reparatur bleibt sie nach einem Crash klein. Entscheidung: B_min = n−1 mit angekündigter Todeszone (verteilen 2), Reparatur auf n+2 nach jeder Kollision. Konsequenz: Klarer Rhythmus Frieden → Druck → Crash → Neustart.

## ADR-3 · 2026-09-07 · Fake-Knarren + Blickkontakt als Signatur
Kontext: Ein Reveal, bei dem sofort klar ist, wer fällt, hat keine Spannung. Entscheidung: Alle besetzten Balken knarren (sichere mit 70 %), Kollisions-Hikers haben immer Slow-Mo-Blickkontakt vor dem Bruch. Konsequenz: Choreographer-Tests erzwingen Reihenfolge; jede Fall-Sequenz trägt das Label `eyeContact`.

## ADR-4 · 2026-09-07 · Brücke-von-oben als DOM/SVG, nur der Schritt als PIXI
Kontext: Wahl und Übersicht sind Buttons und Listen, kein Rendering-Problem. Entscheidung: Inline-SVG-Komponente `BridgeTop` mit Zuständen für Negotiation/Choose/Result; PIXI ausschließlich für STEP. Konsequenz: Kleinster PIXI-Anteil der Familie, schnelle M1.

## ADR-5 · 2026-09-07 · Distribute-Schnellmodus
Kontext: Meist verteilen 3–6 Spieler je 1 Schluck; Einzel-Iteration mit Pass-Screens wäre länger als die Show. Entscheidung: Quick-Modus (öffentliches Badge-Grid) bei allen Guthaben == 1, Iteration sonst. Konsequenz: Zwei Distribute-Pfade, beide getestet.

## ADR-6 · 2026-09-07 · Repo-Name ohne Umlaut
Kontext: Lokaler Ordner heißt "Hängebrücke"; Umlaute in GitHub-URLs und Vite-`base` sind fehleranfällig. Entscheidung: Repo `Haengebruecke`, `base: '/Haengebruecke/'`, App-Titel bleibt "Die Hängebrücke". Konsequenz: Ordnername und Repo-Name weichen bewusst ab; in CLAUDE.md dokumentiert.

## ADR-7 · 2026-09-07 · Das Seil zählt als Fahnenflucht
Kontext: GDD §3.6 definiert Fahnenflucht als "Fahne gesetzt, dann **anderen Balken** gewählt" — das Seil ist kein Balken und fiel durch die Definition. Entscheidung: Wer eine Fahne setzt und dann das Seil nimmt, ist Fahnenflüchtiger. Konsequenz: Rein statistisch/dramaturgisch (Banner, Session-Statistik); die Auszahlung ändert sich nicht, weil Seil-Nutzer ohnehin nichts verteilen und nie stürzen.

## ADR-8 · 2026-09-07 · Der abfaulende Balken fällt in `resolveRound`, nicht bei RESULT
Kontext: Architektur §3 sagt "Schrumpf-Balken bei RESULT-Eintritt", GDD §4.2 zeigt ihn aber schon im Nachspiel der Show abbrechen. Entscheidung: `resolveRound()` zieht ihn (mit `crypto`) und legt ihn als `removedPlank` ins `RoundResult`. Konsequenz: Ein Entscheidungspunkt statt zwei; `docs/03-ARCHITECTURE.md §3` ist entsprechend zu lesen — die Show inszeniert weiterhin nur, was schon feststeht.

## ADR-9 · 2026-09-07 · Verteilt wird nur, wenn jemand gefallen ist
Kontext: Architektur §5 formuliert das Verteil-Guthaben unbedingt ("sicher → 1"), GDD §3.5 sagt für "alle sicher" ausdrücklich "Niemand trinkt, **niemand verteilt**" — und die Invariante `allSafe ⇒ giving leer` steht in derselben Architektur. Entscheidung: Das GDD gewinnt; Guthaben gibt es nur in Runden mit mindestens einer Kollision. Konsequenz: Design-Pfeiler 3 bleibt scharf — eine friedliche Runde bringt niemandem etwas ein und kostet trotzdem einen Balken. Ein reiner Morsch-Bruch löst kein Verteilen aus.

## ADR-10 · 2026-09-08 · "Auf die Brücke" setzt die Session nicht zurück
Kontext: `go` baute Brücke, Seil-Verbrauch und Rundenzähler neu — damit verlor jede wiederhergestellte Session ihren Fortschritt, sobald der Weg einmal über die Lobby führte (E2E-Befund). Entscheidung: `go` startet nur die Runde; die Brücke folgt ausschließlich einer Änderung der Besetzung (`setPlayers` vergleicht die IDs), `quit` räumt nur die laufende Runde ab. Konsequenz: Neu anfangen ist eine ausdrückliche Geste — "Session zurücksetzen" in den Einstellungen; Reload-Persistenz (Audit A1) funktioniert damit überhaupt erst.

## ADR-11 · 2026-09-08 · Die Brücke ist nur dort ein Touch-Ziel, wo man sie antippt
Kontext: Die 56-px-Regel aus CLAUDE.md auf jede Brücken-Darstellung anzuwenden, schob in der Absprache genau den Satz unter die Falz, an dem das Spiel hängt ("Versprechen sind nicht bindend"). Entscheidung: `BridgeTop` bekommt einen `display`-Modus mit `plankDisplayHeightPx` (34 px) für Negotiation, Result und Step; im Choose-Screen gelten unverändert ≥ 56 px (≥ 48 bei 10 Balken). Konsequenz: Die Touch-Ziel-Regel schützt weiter Buttons, nicht Bilder; der A1-Check misst nur den Choose-Screen.

## ADR-12 · 2026-09-08 · Der Step-Platzhalter spielt das echte StepScript
Kontext: M1 braucht einen DOM-Platzhalter für den Schritt. Ein frei erfundenes Timing hätte die Spannungs-Dramaturgie erst in M3 zum ersten Mal wirklich laufen lassen. Entscheidung: Der Platzhalter spielt `buildStepScript()` mit seinen tatsächlichen Zeiten ab — gleichzeitige Ankunft, Knarren mit Amplituden, Slow-Mo-Blickkontakt vor jedem Bruch, Tap-to-Skip erst danach. Nur das Nachspiel folgt dem letzten Bruch direkt, statt die 5 Sekunden abzuwarten, die ab M4 den Fall-Sequenzen gehören. Konsequenz: M2/M3 tauschen das Rendering, nicht die Choreographie; das Skript ist ab jetzt jede Runde im Einsatz.

## ADR-13 · 2026-09-08 · Zwei Atlanten nach Zeichenreihenfolge, Seile als Sprites
Kontext: Audit A2 lässt drei Draw-Batches zu; jeder Texturwechsel in einem Frame kostet einen. Architektur §8 sah pro Motiv einen Atlas vor und die Seile als `Graphics` mit `cacheAsTexture` — beides erzeugt zusätzliche Texturen. Entscheidung: **`world`** (Schlucht, Brücke, Schilder, Fx) und **`chars`** (Hikers, Gustav, Balthasar), aufgeteilt entlang der Zeichenreihenfolge; die Seile sind Sprites mit eingebautem Durchhang. Konsequenz: gemessen **1 Draw-Call** statt drei erlaubten, weil PIXI beide Atlanten in dieselbe Batch packt. `ROPE_TEXTURE` in `Bridge.ts` hält fest, wo im Bild die Kurve liegt — wer `rope.svg` neu zeichnet, muss die drei Zahlen mitpflegen.

## ADR-14 · 2026-09-08 · Balkennummern in den Atlas gebacken, nicht als PIXI-Text
Kontext: Die Schilder blieben leer — `fontFamily` als CSS-Stack-String ergibt in PIXI eine ungültige Deklaration, und ein `Text` rastert einmal beim Erzeugen, notfalls bevor die Schrift geladen ist. Beides schlägt lautlos fehl. Dazu kommt: Jedes `Text`-Objekt bekommt seine eigene Textur, bei zehn Balken also zehn Texturwechsel. Entscheidung: `scripts/build-signs.mjs` erzeugt die Schilder 1–10 als fertige SVGs; sie liegen im Welt-Atlas. Konsequenz: Kein Font-Risiko, kein zusätzlicher Batch. Die Balkennummer ist keine Sprache, sondern eine Nummer — sie darf in die Textur.

## ADR-15 · 2026-09-08 · Die Bühne wird nach der Breite eingepasst, nicht eingefügt
Kontext: Eine 1000 × 1000-Welt und ein Hochkant-Handy (1 : 2.2) gehen nicht zusammen. Füllt man den Screen, ist die Brücke seitlich abgeschnitten — und eine halbe Brücke ist kein Bildausschnitt, sondern ein kaputtes Spiel. Entscheidung: Der Massstab kommt allein aus der **Breite**; die Kulisse reicht von `skyTop` (−900) bis `floorY` (2100) und deckt damit das ganze sichtbare Band ab. Die Kamera positioniert, der Massstab skaliert. Konsequenz: `worldHeight` ist nur noch ein Bezugspunkt, kein Rahmen; ein Test hält fest, dass die Kulisse höher ist als das sichtbare Band.

## ADR-16 · 2026-09-08 · Der Perf-Test misst die JS-Zeit, nicht die Frame-Zeit
Kontext: Der naheliegende Messwert für A2 ist die Frame-Zeit. In einem Headless-Browser ist sie unbrauchbar: Vier Varianten (voll, Low-Effects, halbe Auflösung, beides) lieferten auf die Nachkommastelle dieselben 33.3 ms — das ist die Kadenz des Compositors, nicht unsere Rechenzeit. Entscheidung: `perf.spec.ts` prüft die reine JS-Zeit des Bühnen-Loops (`workTimes`, Budget 4 ms) und die echten Draw-Calls; die Frame-Kadenz wird nur protokolliert. Konsequenz: Gemessen 0,10 ms p95 bei acht Hikers. Die Aussage "60 fps auf dem iPhone 11" bleibt der manuelle Check in A2 — die kann kein Rechner ohne GPU treffen.

## ADR-17 · 2026-09-08 · Skip und Haptik hängen an der Timeline, nicht an der Wanduhr
Kontext: Der Step-Screen setzte `setTimeout` auf `script.skippableFrom`. Im Blickkontakt läuft die Timeline aber auf halber Geschwindigkeit — der Knopf wurde frei, **bevor** es gekracht hatte, und die Haptik schlug ins Leere. Entscheidung: Der `StepDirector` meldet seine Beats (`step`, `break`, `skippable`) als Ereignisse auf der Timeline; der Screen reagiert nur. Konsequenz: Tap-to-Skip greift garantiert erst nach dem letzten Bruch (GDD §4.2), auch bei jedem künftigen Slow-Mo.

## ADR-18 · 2026-09-08 · Die Fall-Sequenz trägt den Blickkontakt, nicht der Director
Kontext: In M2 machte der StepDirector den Blickkontakt selbst und übergab erst beim Bruch an die Sequenz. Architektur §7 verlangt aber, dass jede Fall-Sequenz die Labels `eyeContact` < `snap` < `climbedBack` trägt — was nur geht, wenn sie beim Blick anfängt. Entscheidung: Die Fall-Sequenz beginnt beim Blickkontakt; der Director sagt ihr über `ctx.timing.snapMs` nur, wann der Balken reisst. Konsequenz: Die Signatur des Spiels (ADR-3) steckt **in** der Sequenz und lässt sich pro Datei prüfen — `sequences.test.ts` tut das. M4 tauscht sechs Dateien und keine Zeile im Director.

## ADR-19 · 2026-09-08 · Sequenz-Ziele werden beim Abspielen ausgewertet, nicht beim Bauen
Kontext: Die Timeline entsteht vollständig, **bevor** der Anlauf beginnt — da stehen alle Hikers noch auf dem Plateau. Feste Zielwerte (`hiker.x + 52`) liessen die Gestürzten quer über die Schlucht zurück zur Aufstellung fliegen; im ersten Durchlauf war das deutlich zu sehen. Entscheidung: Positionsabhängige Ziele als Funktionen (`{ x: () => hiker.x + drift }`), die GSAP erst beim Start des Tweens auswertet; Positionen für Effekte werden in `call()` gelesen. Konsequenz: Gilt für jede künftige Sequenz. Wer in M4 einen festen Wert schreibt, bekommt denselben Fehler — deshalb steht der Grund in `BasicFall.ts` und nicht nur hier.

## ADR-20 · 2026-09-08 · Synthetisierte Platzhalter-Töne statt keiner Töne
Kontext: M3.5 verlangt einen Sprite mit allen 32 Klängen aus GDD §6. Aufnahmen kann ich nicht liefern, und ffmpeg ist auf dieser Maschine nicht installiert. Entscheidung: `scripts/synth-audio.mjs` rechnet die Clips aus Oszillatoren und Rauschen als WAV; `build-audio-sprite.mjs` hängt sie ohne externes Werkzeug aneinander und komprimiert mit `afconvert` (auf jedem Mac vorhanden) zu einem 316-KB-m4a. Konsequenz: Die Tonspur ist **vollständig verdrahtet** — Sprite-Offsets, iOS-Entsperren, Stummschaltung, Sync zum Bruch —, und sie klingt nach Synthese. Echte Aufnahmen ersetzen die WAVs Datei für Datei, ohne dass sich eine Zeile Code ändert. Nur m4a, kein ogg: `afconvert` kann kein Vorbis, und ohne AAC-Decoder läuft das Spiel stumm — was A3 ohnehin verlangt.

## ADR-21 · 2026-09-08 · Nummernschilder gebacken, Sprechblasen nicht
Kontext: ADR-14 hat die Balkennummern in den Atlas gelegt, weil PIXI-Text eine eigene Textur und damit einen Draw-Batch kostet. Sprechblasen tragen aber übersetzbaren Text ("Oh.", "Warum ich?!") und können nicht gebacken werden. Entscheidung: `fx/text.ts` ist die einzige Stelle, an der Bühnen-Text entsteht — mit `fontFamily` als Liste und nach `document.fonts.ready`. Konsequenz: Gemessen bleibt es trotz Sprechblase bei **1 Draw-Call**; PIXI batcht die Text-Textur mit. Der Perf-Test prüft das über den ganzen Bruch hinweg, damit ein künftiger zweiter Text nicht unbemerkt das Budget reisst.
