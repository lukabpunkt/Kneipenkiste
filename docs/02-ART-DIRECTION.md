# DIE HÄNGEBRÜCKE — Art Direction & Design-System

> Version 1.0 · Baut auf der Drinkshot-Art-Direction auf. Alles, was hier nicht anders definiert ist, gilt **wie bei Drinkshot** (Stil-Statement, Typografie, Button-System, Motion-Tokens, Asset-Pipeline, UX-Copy-Ton, Animationsprinzipien). Hier nur Unterschiede und Hängebrücke-spezifische Elemente.

---

## 1. Stil-Statement

**"Indiana Jones als Samstagmorgen-Cartoon — eine Schlucht, ein Geier, und Wanderer, die sich gegenseitig nicht trauen."**

- Formensprache, Outlines, Chibi, Cel-Shading: identisch zu Drinkshot.
- **Stimmung:** Goldene Stunde in einer Canyon-Landschaft: warme Felsen (Terrakotta, Ocker), tiefblauer Himmel, unten Nebel und ein glitzernder Fluss. Die Brücke aus grauem, rissigem Holz mit Hanfseilen. Ein Geier auf einem Pfahl.
- **Ton:** Abenteuer-Slapstick. Stürze enden immer im Wasser oder auf einem Felsvorsprung, jeder klettert wieder hoch. Der Geier ist ein Kommentator, kein Aasfresser.

---

## 2. Farb-Tokens (Ergänzungen)

Spielerfarben: **identisch zu Drinkshot**.

| Token | Hex | Verwendung |
|---|---|---|
| `bg.deep` | `#0F0E1A` | App-Hintergrund (Menüs) |
| `bg.panel` | `#1C1B2E` | Cards, Sheets |
| `paper` | `#FFF8E7` | Text |
| `ink` | `#1A1024` | Outlines |
| `canyon` | `#FFB800` | Primary CTA, Sonnenlicht-Akzent |
| `canyonShade` | `#D18E00` | CTA-Kante |
| `sky.top` | `#2B4C8C` | Himmel oben |
| `sky.horizon` | `#F5A25D` | Himmel am Horizont (Verlauf erlaubt, Hintergrund) |
| `rock` | `#C4693E` | Felsen |
| `rockDark` | `#8C4426` | Felsschatten, Schluchtwand |
| `wood` | `#9C8A72` | Balken |
| `woodDark` | `#6B5B48` | Balken-Kante, Risse |
| `woodRotten` | `#5A6B3F` | Morscher Balken (nur im Reveal/Result) |
| `rope` | `#D9B77A` | Seile |
| `mist` | `#DCE3F0` | Nebel (Alpha 0.6) |
| `river` | `#3FA7D6` | Fluss |
| `safe` | `#2ED573` | "Sicher"-Markierungen, Banner "Alle drüben" |
| `danger` | `#FF2D55` | Kollisions-Markierung, Todeszone-Schild, Stempel |
| `flag` | `#FFFFFF` | Fahnen (mit Spielerfarbe-Rand) |

Kontrastregeln wie Drinkshot. Texte auf der hellen Canyon-Bühne in `ink` mit `paper`-Stroke.

---

## 3. Typografie

Wie Drinkshot. Ergänzung: **Balken-Nummern** als eingebrannte Holzschilder (Luckiest Guy, `ink`, leicht rotiert ± 4°, an einem Seil hängend, schwingen mit dem Wind). Todeszone-Schild: rot-weiß gestreift, Luckiest Guy `2xl`, schwingt mit `elastic.out`.

---

## 4. UI-Komponenten (Ergänzungen)

### 4.1 Brücke von oben (Negotiation + Choose + Result) — DOM/SVG
- Inline-SVG: zwei Seile horizontal, dazwischen Balken als Rechtecke mit Radius 8 px, Holz-Textur (2 Streifen), Nummer-Schild darüber. Balken ≥ 56 px hoch, volle Breite mit 8 px Abstand; bei 10 Balken (n = 8) zwei Reihen oder Scroll — nein: Balken schrumpfen auf min. 48 px Höhe, kein Scroll (Todeszone-Schild oben).
- Zustände: `normal` · `selected` (Spielerfarbe-Glow, Choose) · `flagged` (Fahne in Spielerfarbe, Negotiation) · `rope` (Seil-Button unter der Brücke, Modus) · `result_safe` (Hiker-Kopf in Spielerfarbe drauf, grüner Rand) · `result_collision` (2+ Köpfe, rot, Riss) · `result_rotten` (grün-grau, Riss) · `removed` (leerer Platz zwischen den Seilen, "abgefault"-Schild).
- Idle: Seile schwingen minimal (CSS, 4 s).

### 4.2 Countdown-Ring
Wie Tresor; Ring um ein Geier-Portrait, letzte 5 s: Geier schaut auf die Uhr.

### 4.3 Fahnen-Reihe (Fahne-Modus)
Unter der Brücke pro Spieler ein Badge mit "Fahne auf …"-Button; gesetzte Fahne erscheint auf dem Balken, für alle sichtbar. Mehrere Fahnen auf demselben Balken stapeln sich (das ist erlaubt und ein sichtbarer Konflikt).

### 4.4 Gewicht-Stepper (Schwergewicht)
Rucksack-Illustration wächst mit 1–3 (kleiner Rucksack / großer Rucksack / Rucksack mit Amboss dran). Risiko-Zeile: "Sicher: verteilst {g} · Sturz: trinkst {g} × Personen".

### 4.5 Ergebnis-Banner
Schärpe wie Tresor; Farbe `safe` / `danger` / Streifen (Todeszone).

