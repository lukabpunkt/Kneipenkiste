# Gerätematrix

Zwei Spalten, die man nicht verwechseln darf: Was **automatisch** läuft, ist Emulation —
richtige Engine, richtige Viewport-Größe, aber keine echte GPU, kein echter Akku und kein
echtes Safari. Was **manuell** dasteht, kann nur ein Gerät in der Hand beantworten.

Referenzgeräte aus `CLAUDE.md`: iPhone 11/12 (Safari), Pixel 4a/5 (Chrome). Ziel 60 fps,
Minimum 30 (dann Low-Effects). Sekundär iPad und Desktop.

---

## Automatisch (Playwright, jeder Lauf)

| Profil | Engine | Viewport | DPR | Was dort läuft |
|---|---|---|---|---|
| iPhone 12 | WebKit | 390 × 664 | 3 | Kompletter Flow, Perf-Spec, A11y-Checks (25 Tests, einer übersprungen) |
| Pixel 5 | Chromium (SwiftShader) | 393 × 727 | 2,75 | Dieselben 25 Tests, plus JS-Budget und Draw-Batches |

**Warum SwiftShader:** Headless-Chromium hat keine GPU, und ohne WebGL startet die
Schlucht nicht. Die gemessenen Zahlen sind damit eine Aussage über unseren Code
(JS-Zeit, Draw-Calls, Long-Tasks), nicht über die Grafikkarte (ADR-16).

**Was die Emulation trotzdem hart nachweist:** dass WebKit und Chromium sich
unterschiedlich verhalten. In M5 hat genau das einen Fehler gefangen, den kein Blick in
den Code gezeigt hätte — Chromium schluckte einen 404 auf ein Stylesheet, WebKit lehnte
den ganzen dynamischen Import ab und die Bühne blieb schwarz (ADR-29).

---

## Manuell (Playtest 01, `docs/PLAYTEST-01.md`)

Pro Gerät einmal durchspielen: Titel → Lobby → Absprache → Wahl → Schritt → Verteilen →
Result, danach eine zweite Runde (damit die geschrumpfte Brücke dran ist).

| Check | Warum es nur auf Hardware geht | iPhone | Pixel | iPad | Desktop |
|---|---|---|---|---|---|
| Startet und spielt eine Runde durch | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 60 fps im Schritt (`?dev=1`, unten rechts) | Keine GPU in der Emulation | ⬜ | ⬜ | ⬜ | ⬜ |
| Dichtestes Bild flüssig: 6 Spieler, 3 auf einem Balken plus ein Paar | s. o. | ⬜ | ⬜ | ⬜ | ⬜ |
| Ton entsperrt beim ersten Tap | iOS gibt Audio nur nach echter Geste frei | ⬜ | ⬜ | ⬜ | – |
| Musik wechselt zwischen Lobby, Absprache und Schritt | — | ⬜ | ⬜ | ⬜ | ⬜ |
| Bruch kracht im richtigen Moment (± Gefühl) | Latenz echter Audio-Hardware | ⬜ | ⬜ | ⬜ | ⬜ |
| Stumm voll spielbar | — | ⬜ | ⬜ | ⬜ | ⬜ |
| Vibration bei Versiegeln und Bruch | iOS vibriert nicht über die Web-API | ⬜ | ⬜ | – | – |
| Bildschirm bleibt an (Absprache bis Verteilen) | Wake-Lock ist geräteabhängig | ⬜ | ⬜ | ⬜ | – |
| Notch und Home-Indicator schneiden nichts ab | Safe-Areas gibt es nur echt | ⬜ | ⬜ | ⬜ | – |
| Querformat zeigt das Dreh-Overlay | Orientierungssperre | ⬜ | ⬜ | ⬜ | – |
| Als PWA installierbar, startet ohne Browserleiste | — | ⬜ | ⬜ | ⬜ | ⬜ |
| Offline spielbar (Flugmodus, App neu starten) | Precache im echten Service Worker | ⬜ | ⬜ | ⬜ | ⬜ |
| Titel-Loop läuft, nach 10 min noch flüssig | Speicher über Zeit | ⬜ | ⬜ | ⬜ | ⬜ |
| „Bewegung reduzieren" nimmt das Rütteln | Systemeinstellung | ⬜ | ⬜ | ⬜ | ⬜ |
| Teilen öffnet das System-Blatt | Web-Share gibt es nur mobil | ⬜ | ⬜ | ⬜ | – |
| Tastatur/Schalter: Titel bedienbar | Safari braucht volle Tastaturnavigation | ⬜ | ⬜ | ⬜ | ⬜ |
| Portrait-Rahmen sitzt (kein Breitbild) | — | – | – | ⬜ | ⬜ |

**„–" heißt: gilt dort nicht** — kein Wake-Lock am Desktop, keine Vibration auf dem iPad,
kein Portrait-Rahmen auf dem Handy.

### Geräte, die getestet wurden

| Gerät | OS | Browser | Datum | Notiz |
|---|---|---|---|---|
| | | | | |
| | | | | |

---

## Bekannte Abweichungen

| Wo | Was | Warum es so bleibt |
|---|---|---|
| Safari (alle) | Tab wandert nicht auf Knöpfe | Systemeinstellung „Volle Tastaturnavigation", keine Eigenschaft der Seite. Der Fokusring ist trotzdem da. |
| Safari (alle) | Keine Vibration | `navigator.vibrate` gibt es dort nicht. Die Haptik scheitert still (Audit A3). |
| Safari (alle) | Kein `requestIdleCallback` | Der Ton lädt dann über `setTimeout` nach — dieselbe Reihenfolge, eine Zehntelsekunde später. |
| Chromium headless | Frame-Kadenz stur 33,3 ms | Kadenz des Compositors, nicht unsere Rechenzeit (ADR-16). |
| WebKit headless | Long-Task-API fehlt | Der A4-Zähler bleibt dort bei 0; gemessen wird auf Chromium. |
