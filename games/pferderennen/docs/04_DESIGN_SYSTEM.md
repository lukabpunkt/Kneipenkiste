# 04 – Design System, Visuals & Animation

Ziel: Das Spiel soll aussehen wie ein liebevoll gemachtes Indie-Cartoon-Game – **satt, warm, leicht überdreht**, nicht wie ein Formular mit Canvas. Jede Bewegung hat Easing, jede Aktion hat Feedback, nichts „poppt“ einfach hin.

## 1. Stilrichtung

- **Cartoon / Flat mit Tiefe:** Klare Formen, dicke weiche Outlines (2–3 px, dunkle Fellfarbe, nicht schwarz), sanfte Verläufe für Volumen, lange weiche Schatten.
- **Stimmung:** Sommerabend auf der Rennbahn. Warmer Himmel (Pfirsich → Flieder), sattes Grün, Holz- und Cremetöne bei der UI.
- **Referenzen (nur als Gefühl, nicht kopieren):** _Alto's Odyssey_ (Farbverläufe & Stimmung), _Fall Guys_ (Rundlichkeit, Slapstick), _Kingdom Rush_ (Cartoon-Outlines), Duolingo (UI-Buttons mit „Kante unten“).

## 2. Farb-Tokens (`src/styles/tokens.css`)

### 2.1 Pferdefarben (Signaturfarben)

| Pferd           | Base      | Light (Highlights, Glow) | Dark (Outline, Schatten) |
| --------------- | --------- | ------------------------ | ------------------------ |
| Sir Trabsalot   | `#8B5CF6` | `#C4B5FD`                | `#5B21B6`                |
| Prosecco Rakete | `#EC4899` | `#F9A8D4`                | `#9D174D`                |
| Kater Morgana   | `#EF4444` | `#FCA5A5`                | `#991B1B`                |
| Schnapsidee     | `#22C55E` | `#86EFAC`                | `#15803D`                |
| Hopfen Hengst   | `#F59E0B` | `#FCD34D`                | `#B45309`                |
| Wodka Wirbel    | `#06B6D4` | `#67E8F9`                | `#0E7490`                |

Alle sechs Farben sind gegeneinander auch bei Rot-Grün-Schwäche unterscheidbar, wenn Form/Fell hinzukommt (siehe Barrierefreiheit §9). Jedes Pferd nutzt seine Farbe für: Startbox, Sattel, Jockey-Trikot, Zaumzeug, Lane-Marker-Streifen, Wettkarte-Rahmen, Chips, Konfetti, Podium-Sockel, Leaderboard-Punkt.

### 2.2 Die drei Token-Ebenen

Seit M13 ist `tokens.css` dreistufig aufgebaut. Nur die **semantische** Ebene darf außerhalb der Datei benutzt werden — diese Indirektion ist es, die ein zweites Theme zu einem Block Überschreibungen macht statt zu einer zweiten Designrunde.

```
Primitiv    was es IST         --sand-300, --accent-500
Semantisch  wofür es DA IST    --surface, --text-muted, --accent-press
Komponente  die Ausnahmen      --btn-edge (nur wo eine Komponente wirklich eine braucht)
```

### 2.3 Die Skalen (OKLCH)

Gebaut in OKLCH, weil dessen Helligkeit über alle Farbtöne hinweg gleich wahrgenommen wird: In HSL bedeutet „+10 % Helligkeit" bei Orange etwas anderes als bei Pflaume, weshalb handgemischte Skalen ungleichmäßig aussehen. Methode: **eine Helligkeitsleiter für alle Skalen festlegen**, dann Chroma und Hue darüberlegen, Chroma an beiden Enden zusammendrücken.

- **`--sand-50 … --sand-900`** – das Neutral. Warmes Papier oben (H 77), pflaumiger Schatten unten (H 320); der Farbton dreht über die Leiter, weil der Hintergrundverlauf von Pfirsich nach Flieder läuft und ein Neutral, das in den Lichtern wärmer und in den Schatten kühler wird, zum Bild gehört. Die Stufen **50, 600 und 900 sind bitgleich** mit dem alten `--cream`, `--ink-soft` und `--ink`.
- **`--accent-50 … --accent-900`** – Stufe **500 ist `#FF6B35`**, Stufe 700 das alte `--accent-dark`. Die Identität hat sich nicht geändert, sie hat Nachbarn bekommen.
- **`--danger-*` / `--success-*`** – je vier Stufen, mehr braucht keine von beiden.
- **`--tint-subtle` / `--tint` / `--tint-strong`** – durchscheinendes Ink für Flächen, deren Untergrund beim Schreiben nicht bekannt ist. Vorher waren das neun unbenannte `color-mix()`-Werte zwischen 6 % und 35 %; das Auge unterscheidet 6 von 8 nicht, also sind es drei.

