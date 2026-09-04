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
