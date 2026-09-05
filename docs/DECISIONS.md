# Entscheidungen (ADR-Log)

Format: **ADR-{n} · {Datum} · {Titel}** — Kontext · Entscheidung · Konsequenz (max. 5 Zeilen).

## ADR-1 · 2026-09-04 · Gleicher Stack wie die Schwesterspiele, Module per Kopie
Kontext: Vier Spiele, eine Familie. Entscheidung: Vite/TS/PixiJS/GSAP; Module kopieren, Shared-Package erst nach v1.0 aller Spiele. Konsequenz: Keine Monorepo-Komplexität jetzt.

## ADR-2 · 2026-09-04 · Testbares Hinweis-Modell (h Hinweise, p_true 0.6, nie Menge)
Kontext: "Hinweise stimmen zu 60 %" muss implementierbar und statistisch prüfbar sein. Entscheidung: h = ⌊(n−1)/2⌋ verschiedene Hinweise, jeder mit 0.6 wahr; Menge bleibt verborgen. Konsequenz: Balancing über `rules.ts`; Statistik-Test in A0.

## ADR-3 · 2026-09-04 · Beamter darf durchwinken, bekommt Boni
Kontext: Muss der Beamte öffnen, zahlt er bei ehrlichen Runden zwangsläufig. Entscheidung: Durchwinken erlaubt; +2 für "alle erwischt", +1 für "richtig durchgewunken". Konsequenz: Beamter hat positive Ziele; ehrliche Runden sind kein Beamten-Nachteil.

## ADR-4 · 2026-09-04 · Schranken-Reveal sauber → Schmuggler zuletzt
Kontext: Nach der Kontrolle fehlt sonst ein Spannungsbogen. Entscheidung: Reihenfolge wie Tresor-Reveal; alle Mengen werden am Ende öffentlich. Konsequenz: Zweiter Reveal-Moment; Statistik braucht keine geheimen Daten.

## ADR-5 · 2026-09-04 · Ein Item-Set pro Runde
Kontext: Gemischte Silhouetten sind auf dem Röntgenmonitor nicht lesbar. Entscheidung: Alle Reisenden derselben Runde schmuggeln dieselbe Warengattung; Set wechselt pro Runde. Konsequenz: Eindeutige Silhouetten, 8 Sets als Content.

## ADR-6 · 2026-09-04 · HallView als interaktive PIXI-Komponente mit Modi
Kontext: Halle wird in Hall, Inspect und Gate gebraucht; Beamter tippt Koffer. Entscheidung: Ein Canvas, Modus-Umschaltung, Umhängen zwischen Screen-Hosts; HUD als DOM darüber. Konsequenz: Keine Neuinitialisierung, ein Hit-Testing-Pfad.

## ADR-7 · 2026-09-04 · Ein nicht geöffneter Diplomat passiert die Schranke wie jeder andere
Kontext: Architektur §5 schreibt für `gateOrder` "nicht geöffnete, nicht-diplomat Koffer" — wörtlich gelesen fiele ein ungeöffneter Diplomat aus dem Reveal und bekäme keine Tokens. Entscheidung: Ausgeschlossen sind nur **geöffnete** Koffer; ein ungeöffneter Diplomat läuft als sauber oder als Schmuggler durch, seine Immunität bleibt ungenutzt und wird erst im Result sichtbar. Konsequenz: Die Immunität wirkt genau dort, wo sie gedacht ist (beim Öffnen), verrät sich sonst nie, und die Token-Bilanz bleibt vollständig. Test: `round.test.ts` → "schickt einen nicht geöffneten Diplomaten wie jeden anderen durch".

