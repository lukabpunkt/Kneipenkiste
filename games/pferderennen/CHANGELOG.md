# Changelog

Alle nennenswerten Änderungen an diesem Projekt. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach
[Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased] – wird 1.1.0

Das Rennen bekommt Anfang, Höhepunkt und Schluss, und ein Wiederholungsrennen kostet drei Taps
statt zwei pro Spieler. Nichts davon berührt die Simulation: Der Fairness-Audit liefert danach
**Ziffer für Ziffer dieselben Zahlen** wie vorher.

### Neu

- **Vollbild fürs Rennen.** Auf dem Handy nimmt sich das Spiel mit „Rennen starten“ den ganzen
  Bildschirm und gibt ihn danach zurück. (Nicht auf dem iPhone — Safari kennt die Fullscreen-API
  dort nicht. Als installierte PWA läuft das Spiel aber ohnehin ohne Browser-Leiste.)
- **Jeder Screen neu komponiert.** Das Menü ist ein Titelbild statt einer Liste mit 300 px Nichts
  darunter, der Spieler-Screen ein Panel statt eines Formulars, und die Statistik hat Kennzahlen
  statt einer nackten Tabelle.
- **Die Anzeigetafel im Rennen ist Milchglas.** Die eine Stelle, an der der Effekt zu Recht steht:
  Dahinter liegt unser eigenes Canvas, also lässt sich die Lesbarkeit garantieren.
- **Eine echte Schrift.** „Fredoka" wird endlich ausgeliefert – bis jetzt stand sie zwar in den
  Tokens, aber `assets/fonts/` war leer und alles rendete in der Systemschrift. 29 KB, self-hosted,
  mit metrisch angeglichenem Fallback, damit beim Nachladen nichts springt.
- **Ein Farbsystem statt fünf Farben.** Drei Token-Ebenen und in OKLCH gebaute Skalen; Creme, Ink
  und Orange sind auf die Ziffer dieselben wie vorher, haben jetzt aber Nachbarn.
- **Tiefe mit einer Lichtquelle.** Vier Elevation-Stufen aus je drei gestapelten, warm eingefärbten
  Schatten – und die Unterkante, auf der ein Knopf steht, haben jetzt auch Chips, Stepper und
  Karten. Drücken schiebt sie wirklich in die Seite.
- **Eigene Icons.** Becher, Pokal, Zielflagge, Haus und Schließen sind gezeichnet statt Emoji –
  gleiche Strichstärke wie die Pferde. Spieler-Avatare bleiben natürlich Emoji.
- **Wetten übernehmen.** Ab dem zweiten Rennen fragt der Wett-Screen zuerst, ob ihr genauso setzen
  wollt wie beim letzten Mal. Ein Tap, und ihr steht in der Übersicht.
- **Einzeln ändern.** Wer doch wechseln will, tippt in der Übersicht seine Zeile an und kommt in
  die Pferdeauswahl – nur er, alle anderen bleiben stehen. Wer neu dazugekommen ist, steht als
  „noch offen" in derselben Liste.
- **Schlücke direkt in der Zeile.** ⊖ und ⊕ neben jeder Schluckzahl. Einen Schluck mehr kostet
  einen Tap, ohne den Screen zu wechseln und ohne das Rennen zu blockieren.
- **Startpistole.** Ein Starter steht an der Bande, hebt den Arm über die drei gezählten Schritte
  und feuert bei „LOS!" in den Himmel – Mündungsblitz, Rauch und ein Knall, der die Glocke ersetzt.
- **Zielband.** Auf Brusthöhe über die Ziellinie gespannt. Der Sieger reißt es an seiner Bahn; die
  Hälften bleiben an den Pfosten, werden nach vorn mitgerissen und fallen flatternd.
- **Echte Siegerehrung** statt drei Karten: Sockel in den Pferdefarben, die drei Erstplatzierten
  traben nacheinander ein, die Jockeys steigen ab und stellen sich aufs Treppchen, Konfetti in
  Siegerfarbe.
- **Mehr Leben im Rennen:** Dreckfetzen unter den Hufen, Speedlines bei Sprints, Blitzlichtgewitter
  in der Tribüne, das zum Ziel hin zunimmt, und ein sanfter Kamera-Push im Schlussdrittel.

### Behoben

- Im Hochformat lag der „Überspringen“-Knopf auf dem Kommentar. Der Knopf schwebt über dem Canvas
  und wurde von nichts von der Textzeile ferngehalten, die dort die volle Breite einnimmt.
- Die Startnummern auf der Renn-Anzeigetafel standen in Weiß auf der Signaturfarbe und erreichten
  damit nur 2,2–4,2:1. Die Badges hatten diese Behandlung seit M6, die Tafel war übersehen worden,
  weil sie auf einem Canvas sitzt und die Kontrastprüfungen nur das DOM abgelaufen sind.
- Inhalt am unteren Rand wurde hart abgeschnitten, ohne Hinweis, dass noch etwas folgt – auf dem
  Einstellungs-Blatt hieß das, dass die Hälfte der Optionen faktisch nicht existierte.
