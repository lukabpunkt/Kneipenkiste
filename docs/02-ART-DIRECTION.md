# SPRENGMEISTER — Art Direction & Design-System

> Version 1.0 · Baut auf der Drinkshot-Art-Direction auf. Alles, was hier nicht anders definiert ist, gilt **wie bei Drinkshot** (Stil-Statement, Typografie, Button-System, Motion-Tokens, Asset-Pipeline, UX-Copy-Ton, Animationsprinzipien). Hier stehen nur Unterschiede und Sprengmeister-spezifische Elemente.

---

## 1. Stil-Statement

**"Wile E. Coyote betreibt eine Baustelle auf einer Bilderbuch-Wiese."**

- Formensprache, Outlines, Chibi, Cel-Shading: identisch zu Drinkshot.
- **Stimmung:** Sonnige Wiese, Maulwurfshügel, Zaun, ein Cartoon-Baum am Rand, Bauhelm-Gelb und Warnstreifen als Akzent. Freundlich, hell — der Kontrast zum dunklen Scope (Drinkshot) und zum Tresorraum (Tresor).
- **Ton:** ACME-Slapstick. Minen sind runde schwarze Cartoon-Bomben mit kurzer Lunte und Glanzpunkt; Explosionen sind Rauchpilze mit Sternchen; Krater sind runde Löcher mit Rußring. Nichts erinnert an echte Landminen.

---

## 2. Farb-Tokens (Ergänzungen)

Spielerfarben: **identisch zu Drinkshot**.

| Token | Hex | Verwendung |
|---|---|---|
| `bg.deep` | `#0F0E1A` | App-Hintergrund außerhalb des Feldes (Menüs bleiben dunkel wie in der Familie) |
| `bg.panel` | `#1C1B2E` | Cards, Sheets |
| `paper` | `#FFF8E7` | Text auf dunkel |
| `ink` | `#1A1024` | Outlines |
| `hazard` | `#FFB800` | Primary CTA, Bauhelm, Warnstreifen (mit `ink`-Streifen) |
| `hazardShade` | `#D18E00` | CTA-Kante |
| `field.grass` | `#7ED957` | Wiese um das Feld |
| `field.grassDark` | `#5CB342` | Grasbüschel, Feldrand |
| `plate.top` | `#B98352` | Erdplatte Oberseite (verdeckt) |
| `plate.side` | `#8C5E33` | Erdplatte Kante (3D-Look, 6 px) |
| `plate.hole` | `#4A2E17` | Offenes Loch |
| `crater` | `#2B1B10` | Krater-Innen |
| `soot` | `#1A1024` | Ruß (=`ink`, Alpha 0.85) |
| `temp.hot` | `#FF4757` | HEISS-Symbol (Flamme) |
| `temp.warm` | `#FFB800` | WARM-Symbol (Sonne) |
| `temp.cold` | `#18DCFF` | KALT-Symbol (Schneeflocke) |
| `treasure` | `#FFD32A` | Kiste, Konfetti, Fanfare-Glow |
| `smoke` | `#D9D4E3` | Rauch (Alpha 0.9 → 0) |

Hinweis: `temp.hot` ist identisch mit Spielerfarbe Rot, `temp.cold` mit Türkis. Damit das nicht kollidiert, sind Temperatur-Symbole **immer Icons auf hellem Kreis** (`paper`, `ink`-Outline), Spielerfarben dagegen **immer Ringe/Badges mit Symbol**. Zwei unterschiedliche Formensprachen → keine Verwechslung (Test im Look-Check).

---

## 3. Typografie

Wie Drinkshot (*Luckiest Guy* / *Nunito*). Turn-Banner ("RUDI GRÄBT") in Luckiest Guy `xl`, Uppercase, in Spielerfarbe mit `ink`-Stroke. Trink-Banner ("ANNA TRINKT 2") in `2xl`, `temp.hot`-Hintergrund-Schärpe.

---

## 4. UI-Komponenten (Ergänzungen)

