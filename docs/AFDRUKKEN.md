# Afdrukken — Doelindelingslijst printen

De **Afdrukken**-tab in een wedstrijd-view produceert één afdrukbare
doelindelingslijst (Excel-achtige tabel) die de organisatie kan printen of
als PDF opslaan via "Microsoft Print to PDF". De tab werkt volledig offline,
zonder externe PDF-bibliotheek — Chromium's eigen `window.print()` doet het
werk.

## Lay-out van de tab

Twee kolommen, links opties en rechts een live preview.

```
┌──────────────┬─────────────────────────────────────────┐
│ Afdrukopties │ Voorbeeld — A4 portret                  │
│              │ ┌─────────────────────────────────────┐ │
│ Oriëntatie   │ │ Wedstrijdnaam                       │ │
│ Groepering   │ │ 25 mei 2026 · Locatie · 30 doelen   │ │
│ Doelen       │ ├─────────────────────────────────────┤ │
│ Gildes       │ │ Doel | Naam | Gilde | … (tabel)     │ │
│ Afstand      │ │ ...                                 │ │
│ Extra        │ │ Totalen                             │ │
│              │ │ Aandachtspunten (optioneel)         │ │
│ [Afdrukken]  │ │                                     │ │
│              │ └─────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────┘
```

De preview gebruikt **dezelfde** React-component-tree als wat geprint
wordt (`PrintDocument`), gewrapped in een `.print-root` div. Het scherm-
weergave toont een wit "pagina"-blok met de juiste A4-verhouding voor de
gekozen oriëntatie. Bij `@media print` kicken extra regels in die alles
buiten `.print-root` verbergen.

## Opties

| Optie | Waarde | Default |
|---|---|---|
| Oriëntatie | Portret / Landschap | Portret |
| Groepering | Per doel / Per gilde | Per doel |
| Doelen | "Alle doelen" of custom interval (bv. `1-10, 15`) | Alle |
| Gildes | "Alle gildes" of multi-select uit huidige indeling | Alle |
| Afstand | 25m / 18m / 12m (checkboxen) | Alle aan |
| Totalen tonen | checkbox | Aan |
| Conflict-waarschuwingen tonen | checkbox | **Uit** |

Filters werken **cumulatief (AND)**: een schutter verschijnt alleen als hij
aan alle actieve filters voldoet.

### Papierformaat
Het document is altijd voorbereid op A4 (`@page { size: A4 <orientatie> }`).
De gebruiker kan in de native print-dialoog (bv. Microsoft Print to PDF)
altijd een ander formaat kiezen — geen aparte A3-keuze in de UI.

### Doel-interval parsen
`parseDoelInterval` in [`afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts)
accepteert komma-gescheiden getallen en intervallen (`1-10`). Foutgevallen:

- niet-numeriek (`abc`)
- omgekeerd interval (`5-3`)
- waarde < 1 of > `wedstrijd.aantal_doelen`
- meervoudig dash (`1-2-3`)

Bij parsefout toont de UI de foutmelding onder het tekstveld en houdt de
**laatst geldige selectie** aan zodat de preview niet leegvalt terwijl de
gebruiker typt.

## Document-structuur

Eén document, in deze volgorde:

1. **Header** (1× bovenaan, vervangt zich niet per pagina)
   - Wedstrijdnaam, datum (`25 mei 2026`-formaat), locatie, aantal doelen.
2. **Tabel** met vaste kolommen:
   `Doel · Naam · Gilde · Boog · Categorie · Afstand · Dubbel`.
3. **Totalen** (indien aangevinkt): totaal schutters, per boog, per gilde,
   aantal dubbelschutters — allen op basis van de **gefilterde** set.
4. **Aandachtspunten** (indien aangevinkt en aanwezig): gegroepeerd per
   doelnummer; hergebruikt `voegConflictenToe` uit
   [`algoritme/conflicten.ts`](../src/renderer/src/algoritme/conflicten.ts).

### Doellabel en posities

Posities binnen een doel krijgen letters A–F (1→A, 2→B, … 6→F). Het label
`{doelnummer}{letter}` (bv. `1A`, `12F`) wordt links in de tabel getoond.
Helpers `positieLetter` / `doelLabel` zitten in `afdruk-helpers.ts`.

### Groepering "Per doel"

Elk doel toont **exact 6 rijen** (A–F), ook lege doelen en posities zonder
schutter. Schutters worden gesorteerd op `slot.positie` (de volgorde
zoals de organisatie ze in de Indeling-tab heeft staan).

### Groepering "Per gilde"

Elk gilde krijgt een subkop (`Gilde-naam (n)`) en daaronder enkel de
werkelijke schutters van dat gilde. Geen 6-rijen-padding. Schutters zonder
gilde komen onder `(Geen gilde)`, helemaal onderaan. Sortering: alfabetisch
op naam.

### Categorie-afkortingen

In de tabel worden categorieën **afgekort** zodat de kolom smal blijft:

| Volledig label | Afkorting |
|---|---|
| Senior | SE |
| Veteraan Heer | VHE |
| Veteraan Dame | VDA |
| Dame (Compound Senior V, of Senior V) | DA |
| Heer (Compound Senior M) | HE |
| Junior | JR |
| Aspirant | ASP |
| Jeugd | JEUGD |

Mapping in `categorieAfkorting` ([`afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts)).
De volledige labels (via `categorieLabel` uit
[`lib/labels.ts`](../src/renderer/src/lib/labels.ts)) blijven gelden elders
in de app; alleen in print mappen we naar afkortingen.

