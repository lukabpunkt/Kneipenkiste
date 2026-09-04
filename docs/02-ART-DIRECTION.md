# DER TRESOR — Art Direction & Design-System

> Version 1.0 · Baut auf der Drinkshot-Art-Direction auf. Alles, was hier nicht anders definiert ist, gilt **wie bei Drinkshot** (Stil-Statement, Typografie, Button-System, Motion-Tokens, Asset-Pipeline, UX-Copy-Ton). Dieses Dokument beschreibt nur die Unterschiede und die Tresor-spezifischen Elemente.

---

## 1. Stil-Statement

**"Ocean's Eleven als Samstagmorgen-Cartoon — ein Heist, bei dem alle Gauner Freunde sind, bis der Tresor aufgeht."**

- Formensprache, Outlines, Chibi-Proportionen, Cel-Shading: identisch zu Drinkshot.
- **Stimmung:** Nächtlicher Tresorraum, Spotlight, Samt, Stahl, Gold. Wärmer und "reicher" als Drinkshot (dort Wiese/Tageslicht). Glanzlichter auf Metall sind erlaubt (2-Stufen-Highlight, keine Verläufe auf Charakteren).
- **Ton:** Gauner-Komödie. Masken, Ringelshirts, Geldsäcke mit "$"-Symbol… nein: mit **Schluck-Symbol** (ein stilisiertes Glas). Keine echten Waffen, keine Gewalt über Cartoon-Amboss-Niveau.

---

## 2. Farb-Tokens (Ergänzungen)

Spielerfarben: **identisch zu Drinkshot** (`PLAYER_COLORS`).

| Token             | Hex       | Verwendung                                          |
|-------------------|-----------|-----------------------------------------------------|
| `bg.deep`         | `#0B0A14` | App-Hintergrund (noch etwas tiefer als Drinkshot)    |
| `bg.panel`        | `#1A1830` |                                                     |
| `bg.panelRaised`  | `#262345` |                                                     |
| `paper`           | `#FFF8E7` |                                                     |
| `ink`             | `#1A1024` |                                                     |
| `gold`            | `#FFC93C` | Primary CTA, Münzen, Tresor-Glanz, Jackpot           |
| `goldShade`       | `#C9961A` | CTA-Kante, Münz-Schatten                            |
| `steel`           | `#8C93A8` | Tresorkörper                                        |
| `steelDark`       | `#4A506A` | Tresor-Schatten, Zahlenrad                          |
| `velvet`          | `#5B1E3A` | Tischdecke im Tresorraum                            |
| `velvetLight`     | `#7A2A50` | Samt-Highlight                                      |
| `share`           | `#2ED573` | TEILEN-Karte, "Ehre"-Banner                         |
| `shareShade`      | `#1E9E52` |                                                     |
| `steal`           | `#FF2D55` | STEHLEN-Karte, Alarm, Meineid                        |
| `stealShade`      | `#B8163A` |                                                     |
| `laser`           | `#18DCFF` | Laser-Deko im Ruhezustand (wechselt zu `steal` bei Alarm) |
| `spot`            | `#FFF1C4` | Spotlight-Kegel, Alpha 0.18                          |

Kontrastregeln wie Drinkshot (≥ 4.5:1, `ink` auf Gold/Grün/Cyan).

---

## 3. Typografie

Identisch zu Drinkshot (*Luckiest Guy* Display, *Nunito* Body, self-hosted). Zusätzlich für den Tresor-Zähler ein **Flip-Counter-Look** (Split-Flap-Anzeige wie am Bahnhof): Ziffern in Luckiest Guy auf dunklen Klappen, jede Änderung als Klapp-Animation (120 ms, `back.out`), Sound `vault_dial`.

---

## 4. UI-Komponenten (Ergänzungen zum Drinkshot-System)