**Genau zwei Textfarben:** `--text` und `--text-muted`. Alles darunter kommt aus Gewicht und Größe — eine Leiter immer blasserer Grautöne ist der klassische Bastel-Marker. Dazu `--text-on-sky` für die Stellen, an denen Text direkt auf dem Verlauf steht: `--text-muted` erreicht dort nur 3,0–3,7:1, die dunklere Stufe hält 6,1–7,5:1 über den ganzen Verlauf.

Dark Mode ist weiterhin **nicht** vorgesehen. Die semantische Ebene ist aber die gesamte Vorarbeit dafür, falls er kommen soll.

### 2.4 Tiefe

Eine Lichtquelle für die ganze Seite, senkrecht von oben. Mit steigender Höhe wachsen Versatz und Weichzeichnung, während die **Deckkraft sinkt** — das ist es, was Höhe als Höhe lesbar macht statt als Gewicht.

```
--elev-1 / --elev-2 / --elev-3   je DREI gestapelte Schatten, nie einer
--shadow-hue: 0.34 0.055 35      warmes Braun, nie Schwarz
--edge: 4px                      die Unterkante, auf der alles Drückbare steht
--edge-press: 1px                worauf sie beim Drücken zusammenfällt
```

Ein einzelner harter Schatten ist der auffälligste Bastel-Marker, und Stapeln kostet nichts. Schwarze Schatten auf einer Pfirsich-Seite werden grau und schmutzig; ein zum Untergrund hin eingefärbter Schatten bleibt im Bild.

**Die Unterkante gilt überall**: Knöpfe, Chips, Stepper, Pferdekarten. Sie ist dieselbe Mechanik, die Duolingos Knöpfe wie Gegenstände wirken lässt, und sie funktioniert nur, wenn sie *ausnahmslos* gilt und von derselben Seite beleuchtet wird. Die Kantenfarbe kommt immer aus der eigenen Skala des Elements (`--btn-edge`).

### 2.5 Form und Abstand

**Verschachtelte Ecken: Innenradius = Außenradius − Abstand.** Ein Knopf 16 px innerhalb einer 22-px-Karte will 6 px, nicht noch einmal 22. Falsch verschachtelte Ecken sieht man nicht, bis man einmal darauf achtet, und danach nie wieder nicht.

```
--radius-xs: 6px  --radius-sm: 10px  --radius-md: 14px
--radius-lg: 22px --radius-xl: 28px  --radius-pill: 999px
--space-1..8: 4 8 12 16 24 32 48 64
```

Bei den Abständen liegen keine zwei Nachbarn näher als ~25 % beieinander, damit nie abgewogen werden muss, welcher gemeint ist.

## 3. Typografie