## ADR-8 · 2026-09-04 · Eine `RandomSource`-Schnittstelle für crypto und Seed
Kontext: CLAUDE.md verlangt `crypto.getRandomValues` für Hinweise, Diplomat und Item-Set; die Tests brauchen aber reproduzierbare Runden. Entscheidung: `core/rng.ts` exportiert `RandomSource` (die `SeededRng`-API ohne `seed`) und `SECURE_RNG` als crypto-Implementierung; alle Kernfunktionen nehmen sie als Default-Parameter. Konsequenz: Produktiv würfelt immer crypto, Tests injizieren `createSeededRng` — geprüft in `rng.test.ts`, dass die Defaults `SECURE_RNG` sind.

## ADR-9 · 2026-09-04 · Ein Tap auf einen gesperrten Koffer wird still verworfen
Kontext: `inspect()` wirft bei geöffneten, bezahlten oder überzähligen Koffern — die FSM reichte das als Exception durch und hätte eine Runde beenden können. Entscheidung: `send({type:'inspectSuitcase'})` prüft vorher `canInspect()` und gibt sonst `false` zurück; die reine Funktion wirft weiterhin. Konsequenz: Ein verirrter Tap kostet nichts, echte Regelverstöße im Kern fallen weiterhin sofort auf.

## ADR-10 · 2026-09-04 · Screens kommen nur über eine Schleuse an die Runde
Kontext: „Screens bekommen ausschließlich `publicView`" war eine Regel, die jeder Screen einzeln einhalten musste — und die erste unachtsame Zeile hätte sie gebrochen. Entscheidung: `ScreenContext` bietet `view(phase)`, `ownPack(id)` und `reveal()`; die Projektion passiert an genau einer Stelle in `app.ts`, kein Screen fasst `fsm.context.round` an. Konsequenz: `publicView.test.ts` prüft das strukturell (kein `context.round`, kein Selbst-Import von `core/publicView`), nicht mehr nur per Wortlaut-grep. Der Result-Screen darf `truthful` zeigen — das ist der Reveal, und der Test erlaubt ihn nur über `ctx.reveal()`.

## ADR-11 · 2026-09-04 · Das Dev-Panel liegt in `src/dev/`, nicht in `src/ui/`
Kontext: Das Debug-Panel muss Mengen, Diplomat und `truthful` aufdecken können — genau das, was der Lint-Test in `src/ui/` verbietet. Entscheidung: Eigener Ordner `src/dev/`, außerhalb der geprüften Bereiche; das Panel hängt neben dem Router-Host, weil `mount()` den Host bei jedem Screenwechsel leert. Konsequenz: Der Audit-Test bleibt streng, ohne Ausnahmeliste.

## ADR-12 · 2026-09-04 · Seed-Steuerung nur im Dev-Build
Kontext: E2E-Tests brauchen reproduzierbare Runden, produktiv müssen Hinweise, Diplomat und Item-Set über `crypto` fallen (CLAUDE.md). Entscheidung: `?dev=1&seed=123` injiziert einen `createSeededRng` in die FSM; ohne `dev=1` wird der Parameter ignoriert. Konsequenz: Die drei M1.7-Szenarien sind deterministisch, eine URL kann das Spiel aber nicht manipulieren.

## ADR-13 · 2026-09-05 · Koffer in zwei Reihen, Reisende in einer
Kontext: Art Direction §6 sah eine Kofferreihe (max 7, Scale 0.85) und bei 7–8 Spielern zwei Reisenden-Reihen vor. Auf einem 390 px breiten Handy sind 7 Tippflächen à 56 px aber 392 px breit — sie passen geometrisch nicht nebeneinander, und mit Abständen unter 56 px würden sie sich überlappen: Ein Tap öffnete dann den falschen Koffer. Entscheidung: Ab **fünf** Koffern zwei Reihen — die hintere auf dem Band, die vordere davor auf dem Boden (zwei Trefferflächen übereinander brauchen 286 Welteinheiten, mehr als ein Förderband hoch ist). Dafür stehen die **Reisenden in einer** Reihe, leicht überlappend wie eine Schlange; sie sind kein Tippziel. Konsequenz: Jede Trefferfläche misst auf jedem Referenzgerät ≥ 56 px und überlappt keine andere — nachgerechnet in `xray.test.ts`, gemessen in `perf.spec.ts`. Art Direction §6 ist entsprechend zu lesen.

