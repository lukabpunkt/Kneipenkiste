# Changelog

Alle nennenswerten Änderungen an **Der Zoll**. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach
[Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Ausstehend für 1.0
- Playtest mit 5–6 Personen über mindestens 8 Runden (`docs/PLAYTEST-01.md`)
- Balancing-Pass auf Basis des Playtests
- Erster Deploy auf GitHub Pages

## [0.5.0] — 2026-09-05 — Polish, Modi, Zugänglichkeit

### Hinzugefügt
- Title-Loop: ein Koffer rollt durchs Röntgen und zeigt wechselnde Silhouetten (SVG, kein PIXI)
- Onboarding-Hinweise: zwei Sätze, einmal pro Gerät
- Teilen über die Web Share API — der Text erzählt die Pointe, nicht die Statistik
- Result-Juice: Aufklapp-Welle, „stimmte/log" als gedrehte Stempel, Statistik-Balken, Auszeichnungen
- Tastatur-Bedienung der Koffer über ein unsichtbares, fokussierbares Gegenstück im DOM
- Fehlerseite statt weißer Seite, wenn der Start scheitert
- `npm run check:contrast` (22 Farbpaarungen) und `npm run check:lighthouse` als Gates

### Geändert
- Text auf Spielerfarben ist jetzt immer dunkel — fünf von acht Farben hatten mit hellem
  Text nur 2,4:1 bis 3,5:1 Kontrast statt der geforderten 4,5:1
- „Bewegung reduzieren" schaltet Schütteln, Blinken und Title-Loop ab und ersetzt die
  GSAP-Eases durch harte Stufen; die Reihenfolge der Beats bleibt
- Modus-Auswirkungen stehen im UI („Der Beamte öffnet 2", „Waldi kostet eine")

### Behoben
- GSAP war in den Einstiegs-Chunk gerutscht (26 → 59 KB gzip); jetzt wieder 30,3 KB

## [0.4.0] — 2026-09-05 — Röntgen-Sequenzen

### Hinzugefügt
- Sechs Röntgen-Sequenzen und das Diplomaten-Overlay, jede 2,4–3,4 s
- Alarm-Overlay, Pfütze und roter Teppich als Effekt-Bausteine
- Koffer springen sichtbar auf — beim Fang mit Overshoot, beim sauberen Koffer ruhig

### Behoben
- Die Registry konnte dieselbe Sequenz zweimal hintereinander ziehen
- Das Röntgenbild konnte lügen: Die Sequenz wurde erst nach dem Scan gezogen, sodass der
  Monitor einen Teddy zeigen und die Sequenz eine Tasse auspacken konnte

## [0.3.0] — 2026-09-05 — Hinweise, Schranke, Ton

### Hinzugefügt
- Sechs Hinweis-Animationen und Waldis Bellen
- Vier Schranken-Sequenzen mit Stall, Item-Fontäne, Konfetti und Stempel
- Alle 32 Sounds aus GDD §6, zur Laufzeit synthetisiert
- Bestechung als Sprechblase auf der Bühne, Tokens fliegen zum Beamten
- Sequenz-Registry mit gewichteter Auswahl und Sperrfenster
- Sequenz-Preview unter `?dev=1&panel=sequences`

### Behoben
- Die Sprechblase lief bei Rand-Koffern aus dem Bild
- Reisende stapelten sich an der Schranke, statt durchzugehen

## [0.2.0] — 2026-09-05 — Die PIXI-Halle

### Hinzugefügt
- Zollhalle in PixiJS: Koffer, Reisende, Beamter, Waldi, Förderband, Röntgenmonitor
- 98 SVGs in sechs Atlanten
- Ein Canvas für Hall, Inspect und Gate — kein Neuaufbau beim Screenwechsel
- Hall-Chunk lädt während der Lobby nach

### Geändert
- Koffer stehen ab fünf Spielern in zwei Reihen; sieben Tippflächen à 56 px passen
  nicht nebeneinander auf ein 390 px breites Handy

## [0.1.0] — 2026-09-04 — Der Spielablauf

### Hinzugefügt
- Elf Screens von der Lobby bis zum Result, alle Modi spielbar
- Router mit Farb-Wipe, Sticker-Buttons, Beamten-Buttons in seiner Farbe
- Wake-Lock, Haptik, Back-Dialog, Session-Persistenz

### Geändert
- Screens kommen nur noch über eine Schleuse an die Runde; `publicView` wird strukturell
  erzwungen statt per Konvention

## [0.0.1] — 2026-09-04 — Der Regelkern

### Hinzugefügt
- Vollständiger Regelkern als reine Funktionen: Hinweise, Kontrolle, Schranke, Auszahlung,
  Modi, Beamten-Rotation
- Hinweis-Modell mit p_true = 0,6, das nie die Menge verrät
- `publicView` als Whitelist-Projektion
- Projekt-Setup, PWA, CI und Deploy-Workflow