## Datastromen

`AfdrukkenTab` laadt bij mount:

- `window.api.indeling.getByWedstrijd(wedstrijd.id)` — ingedeelde rijen.

Inschrijvingen die **niet** zijn ingedeeld worden bewust **niet** afgedrukt
(per spec — komt mogelijk in een latere iteratie).

De data wordt in `DoelMetConflicten[]` opgebouwd (zelfde structuur als de
Indeling-tab), met `voegConflictenToe` zodat de aandachtspunten in sync zijn.

## Architectuur

| Bestand | Rol |
|---|---|
| [`pages/AfdrukkenTab.tsx`](../src/renderer/src/pages/AfdrukkenTab.tsx) | UI + state voor opties; laadt data; bouwt `PrintOpties`; schrijft dynamische `<style id="ontarget-dynamic-page">` voor `@page`. |
| [`components/PrintDocument.tsx`](../src/renderer/src/components/PrintDocument.tsx) | Pure presentational component: header, tabel (Per doel of Per gilde), totalen, aandachtspunten. |
| [`components/afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts) | Pure helpers: interval-parsing, positie-letters, filters, totalen, categorie-afkortingen. |
| [`index.css`](../src/renderer/src/index.css) (`.print-*` klassen + `@media print` blok) | Print-styling: Excel-achtige tabel met dunne zwarte randen, dichte cellen, vaste lettergrootte. |

## Print-pijplijn

1. Gebruiker klikt **Afdrukken** in de tab.
2. `window.print()` opent de native print-dialoog van Chromium.
3. `@media print`-regels in `index.css` verbergen alles buiten `.print-root`
   en positioneren het document op `position: absolute; top: 0; left: 0`.
4. `@page { size: A4 <orientatie>; margin: 12mm }` stuurt de standaardpagina
   (gebruiker mag dit in de dialoog overschrijven, bv. naar A3 of liggend).
5. `display: table-header-group` op de tabel-kopregel laat Chromium die
   herhalen op elke pagina; `page-break-inside: avoid` op rij-niveau
   voorkomt afgesneden rijen.

### Beperkingen

- **Inkt**: geen kleur of achtergronden, zwarte tekst op wit.
- **Lettergrootte vast** (≈ 10pt). Wil de organisatie meer op één pagina,
  dan moet de oriëntatie of het papierformaat groter — niet schalen.

## Edge cases

| Geval | Gedrag |
|---|---|
| Wedstrijd zonder enkele inschrijving | Tabel toont 6 lege rijen per doel (bij Per doel) of geen gildekoppen (bij Per gilde). |
| Doel-interval syntaxfout | Foutmelding onder tekstveld; preview houdt laatst geldige selectie. |
| Schutter met `gilde_naam = null` | Kolom "Gilde" leeg; bij groepering "Per gilde" onder kop `(Geen gilde)`. |
| Compound/zone-mix | Geen aparte kolom; het is af te leiden uit `Boog` + `Afstand`. |
| Lege doelen door filter | Tonen nog steeds 6 rijen met enkel het doellabel ingevuld. |

## Niet in scope (huidige iteratie)

- Scoreformulieren / doelbordjes (PrintDocument is bewust herbruikbaar, maar
  niets vooraf geïmplementeerd).
- Niet-ingedeelde schutters in de afdruk.
- Externe PDF-libraries (jsPDF, pdfmake, react-pdf) — niet nodig.
- "Print"-knop in andere tabs — alleen in Afdrukken-tab.