### 4.1 Entscheidungskarte (Choice-Screen)
- Zwei Karten 44 % Breite, Ratio 3:4, Radius 24 px, 4 px `ink`-Outline, 8 px Bodenkante.
- TEILEN: Fläche `share`, Illustration zwei Hände (Handschlag) in `paper`, Label "TEILEN".
- STEHLEN: Fläche `steal`, Illustration Hand greift Geldsack, Label "STEHLEN".
- Idle: beide wippen gegenläufig (± 1.5°, 2.4 s). Tap: Karte wächst 1.08×, andere schrumpft und fadet, dann Flip auf die Rückseite (Spielerfarbe + Symbol + Wachssiegel-Stempel "VERSIEGELT", Stempel-Sound).
- Maulwurf-Variante: TEILEN-Karte ist mit Ketten verriegelt (ausgegraut, rüttelt bei Tap, "Nicht für dich.").

### 4.2 Tresor-Widget (Negotiation + Result)
- Runde Tresortür 60 % Breite, Zahlenrad mit Zahlenkranz, Griffrad, Nieten. Im Inneren (bei geöffneter Klappe) Münzstapel, dessen Höhe proportional zu V ist.
- Zähler darunter als Flip-Counter: "**8** SCHLÜCKE".
- Wachstums-Animation: Münzen regnen von oben rein, Zähler klappt hoch, Tür wackelt kurz ("zu voll").
- Reset-Animation: Tür geht auf, Münzen werden rausgesaugt (Staubsauger-Sound), Zähler klappt auf V_0.

### 4.3 Countdown-Ring
- Kreisförmiger Fortschrittsring um den Tresor (Stroke 10 px, `gold` → `steal` in den letzten 10 s), Zahl in der Mitte in `hero`. Letzte 5 s: Ring pulsiert, Ziffern-Punch, Tick-Sound pro Sekunde.

### 4.4 Eid-Siegel
- Badge bekommt ein rotes Wachssiegel unten rechts (`steal`-Farbe, Symbol des Spielers geprägt). Bei Meineid: Siegel zerspringt (3 Scherben-Sprites).

### 4.5 Verteil-UI
- Badges der Teiler in einer Reihe, darüber der Dieb mit Sack. Tap auf Badge: eine Münze fliegt aus dem Sack in den Badge (Bogen, 300 ms), Zähler am Badge +1, Long-Press: Münze fliegt zurück. Leiste "Noch 3" oben. Button "Auszahlen" (gold) erst aktiv bei 0 Rest.

### 4.6 Ergebnis-Banner
- Vollbreite Schärpe (Stil "Zeitungsschlagzeile"), Luckiest Guy `2xl`, Farbe je Fall (`share` / `steal` / `gold` bei Jackpot), fährt mit Overshoot von links ein, dahinter ein Bühnenvorhang-Wipe.

---

## 5. Die Charaktere: Crooks (Shotlings mit Maske)

- Rig **identisch** zum Drinkshot-Shotling (Kopf, Torso, Arme, Beine, Füße, Schatten, Gesichter, Hüte, Symbole). Wiederverwendung des Atlas ist ausdrücklich erwünscht (in M2 wird der Shotling-Atlas aus dem Drinkshot-Repo kopiert bzw. neu generiert).
- Zusätzliche Slots/Assets:
  - `mask.png` — Domino-Maske, getintet in Spielerfarbe, sitzt auf dem Gesichts-Slot (über dem Gesicht, mit Augenlöchern, durch die die Augen-Sprites sichtbar bleiben).
  - `shirt_stripes.png` — Ringelshirt-Overlay für den Torso (optional, 50 % tragen es).
  - `beanie.png` — zusätzlicher Hut.
  - `bag.png` — Geldsack mit Glas-Symbol, Hand-Slot.
  - `sign_deal.png` — Schild "WIR HATTEN EINEN DEAL".
  - Gesichter zusätzlich: `smug` (Grinsen mit einer Augenbraue), `jaw_drop` (Kinnlade als separater Sprite, der zu Boden fällt), `guilty` (Schweißtropfen, Blick zur Seite), `innocent` (große Augen, Pfeifen-Sprechblase).
- **Herr Kassel (NPC):** Bankier-Shotling, grau-blaues Sakko, Monokel, kleiner Schnurrbart, Kassenbuch in der Hand. Nicht getintet, immer gleich. Sprechblasen in Nunito 800.