## ADR-14 · 2026-09-05 · Sechs Atlanten statt einem, Halle als eigener Chunk
Kontext: Ein einziger Atlas wäre bei @2x über 2048 px gegangen, und PIXI + GSAP wogen 175 KB gzip im Einstiegs-Chunk — der Titel hätte auf sie gewartet. Entscheidung: Sechs Atlanten (shotlings, hall, suitcases, items, xray, dog), und `src/game/` wird ausschließlich per `await import('@/game')` geladen; die Lobby stößt den Preload an. Konsequenz: Einstieg 26 KB gzip, Hall-Chunk 149 KB lädt im Hintergrund. Die Draw-Calls bleiben trotzdem bei 3, weil nie zwei Kategorien in derselben Ebene liegen.

## ADR-15 · 2026-09-05 · Die Kamera zentriert, statt den Punkt festzuhalten
Kontext: `Camera.focus()` hielt den Zielpunkt an seiner Bildschirmposition und zoomte darum herum. Beim Schwenk auf den Röntgenmonitor hing der halb außerhalb des Bildes. Entscheidung: `focus()` nimmt den Weltpunkt in die Bildmitte; die Kamera bleibt auf dem Monitor, bis das Banner gestanden hat. Konsequenz: Der Kern-Moment des Spiels läuft in der Bildmitte ab, nicht am Rand.

## ADR-16 · 2026-09-05 · Sounds werden zur Laufzeit synthetisiert
Kontext: GDD §6 listet 32 Cues. Die Toolchain hat keinen OGG/MP3-Encoder (kein ffmpeg, kein sox), und ein Audio-Sprite hätte Bytes gekostet, die nach Architektur §1 knapp sind. Entscheidung: Wie bei Drinkshot erzeugt `AudioManager` jeden Cue per Web Audio aus einem Rezept (Oszillator + Rauschen + Tiefpass + Hüllkurve); `play(cue, when)` plant auf der **AudioContext-Uhr**, nicht per `setTimeout`. Konsequenz: Null Bytes im Bundle, offline ab dem ersten Start — und die ± 50 ms aus Audit A3 sind überhaupt erst haltbar, weil ein `setTimeout` im Renderloop stärker schwankt. Die Fassade (`play`, `startBelt`, `duckMusic`) ist die eines howler-Sprites; in M6 lässt sich der Erzeuger tauschen, ohne einen Aufrufer anzufassen.

## ADR-17 · 2026-09-05 · Das Bestechungsangebot steht auf der Bühne, nicht im HUD
Kontext: Das Angebot ist laut GDD §3.7 **öffentlich** — wer besticht, wirkt schuldig, oder tut nur so. Als Zeile im HUD des Beamten wäre es eine Zahl unter vielen. Entscheidung: Das Angebot erscheint als Sprechblase über dem Koffer des Reisenden; im HUD stehen nur die beiden Knöpfe des Beamten. Bei Annahme klickt ein Schloss zu und die Tokens fliegen sichtbar zu ihm. Konsequenz: Der Tisch sieht, wer bietet und was — und der Unterschied zwischen „gehört dem Reisenden" und „gehört dem Beamten" ist auf einem Handy in der Mitte genau das, was man sehen muss.

## ADR-18 · 2026-09-05 · Wer die Schranke passiert hat, verlässt die Bühne
Kontext: Alle Reisenden liefen an dieselbe Stelle vor der Schranke und blieben dort. Bei sieben Koffern stand am Ende eine Menschentraube statt eines Durchgangs. Entscheidung: Nach jedem Reveal laufen Reisender und Koffer nach rechts aus dem Bild und blenden aus. Konsequenz: Die Schranke liest sich als Durchgang, und der jeweils nächste steht frei — wichtig, weil der letzte Koffer der Höhepunkt der Runde ist (ADR-4).

