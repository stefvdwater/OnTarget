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

## Bekend aandachtspunt (niet opgelost deze cyclus)

Tab-lokale UI-state (filters, toggles, zoekvelden) in alle sub-tabs van
`WedstrijdDetailPage` reset bij het wisselen van tab, omdat elke sub-tab
unmount bij `{tab === 'x' && <XTab />}`. Gemerkt bij de nieuwe
"Lege doelen ook opnemen"-toggle, maar het patroon is ouder en breder (bv.
het zoekveld in `InschrijvingenTab`). Bewust niet aangepakt deze cyclus, zie
[issue #42](https://github.com/stefvdwater/OnTarget/issues/42).
