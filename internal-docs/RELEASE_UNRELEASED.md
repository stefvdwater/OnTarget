# Release onuitgebracht (vs 1.1.0)

Doel van dit document: een agent of mens die voor het eerst aan deze codebase
werkt tijdens deze cyclus snel laten begrijpen wat er is gewijzigd ten
opzichte van [`1.1.0`](RELEASE_1.1.0.md). Het versienummer in de titel en de
bestandsnaam wordt pas bij de release zelf ingevuld (zie de `/release`-skill);
tot dan heet dit bestand `RELEASE_UNRELEASED.md`.

## Overzicht

Cyclus gestart vanaf `1.1.0`. Eén nieuwe functie: **scorekaarten afdrukken**.
De Afdrukken-tab kan naast de bestaande doelindelingslijst nu ook blanco
scorekaarten produceren, één per schutter, klaar om uit te printen en tijdens
de wedstrijd met pen in te vullen.

Het database-schema, de IPC-contracten en het indelingsalgoritme blijven
onaangeroerd.

## Wijziging

### Scorekaarten-modus in de Afdrukken-tab

De Afdrukken-tab kreeg een tweede document-type naast de bestaande
doelindelingslijst ("Indeling"): **Scorekaarten**. Zie
[AFDRUKKEN.md](AFDRUKKEN.md) voor de volledige beschrijving van beide
modi.

- **Modus-toggle in de stappenbalk.** Twee gelijkwaardige knoppen
  ("Indeling" / "Scorekaarten"), rechts uitgelijnd in `.steps`, enkel
  zichtbaar op de Afdrukken-stap. Hergebruikt bewust de `.step`/`.step-btn`/
  `.step-label`-opmaak van de echte stappen (inclusief de gele
  actief-onderstreping), maar zonder cirkel, icoon of chevron-connector: dit
  zijn geen stappen in een volgorde. Placeholder-vormgeving, nog niet
  definitief. De modus-state zit in `WedstrijdDetailPage` (niet meer in
  `AfdrukkenTab`, die nu een dunne controlled component is).
- **Layout: één A4-pagina per doel.** Een doel heeft maximaal 6 posities
  (R10 in [RULES.md](RULES.md)), wat exact overeenkomt met een 3×2-rooster
  van kaarten per pagina. Het doelnummer staat als paginatitel boven het
  rooster, niet op de individuele kaart — de kaarten worden na het printen
  los geknipt en dragen daarom zelf wel de wedstrijdnaam en datum.
- **Kaart-inhoud**: wedstrijdnaam + korte datum (`13/06/2026`) bovenaan, dan
  naam / gilde / categorie / boogtype als platte tekst (bewust géén
  schutterkaart-visuele stijl zoals de kleurstrip in de Indeling-tab), dan
  een blanco scoretabel (10 rijen, kolommen 1/2/3/Tot./Alg.Tot.), en een
  Rozen/Punten-voettabel. Alles blanco: de organisatie print dit vooraf, de
  schutter vult in tijdens de wedstrijd.
- **Filters**: doel-interval (zelfde tekstveld en parser als bij Indeling)
  en afstand (25m/18m/12m). Geen gilde-filter en geen Excel-export in deze
  modus. Een aparte toggle **"Lege doelen ook opnemen"** (default uit)
  bepaalt of doelen zonder enige passerende schutter toch een pagina met 6
  volledig blanco kaarten krijgen, of overgeslagen worden.
- **Print-mechanisme ongewijzigd**: nog steeds `window.print()` + `@media
  print`, geen PDF-bibliotheek. Wel een subtiele correctie hierbij ontdekt:
  `.print-root` valt tijdens het echte afdrukken al terug op `padding: 0`
  (bestaande regel); een eerdere berekening ging daar per ongeluk van de
  schermvoorbeeld-waarde (14mm) uit, wat tot overflow leidde. De
  scorekaarten-pagina's krijgen daarom een aparte
  `.scorekaarten-print-root`-klasse met padding enkel voor het
  schermvoorbeeld.