## ADR-19 · 2026-09-05 · Die Sequenz wird vor dem Scan gewählt
Kontext: Bei einem sauberen Koffer zeigt das Röntgenbild ein peinliches Item (Teddy, Tasse, Ente mit Schleife), und die Sequenz danach packt genau dieses aus. Wählte man die Sequenz erst nach dem Scan, zeigte der Monitor einen Teddy und der Reisende drückte sich eine Tasse an die Brust. Entscheidung: `InspectDirector` zieht die Sequenz aus der Registry, **bevor** er den Scan baut, und leitet die Silhouette aus ihrer ID ab. Konsequenz: Das Röntgenbild sagt immer die Wahrheit — und dieses Bild ist das einzige im Spiel, das nie lügen darf.

## ADR-20 · 2026-09-05 · Die Sperre gibt nach, aber nie für die zuletzt gespielte Sequenz
Kontext: Bei drei Kandidaten und einem Sperrfenster von drei ist ab dem vierten Zug alles gesperrt. Die Registry fiel dann auf **alle** zurück — und zog im Test bei Zug 9 zweimal hintereinander `caught_alarm_burst`. Entscheidung: Ist alles gesperrt, bleibt wenigstens die zuletzt gespielte ausgeschlossen; nur bei einer einzigen registrierten Sequenz gibt auch das nach. Konsequenz: Eine Wiederholung nach zwei Runden fällt kaum auf, zweimal dasselbe direkt hintereinander nimmt dem Gag die Pointe — und genau das ist jetzt ausgeschlossen (geprüft über 1 000 Ziehungen je Kategorie).

## ADR-21 · 2026-09-05 · Text auf Spielerfarben ist immer `ink`
Kontext: `textColorOn()` gab nur für Gelb, Cyan und Grün dunklen Text zurück, für die übrigen fünf hellen. Gemessen (`npm run check:contrast`) fiel `paper` auf Rot, Blau, Lila, Orange und Pink zwischen 2,4:1 und 3,5:1 durch — verlangt sind 4,5:1. Entscheidung: Die Spielerfarben sind unveränderlich (Art Direction §2.1, identisch zu den Schwesterspielen), also weicht der Text: dunkel auf allen acht, damit zwischen 4,7:1 und 12,8:1. Konsequenz: Ein Kontrast-Skript prüft 22 echte Paarungen bei jedem CI-Lauf; die Regel steht zusätzlich als Unit-Test.

## ADR-22 · 2026-09-05 · Der Title-Loop ist SVG, nicht PIXI
Kontext: GDD §5 beschreibt einen Koffer, der im Loop durchs Röntgen rollt. Mit PIXI müsste der Titel auf den Hall-Chunk warten (149 KB) — für das Erste, was jemand sieht. Entscheidung: Inline-SVG plus CSS-Animation, ein einziges Intervall für den Silhouetten-Wechsel. Konsequenz: Der Titel erscheint sofort, kostet nichts, hört bei `prefers-reduced-motion` über die Media-Query von selbst auf — und es gibt nichts, was in zehn Minuten lecken könnte (im E2E über 45 s und ~19 Wechsel geprüft).

## ADR-23 · 2026-09-05 · Die Koffer haben ein Gegenstück im DOM
Kontext: Die Koffer liegen auf einem Canvas. Für Tastatur und Screenreader existieren sie dort nicht — der Kern des Spiels wäre für jemanden, der nicht tippen kann, unbedienbar. Entscheidung: Der Kontroll-Screen rendert eine visuell versteckte, fokussierbare Liste mit denselben Zielen, denselben Namen und demselben Zustand; sie wird sichtbar, sobald der Fokus darauf landet (`:focus`, nicht `:focus-visible` — hierher kommt nur, wer eine Tastatur benutzt). Konsequenz: Dieselbe Runde, nicht ein Ersatzspiel. Geprüft im E2E: vier Knöpfe, sichtbarer Fokus, Enter öffnet den Koffer.