### 4.1 Erdplatte (Board-Tile)
- Quadrat mit Radius 12 px, `plate.top`, 6 px Bodenkante `plate.side`, 3 px `ink`-Outline, 2–3 zufällige Grashalme/Kiesel als Deko (Variante aus 4 Sprites).
- Zustände: `covered` (Idle: alle 6–10 s wackelt eine zufällige Platte minimal — "da lebt was") · `pressed` (scale 0.94, 80 ms) · `opening` (Platte kippt nach hinten weg wie ein Deckel, 260 ms, `back.in`) · `open_empty` (Loch + Hinweis-Icon + kleines Tier) · `crater` (dunkler, Rußring, Rauch-Idle, Legerfarben-Ring(e) am Rand, Hinweis-Icon bleibt) · `treasure` (goldenes Loch mit Glow) · `mine_revealed` (nur im Replay: Bombe mit Legerfarbe/Symbol) · `dud` (Blindgänger: Rauchwölkchen + Legerfarbe + "Pfff"-Schild).
- Auf dem Place-Screen: `mine_placed` (Bombe halb in der Erde, Lunte glimmt, Platte leicht angehoben) mit Zähler-Badge.

### 4.2 Turn-Banner
- Oben, Vollbreite, Spielerfarbe, Digger-Portrait links, "RUDI GRÄBT" rechts, Zug-Timer-Ring optional. Wechsel per Wipe in der neuen Spielerfarbe (200 ms).

### 4.3 Trink-Banner (Explosion)
- Schärpe fährt von rechts ein, "ANNA TRINKT 2", darunter kleiner Kill-Feed "Rudi → Anna" mit beiden Badges. Bleibt 2.2 s, dann raus. Haptik 60 ms. Bei Stapel: "ANNA TRINKT 4 · Rudi + Marc → Anna".

### 4.4 Token-Anzeige
- Rechts unten kleine Stapel-Badges "🍺 ×2" pro Spieler mit Tokens, ploppen bei Vergabe mit Overshoot.

### 4.5 Distribute-Screen
- Wie Tresor (Münze → hier Flaschen-Icon fliegt vom Token-Stapel in den Badge).

### 4.6 Feld-Replay (Result)
- Dieselbe Board-Komponente im Modus `replay`: Welle von der Kiste nach außen (Verzögerung 40 ms pro Chebyshev-Ring), nicht ausgelöste Minen mit "Phew"-Schild.

---

## 5. Die Charaktere: Diggers (Shotlings mit Helm)

- Rig **identisch** zum Drinkshot-Shotling. Zusätzliche Slots/Assets:
  - `helmet.png` — Bauhelm, getintet in Spielerfarbe, mit `ink`-Streifen; sitzt im Hut-Slot (Diggers tragen immer Helm).
  - `vest.png` — Warnweste-Overlay (`hazard` mit `paper`-Streifen), optional 50 %.
  - `shovel.png` — Schaufel, Hand-Slot; `shovel_pretzel.png` — verbogene Variante.
  - `soot_overlay.png` — Ruß-Maske für Kopf + Torso (Alpha-Tint), plus `hair_fan.png` (aufgestellte Haare).
  - Gesichter zusätzlich: `sweat` (HEISS), `brow` (WARM), `shiver` (KALT), `soot_blink` (schwarzes Gesicht, weiße Blinzelaugen), `relief`, `smug_gap_tooth`.
  - `flag_white.png` — weiße Fahne (Krater-Gag).
- Diggers stehen **um das Feld herum** (nicht darauf): kleine Bank am Feldrand, jeder auf seinem Platz; der aktive Digger läuft zur Platte, gräbt, kehrt zurück (oder fliegt und kehrt rußig zurück). Bei 7–8 Spielern zwei Reihen.
- **Kein NPC** in diesem Spiel — das Feld selbst ist der Moderator (Turn-Banner, Temperatur-Pops, Tiere im Loch).

