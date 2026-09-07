# 04 – Design System, Visuals & Animation

Ziel: Das Spiel soll aussehen wie ein liebevoll gemachtes Indie-Cartoon-Game – **satt, warm, leicht überdreht**, nicht wie ein Formular mit Canvas. Jede Bewegung hat Easing, jede Aktion hat Feedback, nichts „poppt“ einfach hin.

## 1. Stilrichtung

- **Cartoon / Flat mit Tiefe:** Klare Formen, dicke weiche Outlines (2–3 px, dunkle Fellfarbe, nicht schwarz), sanfte Verläufe für Volumen, lange weiche Schatten.
- **Stimmung:** Abendrennen unter Flutlicht. Nachthimmel (fast schwarzes Pflaume → Horizontglühen), gedämpfte Bahn im warmen Lichtkegel, Papier und Amber bei der UI.
- **Teil der Kneipenkiste:** Seit September 2026 teilt das Spiel Grund, Papier, Amber, Schrift und Knopfform mit Drinkshot, Sprengmeister, Tresor und Zoll. Was hier steht, beschreibt die eigene Handschrift *innerhalb* dieses Rahmens — die gemeinsamen Werte sind in §2.6 aufgeführt und dürfen nicht driften.
- **Referenzen (nur als Gefühl, nicht kopieren):** _Alto's Odyssey_ (Farbverläufe & Stimmung), _Fall Guys_ (Rundlichkeit, Slapstick), _Kingdom Rush_ (Cartoon-Outlines), Duolingo (UI-Buttons mit „Kante unten“).

## 2. Farb-Tokens (`src/styles/tokens.css`)

### 2.1 Pferdefarben (Signaturfarben)

| Pferd           | Base      | Light (Highlights, Glow) | Dark (Outline, Schatten) |
| --------------- | --------- | ------------------------ | ------------------------ |
| Sir Trabsalot   | `#AF73EE` | `#D3AFEB`                | `#7B3FBF`                |
| Prosecco Rakete | `#FF6B9D` | `#FFAABE`                | `#C94A78`                |
| Kater Morgana   | `#FF4757` | `#FF9798`                | `#C0392B`                |
| Schnapsidee     | `#2ED573` | `#8CE5A7`                | `#1E9E52`                |
| Hopfen Hengst   | `#FFD32A` | `#FFE47F`                | `#D4A800`                |
| Wodka Wirbel    | `#18DCFF` | `#80E9F4`                | `#0FA6C2`                |

Die Base-Werte sind die **Kneipenkiste-Spielerfarben** — dieselben sechs Hexwerte, die die vier Schwesterspiele vergeben. Ein lila Pferd ist exakt das Lila eines lila Spielers. `Light` ist ein 45-%-Mix zu Papier (daraus wird der Streifen auf den Silks), `Dark` der kanonische Shade.

**Beschriftung auf einer Signaturfarbe ist immer Tinte, nie Papier.** Papier erreicht auf den sechs Farben 2,1–6,0:1 und scheitert am Gelb; Tinte liegt bei 5,6–13,1:1. Auf den *Shades* ist es geteilt — dort entscheidet `textOn()` in `render/palette.js` bzw. dieselbe Regel in `components.css` pro Farbe.

Alle sechs Farben sind gegeneinander auch bei Rot-Grün-Schwäche unterscheidbar, wenn Form/Fell hinzukommt (siehe Barrierefreiheit §9). Jedes Pferd nutzt seine Farbe für: Startbox, Sattel, Jockey-Trikot, Zaumzeug, Lane-Marker-Streifen, Wettkarte-Rahmen, Chips, Konfetti, Podium-Sockel, Leaderboard-Punkt.

### 2.2 Die drei Token-Ebenen

Seit M13 ist `tokens.css` dreistufig aufgebaut. Nur die **semantische** Ebene darf außerhalb der Datei benutzt werden — diese Indirektion ist es, die ein zweites Theme zu einem Block Überschreibungen macht statt zu einer zweiten Designrunde.

```
Primitiv    was es IST         --night-300, --accent-500
Semantisch  wofür es DA IST    --surface, --text-muted, --accent-press
Komponente  die Ausnahmen      --btn-edge (nur wo eine Komponente wirklich eine braucht)
```

### 2.3 Die Skalen (OKLCH)

Gebaut in OKLCH, weil dessen Helligkeit über alle Farbtöne hinweg gleich wahrgenommen wird: In HSL bedeutet „+10 % Helligkeit" bei Orange etwas anderes als bei Pflaume, weshalb handgemischte Skalen ungleichmäßig aussehen. Methode: **eine Helligkeitsleiter für alle Skalen festlegen**, dann Chroma und Hue darüberlegen, Chroma an beiden Enden zusammendrücken.

