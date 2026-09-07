# Geräte-Matrix

Was auf welchem Gerät geprüft wurde — und was dabei herauskam. Die Spalte **Wer** sagt,
ob eine Zeile automatisch fällt oder ein Mensch hinsehen muss; ohne diese Unterscheidung
liest sich jede Matrix grüner, als sie ist.

## Referenzgeräte (CLAUDE.md)

| Gerät | Browser | Rolle | Wer prüft | Stand |
|---|---|---|---|---|
| iPhone 11 / 12 | Safari | **Referenz** — 60 fps Ziel | Mensch | ⏳ offen |
| Pixel 4a / 5 | Chrome | **Referenz** — 60 fps Ziel, 30 fps Minimum | Mensch | ⏳ offen |
| iPhone 12 (Emulation) | WebKit, 390 × 844 | Flow, Touch-Ziele, A11y | Playwright | ✅ 25/25 |
| Pixel 5 (Emulation) | Chromium, 393 × 851 | Flow + Performance | Playwright | ✅ 25/25 |
| iPad | Safari | Sekundär — Portrait-Frame | Mensch | ⏳ offen |
| Desktop Chrome / Firefox / Safari | — | Sekundär — Portrait-Frame | Mensch | ⏳ offen |

## Was die Emulation abdeckt — und was nicht

**Abgedeckt** (läuft in CI, jede Zeile ist ein Test):

- Der komplette Ablauf: Lobby → Minen legen → Graben → Verteilen → Result, mehrere Runden.
- Touch-Ziele ≥ 56 px und 50 Taps ohne Fehl-Tap auf dem Canvas.
- Alle Modus-Kombinationen, die sich ins Gehege kommen können.
- Draw-Batches (≤ 3, gemessen 1), Partikel-Budget (≤ 200, gemessen 29), Long-Tasks
  (≤ 2 je Grabung, gemessen 0), Heap über zehn Grabungen (flach).
- Reduced-Motion, zugängliche Namen, Live-Regionen, Übersetzungslücken.

**Nicht abgedeckt** — und genau deshalb steht oben „⏳ offen":

- **Die echte Bildrate.** Headless-Chromium rendert je nach Maschine per SwiftShader in
  Software; der Perf-Test erkennt das und wertet die Zahl dann als Hinweis statt als
  Urteil. Verbindlich ist die Messung auf iPhone 11 / Pixel 4a (`?dev=1` zeigt p50 und
  Draw-Calls).
- **Der Ton.** Die Cues sind zur Laufzeit synthetisiert (ADR-13) und klingen am
  Handy-Lautsprecher anders als am Laptop. Besonders zu prüfen: Sind die drei
  Temperaturen ohne Blick aufs Icon auseinanderzuhalten?
- **Haptik.** `navigator.vibrate` gibt es auf iOS nicht — dort fällt sie ersatzlos aus.
  Auf Android muss sie sich richtig anfühlen: kurz bei der Explosion, nicht dauernd.
- **Wake-Lock.** Safari kann es erst ab 16.4, Firefox gar nicht. Das Spiel läuft ohne,
  aber der Bildschirm geht dann zwischen zwei Zügen aus — auf dem Tisch ein echtes Ärgernis.
- **PWA-Installation.** Manifest, Icons und Service Worker sind da und werden im E2E
  geprüft; ob das Icon auf dem Homescreen gut aussieht, sieht man nur auf dem Homescreen.
- **Der Look.** Ob die Wiese wie eine Wiese aussieht und der Nachtmodus dunkel genug ist,
  entscheidet kein Test.

## Prüfliste je Gerät

Für jedes Referenzgerät einmal durchgehen. Ein „nein" ist ein Finding, kein Makel.

1. **Installieren**: Zum Homescreen hinzufügen, App vom Homescreen starten. Startet sie
   im Vollbild, ohne Browser-Leiste? Sieht das Icon richtig aus?
2. **Offline**: Flugmodus an, App starten. Läuft sie?
3. **Eine Runde zu viert** spielen. Läuft alles flüssig? Ruckelt eine der 16 Sequenzen?
4. **Dev-Panel** (`?dev=1`): p50 ≤ 16,7 ms, Draw-Calls ≤ 3 — auf 6 × 6 mit 8 Spielern.
5. **Ton**: Sind Explosion, Blindgänger und die drei Temperaturen unterscheidbar?
6. **Bildschirm bleibt an**, während das Handy zwischen zwei Zügen auf dem Tisch liegt.
7. **Querformat**: Kommt der Hinweis „bitte hochkant"?
8. **Bewegung reduzieren** (iOS: Bedienungshilfen → Bewegung): Fehlt etwas, das man braucht?
9. **Zurück-Wischen** mitten in einer Runde: Kommt der Abbruch-Dialog?
10. **Tab wechseln** und zurückkommen: Läuft der Ton weiter, hängt nichts?