### 4.6 Distribute-Schnellmodus
Badge-Grid der Empfänger; oben die Reihe der Verteiler mit Pfeil "→ wer?"; Tap auf Ziel setzt den Pfeil, nächster Verteiler leuchtet auf. Kein Pass-Screen.

---

## 5. Die Charaktere

### 5.1 Hikers (Shotlings)
- Rig identisch zum Drinkshot-Shotling. Zusätzliche Slots/Assets: `hat_hiker.png` (Krempenhut, getintet), `backpack.png` (3 Größen, Rucksack-Slot hinter dem Torso), `stick.png` (Wanderstock, Hand-Slot), `rope_harness.png` (Seil-Modus).
- Gesichter zusätzlich: `oh` (kleiner runder Mund, große Augen — der Blickkontakt), `held_breath` (Backen aufgeblasen), `whistle`, `wet` (Haare platt, Fisch auf dem Kopf als Overlay), `smug_shrug`, `help` (Schild-Sprechblase).
- Zustände: `idle`, `run`, `stand_wobble`, `look_at(other)`, `fall_*`, `wet_climb`, `safe_wave`.

### 5.2 Der Geier "Gustav"
Cartoon-Geier, grau-braun, kahler rosa Kopf, `ink`-Outline, sitzt auf einem Pfahl am linken Plateau. Animationen: kreisen (Intro), kreischen, lachen (Schultern zucken), auf die Uhr schauen, einen Hiker kurz tragen (`fall_seesaw`), auf dem Todeszone-Schild landen.

### 5.3 Der Zimmermann "Balthasar"
Shotling-Variante mit Zimmermannshut, Bleistift hinterm Ohr, Hammer. Erscheint nur bei Reparatur (Leiter von unten), nicht getintet.

---

## 6. Die Bühne (Schlucht)

- Logische Welt 1000 × 1000, Seitenansicht. Linkes Plateau (x 0–180), Brücke (x 180–820) mit B Balken gleichmäßig verteilt, rechtes Plateau (x 820–1000). Brücke hängt in leichtem Durchhang (Catenary), Balken folgen der Kurve. Schlucht darunter mit Nebel-Layer (Parallax langsam) und Fluss (Glitzer-Partikel).
- Hikers starten links in einer Reihe (bei 7–8 zwei Reihen), laufen zu ihren Balken; Balkenbreite ≥ 60 Einheiten, damit zwei Hikers nebeneinander stehen können (bei m_b ≥ 3 stehen sie gestaffelt).
- Kamera: Intro-Fahrt über die Schlucht (Zoom 1.3× → 1.0×), beim Knarren leichter Zoom auf Kollisionsbalken (1.15×), Shake beim Bruch (10 px, 250 ms), beim Fall folgt die Kamera nach unten (Pan bis zum Fluss, dann zurück).
- Wind: Seile und Hüte reagieren auf ein globales Wind-Noise (simplex), Nebel driftet.

---

## 7. Animationsprinzipien

Die 7 Regeln aus Drinkshot gelten. Zusätzlich:
- **Gleichzeitigkeit ist Pflicht:** Alle Hikers kommen im selben Frame auf ihren Balken an (Geschwindigkeiten werden aus der Distanz berechnet). Der Schritt hat einen gemeinsamen Hit-Stop.
- **Jeder Balken knarrt:** Sichere Balken knarren mit 70 % der Amplitude der Kollisionsbalken — deutlich, aber leiser. Erst ab dem Blickkontakt trennt sich Fake von Echt.
- **Blickkontakt vor Bruch:** Kollisions-Hikers drehen die Köpfe zueinander (Slow-Mo 0.5×, 800 ms), Gesicht `oh`, eine "Oh."-Sprechblase — **immer**, in jeder Fall-Sequenz. Das ist die Signatur des Spiels.
- **Alle kommen wieder hoch:** Jede Fall-Sequenz endet damit, dass die Gestürzten nass am Seil hängen oder hochklettern. Kein Hiker "verschwindet".

---

## 8. Partikel-Budget

| Effekt | Max | Technik |
|---|---|---|
| Holzsplitter | 16 | Pool, Gravity, Rotation |
| Wasser-Spritzer | 24 | Pool |
| Wasser-Ringe | 3 | Sprite scale + fade |
| Fluss-Glitzer | 30 | ParticleContainer, Idle |
| Nebel | 4 Sprites | Parallax |
| Sternchen | 8 | Pool |
| Konfetti (Result) | 60 | DOM-CSS |

Gesamt ≤ 200 aktive Sprites.

---

## 9. UX-Copy (DE, Ergänzungen)

- CTA Lobby: "Auf die Brücke". Negotiation: "Sprecht euch ab. Oder tut so." / "Versprechen sind nicht bindend." / "Alle bereit". Choose: "Dein Balken. Niemand sieht ihn." / "Seil nehmen (einmalig)". Sealed: "Alle haben gewählt. Handy in die Mitte."
- Banner: "Alle drüben", "Es kracht", "Massensturz", "Todeszone", "Fahnenflucht!", "Pech".
- Schilder: "NUR {B} BALKEN", "Balken {x} ist abgefault", "Repariert", "HILFE".
- Sprechblasen: "Oh.", "Warum ich?!", "Ernsthaft?", "Du hattest die 3 gesagt!", "Puh."
- Geier-Kommentare (i18n-Array, Result): "Ich hätte auf die 5 gewettet.", "Vertrauen ist so 2019.", "Wieder niemand? Ich hab Hunger."
- Fehlertext Lobby (< 3): "Zu zweit gibt es genug Balken für alle. Holt noch jemanden."
- Onboarding-Tooltips: Negotiation: "Redet. Versprecht. Brecht es." Choose: "Allein auf dem Balken = sicher. Zu zweit = nass."