- **`--night-50 … --night-950`** – das Neutral. Warmes Papier oben (H 88), pflaumiger Schatten unten (H 285); der Farbton dreht über die Leiter, weil ein Neutral, das in den Lichtern wärmer wird, zur Seite gehört. Ein Grau mit festem Farbton säße darauf wie ein Aufkleber. Die Stufen **50, 800, 900 und 950 sind die Kneipenkiste-Anker** und liegen fest.
- **`--accent-100 … --accent-900`** – Stufe **500 ist `#FFB800`**, Stufe 700 `#D18E00`: das Amber, auf dem alle vier Schwesterspiele laufen. Orange bleibt die Farbe der Hub-Karte, so wie Sprengmeister außen grün und innen amber ist.
- **`--danger-*` / `--success-*`** – je zwei Stufen: die Fläche und ihre Kante. Die blassen Tints, die eine helle Oberfläche brauchte, sind weg — auf dunklem Grund macht ein durchscheinender Hauch der Fläche selbst diese Arbeit und kann nicht aus dem Gamut laufen.
- **`--tint-subtle` / `--tint` / `--tint-strong`** – durchscheinendes **Papier** für Flächen, deren Untergrund beim Schreiben nicht bekannt ist. (Auf der hellen Seite war es Tinte; auf dunklem Grund liest Helles als „angehoben“.) Vorher waren das neun unbenannte `color-mix()`-Werte zwischen 6 % und 35 %; das Auge unterscheidet 6 von 8 nicht, also sind es drei.

**Genau zwei Textfarben:** `--text` und `--text-muted`. Alles darunter kommt aus Gewicht und Größe — eine Leiter immer blasserer Grautöne ist der klassische Bastel-Marker. Dazu `--text-subtle` für Text, der direkt auf der Seite statt in einer Karte steht. (Hieß bis zum Kneipenkiste-Umbau `--text-on-sky` und zog in die andere Richtung: auf hellem Grund verlor Text auf dem Verlauf Kontrast, auf dunklem Grund gewinnt er welchen.)

Ein Light Mode ist **nicht** vorgesehen. Die semantische Ebene ist aber genau die Vorarbeit, die den Wechsel von Tag auf Nacht zu einer Datei gemacht hat — sie würde ihn auch wieder zurück tragen.

### 2.4 Tiefe

Eine Lichtquelle für die ganze Seite, senkrecht von oben. Mit steigender Höhe wachsen Versatz und Weichzeichnung, während die **Deckkraft sinkt** — das ist es, was Höhe als Höhe lesbar macht statt als Gewicht.

```
--elev-1 / --elev-2 / --elev-3   gestapelte weiche Schatten, nie ein einzelner
--hairline                       1 px Papier-Lichtkante oben — DAS liest als „erhaben"
--shadow-hue: 0.12 0.028 287     noch von vier Stellen als nacktes L C H konsumiert
--edge: 6px                      die Unterkante, auf der alles Drückbare steht
--edge-press: 2px                worauf sie beim Drücken zusammenfällt (4 px Weg)
```

Auf fast schwarzem Grund kann ein weicher Schatten nur noch schwarz sein, und Schwarz auf Schwarz ist nichts. Tiefe tragen hier deshalb zwei andere Dinge: die harte Unterkante und die Lichtkante oben. Die weichen Schatten trennen weiterhin ein Sheet von der Seite dahinter — das ist die eine Aufgabe, die ihnen bleibt.

**Die Unterkante gilt überall**: Knöpfe, Chips, Stepper, Abzeichen. 6 px hoch mit 4 px Weg — exakt der Wert der Schwesterspiele. Dazu die Sticker-Kontur: **3 px Tinte um farbige Flächen**, aber *nicht* um Karten; drei Pixel Tinte auf einem Panel, das selbst fast Tinte ist, sind 1,1:1 und damit nichts. Sie ist dieselbe Mechanik, die Duolingos Knöpfe wie Gegenstände wirken lässt, und sie funktioniert nur, wenn sie *ausnahmslos* gilt und von derselben Seite beleuchtet wird. Die Kantenfarbe kommt immer aus der eigenen Skala des Elements (`--btn-edge`).

### 2.5 Form und Abstand

**Verschachtelte Ecken: Innenradius = Außenradius − Abstand.** Ein Knopf 16 px innerhalb einer 28-px-Karte will 12 px, nicht noch einmal 28. Falsch verschachtelte Ecken sieht man nicht, bis man einmal darauf achtet, und danach nie wieder nicht.

```
--radius-xs: 6px  --radius-sm: 12px  --radius-md: 20px   (der Sticker-Knopf)
--radius-lg: 28px --radius-xl: 32px  (der Handyrahmen)   --radius-pill: 999px
--space-1..8: 4 8 12 16 24 32 48 64
```

Bei den Abständen liegen keine zwei Nachbarn näher als ~25 % beieinander, damit nie abgewogen werden muss, welcher gemeint ist.

### 2.6 Was der Kneipenkiste gehört

Diese Werte sind **kneipenkiste-weit identisch** und dürfen hier nicht driften. Sie stehen in `tokens.css` bewusst als Hex-Literale und nicht als OKLCH: ein Hin-und-Zurück durch OKLCH verschiebt sie um einen Zählwert, und dann ist das Amber hier ein anderes als in Drinkshot.