- Der Attract-Track begann auf einer harten Linie quer über die Seite statt sich in den Himmel
  einzublenden.
- Gedämpfter Text auf dem Hintergrundverlauf erreichte nur 3,0–3,7:1. Frühere Kontrast-Sweeps
  hatten nur Karteninnenräume geprüft, nie den Text, der direkt auf dem Himmel steht.
- Ein Eingabefeld schaltete beim Fokussieren den Fokusring des ganzen Spiels ab und ersetzte ihn
  durch einen 2-px-Rahmen.
- Die automatische Qualitätsabsenkung konnte nie auslösen: Der Monitor bekam den festen
  Simulations-Timestep statt der echten Framezeit, `frames / elapsed` ergab damit immer exakt 60.
- Alles, was animiert, lief unabhängig von der Zeitlupe in Echtzeit – die Beine galoppierten mit
  vollem Tempo, während das Pferd durchs Fotofinish kroch.
- Die Startboxen klappten linear auf, obwohl das Design-System einen Bounce verlangt.
- Der Timer des Start-Blitzes wurde beim Verlassen des Screens nicht abgeräumt.
- Ein gesperrter Knopf hieß für Screenreader nicht mehr, wofür er da war: Der Hinweis, *warum* er
  gesperrt ist, hatte seinen Namen überschrieben.

## [1.0.0] – 2026-09-02

Die erste vollständige Version. Sechs Pferde, ein Gerät, und der Beweis, dass es fair ist.

### Spiel

- **Sechs Pferde, bewiesen gleich stark.** Keine Stats, kein Glücksfaktor, keine Bahn, die hilft –
  über 1.000.000 simulierte Rennen liegt die größte Abweichung 0,0006 vom idealen 1/6.
- **Rennsimulation** mit Catmull-Rom-Phasenprofil, Ornstein-Uhlenbeck-Rauschen und Sprints. Der
  Führende zur Rennhälfte gewinnt nur in 31 % der Fälle, im Schnitt gibt es 11,9 Führungswechsel.
- **23 Events** – Bananenschale, Kotzpause, Regenbogen-Furz, Taube, UFO und der Rest –, jedes mit
  Requisite, Animation, Partikeln und Kommentar. Sie treffen jedes Pferd gleich oft.
- **Vier Wettarten:** Sieg, Platz, Letzter, oder frei wählbar pro Spieler.
- **Trinkregeln:** Event-Regeln und die optionale Führungswechsel-Regel im Schlussdrittel.
- **Session-Statistik** mit Siegen, verteilten und getrunkenen Schlücken, Pechsträhne und der
  Rennhistorie als Farbpunkte.
- **Alkoholfrei-Modus:** aus jedem Schluck wird ein Punkt, überall.

### Darstellung

- Prozedural gezeichnete Pferde mit 17 Animationszuständen, kontinuierlich fortgeschriebener
  Gallopphase und Follow-Through in Mähne und Schweif.
- **Zwei Bahn-Orientierungen:** Querformat für Laptop und Fernseher, Hochformat fürs Handy, live
  umschaltbar mitten im Rennen.
- **Fotofinish** mit Zeitlupe, Kamerafahrt, Vignette und Blitzlicht – in rund 40 % der Rennen.
- Countdown mit Startglocke, Konfetti in der Siegerfarbe, Podium und Attract-Mode auf dem
  Startbildschirm.

### Ton

- Vollständig synthetisiert (Web Audio), **keine einzige Audiodatei**: Hufgetrappel, das dem Tempo
  des Feldes folgt, Menge, die zum Ziel hin anschwillt, Startglocke, Fanfare, Kamera-Klicks und ein
  eigener Cue je Event.
- **Live-Kommentator** mit 97 Zeilen: Priorität Event vor Führungswechsel vor Füller, und keine
  Zeile wiederholt sich innerhalb eines Rennens.

### Technik

- Kein Framework, kein Bundler, **kein Build-Schritt**. Was im Repo liegt, lädt der Browser.
- **PWA:** installierbar, offline vollständig spielbar. Die Icons werden aus dem Zeichencode des
  Spiels gerendert, die Precache-Liste des Service Workers wird generiert und in der CI geprüft.
- **Barrierefreiheit:** Lighthouse 100. Kompletter Tastatur-Flow, Fokus-Fallen in Overlays,
  `aria-live` für Start, Führungswechsel, Fotofinish und Sieger, `prefers-reduced-motion` mit
  manueller Überschreibung.
- **Performance:** Lighthouse Mobile 92, Total Blocking Time 0 ms, CLS 0, kein verworfener Frame
  während eines Rennens.
- 315 Unit-Tests, 8 End-to-End-Tests auf Chromium und WebKit im Handy-Viewport, und ein
  Fairness-Audit als Pflicht-Gate in der CI.

[1.0.0]: https://github.com/lukabpunkt/Pferderennen/releases/tag/v1.0.0
