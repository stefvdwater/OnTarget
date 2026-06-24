---
status: draft
versie-basis: 0.2.4-alpha.10
doel: basis voor de publieke handleiding op handleiding.html
opmerking: dit document beschrijft de huidige app per scherm en per UI-element, zodat een gebruiker zonder voorkennis OnTarget in handen kan nemen.
---

# OnTarget - Handleiding (draft)

Welkom bij OnTarget. Deze handleiding loodst je van installatie tot afdruk van de doelindeling. Ze beschrijft het programma scherm per scherm en knop per knop, zoals je ze in de huidige versie effectief ziet.

> Werkdocument. Dingen die nog beslist of toegevoegd moeten worden, staan onderaan onder "Te beslissen / open vragen".

## 0. Voor je begint

### 0.1 Installeren

- OnTarget draait lokaal op Windows. Download de installer (`OnTarget-Setup.exe`) en doorloop de installatie.
- De app heeft geen internetverbinding nodig. Alle data leeft op je eigen pc.
- De databank wordt automatisch bewaard in de Windows `AppData`-map van de toepassing. Je hoeft die zelf niet aan te raken; backups maak je per wedstrijd via de Wedstrijden-pagina (zie [§10](#10-backup-en-herstel)).

### 0.2 De app in vogelvlucht

Bij het opstarten zie je in elk scherm bovenaan dezelfde **kop**:

| Onderdeel | Locatie | Functie |
| --- | --- | --- |
| **Schietschijf + "OnTarget"** | Links | Klikbaar logo, brengt je terug naar het **Wedstrijden**-overzicht. |
| **Wedstrijden** | Naast logo | Tab voor het wedstrijdenoverzicht. |
| **Schutters** | Naast Wedstrijden | Tab voor het volledige schuttersbestand. |
| **Maan / Zon** | Rechts | Schakelt tussen light en dark mode. Maan = je staat in light, klik om naar dark. Zon = je staat in dark, klik om terug naar light. |
| **Wereldbol** | Helemaal rechts | Opent de OnTarget-website in je standaardbrowser. |

Onderaan rechts staat altijd het **versienummer** van de app (bijvoorbeeld `v0.2.4-alpha.10`). Handig als je een probleem rapporteert.

### 0.3 De typische werkflow

Een wedstrijd bestaat uit deze stappen, in deze volgorde:

1. **Schuttersbestand opbouwen** (één keer, daarna bijwerken). Zie [§3](#3-het-scherm-schutters).
2. **Wedstrijd aanmaken en configureren**: datum, locatie, aantal doelen. Zie [§5](#5-een-nieuwe-wedstrijd) en [§6](#6-tabblad-configuratie).
3. **Inschrijvingen toevoegen** vanuit het schuttersbestand. Zie [§7](#7-tabblad-inschrijvingen).
4. **Automatische indeling** laten berekenen en eventueel handmatig bijsturen. Zie [§8](#8-tabblad-indeling).
5. **Afdrukken** of als PDF opslaan. Zie [§9](#9-tabblad-afdrukken).

## 1. Schermen-overzicht

OnTarget heeft twee hoofdschermen, te bereiken via de tabs bovenaan:

- **Wedstrijden** (standaardscherm bij opstart): lijst van alle wedstrijden, plus de knoppen om een wedstrijd aan te maken, te importeren of te exporteren. Klik op een wedstrijd om in te zoomen op het detailscherm met vier sub-tabbladen: **Configuratie**, **Inschrijvingen**, **Indeling**, **Afdrukken**.
- **Schutters**: het volledige schuttersbestand dat doorheen alle wedstrijden gedeeld wordt. Hier voeg je schutters toe, importeer of exporteer je een CSV en kan je demo-data inladen.

Klik je nogmaals op **Wedstrijden** terwijl je in een wedstrijddetail zit, dan klapt het detail dicht en sta je terug op het overzicht.

## 2. Begrippen en regels in een notendop

| Begrip | Wat het betekent in de app |
| --- | --- |
| Schutter | Eén persoon: voornaam, naam, gilde, boogtype, leeftijdscategorie, geslacht en afstand. |
| Gilde | Een schuttersgilde. Wordt automatisch aangemaakt als je een naam intikt die nog niet bestaat. |
| Wedstrijd | Een gebeurtenis met datum, locatie en eigen inschrijvingen + indeling. |
| Inschrijving | Een schutter die deelneemt aan één wedstrijd. |
| Indeling | Welke schutter staat op welk doel, in welke positie. |
| Aanmeldvolgorde | De volgorde waarin schutters zijn ingeschreven. Bepaalt mee de toewijzing aan voorste/achterste doelen. |
| Dubbel schieten | Een schutter schiet twee reeksen: eerste helft, tweede helft, of beide. |
| Vergrendeld doel | Een doel dat door de automatische indeling **niet** meer aangeraakt wordt. |

### Toegelaten combinaties boog / leeftijd / afstand

OnTarget controleert deze regels actief en blokkeert ongeldige combinaties:

- **Jeugd** schiet enkel op **12m of 18m**.
- **Aspirant, Junior, Senior, Veteraan** schieten enkel op **25m**.
- **Veteraan + Compound** is niet toegelaten. Kies je in het formulier Compound terwijl Veteraan staat ingesteld, dan springt de leeftijdscategorie automatisch naar Senior.

### Visuele kentekens

- **Boogkleur** op de schutterskaart (4-pixel verticaal strookje links): **blauw = Recurve**, **rood = Compound**, **geel = Barebow**, neutraal = Andere.
- **Doel-accenten**: geel (`#f5c518`) als primaire accentkleur, rood (`#e63946`) voor compound en alarmsignalen, blauw (`#1d70b8`) voor links en focus.
- **Dubbelaars** krijgen een badge op hun kaart: "Dubbel" (volledig), "Dubbel 1e" of "Dubbel 2e".

## 3. Het scherm "Schutters"

Klik op **Schutters** in de kop. Je krijgt een tabel met het volledige bestand, plus een rij actieknoppen bovenaan.

### 3.1 De kop boven de tabel

| Element | Functie |
| --- | --- |
| Titel "Schutters" + sub-regel | Toont het totaal aantal geregistreerde schutters en het aantal gilden. |
| **Zoekbalk** | Typt automatisch in *Voornaam Achternaam Gilde* (case-insensitive). Filter werkt live. |
| **Filter**-knop | Opent een paneel waarin je filtert op **Boogtype** (Recurve / Compound / Barebow / Andere) en op **Afstand** (12m / 18m / 25m). Een teller naast de knop toont hoeveel filters actief zijn. Knop "Wis filters" reset de selectie. |
| **Importeren / Exporteren**-dropdown | Drie items: **Importeren** (CSV inladen), **Exporteren** (volledige lijst naar CSV), **Demo data laden** (reset + 100 voorbeeldschutters). Zie [§3.4](#34-csv-import-en-export) en [§3.5](#35-demo-data-laden). |
| **Nieuwe schutter** (blauw) | Opent het schutter-formulier. Zie [§3.2](#32-een-schutter-toevoegen). |

### 3.2 Een schutter toevoegen

Klik op **Nieuwe schutter**. Het formulier bevat:

- **Voornaam** en **Naam** (allebei verplicht).
- **Gilde**: dropdown van bestaande gilden met minstens één schutter. Klik **+ nieuw gilde** rechts naast het label om een nieuwe naam in te tikken. Onbestaande gilden worden bij opslaan automatisch aangemaakt.
- **Boogtype**: Recurve, Compound, Barebow, Andere.
- **Categorie**: Aspirant, Jeugd, Junior, Senior, Veteraan (de keuze Veteraan verdwijnt wanneer je Compound kiest).
- **Geslacht**: Heer (M) of Dame (V), als segmented buttons.
- **Afstand**: 12m / 18m / 25m. Niet-toegelaten knoppen zijn grijs en niet-klikbaar volgens de regels in [§2](#2-begrippen-en-regels-in-een-notendop).

Klik **Schutter aanmaken** om te bewaren, of **Annuleer** om te sluiten zonder iets te bewaren. Het formulier sluit niet bij een klik buiten de modal, om verloren typewerk te voorkomen.

### 3.3 Schutters bewerken of verwijderen

In de tabel staan per rij twee knoppen rechts:

- **Bewerken** opent hetzelfde formulier, voorgevuld met de bestaande gegevens. Onderaan links staat dan een extra **Verwijderen**-knop (in het rood).
- **Verwijder** (rood) opent direct een bevestigingsmodal. **Let op:** verwijderen schrapt de schutter volledig, dus ook uit alle wedstrijden waar die was ingeschreven, inclusief de doelindeling.

### 3.4 CSV-import en -export

Via **Importeren / Exporteren** in de kop:

- **Exporteren** schrijft één CSV-bestand `schutters-YYYY-MM-DD.csv` met de header `voornaam,naam,gilde_naam,type_boog,leeftijdscategorie,geslacht,afstand`. Het bestand is UTF-8 met BOM, zodat Excel speciale tekens correct toont. Een geëxporteerde lijst is meteen opnieuw importeerbaar.
- **Importeren** opent een bestandskeuze voor `.csv`. OnTarget toont eerst een **Importreview-modal**: je ziet rij per rij wat er aankomt, eventuele fouten ("ongeldige categorie", "Compound + Veteraan niet toegelaten") en eventuele duplicaten. Per duplicaat kies je **behoud bestaande**, **vervang bestaande** of **importeer als nieuwe**. Ongeldige rijen kan je inline aanpassen voor je bevestigt. Onbekende gilden worden bij bevestiging automatisch aangemaakt.

Na de import krijg je een **Import-resultaat**-modal met aantal toegevoegde schutters, aantal nieuwe gilden en een lijst van eventuele fouten (eerste 30 getoond).

### 3.5 Demo-data laden

Via **Importeren / Exporteren > Demo data laden** krijg je een bevestigingsmodal. Bevestigen wist **alle bestaande schutters en gilden** en laadt 100 demo-schutters. Inschrijvingen en doelindelingen van bestaande wedstrijden gaan verloren; de wedstrijden zelf blijven bestaan (zonder schutters).

In dezelfde modal verschijnt een gele **backup-tip** als je wedstrijden hebt: één klik op **Backup wedstrijden** opent een mapkeuze en exporteert elke wedstrijd als JSON. Pas wanneer je tevreden bent, klik je op **Demo data laden** om de destructieve actie uit te voeren. De backup-stap en de wis-stap zijn bewust twee aparte klikken.

### 3.6 Gevarenzone onderaan

Onderaan de pagina staat een aparte rode kaart met twee onomkeerbare acties:

- **Alle schutters verwijderen**: schrapt het volledige bestand, inclusief alle inschrijvingen en indelingen, maar laat gilden en wedstrijden bestaan. Ook hier verschijnt eerst de backup-tip.
- **Lege gilden verwijderen**: enkel beschikbaar als er gilden zijn zonder schutters. De knop toont tussen haakjes het aantal lege gilden.

## 4. Het scherm "Wedstrijden"

Standaard opstartscherm. Bovenaan staat het paginahoofd:

| Element | Functie |
| --- | --- |
| Titel + sub-regel | "Wedstrijden" en "X wedstrijden gepland". |
| **Importeren / Exporteren**-dropdown | Twee items: **Wedstrijden importeren** (één of meerdere `.json`-backups) en **Alle exporteren** (één map kiezen, één bestand per wedstrijd). De sub-tekst onder elke knop toont het aantal beschikbare wedstrijden. |
| **Nieuwe wedstrijd** (blauw) | Maakt meteen een nieuwe wedstrijd aan met standaardwaarden en springt naar het Configuratie-scherm van die wedstrijd. Zie [§5](#5-een-nieuwe-wedstrijd). |

### 4.1 De kaarten

Elke wedstrijd verschijnt als een kaart in een raster:

- **Titel**, **datum** (bv. `25 mei 2026`) en **locatie**.
- Twee chips onderaan: aantal doelen en aantal ingeschreven schutters.
- Klik op de kaart om in te zoomen op het wedstrijddetail. De default-tab is **Inschrijvingen**.
- Beweeg met de muis over de kaart: rechtsboven verschijnt een download-icoontje. Klikken exporteert die ene wedstrijd als JSON-backup via je browserdownload.

### 4.2 Wedstrijden importeren

Klik **Wedstrijden importeren** in de dropdown. Selecteer één of meerdere `.json`-bestanden in de bestandskiezer.

OnTarget verwerkt ze sequentieel. Per bestand:

1. **Validatie**. Geen geldig OnTarget-backup → het bestand wordt zonder modal gemarkeerd als fout in het eindresultaat.
2. **Conflictdetectie**. Bestaat er al een wedstrijd met dezelfde naam en datum, dan opent een modal **Wedstrijd bestaat al** met drie keuzes:
   - **Vervangen** (rood): de bestaande wedstrijd wordt gewist (incl. inschrijvingen en indeling) en de backup wordt geïmporteerd.
   - **Als kopie importeren**: nieuwe wedstrijd met `(kopie)`, `(kopie 2)` etc. in de naam. De bestaande blijft ongewijzigd.
   - **Overslaan**: dit bestand wordt genegeerd, de volgende uit de batch wordt verwerkt. Backdrop-klik dismist de modal niet, om accidenteel overslaan te voorkomen.
3. **Import**. Schutters worden gematcht op `(voornaam, naam, gilde)` (case-insensitive); ontbrekende schutters of gilden worden automatisch aangemaakt.

Na afloop verschijnt **Import-resultaat** met per bestand een lijntje (`✓`, `–`, `✗`), eventuele hernoeming bij kopies, totaal aantal nieuwe schutters/gilden, en een teller van geslaagde / overgeslagen / mislukte bestanden.

### 4.3 Alle wedstrijden exporteren

Klik **Alle exporteren** in de dropdown. Kies één map (de keuzedialoog laat toe om ter plekke een nieuwe map te maken). OnTarget schrijft per wedstrijd één JSON-bestand met een veilige bestandsnaam (datum + naam). Na afloop krijg je **Export voltooid** met de gekozen map en het aantal opgeslagen bestanden.

## 5. Een nieuwe wedstrijd

Klik op **Nieuwe wedstrijd** rechts bovenaan de Wedstrijden-pagina. Wat er gebeurt:

1. OnTarget maakt direct een nieuwe wedstrijd aan met standaardwaarden: naam **Nieuwe wedstrijd**, datum **vandaag**, locatie leeg, **10 doelen** waarvan 2 op 18m en 1 op 12m, **compound-startdoel 6** met **1 compound-doel**.
2. Je belandt automatisch op het tabblad **Configuratie** van die wedstrijd.
3. Pas daar minstens de **naam**, **datum**, **locatie** en de **doelconfiguratie** aan voor je verder gaat met inschrijvingen.

Bovenaan zie je een breadcrumb (`Wedstrijden / [naam] / Configuratie`) en een rij tabs voor de vier sub-schermen: **Configuratie**, **Inschrijvingen** (met teller), **Indeling**, **Afdrukken**.

## 6. Tabblad Configuratie

De configuratie is opgedeeld in vier blokken.

### 6.1 Algemene gegevens

- **Naam** (vrij tekstveld).
- **Datum** (datumprikker).
- **Locatie** (vrij tekstveld).

Wijzigingen worden **gedebounced** opgeslagen: ongeveer **0,3 seconden** na je laatste toets schrijft OnTarget naar de databank. Wisselt de tab of sluit je de app, dan flusht OnTarget de wachtende wijziging eerst, zodat je nooit iets verliest.

### 6.2 Doelen

Drie velden, één per zone:

- **Aantal 25m-doelen**
- **Aantal 18m-doelen**
- **Aantal 12m-doelen**

Het **totaal** wordt automatisch berekend en getoond onderaan als gekleurde balkjes (blauw = 25m, geel = 18m, rood = 12m) met "= X doelen totaal".

> Volgorde van de doelnummering: 25m-doelen eerst (incl. compound), dan 18m, dan 12m. Een wedstrijd met 6×25m + 2×18m + 1×12m geeft dus doelen 1-6 (25m), 7-8 (18m), 9 (12m). Dat is ook de volgorde waarin het algoritme schutters indeelt: vroege aanmelders op de voorste doelen, late aanmelders verder achter.

### 6.3 Compound-doelen

- **Startdoel (compound)**: het eerste 25m-doel waarop compound-schutters terechtkomen.
- **Aantal compound-doelen**: hoeveel opeenvolgende doelen vanaf het startdoel voor compound gereserveerd zijn. Dit is een **bovengrens**, geen vast aantal: ongebruikte compound-doelen worden tijdens de indeling automatisch hergebruikt als gewone 25m-doelen, met behoud van hun doelnummer.
- **Compound op doel(en)**: een afgeleide read-only tekst die de range toont (bv. `Doel 06 - 08`).

Vallen de compound-doelen **buiten** de 25m-zone (bv. startdoel hoger dan het aantal 25m-doelen), dan verschijnt onderaan een gele waarschuwing met driehoek-icoon.

### 6.4 Gevarenzone

Eén knop: **Wedstrijd verwijderen** (rood). Opent een bevestigingsmodal. Bevestigen verwijdert de wedstrijd permanent, samen met haar inschrijvingen en doelindeling. Backdrop-klik dismist de modal niet.

## 7. Tabblad Inschrijvingen

Het scherm bestaat uit twee panelen.

### 7.1 Hoofdtabel: ingeschreven schutters

Per ingeschreven schutter zie je:

- **#**: aanmeldnummer (twee cijfers), bepaald door de volgorde van inschrijven.
- **Naam**: voornaam + naam.
- **Gilde**.
- **Boog**: gekleurde chip volgens boogtype.
- **Categorie**: het label volgens de label-conventie (bv. `Senior`, `Dame`, `Veteraan Heer`, of `Heer`/`Dame` voor Compound-senioren).
- **Afstand**: 25m / 18m / 12m.
- **Dubbel**: twee checkboxen, één voor **1e helft** en één voor **2e helft**. Allebei aangevinkt = volledige wedstrijd dubbel.
- **Verwijder**-knop: schrapt de inschrijving uit deze wedstrijd. De schutter blijft in het algemene bestand staan.

De aanmeldvolgorde wordt **server-side** bepaald (atomair binnen een transactie): twee snelle klikken kunnen geen identiek nummer claimen.

> De inschrijvingslijst is niet versleepbaar. Wil je dat een schutter eerder aan een doel toegewezen wordt, dan moet die schutter vroeger ingeschreven worden. Vergrendelde doelen tijdens de indeling zijn een alternatieve manier om bepaalde plaatsingen te bevriezen.

### 7.2 Rechter paneel: schutters toevoegen

- **Zoekbalk**: zoekt live in voornaam, naam **en gilde**. In de praktijk gebruik je deze om in één keer een hele gildeploeg te tonen.
- **Lijst** van matchende schutters die nog niet ingeschreven zijn. Per rij staat een **+**-knop om die schutter meteen in te schrijven.
- **Lege staat "Geen schutter gevonden"**: verschijnt zodra je zoekterm geen match oplevert. Eronder staat een **Nieuwe schutter aanmaken**-knop die het schutter-formulier opent, met de zoekterm al ingevuld als voornaam/naam. Bij bevestigen wordt de nieuwe schutter zowel toegevoegd aan het schuttersbestand als meteen ingeschreven voor deze wedstrijd.
- **Lege staat "Iedereen ingeschreven"**: verschijnt zonder zoekterm zodra elke schutter in het bestand al deelneemt.

## 8. Tabblad Indeling

Hier wijs je schutters toe aan doelen. De pagina heeft drie zones: een actiebalk bovenaan, een **Aanmeldvolgorde**-paneel links en een **doelenmatrix** rechts.

### 8.1 Actiebalk

| Element | Functie |
| --- | --- |
| **Voortgang**: "X van Y schutters ingedeeld" | Live geüpdatet bij elke verandering. |
| **Aandachtspunten-chip** (geel, met driehoek) | Verschijnt enkel als er minstens één conflict is. Beweeg met je muis erover om een **popover** te openen met het volledige overzicht per doel. |
| **Leegmaken** | Wist alle niet-vergrendelde doelen na bevestiging. |
| **Doelen vergrendelen** / **Doelen ontgrendelen** | Vergrendelt of ontgrendelt **alle** doelen tegelijk. Toggelt op basis van of alles al vergrendeld is. |
| **Automatisch indelen** (geel, met sterretje) | Laat het algoritme de indeling berekenen. Bestaat er al een indeling, dan vraagt OnTarget eerst om bevestiging. |

### 8.2 Linker paneel: Aanmeldvolgorde

Het paneel **Aanmeldvolgorde** toont de schutters die nog niet zijn ingedeeld, in inschrijfvolgorde. Bovenaan staat de teller (`X / Y`). Een lege staat ("Iedereen ingedeeld") wisselt automatisch in als alle inschrijvingen verdeeld zijn.

Een schutterskaart toont:

- Voornaam + naam, met eventueel een **dubbel-badge** (1e, 2e of vol).
- Categorie + gilde + boogtype.
- De gekleurde linker rand verraadt het boogtype (blauw/rood/geel/neutraal).

### 8.3 Doelenmatrix rechts

De doelen zijn gegroepeerd per zone: eerst **25 meter** (waaronder compound), dan **18 meter**, dan **12 meter**. Per zone toont de kop het aantal doelen.

Per doel toont de kaart:

| Onderdeel | Wat het toont |
| --- | --- |
| **Kop** | `Doel 01` t/m `Doel NN`, met tags **Compound**, **18m** of **12m** waar van toepassing. |
| **Bezettingsteller** rechtsboven | `X/6` (waarbij X = aantal beurten in de drukste helft). Groen als 4-5 (ideaal), geel als 6 (max), rood als > 6 (overbezet). |
| **Slotje** rechtsboven | Vergrendelt of ontgrendelt dit ene doel. |
| **Body** | De schutters op dit doel, op volgorde van positie. Lege doelen tonen "Sleep schutters hierheen" of "Vergrendeld - leeg". |
| **Conflictbalk onderaan** | Verschijnt enkel bij conflicten: gele driehoek + de **eerste** conflict-zin + `(+N)` als er meer zijn. |

### 8.4 Slepen en neerzetten

Het indelingsscherm gebruikt drag-and-drop (`@dnd-kit`):

- **Vanuit het Aanmeldvolgorde-paneel naar een doel**: schutter wordt ingedeeld op het einde van dat doel.
- **Vanuit een doel naar een ander doel**: verplaatsen.
- **Binnen een doel**: positie wijzigen.
- **Vanuit een doel terug naar het Aanmeldvolgorde-paneel**: indeling ongedaan maken voor die schutter.
- **Vergrendelde doelen** weigeren elke drop.
- Een sleep activeert na een muisbeweging van **5 pixels**, zodat een gewone klik niets verandert.

Elke wijziging wordt onmiddellijk **automatisch opgeslagen**. Je kan de wedstrijd sluiten en later gewoon verdergaan.

### 8.5 Automatisch indelen

De knop **Automatisch indelen** start het algoritme dat in [§2](#2-begrippen-en-regels-in-een-notendop) en in `RULES.md` beschreven staat. Kort samengevat:

- 25m, 18m en 12m worden los van elkaar verwerkt.
- Compound-schutters krijgen hun eigen doel vanaf het ingestelde startdoel, behalve als er minder dan 3 zijn (dan komen ze vooraan op een 25m-doel).
- Ongebruikte compound-doelen worden herbestemd tot gewone 25m-doelen.
- **Vergrendelde doelen** worden niet aangeraakt: de schutters die daar staan blijven, geen nieuwe schutters worden bijgezet.
- De aanmeldvolgorde bepaalt mee wie op de voorste doelen komt.
- Streefbezetting per doel: **5**; minimum **4**, maximum **6**.

Het algoritme bepaalt **voorstellen**. Manuele aanpassingen blijven bewaard zolang je niet opnieuw op **Automatisch indelen** klikt. Druk je dat wel opnieuw, dan vraagt OnTarget eerst om bevestiging.

### 8.6 Vergrendelen

- **Per doel**: klik het slotje rechtsboven op het doel. Vergrendelde doelen tonen een gesloten slot.
- **Alle doelen tegelijk**: gebruik de knop **Doelen vergrendelen** of **Doelen ontgrendelen** in de actiebalk. Die knop wisselt automatisch van label naargelang de huidige stand.
- Vergrendelen werkt **enkel op doelniveau**. Je kan geen losse schutter binnen een doel vergrendelen.
- Een vergrendeld doel dat leeg is, blijft leeg: het algoritme zet er niets bij.
- Een vergrendeld compound-doel blijft compound, ook als het leeg is (geen automatische herbestemming).

### 8.7 Leegmaken

De knop **Leegmaken** wist alle schutters op niet-vergrendelde doelen en zet ze terug in het Aanmeldvolgorde-paneel. Vergrendelde doelen blijven volledig zoals ze staan. Vraagt eerst bevestiging.

### 8.8 Conflictwaarschuwingen

Mogelijke problemen worden op twee plaatsen getoond:

- **Per doel**: altijd zichtbaar onderaan de doelkaart als gele balk met driehoek. Toont het eerste conflict integraal en `(+N)` als er meer zijn op dat doel.
- **Bovenaan in de actiebalk**: de geel-gekleurde chip `X aandachtspunten`. Beweeg met de muis over de chip voor een **popover** met de volledige lijst, gegroepeerd per doel.

Voorbeelden van meldingen:

- *"Alle schutters op dit doel komen van hetzelfde gilde."*
- *"Dit doel heeft meer schutters dan aanbevolen."*
- *"Er zijn meer schutters ingeschreven dan de doelen aankunnen. Overweeg extra doelen toe te voegen."*
- *"Deze compound schutter staat op een niet-compound doel."*
- *"Deze dubbelschutter staat niet op de eerste positie."*

Conflicten blokkeren nooit de indeling: ze zijn een hint, jij beslist altijd.

## 9. Tabblad Afdrukken

Het Afdrukken-tabblad heeft een **opties-paneel** links en een **live A4-preview** rechts.

### 9.1 Opties

| Sectie | Mogelijkheden | Default |
| --- | --- | --- |
| **Oriëntatie** | Portret / Landschap | Portret |
| **Groepering** | Per doel / Per gilde | Per doel |
| **Doelen** | "Alle doelen" of een custom interval (bv. `1-10, 15`) | Alle |
| **Gildes** | "Alle gildes" of multi-select uit de huidige indeling, met "Alles aan / Alles uit" | Alle |
| **Afstand** | Vinkjes voor 25m, 18m, 12m | Alle aan |
| **Extra** | **Totalen tonen** (default aan) en **Conflict-waarschuwingen tonen** (default uit) | |

Filters werken cumulatief (AND): een schutter verschijnt enkel als hij aan **alle** actieve filters voldoet. Bij een fout in het doel-interval (bv. `5-3` of een waarde buiten bereik) verschijnt een foutmelding onder het tekstveld; de preview houdt de laatst geldige selectie aan zodat hij niet leeg valt.

### 9.2 Preview

Rechts zie je een wit "papierblad" met de juiste A4-verhouding voor de gekozen oriëntatie. De preview gebruikt dezelfde React-component als de eigenlijke print, dus wat je ziet is letterlijk wat geprint wordt.

Het document bevat in volgorde:

1. **Header**: wedstrijdnaam, datum, locatie en aantal doelen.
2. **Tabel** met kolommen `Doel · Naam · Gilde · Boog · Categorie · Afstand · Dubbel`. Posities binnen een doel krijgen een letter A t.e.m. F, zodat een label er uitziet als `01A`, `01B`, ..., `12F`.
3. **Totalen** (indien aangevinkt): totaal aantal schutters, per boog, per gilde, aantal dubbelaars.
4. **Aandachtspunten** (indien aangevinkt en aanwezig): gegroepeerd per doel.

### 9.3 Groepering

- **Per doel**: elk doel toont **6 rijen** (A t.e.m. F), ook lege doelen en lege posities. Sortering volgens de positie die je in het Indelingstabblad hebt gezet.
- **Per gilde**: elk gilde krijgt een eigen sub-kop (`Gilde-naam (n)`) gevolgd door enkel de bezette posities, alfabetisch op naam. Schutters zonder gilde komen onder `(Geen gilde)` helemaal onderaan.

### 9.4 Afdrukken zelf

Klik onderaan op **Afdrukken**. De native print-dialoog van Windows opent. Daar kan je:

- Een printer kiezen, of **Microsoft Print to PDF** selecteren om een PDF te bewaren.
- Het papierformaat aanpassen (default = A4 met 12mm marge in de gekozen oriëntatie).

Alleen wat onder `.print-root` valt wordt afgedrukt: de rest van de app verdwijnt uit het printbeeld. De tabel print zwart-wit, met dunne zwarte randen en herhaalde kopregels op elke pagina.

> Niet-ingedeelde inschrijvingen verschijnen bewust niet op de afdruk. Pas iedereen toewijzen, dan afdrukken.

## 10. Backup en herstel

Een wedstrijd kan je volledig exporteren als JSON-bestand en later (op dezelfde of een andere pc) opnieuw inlezen, inclusief inschrijvingen, doelindeling en vergrendelingen.

### 10.1 Eén wedstrijd exporteren

- Beweeg met de muis over een wedstrijdkaart op de Wedstrijden-pagina; rechtsboven verschijnt een download-icoontje. Eén klik triggert een **browserdownload** met een veilige bestandsnaam.
- Of: open de **Importeren / Exporteren**-dropdown en klik **Alle exporteren** voor een bulk-export naar één gekozen map.

### 10.2 Wedstrijden importeren

Via dezelfde dropdown: **Wedstrijden importeren**. Je kan meerdere `.json`-bestanden in één keer kiezen. Zie [§4.2](#42-wedstrijden-importeren) voor de conflict-flow en het eindresultaat.

### 10.3 Stabiliteit van het formaat

Het JSON-formaat is gespecificeerd in [internal-docs/BACKUP_FORMAT.md](../internal-docs/BACKUP_FORMAT.md). Stabiliteitscontract in een notendop:

- Top-level type-string `"ontarget-wedstrijd-backup"` is vast.
- `schemaVersie` groeit monotoon. Backups uit oudere versies blijven altijd importeerbaar.
- Binnen één versie zijn alleen additieve velden toegelaten.

Praktisch: een backup uit OnTarget 0.2.x kan je in latere versies probleemloos terug inlezen.

### 10.4 Verdedigend backup-blok

In de bevestigingsmodals voor de twee destructieve schutters-acties (**Alle schutters verwijderen** en **Demo data laden**) verschijnt een gele tip-box die je uitnodigt om eerst alle wedstrijden te exporteren. **Backup wedstrijden** opent een mapkeuze; na succes verandert de knop in **Backup opnieuw maken** en zie je het aantal bestanden + de map. De backup voert de destructieve actie **niet** automatisch uit; dat blijft een aparte klik op **Definitief verwijderen** of **Demo data laden**.

## 11. Robuustheid en kleine gemakken

Een paar zaken die je niet altijd ziet, maar die er voor zorgen dat je geen werk verliest:

- **Configuratie wordt gedebounced opgeslagen** (300 ms na de laatste toets). Bij tab-wissel, venster-blur of het sluiten van de app flusht OnTarget eerst de wachtende wijzigingen, zodat ze altijd bewaard zijn.
- **De databank wordt synchroon geflusht bij afsluiten** van de app, zelfs als je binnen de 500 ms debounce-marge afsluit na een wijziging.
- **Inschrijvingsvolgorde is race-vrij**: ook bij snelle dubbelklikken krijgen twee schutters nooit hetzelfde aanmeldnummer.
- **Modals met data dismissen niet bij een misklik op de achtergrond**: het schutter-formulier, de CSV-importreview, de wedstrijd-import conflictmodal en alle bevestig-modals (verwijderen, herberekenen, leegmaken...) sluiten enkel via **Annuleer**, **Sluiten** of de actieknop. Info-modals (import-resultaat, export-resultaat) dismissen wel bij een klik naast de modal.
- **Foutmelding bij schrijffouten**: als de databank niet weggeschreven kan worden (volle schijf, antivirus-blokkade, read-only filesystem), krijg je een Nederlandstalige foutmelding via een Windows-dialoog in plaats van een crash.

## 12. Veelvoorkomende workflows

### 12.1 Een nieuwe gildeploeg invoeren en inschrijven

1. Ga naar **Schutters > Nieuwe schutter** en voeg de eerste schutter toe. Klik bij **Gilde** op **+ nieuw gilde** en tik de gildenaam.
2. Voor de rest van de ploeg: opnieuw **Nieuwe schutter**, kies dat gilde uit de dropdown.
3. Sneller? Maak één keer een CSV met de juiste header en gebruik **Importeren / Exporteren > Importeren**.
4. Open de wedstrijd, ga naar **Inschrijvingen**, typ de gildenaam in de zoekbalk: alle ploegleden verschijnen in één rij. Klik per schutter op **+** om in te schrijven.

### 12.2 Een wedstrijd overdragen van pc naar pc

1. Op de bron-pc: hover over de wedstrijdkaart, klik het download-icoontje en bewaar het `.json`-bestand.
2. Op de doel-pc: open OnTarget, **Wedstrijden > Importeren / Exporteren > Wedstrijden importeren**, kies het bestand.
3. Eventuele schutters die nog niet in het schuttersbestand zaten worden automatisch aangemaakt (mét gilde).

### 12.3 Vergrendelen om manueel werk te bewaren

1. Maak met **Automatisch indelen** een eerste voorstel.
2. Sleep handmatig waar nodig.
3. Klik per gewenst doel op het slotje rechtsboven. Of: gebruik **Doelen vergrendelen** om alles tegelijk te bevriezen, en ontgrendel daarna selectief enkel de doelen die je wilt herwerken.
4. Klik opnieuw op **Automatisch indelen**. Bevestig de waarschuwing. Vergrendelde doelen blijven onaangeroerd, de rest wordt herverdeeld.

## 13. Te beslissen / open vragen

Te ronden voor we deze draft op de site zetten:

- [ ] Schermafbeeldingen per sectie: één globale screenshot per scherm, of inline kleine close-ups bij elke knop?
- [ ] Korte intro-video of GIF voor het indelingsscherm (slepen + auto-knop in actie).
- [ ] Volledige tekst van de demo-data: wat zit er precies in? Toevoegen aan de handleiding of overlaten aan de gebruiker om te ontdekken?
- [ ] Engelse versie ja/nee, en wie vertaalt?
- [ ] Versie- en updatebeleid: hoe komt de gebruiker te weten dat er een nieuwe versie is, en hoe installeert die ze?
- [ ] Verwijzing naar `RULES.md` (gewone-taal regels) en `BACKUP_FORMAT.md` (formaat-spec): rechtstreeks linken vanuit de handleiding of inkapselen in OnTarget zelf via een "Help"-menu?
- [ ] CSV-import: voorbeeldbestand publiek beschikbaar maken (bv. via een download-link in deze pagina)?
- [ ] Sectie over toetsenbord-shortcuts toevoegen zodra die geïmplementeerd zijn (huidige versie heeft er nog geen documenteerbare).