```
#0F0E1A  Grund          #1C1B2E  Panel        #27263D  Panel erhoben
#FFF8E7  Papier         #1A1024  Tinte
#FFB800  Amber          #D18E00  Amber-Kante
#FF2D55  Danger         #2ED573  Success
Luckiest Guy 400 (Display)  ·  Nunito 200–1000 (Body)
Sticker-Knopf: 64 px hoch, 20 px Radius, 3 px Tinte, 6 px Kante, 4 px Weg
```

Dazu die sechs Pferdefarben aus §2.1 und der Rahmen unten. Alles andere in dieser Datei — die Rampe dazwischen, die Rennszene, die Kamera, die Partikel — ist die eigene Handschrift dieses Spiels.

### 2.7 Der Rahmen auf dem Desktop

Ab 768 px sitzen die Menü-Screens in einem zentrierten 9:16-Handyrahmen (`min(480px, 100dvh·9/16)`, 32 px Radius), genau wie bei den vier Schwesterspielen. Das ist ein Spiel, bei dem ein Handy herumgereicht wird, und ein bildschirmbreites Menü behauptet etwas anderes.

**Das Rennen nicht.** Es hat eine Querformat-Bahn und einen Zehn-Fuß-Modus, die kein Schwesterspiel hat, und eine 480-px-Spalte würde beide wegwerfen. Der Router setzt dafür `data-frame` auf `<html>`:

- `phone` – Menüs, im Rahmen
- `full` – das Rennen, vollflächig; dieses Flag schaltet auch die Fernseher-Schriftgröße

Gesetzt wird `full` **vor** dem Einhängen des Screens, damit das Renn-Canvas gleich im ersten Frame die volle Box misst; zurück auf `phone` erst, wenn der abgehende Screen entfernt ist, sonst wird das Rennen mitten im Übergang zusammengequetscht.

## 3. Typografie

- **Display (Titel, Pferdenamen, Countdown, Kommentar):** **Luckiest Guy** 400, self-hosted als woff2 in `assets/fonts/` (17 KB, Latin-Subset). Genau ein Schnitt — wer mehr anfordert, bekommt in manchen Engines synthetisches Fetten. Bitgleich mit der Datei in `hub/fonts` und in jedem Schwesterspiel, wer also ein anderes Spiel offen hatte, hat sie schon im Cache.
- **Body (Fließtext, Knöpfe, Chips, Rangliste, Zahlen):** **Nunito**, Variable-Achse 200–1000, 39 KB. Default 600, Betonung 800. Knöpfe laufen bewusst *nicht* auf der Display-Schrift: Luckiest Guy ist bei 16–20 px unlesbar.
- Kein Google-Fonts-Request zur Laufzeit — die CSP erlaubt ohnehin nur `font-src 'self'`.
- **Fallback mit Metrik-Überschreibung:** Je eine zweite `@font-face`-Regel zwingt die echten Metriken auf die Systemschrift, damit Text vor und nach dem Font-Swap dieselbe Box belegt. Ohne das springt beim Swap jede Zeile und CLS ist nicht mehr 0 (A5). Kein Schwesterspiel liefert das mit; es ist unsere Zugabe. Die Werte sind mit fontTools **aus den ausgelieferten woff2 gelesen**, nicht aus einer Tabelle abgeschrieben (Nunito 1000 upm, asc 1011, desc 353, x-height 484; Luckiest Guy 2048 upm, asc 1440, desc 608, x-height 1400).
- Ehrliche Grenze: das repariert den **Layout**-Sprung, und den misst CLS. Den optischen Sprung repariert es nicht — für eine Comic-Pinselschrift gibt es keine Systementsprechung.
- **Fluide Skala** zwischen 360 px und 1440 px Viewport, per `clamp()`, ohne Breakpoint-Sprung. Der kleine Pol behält die Werte, mit denen das Spiel ausgeliefert wurde (14/16/18/22/28/36); der große wächst schneller als proportional, weil ein größerer Bildschirm mehr Hierarchie will, nicht bloß mehr von allem. **Ausnahme `--text-3xl`:** Luckiest Guy ist deutlich breiter als Fredoka war — „Pferderennen“ misst 7,14 em statt 6,0 —, deshalb ist der Titel auf 40→56 px gedeckelt. 56 px brauchen 400 px Zeile, und genau so viel gibt der 480-px-Rahmen her. Jedes `clamp()` behält einen `rem`-Anteil in der Mitte, sonst bricht der Browser-Zoom.
- **Fernseher:** Ab 1400 px hebt `:root[data-frame='full'] { font-size: 21px }` die ganze Skala an — aus drei Metern ist alles unter ~24 px unlesbar. Nur während des Rennens: alles andere steckt bei dieser Breite im 480-px-Rahmen, wo ein angehobener Root eine Lupe auf einem Handy wäre. Abstände bleiben in px: ein Fernseher braucht größere Buchstaben, nicht größere Lücken.
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
