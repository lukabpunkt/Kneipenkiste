# Changelog

Alle nennenswerten Änderungen. Format lose nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionen nach [SemVer](https://semver.org/lang/de/). Ein Meilenstein ist ein Minor, ein
Audit-Report dazu steht in [`docs/PROGRESS.md`](docs/PROGRESS.md), die Entscheidungen
dahinter in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## [Unveröffentlicht]

### Ausstehend für 1.0

- Playtest 01 durchführen und die Top-5-Findings beheben ([`docs/PLAYTEST-01.md`](docs/PLAYTEST-01.md)).
- Gerätematrix auf echter Hardware abhaken ([`docs/DEVICE-MATRIX.md`](docs/DEVICE-MATRIX.md)).
- Repo pushen, Pages aktivieren, dann `v1.0.0` taggen.

---

## [1.0.0-rc.1] — 2026-09-09 · Alles gebaut, Playtest offen

### Neu

- **Balancing-Pass, der das Spiel modelliert** statt Würfel: `npm run balance` zeigt vier
  Tabellen — Zufallswahl, Absprache mit Wortbruch, die Wortbruch-Kurve und eine Sitzung
  über acht Runden mit Schrumpfen und Reparatur. Ergebnis: keine Änderung an `rules.ts`,
  mit Begründung und Hebel für später (ADR-32).
- **Playtest-Protokoll** zum Ausfüllen ([`docs/PLAYTEST-01.md`](docs/PLAYTEST-01.md)) —
  inklusive der elf manuellen Checks, die sich über M2 bis M5 angesammelt haben.
- **Gerätematrix** ([`docs/DEVICE-MATRIX.md`](docs/DEVICE-MATRIX.md)): was die Emulation
  beweist, was nur Hardware beantworten kann, und die bekannten Engine-Abweichungen.
- **Eigener GIF-Encoder** in `scripts/lib/` (PNG-Dekoder plus GIF89a mit LZW, ohne
  Abhängigkeit): das animierte Bild im README und `docs/screens/m4-falls.gif` mit allen
  sechs Stürzen — der Ersatz für das Video, das A4 als SOLL verlangt.
- **PWA-Feinschliff:** Manifest mit `id`, `dir` und drei Store-Screenshots für die
  Installations-Ansicht (bewusst nicht im Precache).
- **Release-Papiere:** MIT-Lizenz, dieser Changelog, neu geschriebenes README.

### Behoben

- **Stumm war nicht stumm:** Bei ausgeschaltetem Ton lud das Spiel trotzdem das
  316-KB-Sprite und öffnete einen AudioContext. Auf Geräten mit belegtem Audio-Gerät
  schrieb der Browser darauf einen Fehler in die Konsole.

---

## [0.5.0] — 2026-09-09 · Politur, Modi, Barrierefreiheit

### Neu

- **Titel-Loop:** Ein Wanderer geht über die Brücke, der Balken bricht, er fällt und
  klettert wieder hoch — neun Sekunden in CSS, ohne eine Zeile JavaScript (ADR-27).
- **Fahnen-Streit sichtbar:** Zwei Fahnen auf einem Balken färben ihn rot, pulsieren
  ruhig und schreiben darunter, wer sich streitet.
- **Modus-Chips** in Absprache und Nebel: welche Sonderregeln diese Runde gelten, mit je
  einem Satz Erklärung.
- **Bühne kennt die Modi:** Schwergewichte tragen ihren Rucksack, Seil-Nutzer hangeln
  sich Griff für Griff unter der Brücke durch.
- **Result-Juice:** Zusammenstoß als Grafik (zwei Namen, dazwischen der Knall),
  Aufklapp-Welle über die Brücke, Teilen über die Web-Share-API.
- **Einmal-Hinweise** für den ersten Abend (Absprache, Result), in eigenem
  Storage-Schlüssel (ADR-31).
- **Notausgang beim Start:** Scheitert der Start, steht ein Satz und ein Knopf da, der
  den alten Spielstand wegwirft — statt eines schwarzen Screens.
- `npm run capture:ui` fotografiert die Menü-Screens für den Look-Check.

### Barrierefreiheit

- Tastatur-Fokus ist sichtbar (es gab keine einzige `:focus-visible`-Regel).
- `--danger-text` als eigene Schriftfarbe: `--danger` erreichte auf dem erhöhten Panel
  nur 4.02 : 1 (ADR-26). 13 Kontrastpaare stehen jetzt als Test.
- „Bewegung reduzieren" nimmt der Bühne das Rütteln und lässt die Slow-Mo stehen —
  sie ist Information, kein Effekt (ADR-30).
- Englisch vollständig: 146 Keys in beiden Sprachen, geprüft im Test.

### Performance

- howler lädt mit dem Ton statt beim Start: im CPU-Profil 254 ms gespart, Einstiegs-Chunk
  von 37,3 auf 29,4 KB gzip (ADR-28).
- Stylesheet steckt in der HTML-Datei: First Contentful Paint von 576 auf 308 ms
  (4× CPU-Drosselung, 150 ms RTT, ADR-29).
- Service Worker meldet sich erst nach `load` an.
- Lighthouse Mobile: **91 / 100 / 100** (Performance / Accessibility / Best Practices).

### Behoben

- Der Ton fehlte im PWA-Precache (`m4a` stand nicht im Glob) — offline war das Spiel stumm.
- Das eingebettete Stylesheet warf die CSS-Datei aus dem Bundle; Vite hängt aber an jeden
  dynamischen Import einen Preload darauf. WebKit lehnte den Import ab, die Bühne blieb
  auf iPhone schwarz.
- Das Hangeln am Seil war eine unendliche GSAP-Schleife — ein unendliches Kind macht die
  Eltern-Timeline unendlich lang, die Show wäre nie beim Result angekommen.

## [0.4.0] — 2026-09-08 · Die sechs Fall-Sequenzen

### Neu

- **Sechs Stürze:** Händchenhalten, Coyote-Pause, Wippe, Seilschwung, Domino,
  Wandkicker. Alle 4,15–4,65 s, alle mit Blickkontakt davor, alle klettern wieder hoch.
- **`fallKit`** als gemeinsamer Bausatz: Die Signatur des Spiels steht an einer Stelle im
  Code, jede Sequenz-Datei enthält nur ihren Gag (ADR-22).
- **Renderer-freie Sequenz-Tests:** echte Hikers, echte Timelines, kein WebGL (ADR-23).
- **Sequenz-Preview** zeigt die Sequenz, die auf dem Knopf steht (ADR-25);
  `npm run capture:falls` fotografiert je Sequenz fünf Momente.

### Behoben

- Der Router verschluckte Screens: „das jüngste Ziel gewinnt" übersprang Screens, auf
  denen die Runde gerade stand. Jetzt fragt er die FSM, ob ein Ziel noch aktuell ist
  (ADR-24). Dazu: Eine gescheiterte Navigation legt die Schlange nicht mehr still, und
  der Wipe wird auch im Fehlerfall abgeräumt.
- `fall_bounce_wall` dauerte 5,04 s — vier Hundertstel über dem Limit.

## [0.3.0] — 2026-09-08 · Die Spannungsmaschine

- Knarren auf **allen** besetzten Balken (sichere mit 70 % Amplitude), Slow-Mo-Blickkontakt
  mit „Oh."-Sprechblase, gemeinsamer Hit-Stop.
- Sequenz-System mit Registry, Kontext und Auswahl; neun Inszenierungen.
- Ton: 32 Klänge als ein 316-KB-Sprite, synthetisiert (ADR-20).
- Partikel-Pools, Sprechblasen, Schilder, Stempel — ohne Allokation im Loop.

## [0.2.0] — 2026-09-08 · Schlucht, Brücke und Hikers

- PixiJS-Bühne: Canyon in Parallaxe, Brücke mit Durchhang, acht Hikers mit Rig.
- Zwei Atlanten entlang der Zeichenreihenfolge — gemessen **ein** Draw-Call (ADR-13).
- Kamera: Intro-Fahrt, Zoom, Shake, Sturz-Verfolgung.

## [0.1.0] — 2026-09-08 · Der komplette Flow

- Alle zehn Screens, Wipe-Übergänge, Pass-the-Phone mit Tap-Sperre.
- Modi im UI: Fahne, Morsch, Schwergewicht, Nebel, Seil.
- Persistenz: Brücke, Statistik und Seil-Verbrauch überleben einen Reload.

## [0.0.1] — 2026-09-07 · Setup und Regelkern

- Reiner Regelkern: `resolveRound()` entscheidet genau einmal, `Math.random` ist in
  `src/core/` verboten, morscher und abfaulender Balken kommen aus `crypto`.
- FSM mit zehn Zuständen, Choreographer, `publicView` als einzige Projektion für Screens.
- Erschöpfende Auszahlungs-Tests für n = 3…5 und alle Verteilungen.