### Interne herstructurering van de Afdrukken-tab

- `AfdrukkenTab.tsx` was de volledige Indeling-afdruklogica; die logica
  verhuisde ongewijzigd naar `IndelingAfdrukTab.tsx`. `AfdrukkenTab.tsx` is
  nu enkel een modus-switch (`modus`-prop) tussen `IndelingAfdrukTab` en het
  nieuwe `ScorekaartenAfdrukTab`.
- **`useAfdrukDoelen.ts`** (nieuwe hook): de indeling-laadlogica (voorheen
  in `AfdrukkenTab` zelf) is geëxtraheerd zodat `IndelingAfdrukTab` en
  `ScorekaartenAfdrukTab` exact dezelfde doelen-/conflictenopbouw
  hergebruiken in plaats van te dupliceren.
- **`afdruk-helpers.ts`** kreeg `formatDatumKort`, `ScorekaartPagina` en
  `bouwScorekaartPaginas` (pure functie, filtert + groepeert per doel).

Bewuste scope-beperking: enkel de Afdrukken-tab. Geen wijziging aan
indeling, inschrijvingen, of het indelingsalgoritme.

### Afdrukken-preview: onafhankelijke scroll ([issue #41](https://github.com/stefvdwater/OnTarget/issues/41))

De preview-pane in de Afdrukken-tab scrolde voorheen mee met de volledige
pagina: bij een preview die hoger is dan het scherm, scrolde je de hele
`.app-main` mee, inclusief het optiespaneel eronder. `.afdrukken-preview-wrap`
volgt nu hetzelfde sticky-plus-eigen-scroll-patroon als `.beschikbaar-paneel`
in de Inschrijvingen-tab: sticky binnen de pagina, met een eigen
`overflow-y: auto` voor de preview zelf, terwijl de "Voorbeeld: ..."-kop
zichtbaar blijft staan.

Twee gerelateerde CSS-subtiliteiten kwamen daarbij aan het licht en zijn
opgelost:
- `position: sticky` op het preview-paneel maakte het onbedoeld tot
  containing block voor `.print-root`'s `position: absolute` tijdens
  `@media print`, waardoor het echte afdrukken werd afgekapt op ongeveer
  één schermhoogte in plaats van over meerdere pagina's te vloeien.
  `@media print` reset nu expliciet `position`/`overflow`/`max-height` op
  de wrapper-elementen.
- `.afdrukken-preview-pagina` (flex, standaard `align-items: stretch`) rekte
  `.print-root` verticaal naar de beschikbare hoogte van het scroll-paneel;
  tabelinhoud voorbij die hoogte liep ongeclipt door op de grijze
  achtergrond in plaats van binnen de witte pagina te blijven.
  `align-items: flex-start` laat `.print-root` weer op eigen inhoudshoogte
  groeien.

### Afdrukken-preview: losse pagina's die overeenkomen met de echte afdruk

Vervolg op de vorige sectie. De schermvoorbeeld-pagina's tonen nu wat er ook
echt wordt afgedrukt, in plaats van één doorlopende preview.

Voor **Scorekaarten** was dit goedkoop: de pagina's waren al vooraf
1-per-doel opgebouwd (`bouwScorekaartPaginas`), enkel de schermweergave
moest per pagina in een eigen vel gesplitst worden.