- **Display (Titel, Pferdenamen, Knöpfe, Countdown):** **Fredoka**, Variable-Achse 300–700, self-hosted als woff2 in `assets/fonts/` (OFL, Lizenz liegt daneben), auf Latin subsettet, **29 KB**. Kein Google-Fonts-Request zur Laufzeit — die CSP erlaubt ohnehin nur `font-src 'self'`. Die Achse hat den Default 300, also **muss jede Nutzung ihr Gewicht angeben**.
- **Fallback mit Metrik-Überschreibung:** Eine zweite `@font-face`-Regel zwingt Fredokas Metriken auf die Systemschrift (`size-adjust: 96.3 %`, `ascent-override: 101.1 %`, `descent-override: 24.5 %`), damit eine Überschrift vor und nach dem Font-Swap dieselbe Box belegt. Ohne das springt beim Swap jede Zeile und CLS ist nicht mehr 0 (A5).
- **Body:** der System-Stack. Zwei Familien sind das Maximum, und eine Systemschrift für Fließtext ist bei GitHub oder Notion genauso — der Amateur-Marker ist `system-ui` in *Überschriften*.
- **Fluide Skala** zwischen 360 px und 1440 px Viewport, per `clamp()`, ohne Breakpoint-Sprung. Der kleine Pol behält die Werte, mit denen das Spiel ausgeliefert wurde (14/16/18/22/28/36/56); der große wächst schneller als proportional, weil ein größerer Bildschirm mehr Hierarchie will, nicht bloß mehr von allem. Jedes `clamp()` behält einen `rem`-Anteil in der Mitte, sonst bricht der Browser-Zoom.
- **Fernseher:** Ab 1400 px hebt `:root { font-size: 21px }` die ganze Skala an — aus drei Metern ist alles unter ~24 px unlesbar. Abstände bleiben in px: ein Fernseher braucht größere Buchstaben, nicht größere Lücken.
- Große Schrift enger (Tracking, Leading), kleine Schrift luftiger — `--track-display`, `--leading-display/-heading/-body`.
- Zahlen (Schlücke) immer **tabular-nums**.

## 3a. Icons (`ui/components/icon.js`)

Ein Set, ein Raster, eine Strichstärke: **24er-Viewbox, 2 px Kontur, runde Enden und Ecken** — dieselbe Sprache wie `OUTLINE` bei den Pferden. Die Strichstärke skaliert bewusst *nicht* mit der Icon-Größe, damit jedes Glyph in derselben Gewichtsklasse bleibt.

Emoji haben diese Aufgabe vorher gemacht und sind das falsche Werkzeug dafür: Jede Plattform zeichnet sie anders, sie bringen ihre eigenen Farben in eine sorgfältig gebaute Palette und sitzen auf der Grundlinie wie ein Fremdkörper, weil sie zu keiner Schrift gehören. **Spieler-Avatare bleiben Emoji** — dort sind sie keine Icons, sondern der Spieler.

Icons sind immer `aria-hidden`; ihr Name steht im Text daneben oder im `aria-label`.

## 4. Screens (Wireframe-Beschreibung)

### 4.1 Start

- Vollbild-Himmelsverlauf; unten Rasen und Bahn mit 6 Pferden im Idle-Loop (Kopfnicken, Schweifwedeln, gelegentliches Schnauben mit Partikeln). Das ist der „Attract Mode“.
- Logo/Titel „Pferderennen“ mit leichtem Wackeln (rotate ±1,5°, 3 s Loop).
- Primär-Button groß (min. 56 px hoch, volle Breite auf Mobile), Sekundär-Buttons als Ghost.
- „Weiterspielen“-Button mit Avatar-Reihe der gespeicherten Spieler.

### 4.2 Spieler

- Liste mit Avatar-Emoji (Tap = zufällig neu), Name-Input, Entfernen-X.
- „+ Spieler“-Button, Enter im Input fügt nächsten Spieler hinzu (Herumreichen-Flow).
- Sticky Footer: „Weiter zu den Wetten →“, disabled < 2 Spieler mit Hinweis.

### 4.3 Wetten

- Header: „**Luka** ist dran“ mit Avatar, Fortschritt „3 / 6“.
- Grid 2×3 (Mobile) bzw. 3×2 (Desktop) der Pferdekarten: Farbrahmen, Portrait (prozedural gezeichnet, Kopf mit Accessoire), Name, Charakter-Zeile, kleine Chips der Spieler, die schon darauf gesetzt haben.
- Nach Auswahl: Karte animiert nach oben, unten erscheint Stepper „Einsatz: [−] **3** [+] Schlücke“ (Buttons ≥ 48 px) + Wettart (wenn „Frei“) + Button „Setzen ✓“.
- Nach dem letzten Spieler: Übersichts-Tabelle + „🏁 Rennen starten“ (pulsierend).

### 4.4 Rennen (Canvas + DOM-HUD)