### 5.1 Tiere & Fundstücke (Leer-Varianten)
`worm` (winkt), `beetle` (läuft im Kreis), `bone` (Hund kommt kurz und holt ihn), `boot` (alter Stiefel, ein Wurm guckt raus). Je 64 × 64, 2-Frame-Idle.

### 5.2 Die Kiste
Holzkiste mit "BIER"… nein: mit dem **Glas-Symbol** der Spielefamilie und Warnstreifen, 6 Flaschenhälse oben, Glanz. Zustände `closed`, `open`, `singed` (Preis der Gier: angesengt, ein Flaschenhals abgebrochen).

---

## 6. Das Feld (Bühne)

- Logische Welt 1000 × 1000. Feld zentriert, 5 × 5 → Platte 150 Einheiten + 14 Abstand; 6 × 6 → 124 + 12. Um das Feld: Wiese, Zaunstücke, 1 Baum oben rechts (Landeplatz für `hit_tree_landing`), 2–3 Maulwurfshügel, ein "VORSICHT"-Schild.
- Digger-Bank unten (bei 3–5) bzw. unten + oben (6–8), außerhalb der Tippfläche.
- Kamera: leichter Zoom (1.12×) auf die aktive Platte während der Grabung, zurück danach; Screen-Shake bei Explosion (12 px, 250 ms); Slow-Mo nicht nötig — Explosionen sind knackig, kein Suspense-Halten.
- **Anticipation vor dem Ergebnis:** Nach dem Tap läuft der Digger hin (250 ms), 3 Schaufelstöße (je 120 ms, Squash), dann 200 ms Stille mit Platte, die zittert — **erst dann** Ergebnis. Gesamt ~ 900 ms vom Tap bis zur Auflösung. Das ist die Jenga-Sekunde.

---

## 7. Animationsprinzipien

Die 7 Regeln aus Drinkshot gelten für jede Hit-/Treasure-Sequenz. Zusätzlich:
- **Ruß bleibt:** Ein gesprengter Digger bleibt bis Rundenende rußig (Soot-Overlay), das ist der sichtbare Score.
- **Legerfarbe zuerst lesbar:** Der Farb-Ring über dem Krater erscheint **innerhalb von 300 ms** nach der Explosion, bevor die Slapstick-Sequenz weitergeht — die Information "wer war's" darf nie hinter dem Gag warten.
- **Stumm = leer:** `dig_own_mine_silent` und `dig_empty_*` teilen sich Code-Pfad und Assets. Kein eigener Sound, kein eigener Frame. (Audit-Check.)

---

## 8. Partikel-Budget

| Effekt | Max | Technik |
|---|---|---|
| Rauchpilz | 12 Sprites | Pool |
| Erdklumpen | 20 | Pool, Gravity |
| Sternchen | 8 | Pool |
| Konfetti | 100 | ParticleContainer |
| Blätter (Baum) | 12 | Pool |
| Legerfarben-Ring | 2 | Graphics cache / Sprite scale |

Gesamt ≤ 200 aktive Sprites.

---

## 9. UX-Copy (DE, Ergänzungen)

- CTA Lobby: "Feld verminen". Place: "Lege 2 Minen." / "Vergraben". Buried: "Alle Minen vergraben. Handy in die Mitte." Dig-Banner: "{NAME} GRÄBT". Explosion: "{NAME} TRINKT {N}". Kiste: "{NAME} HAT DIE KISTE!". Gier: "DER PREIS DER GIER". Blindgänger: "Pfff.".
- Temperatur-Labels (klein unter dem Icon, erste 2 Runden, danach nur Icon): "Heiß", "Warm", "Kalt".
- Fehlertext Lobby (< 3): "Zu zweit weißt du immer, wer die Mine gelegt hat. Holt noch jemanden."
- Onboarding-Tooltip Place: "Deine Minen tun DIR nichts. Merk dir, wo sie liegen." Dig: "Heiß = Kiste ist direkt daneben."