Voor **Indeling** ligt de paginascheiding niet vast: de browser beslist dat
pas bij het echte afdrukken via `page-break-inside: avoid`. Om de preview
daarmee te laten overeenkomen, rendert een nieuwe hook
(`usePrintPaginering.ts`) een verborgen, ongepagineerde kopie, meet de
werkelijke hoogtes van elke doel-groep/gilde-rij/waarschuwing, en pakt ze
greedy in pagina's (`pakInPaginas` in `afdruk-helpers.ts`) op basis van de
echte `@page`-marge (12mm, nu een gedeelde `PRINT_PAGINA_MARGE_MM`-constante
i.p.v. losse magic numbers). Herbruikbare stukken (header, tabelkop, rijen,
totalen, waarschuwingen) zijn uit `PrintDocument.tsx` geëxporteerd zodat
preview en afdruk exact dezelfde opmaak delen. Waarschuwingen worden per
item gepakt (net als bij het echte afdrukken, dat een lange lijst ook kan
splitsen); totalen blijft bewust één atomair blok (altijd 4 vaste regels).
De echte afdruk blijft ongewijzigd: een verborgen, ongepagineerde kopie
(`.print-root-meetkopie > .print-root`) is de enige bron voor `window.print`.

Bekende, bewust aanvaarde beperking: de meting en de echte afdruk kunnen in
theorie een paar px uit elkaar lopen bij sub-pixel afronding; dat maakt de
`.print-pagina-vel`-vellen hooguit een fractie hoger dan strikt nodig
(`minHeight`, geen harde clip), niet fout.

### Scorekaarten: 2 kaarten voor een volledige dubbelschutter

Een volledige dubbelschutter (1e+2e) schiet als eerste én als laatste
beurt binnen zijn doel (R5 in [RULES.md](RULES.md)), maar kreeg tot nu toe
maar 1 scorekaart. `bouwScorekaartPaginas`/`bouwKaartPosities` in
[`afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts)
geven zo'n schutter nu 2 kaarten: één op zijn normale plaats in de
schietvolgorde, één op de effectief laatste positie van de pagina (niet
zomaar de eerstvolgende vrije positie). Bij meerdere volledige
dubbelschutters op hetzelfde doel blijft hun onderlinge volgorde in beide
groepen behouden, bv. `A B C _ A B` in plaats van `A B C A B _`. Zie
[AFDRUKKEN.md](AFDRUKKEN.md#volledige-dubbelschutters-krijgen-2-kaarten).

Bewuste scope-beperking: enkel de scorekaarten-print. Halve
dubbelschutters (enkel EH of TH) en het indelingsalgoritme zelf blijven
onaangeroerd.

### Tab-lokale UI-state overleeft tab-wissel ([issue #42](https://github.com/stefvdwater/OnTarget/issues/42))

Elke sub-tab van `WedstrijdDetailPage` unmount bij het wisselen van tab
(`{tab === 'x' && <XTab />}`), waardoor lokale `useState` (zoekveld,
print-filters) telkens terugviel op de default. Opgelost door de
betrokken state te verhuizen naar `WedstrijdDetailPage`, die zelf niet
unmount tijdens het wisselen van tab (zelfde patroon als het bestaande
`afdrukModus`):

- `InschrijvingenTab`: het zoekveld (`zoek`) is nu een gecontroleerde prop
  (`zoek`/`onZoekChange`) i.p.v. lokale state.
- `IndelingAfdrukTab`/`ScorekaartenAfdrukTab`: alle opties/filters
  (oriëntatie, groepering, doel-interval, gilde-selectie, afstanden,
  totalen/waarschuwingen tonen, "Lege doelen ook opnemen") zijn nu
  `filters`/`onFiltersChange`-props, getypeerd als `IndelingAfdrukFilters`/
  `ScorekaartenAfdrukFilters` in `afdruk-helpers.ts`. Dit geldt ook voor
  het wisselen tussen de Indeling/Scorekaarten-modus binnen Afdrukken.
- Bewust niet aangepakt: puur ephemere state (bevestig-modals in
  `ConfiguratieTab`/`IndelingTab`, de afgeleide `doelIntervalFout`/
  `doelIntervalGeldig`, in-flight Excel-export-status) blijft lokaal: die
  hoort niet te overleven, of herstelt zichzelf uit de wel-gelifte
  brontekst.
- Gedeelde patch-updater (`usePatchState` in `src/renderer/src/hooks/`)
  i.p.v. losse handgeschreven merge-functies per gelift stuk state.
