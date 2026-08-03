# Release 1.1.0 (vs 1.0.0)

Doel van dit document: een agent of mens die voor het eerst aan deze codebase werkt tijdens of na cyclus 1.1.0 snel laten begrijpen wat er is gewijzigd ten opzichte van [`1.0.0`](RELEASE_1.0.0.md).

## Overzicht

Cyclus gestart vanaf `1.0.0`. Twee kleine, onafhankelijke UI-wijzigingen, allebei zichtbaar voor de eindgebruiker:

1. De **wedstrijd-tabbalk herwerkt naar een stappenbalk** (puur visueel, geen gedragswijziging).
2. **Afstand achter categorie op de schutterskaart** bij Jeugd en Aspirant, zodat meteen duidelijk is op welke afstand die schutter schiet.

Het database-schema, de IPC-contracten en het indelingsalgoritme blijven onaangeroerd.

## Wijziging

### Wedstrijd-tabbalk herwerkt naar stappenbalk

De tabbalk in het wedstrijd-detailscherm (`Configuratie` / `Inschrijvingen` / `Indeling` / `Afdrukken`) is optisch vervangen door een stappenbalk in de stijl van [Ant Design Steps](https://ant.design/components/steps), om de gesuggereerde volgorde te tonen zonder de vrije navigatie te beperken.

- **Puur visueel.** Elke stap blijft een gewone knop, op elk moment klikbaar. Geen enforced volgorde en geen "voltooid"-status per stap: een tussenversie met een live, per-tab afgeleide voltooid-status is bewust weer verwijderd nadat bleek dat de betekenis van "voltooid" per tab te sterk uiteenliep (data-compleet, louter bezocht, of niet van toepassing) om consistent aan te voelen.
- **Vast icoon per stap**: tandwiel (Configuratie), potlood (Inschrijvingen), pagina-met-lijntjes (Indeling), printer (Afdrukken), verbonden met chevron-connectors. Twee nieuwe iconen toegevoegd: [`IconGear.tsx`](../src/renderer/src/components/icons/IconGear.tsx) en [`IconDocument.tsx`](../src/renderer/src/components/icons/IconDocument.tsx); potlood en printer bestonden al en zijn hergebruikt.
- **`IconChevron` kreeg een `richting`-prop** (`omlaag` als default voor het bestaande dropdown-gebruik, `rechts` voor de stap-connectors) in plaats van de rotatie via een losse CSS-transform op de aanroepende plek te regelen, zodat een volgende plek die een gedraaid chevron-icoon nodig heeft dezelfde API kan hergebruiken.
- Icoon + label per stap staat nu in een centrale `STAPPEN`-lijst in [`WedstrijdDetailPage.tsx`](../src/renderer/src/pages/WedstrijdDetailPage.tsx), gedeeld met het broodkruimel-label (voorheen twee plekken die uit elkaar konden lopen).

Bewuste scope-beperking: enkel de tabbalk van het wedstrijd-detailscherm. Geen wijziging aan navigatielogica, database, IPC of het indelingsalgoritme.

### Afstand achter categorie bij Jeugd en Aspirant op de schutterskaart

Jeugd en Aspirant zijn op de indelingskaart niet meteen duidelijk over welke afstand ze schieten (in tegenstelling tot de Schutters- en Inschrijvingentabel, die afstand al in een eigen kolom tonen).

- **`categorieLabel()`** ([`lib/labels.ts`](../src/renderer/src/lib/labels.ts)) krijgt een optioneel tweede argument `afstand`. Enkel bij Jeugd en Aspirant wordt dat achter de categorie getoond (`"Jeugd 12m"`); de andere categorieën blijven ongewijzigd.
- **Bewust een los argument, geen veld op het input-object.** Schutter/Inschrijving hebben altijd een afstand-veld; als optioneel veld op `s` had de aanvulling ook doorgelekt naar callers die afstand al apart tonen (Schutters- en Inschrijvingentabel), met een dubbele weergave tot gevolg. Enkel `SchutterKaart` geeft het argument expliciet mee.

Bewuste scope-beperking: enkel de weergave op de schutterskaart. Geen wijziging aan de onderliggende afstand-/categorie-validatie ([`afstandToegestaan`/`categorieToegestaan`](../src/renderer/src/components/SchutterFormulier.tsx)).