- Canvas füllt den Screen. Leaderboard oben rechts (Landscape) bzw. oben (Portrait) als Reihe von 6 Farbpunkten mit Position-Nummer, live sortiert mit FLIP-Animation.
- Fortschrittsbalken oben: Linie mit 6 Mini-Pferde-Icons, die entlang wandern.
- Kommentar-Zeile unten in Sprechblasen-Panel; Textwechsel mit Slide-Up.
- Event-Toasts (Trinkregel) als Pill über der Kommentar-Zeile, 3 s, mit 🍺.
- Countdown-Overlay: „3“ „2“ „1“ skaliert von 3× auf 1× mit Bounce, „LOS!“ mit Screen-Flash.
- **Startpistole:** Ein Starter steht an der vorderen Bande hinter der Startlinie – nicht vor der Tribüne, wo eine dunkle Figur im bunten Publikum untergeht. Er hebt den Arm über die drei gezählten Schritte, und zwar nach *hinten* herum: der kurze Weg würde die Pistole waagerecht über die Bahn auf die Pferde richten. Bei „LOS!“ Mündungsblitz, Rauch vom Lauf und der Knall. Die Kamera trägt ihn beim Anfahren von selbst aus dem Bild.
- **Zielband:** Auf Brusthöhe über die Ziellinie gespannt, leicht zu den Pferden hin durchhängend, mit dunkler Kante gegen das Schachbrett dahinter. Der Sieger reißt es an *seiner* Bahn; die beiden Hälften bleiben an ihren Pfosten, werden vom Pferd nach vorn mitgerissen und fallen dann flatternd. Rein visuell – ausgelöst von der gezeichneten, nicht der simulierten Position.
- **Renn-Effekte:** Dreckfetzen unter den Hufen (nur ab Tempo und nur gelegentlich), Speedlines hinter einem Pferd oberhalb der Schwelle, ab der die Engine auf `gallop_fast` schaltet, Blitzlichtgewitter in der Tribüne, das zum Ziel hin zunimmt, und ein sanfter Kamera-Push über das Schlussdrittel. Alles hängt an der Qualitätsstufe.

### 4.5 Ergebnis

- **Siegerehrung** als Canvas-Szene: 3 Sockel in Pferdefarben, Höhe 3/2/1. Die drei Erstplatzierten traben nacheinander ein (Stagger 250 ms, Dritter zuerst) und halten *hinter* ihrem Sockel, sodass der Sockel die Beine verdeckt. Die Jockeys steigen ab – dasselbe `riderless`-Flag wie im Rennen, damit niemand doppelt gezeichnet wird – und stellen sich aufs Treppchen, der Sieger mit beiden Armen hoch. Konfetti-Kanonen in Siegerfarbe. Die Szene hält sich selbst an, sobald alles steht.
- Unter der Szene stehen die drei Namen als echter Text. Sie sind das, was ein Screenreader vorliest; die Szene ist die Feier, nicht die Information.
- Karten: „🥇 **Luka** verteilt **3 Schlücke**“ (grün) / „🍺 **Nina** trinkt **2 Schlücke**“ (rot). Bei Haus-Sieg: Sonderkarte mit 🏠.
- Event-Trinkregeln aus dem Rennen als Rückblick-Liste (falls aktiv).
- Buttons: „Nächstes Rennen“ (primär), „Spieler ändern“, „Statistik“.

### 4.6 Regeln / Einstellungen / Statistik

- Als Bottom-Sheet-Modal (Mobile) bzw. zentriertes Modal (Desktop). Schließen per X, Backdrop-Tap, `Esc`.

## 5. Das Pferd (prozedurales Rendering, `render/horse.js`)

### 5.1 Aufbau (Landscape, Seitenansicht)

Teile (alle relativ zu einer Basisgröße `S`, Default 64 px Körperlänge):

1. **Schatten:** Ellipse unter dem Pferd, skaliert mit Sprunghöhe (kleiner, wenn Pferd in der Luft).
2. **Hinterbeine** (2), **Vorderbeine** (2): je Oberschenkel + Unterschenkel + Huf (Kapsel-Formen), Gelenkwinkel aus Gallop-Zyklus.
3. **Körper:** abgerundete Kapsel mit leichter Neigung; Fellfarbe mit Highlight-Verlauf.
4. **Hals + Kopf:** Kurve nach vorne-oben, Kopf leicht nickend im Zyklus; Ohr, Auge (Blinzeln alle 3–6 s), Nüster.
5. **Mähne und Schweif:** 3–4 Segmente mit Verzögerung (Follow-Through), reagieren auf Geschwindigkeit.
6. **Sattel** (Signaturfarbe), **Zaumzeug** (Signaturfarbe), **Jockey**: Kugelkopf mit Helm/Accessoire, Trikot in Signaturfarbe, Arme halten Zügel, Körper wippt gegenphasig zum Körper.
7. **Pferd-spezifische Accessoires** aus `data/horses.js`: Sonnenbrille, Kaffeebecher, Kleeblatt, Brezel, Ushanka, Ritterhelm.