### 5.1 Karten-Sprites
- Vorderseite TEILEN / STEHLEN (wie 4.1, als Sprite 256×340), Rückseite neutral (Muster) mit getintetem Rahmen + Symbol, Siegel-Overlay, Maulwurf-Helm-Overlay.
- Flip wird prozedural über `scale.x` (1 → 0 → 1 mit Textur-Tausch bei 0) gemacht, mit leichtem `skew` für Perspektive und einem "Stocken"-Keyframe (scale.x hält bei 0.4 für 200 ms).

---

## 6. Die Bühne (Tresorraum)

- Aufbau von hinten nach vorn: Wand (dunkelgrau, Nieten), Laser-Linien (dünne `laser`-Linien, die alle 3 s die Position wechseln, Alpha 0.35), Tresor (mittig hinten), Samttisch (Ellipse vorn), Karten auf dem Tisch im Halbkreis, Crooks hinter ihren Karten, Herr Kassel rechts neben dem Tresor, Spotlight-Kegel als Sprite mit Alpha über allem, Vignette.
- Kamera: leichter Zoom auf die aktive Karte (1.15×), Schwenk (`power3.inOut`, 400 ms), zurück bei Auszahlung.
- Bei Alarm: Laser werden `steal`, Raum flackert rot (Overlay Alpha 0.25, 3 Pulse), Sirene.
- Layout skaliert über die logische 1000 × 1000-Welt wie bei Drinkshot; bei 8 Spielern werden Karten kleiner (Halbkreis-Radius fix, Karten-Scale 0.8).

---

## 7. Animationsprinzipien

Die 7 Regeln aus Drinkshot (Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Lesbarkeit, Sound-Sync) gelten unverändert für **jede** Ergebnis-Inszenierung und für den Karten-Flip.

Zusätzlich für die Reveal-Show:
- **Tempo-Kurve:** Verweildauer pro Karte sinkt linear von 100 % auf 70 % bis zur vorletzten Karte; die letzte Karte bekommt 160 %.
- **Fake-Stocken:** Jede Karte stockt einmal bei 60 % Flip. Die letzte Karte stockt zweimal (60 % und 85 %). Nie mehr — sonst wird es nervig.
- **Blick-Regie:** Alle Crooks schauen auf die Karte, die gerade aufgedeckt wird; der Besitzer schaut zur Kamera (Gesicht `innocent` bei TEILEN, `smug` bei STEHLEN erst NACH dem Flip).

---

## 8. Partikel-Budget

| Effekt          | Max | Technik              |
|-----------------|-----|----------------------|
| Münzregen       | 60  | ParticleContainer    |
| Goldkonfetti    | 100 | ParticleContainer    |
| Rauch Tresor    | 8   | Sprite-Pool          |
| Sternchen       | 8   | Sprite-Pool          |
| Siegel-Scherben | 3   | Sprite-Pool          |
| Reifenqualm     | 10  | Sprite-Pool          |

Gesamt ≤ 200 aktive Sprites, Pools wie Drinkshot.

---

## 9. UX-Copy (DE, Ergänzungen)

- CTA Lobby: "Tresor öffnen". Negotiation: "Verhandelt. 30 Sekunden." / "Alle bereit". Choice: "Deine Entscheidung. Niemand sieht sie." Sealed: "Alle Karten versiegelt. Handy in die Mitte."
- Banner: "Ehre unter Dieben", "Der Alleingang", "Zu viele Köche", "Schlägerei", "JACKPOT", "MEINEID!", "Der Maulwurf".
- Herr Kassel (Beispiele, in `i18n` als Array): "Die Karten, bitte.", "Ich habe da so ein Gefühl…", "Vertrauen ist gut. Ich bin Banker.", "Der Tresor hat noch nie so gut ausgesehen.", "Gebühr! Danke.", "Meineid. Wie enttäuschend."
- Fehlertext Lobby (< 3 Spieler): "Zu zweit ist das kein Dilemma, das ist eine Beziehung. Holt noch jemanden."
