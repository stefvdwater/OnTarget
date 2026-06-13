# On Target — Functies van het Programma

## 1. Schuttersdatabase

- Schutters aanmaken, bewerken en verwijderen uit het schuttersbestand.
- Per schutter opslaan:
  - Voornaam + Naam
  - Gilde
  - Type boog: Recurve, Compound, Barebow, Andere
  - Leeftijdscategorie: Aspirant, Jeugd, Junior, Senior, Veteraan
  - Geslacht: M / V (opgeslagen als `M`/`V`; in de UI getoond als **Heer** /
    **Dame**, gecombineerd met leeftijdscategorie tot één label volgens de
    [label-conventie](../README.md#label-conventie-weergave))
  - Afstand: 12m, 18m, 25m
- Schutters doorzoeken en filteren.
- Import en export van het schuttersbestand als CSV (UTF-8 met BOM, direct herimporteerbaar). Onbekende gilden worden bij import automatisch aangemaakt. Zie de CSV-sectie in [CLAUDE.md](../CLAUDE.md).

## 2. Wedstrijdinschrijving

- Nieuwe wedstrijd aanmaken.
- Schutters inschrijven via een **zoekbalk op naam**: zoekt live in het schuttersbestand.
  - Gevonden schutter: één klik om toe te voegen aan de inschrijvingslijst.
  - Niet gevonden: schutter **manueel invoeren** via een formulier (wordt opgeslagen in het schuttersbestand).
- Ingeschreven schutters kunnen **bewerkt** of **verwijderd** worden uit de inschrijvingslijst.
- Aanmeldvolgorde bijhouden: de volgorde waarin schutters worden toegevoegd bepaalt de doeltoewijzing binnen hun zone. De organisatie kan deze volgorde **manueel herordenen**.
- Per inschrijving: **dubbel schieten** aanduiden via twee checkboxen:
  - ☐ Eerste helft dubbel
  - ☐ Tweede helft dubbel
  - Beide aangevinkt = volledige wedstrijd dubbel schieten.

## 3. Doelindelingsscherm

### Lay-out

- **Linker balk:** lijst van alle ingeschreven schutters die nog niet aan een doel zijn toegewezen.
- **Rechter zone:** matrix van alle doelen, elk doel toont zijn schutters.
  - Compound doelen en korte-afstandsDoelen (18m, 12m) zijn visueel onderscheiden van normale doelen.
  - Normale 25m doelen krijgen geen extra aanduiding.

### Interactie

- Schutters **slepen vanuit de linker balk naar een doel** om hen toe te wijzen.
- Schutters **slepen binnen een doel** om de volgorde aan te passen.
- Schutters **slepen van het ene doel naar het andere** om hen te verplaatsen.
- Schutter terugslepen naar de linker balk om de toewijzing ongedaan te maken.
- **Vergrendelen:** de organisatie kan individuele schutters op een doel of een volledig doel vergrendelen.
  - Vergrendelde schutters/doelen worden niet overschreven bij herberekening.
  - Bij herberekening worden enkel de niet-vergrendelde schutters herverdeeld.
  - Visuele aanduiding dat een schutter of doel vergrendeld is.

### Automatische indeling

- **Knop "Auto":** laat de computer de indeling berekenen voor alle niet-vergrendelde schutters.
- De organisatie heeft altijd het **laatste woord**: manuele aanpassingen worden nooit automatisch overschreven tenzij opnieuw op "Auto" gedrukt wordt.
- Bij het opnieuw indrukken van "Auto" vraagt de app om bevestiging.

### Opslaan

- De indeling wordt automatisch tussentijds opgeslagen zodat de organisatie kan stoppen en later verdergaan.
- Bij het wijzigen van de doelconfiguratie (aantal doelen, zones) blijven vergrendelde doelen behouden; de rest wordt herberekend na bevestiging.

### Feedback

- Schutters of doelen met een mogelijk conflict krijgen een **gele markering met een uitroepteken (⚠)**.
- Bij hoveren over de markering verschijnt een **tooltip in gewone taal** die het conflict uitlegt (geen regelnummers of technische codes).
  - Voorbeelden van tooltips:
    - *"Alle schutters op dit doel komen van hetzelfde gilde."*
    - *"Dit doel heeft meer schutters dan aanbevolen."*
    - *"Er zijn meer schutters ingeschreven dan de doelen aankunnen. Overweeg extra doelen toe te voegen."*
    - *"Deze compound schutter staat op een niet-compound doel."*
    - *"Deze dubbelschutter staat niet op de eerste positie."*
- De linker balk toont duidelijk hoeveel schutters nog niet zijn ingedeeld.
- Conflicten blokkeren nooit de indeling — de organisatie beslist altijd zelf.

## 4. Weergave & Afdrukken

- Overzichtelijke weergave van de doelindeling per doel (wie schiet op doel 1, 2, 3, ...).
- **Afdrukken**-tab per wedstrijd: live preview van een doelindelingslijst
  (Excel-achtige tabel) met live-bijgewerkte opties voor oriëntatie,
  groepering (per doel of per gilde), filters op doel-interval / gilde /
  afstand, totalen en conflict-waarschuwingen. De native print-dialoog van
  Windows opent met "Microsoft Print to PDF" als optie om een PDF op te
  slaan. Zie [AFDRUKKEN.md](AFDRUKKEN.md) voor de volledige beschrijving.
- De indeling wordt geëxporteerd via print-to-PDF: de native Windows print-dialoog met "Microsoft Print to PDF" slaat het Afdrukken-overzicht op als PDF. Een rechtstreekse CSV- of Excel-export van de indeling bestaat (nog) niet en blijft een optionele toekomstige uitbreiding.

## 5. Wedstrijdinstellingen

De organisatie kan per wedstrijd het volgende configureren:

- **Totaal aantal beschikbare doelen.**
- **Aantal 18m doelen** — staan altijd achteraan.
- **Aantal 12m doelen** — staan na de 18m doelen, helemaal achteraan.
- **Startdoel voor compound schutters** — het doel waarop compound schutters beginnen (binnen de 25m-zone).

De app berekent automatisch hoeveel doelen per zone beschikbaar zijn op basis van deze instellingen.

## 6. Wedstrijdbeheer

- Overzicht van alle wedstrijden (verleden en toekomst).
- Wedstrijdgegevens opslaan (datum, locatie, naam).
- Inschrijvingslijst per wedstrijd raadpleegbaar.
- Backup per wedstrijd: een wedstrijd volledig exporteren naar een JSON-bestand (met inschrijvingen, doelindeling en vergrendelde doelen) en later, op dezelfde of een andere installatie, terug importeren. Ook bulk-export van alle wedstrijden naar een map. Bij import met een naam- en datum-conflict kan de gebruiker kiezen tussen vervangen, als kopie importeren of overslaan. Het bestandsformaat staat in [BACKUP_FORMAT.md](BACKUP_FORMAT.md).

## 7. Toekomstige functies

> Complexere functies volgen naarmate de regels verder worden uitgewerkt.