### 5.2 Gallop-Zyklus

- Zyklusdauer `T = 0.55 s / speedFactor` (schneller = kürzere Schritte), Phase `φ ∈ [0, 1)`.
- 4-Beat-Gallop vereinfacht: Hinterbeine schwingen bei `φ ≈ 0.0–0.4`, Vorderbeine bei `φ ≈ 0.4–0.8`, Flugphase bei `φ ≈ 0.8–1.0` (Körper +6 px hoch, Schatten kleiner).
- Körper-Bounce: `y = -4·|sin(2π φ)|`, Körper-Rotation `±4°` gegenphasig.
- Kopf-Nick `±6°`, Mähne/Schweif mit Lag `0.08 s` pro Segment.
- Staubwölkchen bei jedem Hufaufsatz (2–3 Partikel), bei Sprint mehr und mit Speedlines.

### 5.3 Animations-States (`horseAnimations.js`)

`idle`, `gallop`, `gallop_fast` (Speedlines, flacherer Körper), `stumble`, `limp`, `vomit`, `pee`, `sleep`, `wake`, `hiccup`, `confused` (rückwärts), `slip` (360°-Spin), `pose`, `graze`, `fly` (Feder-Hufe), `celebrate` (Aufbäumen + Jockey jubelt), `trot_in` (müde Zieleinlauf). Übergänge über 120–200 ms Blend (Gelenkwinkel lerpen).

### 5.4 Portrait-Modus (Rückansicht, schräg von hinten oben)

- Sichtbar: rundes Hinterteil, Schweif (wedelt), Rücken mit Sattel (groß, Signaturfarbe), Jockey von hinten (Trikot, Helm), Kopf/Ohren vorne kleiner (Perspektive), Beine seitlich abwechselnd sichtbar.
- Gallop-Zyklus: Körper wippt auf/ab und rollt leicht links/rechts; Beine erscheinen abwechselnd seitlich.
- Die Farbfläche (Sattel + Trikot) ist bewusst groß, damit man das eigene Pferd auf dem Handy sofort erkennt.

## 6. Bahn & Umgebung (`render/track.js`)

- **Landscape:** Himmelsverlauf → ferne Hügel (Parallax 0,2) → Tribüne mit Publikum (Parallax 0,5; Publikum = Reihen bunter Kreise, die bei Events und im Finish „La-Ola“-wippen) → Zaun (weiß) → 6 Bahnen aus Sand mit hellen Trennlinien → Rasenstreifen vorne (Parallax 1,3, mit Grasbüscheln).
- **Startboxen:** 6 Boxen aus Holz, Tor in Signaturfarbe mit Nummer, klappen beim Start mit Bounce auf; Kamera zeigt beim Countdown alle Boxen.
- **Ziellinie:** Schachbrett-Balken quer über alle Bahnen, „ZIEL“-Banner auf Pfosten, Fotografen (Blitze) daneben.
- **Streckenmarker** alle 100 Units (kleine Schilder), damit Tempo spürbar ist.
- **Dekor, das liegen bleibt:** Bananenschale nach dem Event, Kotzpfütze, Pinkelpfütze, verlorenes Hufeisen, abgeworfener Jockey (sitzt am Rand und winkt).
- Hintergrund-Layer werden in ein **Offscreen-Canvas** gecacht und nur per `drawImage` verschoben.

## 7. Kamera (`render/camera.js`)

- Ziel: Schwerpunkt des Feldes, leicht nach vorne versetzt (+15 % Sichtbreite), damit man sieht, wohin es geht. Lerp mit `1 − e^(−6·dt)`.
- Zoom: Start 1,0; wenn das Feld breiter als 70 % der Sicht wird, leicht rauszoomen (min 0,75).
- **Fotofinish:** Zeitlupe (Render-Interpolation mit `timeScale = 0.25`, Engine läuft mit weniger Steps pro Frame), Zoom 1,4 auf die Ziellinie, Vignette, Blitzlichter, Sound-Filter (Lowpass).
- **Shake:** bei `stumble`, `banana`, `streaker` 200–350 ms, Amplitude 3–6 px, Trauma-Decay. Deaktiviert bei Reduced Motion.

## 8. Partikel & Effekte (`render/particles.js`)

Object-Pool mit 400 Partikeln, Typen: `dust` (braun, fade), `confetti` (Rechtecke, Rotation, Signaturfarbe + Weiß/Gold), `star` (Sternchen bei Rutsch/Stolpern), `sparkle` (Prosecco-Glitzer), `rainbow` (Streifen-Trail), `splash` (Schlamm/Kotze), `zzz`, `heart`, `question`, `speedline`. Jeder Typ hat `spawn(x,y,opts)` und ein `update/draw`. Additive Blending für Glow-Effekte sparsam (`globalCompositeOperation = 'lighter'`).

## 9. Barrierefreiheit & Ergonomie

- Alle interaktiven Elemente ≥ 48 × 48 px; Primär-Buttons 56 px hoch.
- Pferde zusätzlich zur Farbe durch **Form** unterscheidbar (Fellfarbe, Accessoire, Nummer 1–6 auf Startbox und Sattel-Decke).
- Fokus-Ringe sichtbar (`:focus-visible`), Tab-Reihenfolge logisch; Rennen ist mit `Enter` startbar.
- Canvas hat `role="img"` und `aria-live="polite"`-Region im DOM, die Führungswechsel und Ergebnis als Text ausgibt.
- `prefers-reduced-motion`: keine Screen-Shakes, keine Blitze, Partikel −70 %, Titel-Wackeln aus.
- Textkontrast ≥ 4,5:1, Toast-Texte ≥ 18 px.
- Kein Inhalt hängt von Sound ab.

## 10. Sound-Design (Web Audio, synthetisiert, `audio/sfx.js`)

| Cue                                                                                                                        | Charakter                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Hufgetrappel                                                                                                               | Loop aus gefilterten Noise-Bursts, Rate gekoppelt an mittlere Feldgeschwindigkeit, Stereo-Panning nach Kamera |
| Startpistole                                                                                                               | Knall aus drei Schichten: breitbandiger Rausch-Burst, tiefer Square-Sweep als Körper, kurzer Nachhall         |
| Menge                                                                                                                      | Brown-Noise-Pad, Lautstärke steigt zum Finish, „Ooooh“ bei Events (gefilterter Sawtooth-Sweep)                |
| Banane                                                                                                                     | Slide-Whistle abwärts                                                                                         |
| Kotzen                                                                                                                     | Blubbern (LFO auf Lowpass)                                                                                    |
| Furz                                                                                                                       | Kurzer tiefer Sawtooth mit Vibrato (klassisch)                                                                |
| Taube                                                                                                                      | Zwei kurze Chirps                                                                                             |
| Fotofinish                                                                                                                 | Kamera-Klicks + Tiefpass auf Master                                                                           |
| Fanfare                                                                                                                    | 3-Ton-Arpeggio, Major                                                                                         |
| UI-Tap                                                                                                                     | Kurzer Klick (Noise 20 ms)                                                                                    |
| AudioContext wird erst nach der ersten Nutzerinteraktion erzeugt (Autoplay-Policy). Master-Gain mit sanftem Fade bei Mute. |

## 11. Micro-Interactions (DOM)

- Buttons: `translateY(2px)` + Schatten kleiner bei `:active`; Hover hebt 1 px.
- Karten-Auswahl: Rahmen leuchtet in Pferdefarbe, leichtes Scale 1,03 mit `--ease-bounce`.
- Screen-Wechsel: Slide + Fade 220 ms; Rennen-Start: Vorhang zu (Signaturfarben-Streifen) / auf.
- Zahlen im Stepper: Ziffer rollt (translateY) beim Ändern.
- Haptik (Mobile, `navigator.vibrate`): 10 ms bei Tap, 30 ms bei Event, 3×60 ms bei Sieg.
