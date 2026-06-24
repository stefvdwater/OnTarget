# On Target — Specificatie: Doelindelingsalgoritme

Dit document beschrijft het verwachte **gedrag** van de automatische doelindeling
voor een boogschieten-wedstrijd: regels, prioriteiten, randgevallen en
input/output. Het beschrijft **niet** hoe het algoritme intern werkt — daarvoor
zie [ALGORITME_v2.0.md](ALGORITME_v2.0.md).

---

## 1. Domeinbegrippen

| Term | Betekenis |
|---|---|
| **Schutter** | Deelnemer met eigenschappen: gilde, boogtype, afstand, aanmeldvolgorde, dubbel EH/TH |
| **Doel** | Schietpositie; bevat een zone en een gesorteerde lijst schuttersslots |
| **Zone** | Groep doelen op dezelfde afstand: `25m`, `18m`, `12m`, `compound` |
| **Beurt** | Één beurt per helft per normaal schutter; dubbelschutter telt dubbel in de betrokken helft |
| **Dubbelschutter** | Schutter die een gemiste wedstrijd inhaalt: EH-dubbel, TH-dubbel of vol-dubbel (beide helften) |
| **Vol-dubbel** | 2 beurten per helft; telt als 2 in beide helften |
| **Gilde** | Boogschuttersvereniging waartoe een schutter behoort |
| **Aanmeldvolgorde** | Volgorde van inschrijving; lager = eerder ingeschreven → eerder doel |
| **Vergrendeld doel** | Doel waarvan de indeling handmatig is vastgezet en niet overschreven mag worden |

---

## 2. Harde regels (nooit schenden)

| Code | Regel |
|---|---|
| R1 | Elke schutter staat op een doel in de **correcte zone** (juiste afstand, boogtype) |
| R2 | Een doel mag **nooit meer dan 6 beurten** per helft bevatten |
| R3 | Een **vergrendeld doel** wordt niet gewijzigd; de schutters erop worden als "al geplaatst" beschouwd |
| R4-hard | Een doel heeft **altijd minimaal 4 beurten** per helft. Uitzondering: als de hele zone minder dan 4 beurten kan leveren, of als het resterende aantal schutters onvoldoende is om elk actief doel op 4 beurten te brengen (dan worden de resterende schutters samengebracht op zo weinig mogelijk doelen). |

---

## 3. Sterke voorkeuren (zoveel mogelijk respecteren)

| Code | Regel | Toelichting |
|---|---|---|
| R4 | **Streef naar 5 beurten** per doel per helft | Ideale bezetting |
| R5 | **Maximaal 2 schutters van hetzelfde gilde** per doel | Zachte bovengrens; zie §6 voor uitzonderingen |
| R6 | **Minimaal 2 verschillende gilden** per doel | Uitzondering: §6 |
| R7 | **Dubbelschutters op de laatste actieve doelen** van hun zone | Achteraan in het gevulde blok, niet op fysiek lege doelen |
| R8 | Schutters met een **lagere aanmeldvolgorde op een lager doelnummer** | Registratievolgorde → doelvolgorde |
| R9 | **Gelijkmatige verdeling**: alle doelen zo gelijk mogelijk gevuld | Voorkeur voor 4 boven 6 als er meer doelen beschikbaar zijn |
| R10 | Schutters van hetzelfde gilde op **aaneengesloten doelen** | Niet verspreid over de hele zaal |

---

## 4. Zones en doelindeling

### 4.1 Zonetoewijzing

Elke schutter heeft een `afstand` (12, 18 of 25 m) en een `type_boog` (Recurve, Barebow, Compound).

```
afstand = 25, type_boog = Compound  → compound-zone (tenzij < 3 compound-schutters: zie §4.2)
afstand = 25, type_boog ≠ Compound  → 25m-zone
afstand = 18                         → 18m-zone
afstand = 12                         → 12m-zone
```

### 4.2 Minder dan 3 compound-schutters (R16)

Als de compound-zone minder dan 3 schutters heeft, worden die schutters toegevoegd aan de 25m-zone en krijgen ze positie vóórin hun doel (visueel onderscheid zonder apart doel).

### 4.2b Variabele compound-doelen (R17)

`aantalCompoundDoelen` in de wedstrijdconfiguratie is een **bovengrens**, geen vast aantal.
Het algoritme bepaalt zelf hoeveel compound-doelen écht nodig zijn op basis van de
aanwezige compound-schutters en de gewone bezettingslogica (streef 5 per doel,
R4-hard min 4). **Ongebruikte compound-doelen worden herbestemd tot 25m-doelen**
en doen mee in de indeling van de 25m-zone.

Praktisch:

1. De compound-zone wordt **vóór** de 25m-zone verwerkt (afwijking op §4.3).
2. Daarna worden alle compound-doelen die geen enkele schutter kregen én niet
   vergrendeld zijn, omgezet naar `zone = '25m'`. Ze behouden hun doelnummer
   (fysieke positie) en worden in de samengevoegde 25m-zone gesorteerd op nummer.
3. De 25m-zone bestaat dan logisch uit `[oorspronkelijke 25m-doelnummers] ∪
   [herbestemde compound-doelnummers]`. R8 (aanmeldvolgorde → doelnummer) en
   R7 (dubbels op laatste actieve doelen) gelden over die samengevoegde zone.
4. Een **vergrendeld** compound-doel blijft compound, ook als het leeg is — de
   gebruiker heeft het bewust gereserveerd.
5. Voor **conflictdetectie** (§9) geldt: een herbestemd doel telt voor alle
   doeleinden als 25m-doel. De waarschuwing "niet-compound schutter op compound
   doel" geldt dus niet op een herbestemd doel.

Compound-overflow (méér compound-schutters dan de voorziene compound-doelen
kunnen bevatten bij 6 beurten/doel) blijft hard: resterende compound-schutters
worden `nietIngedeeld`. Compound-schutters lopen nooit over naar 25m (behalve
via de bestaande R16-uitzondering bij <3 schutters).

### 4.3 Verwerkingsvolgorde per zone

1. Sorteer alle schutters op `aanmeldvolgorde` (oplopend).
2. Splits in **dubbelschutters** en **normale schutters**.
3. Verwerk **dubbelschutters eerst** (§5), dan **normale schutters** (§6).

---

## 5. Dubbelschutters

### 5.1 Groepering en plaatsing

Dubbelschutters komen altijd op de **laatste actieve doelen** van hun zone (R7) — dat wil zeggen, op de achterste M doelen van het gebruikte (gevulde) blok, **niet** op fysiek lege doelen helemaal achteraan de zone. Concreet: als de zone er N actieve doelen heeft en M dubbelgroepen, dan staan de dubbelgroepen op `actieveDoelen[N-M .. N-1]`. De vroegst aangemelde groep komt op het laagste van die M doelen.

Groepeer ze als volgt:
- **Vol-dubbelaars** (EH + TH): maximaal 2 per doel. Twee vol-dubbelaars bezetten 4 beurten per helft; er is nog ruimte voor 1 normale schutter (→ 5 beurten).
- **EH-dubbel + TH-dubbel combinaties**: koppel bij voorkeur een EH-dubbel aan een TH-dubbel van een **ander gilde** (R6). Elk koppel gaat op één doel.
- Resterende EH- of TH-dubbelaars gaan elk afzonderlijk op een doel.

### 5.2 Normale schutters aanvullen op dubbeldoelen

Een dubbeldoel wordt aangevuld met normale schutters tot **5 beurten** per helft.
Daarbij gelden:

- **Minimum normalen voor rust (R8)**: als de groep 2 vol-dubbelaars of een
  EH+TH-koppel bevat, is minstens 1 normale schutter verplicht (scoreschrijver).
  Bij 2 EH én 2 TH op hetzelfde doel: minstens 2 normalen, uit verschillende gilden.
- **R6 (min 2 gilden)**: als alle dubbelaars op het doel van hetzelfde gilde zijn,
  moet de eerste aanvullende normaal van een **ander** gilde komen.
- **R5 (max 2 per gilde)**: geldt ook bij aanvulling. Een gilde dat al 2× aanwezig
  is op het doel wordt overgeslagen.
- Selectie van normalen gebeurt op **registratievolgorde**, met overslaan waar
  bovenstaande regels dat vereisen.

### 5.3 Voorbeeld: 4 vol-dubbelaars (A1, A2 van gilde A; B1, B2 van gilde B)

```
Doel 1: A1 (vol-dubbel) + B1 (vol-dubbel) + N1 (normaal van gilde C of D)  → 5 beurten
Doel 2: A2 (vol-dubbel) + B2 (vol-dubbel) + N2 (normaal van gilde C of D)  → 5 beurten
```

---

## 6. Normale schutters verdelen

### 6.1 Gildegrens (R5/R6) — prioriteitsvolgorde

De gildegrens is **zacht** en wordt stapsgewijs versoepeld:

| Stap | Gildegrens | Wanneer |
|---|---|---|
| 1 (normaal) | max 2 per gilde per doel | Altijd eerst proberen |
| 2 (versoepeld) | max 3 per gilde per doel | Als stap 1 leidt tot ondervulde doelen (< 5 beurten) én er geen extra doel beschikbaar is |
| 3 (noodgeval) | onbeperkt (maar ≤ 6 beurten) | Enkel als alle bovenstaande stappen mislukken |

**Uitzondering R6 (min 2 gilden)**: als de zone slechts 1 gilde bevat, vervalt de 2-gilden-eis. Er wordt **geen conflictwaarschuwing** gegeven in dat geval.

### 6.2 Aantal actieve doelen

Het aantal te gebruiken doelen wordt bepaald door:

- **Streefbezetting**: 5 beurten per doel (R4). Het aantal doelen wordt zo
  gekozen dat de streefbezetting zo dicht mogelijk benaderd wordt.
- **R4-hard (minimum 4)**: een doel krijgt nooit minder dan 4 beurten per
  helft. Het aantal actieve doelen wordt daarom nooit zo hoog gezet dat
  doelen onder 4 moeten zakken.
- **Maximum 6 beurten (R3)**: een doel krijgt nooit meer dan 6 beurten per
  helft. Bij gebrek aan doelcapaciteit worden schutters als
  niet-ingedeeld gemarkeerd.

`aantalBeurten` = som van de beurten van alle schutters in de zone (normaal = 1,
vol-dubbel = 2).

| Beurten | Doelen beschikbaar | Verwachte verdeling |
|---|---|---|
| 9 | ≥ 2 | 2 doelen (5+4) |
| 5 | ≥ 1 | 1 doel (5) |
| 17 | ≥ 4 | 4 doelen (5+4+4+4) |
| 17 | 3 | 3 doelen (6+6+5) |

**Uitzondering (R4-hard)**: als de totale beurten in de zone < 4, worden alle
schutters op 1 doel geplaatst zonder de min-4-eis.

---

## 7. Randgevallen met verwacht gedrag

### 7.1 Twee gilden in een zone

**Situatie**: 12 schutters, gilde A (6) en gilde B (6), 2 beschikbare doelen.

**Probleem**: met max 2 per gilde per doel passen er slechts 4 per doel → 8 geplaatst, 4 over.

**Verwacht resultaat**:
```
Doel 1: A1 A2 B1 B2 A3   (A:3 B:2, 5 schutters)
Doel 2: A4 A5 B3 B4 B5   (A:2 B:3, 5 schutters) ← of A:3 B:2 als B's zijn opgebruikt
```
→ Gildegrens wordt versoepeld tot 3 per doel (R5 stap 2 uit §6.1). **Geen extra doel openen.**

### 7.2 Eén gilde in een zone

**Situatie**: 8 schutters, allen van gilde A (bijv. 12m-zone met 1 deelnemend gilde).

**Verwacht resultaat**:
```
Doel 1: A1 A2 A3 A4   (A:4, 4 beurten)
Doel 2: A5 A6 A7 A8   (A:4, 4 beurten)
```
- Geen conflictwaarschuwing "alle schutters van hetzelfde gilde" — er is geen andere keuze.
- Verdeling: **zo gelijk mogelijk** (4+4 boven 5+3).
- Beurtengrens: bewaard op 5 per beurt-definitie (hier 4 normalen = 4 beurten, wat < 5 is maar acceptabel).

### 7.3 Resterende schutters na evenredige verdeling

**Situatie**: 17 schutters, 3 doelen beschikbaar (max. 5/doel = 15 plaatsen).

**Beslissingsregel**:
- Als er **4 of meer doelen beschikbaar** zijn: gebruik een extra doel → bijv. `5+4+4+4`.  
  *Voorkeur: 4 boven 6, zelfs als dat een extra doel kost.*
- Als er **exact 3 doelen** zijn (geen extra): spreiding met 6 → `6+6+5`.

```
Voorbeeld: 17 schutters, 4 doelen beschikbaar
→ Doel 1: 5, Doel 2: 4, Doel 3: 4, Doel 4: 4

Voorbeeld: 17 schutters, 3 doelen beschikbaar
→ Doel 1: 6, Doel 2: 6, Doel 3: 5
```

### 7.4 Gildediversiteit vs. gelijke verdeling (grote gilde-onbalans)

**Situatie**: 10 schutters gilde A, 2 schutters gilde B, 2 doelen.

**Verwacht resultaat**:
```
Doel 1: A1 A2 A3 A4 A5 B1   (A:5, B:1 → 6 beurten)
Doel 2: A6 A7 A8 A9 A10 B2  (A:5, B:1 → 6 beurten)
```
→ **Gelijke verdeling heeft prioriteit** over gildediversiteit. B wordt verspreid over beide doelen zodat elk doel 2 gilden heeft én 6 schutters. Dat is beter dan bijv. `A:8 + B:2` op één doel.

### 7.5 Vergrendeld doel midden in de zone

**Situatie**: zone heeft 5 doelen; doel 3 is vergrendeld.

**Verwacht resultaat**: vergrendeld doel wordt **volledig overgeslagen** bij de
verdeling. De overige 4 doelen (1, 2, 4, 5) worden gevuld alsof het vergrendelde
doel niet bestaat. De registratievolgorde (R8) geldt t.o.v. de *relatieve*
positie in de gefilterde lijst.

### 7.6 Gilde-overflow: één gilde op alle doelen al 2×

**Situatie**: er blijven 3 schutters van gilde K over terwijl alle doelen al
K:2 hebben.

**Verwacht resultaat**: K-schutters komen op de meest ondervulde doelen
(voorkeur voor bijvullen tot 5 beurten), ook al stijgt K boven 2 per gilde
(R5-versoepeling, §6.1). Houd K-schutters bij voorkeur op **aaneengesloten
doelen** (R10).

```
Voorbeeld:
Doel 14: 4 schutters (K:2) → K3 gaat hier (K:3, 5 schutters)
Doel 15: 3 schutters (K:1) → K4 gaat hier (K:2, 4 schutters)
Doel 15: 4 schutters (K:2) → K5 gaat hier (K:3, 5 schutters)
```

### 7.7 Onvoldoende doelen (theoretisch randgeval)

**Situatie**: meer schutters dan doelen kunnen bevatten bij 6 beurten maximum.

**Verwacht resultaat**: 
- Alle doelen worden gevuld tot 6 beurten (harde grens).
- Resterende schutters worden gemarkeerd als **niet-ingedeeld** en zichtbaar getoond als fout.
- Nooit stille overschrijding van 6 beurten.

---

## 8. Sortering van schutters binnen een doel

Na de volledige indeling wordt de volgorde binnen elk doel als volgt bepaald:

1. **Compound-schutters op een niet-compound 25m-doel** (R16-uitzondering): allereerst
2. **EH-dubbel en vol-dubbel schutters**: vóórin (kunnen vroeg vertrekken na EH)
3. **Normale schutters**: gegroepeerd per gilde
4. **TH-only dubbelschutters**: achteraan (komen later aan)

---

## 9. Conflictdetectie (na indeling)

Toon een ⚠-waarschuwing op een doel bij:

| Conflict | Uitzondering (geen waarschuwing) |
|---|---|
| Alle schutters van hetzelfde gilde | Zone heeft maar 1 gilde |
| Meer dan 6 beurten in een helft | — |
| Meer dan 5 beurten (aanbeveling) | — |
| Schutter op verkeerde afstand voor zone | — |
| Compound-schutter op niet-compound doel | Compound-schutter op 25m via R16-uitzondering (<3) |
| Niet-compound schutter op compound doel | Doel was herbestemd tot 25m (§4.2b); telt dan als 25m-doel |
| Dubbelschutter niet op eerste positie | — |

---

## 10. Invoer- en uitvoerformaat

### Invoer per schutter

```typescript
{
  schutter_id: number
  voornaam: string
  naam: string
  gilde_naam: string | null
  type_boog: 'Recurve' | 'Barebow' | 'Compound' | 'Andere'
  afstand: 12 | 18 | 25
  leeftijdscategorie: string
  geslacht: 'M' | 'V'
  aanmeldvolgorde: number          // laag = vroeg ingeschreven
  dubbel_eerste_helft: boolean
  dubbel_tweede_helft: boolean
}
```

### Invoer wedstrijdconfiguratie

```typescript
{
  aantalDoelen: number             // totaal aantal doelen
  aantalDoelen18m: number
  aantalDoelen12m: number
  compoundStartdoel: number        // eerste doelnummer van compound-zone
  aantalCompoundDoelen: number
}
```

### Uitvoer

```typescript
{
  doelen: DoelMetConflicten[]      // elk doel met schutterslots + conflictenlijst
  nietIngedeeld: Schutter[]        // schutters die niet geplaatst konden worden
}
```

Elk doel heeft:
```typescript
{
  nummer: number
  zone: '25m' | 'compound' | '18m' | '12m'
  schutters: DoelSlot[]            // gesorteerd zoals §8
  vergrendeld: boolean
  conflicten: Conflict[]
}
```

---

## 11. Samenvatting prioriteitsvolgorde

Bij conflicterende regels geldt deze prioriteit (hoog → laag):

1. Correcte zone (R1) — harde regel
2. Max 6 beurten (R2) — harde regel
3. Vergrendelde doelen respecteren (R3)
4. Min 4 beurten per doel (R4-hard) — harde regel, uitzondering: onvoldoende beurten in zone
4. Dubbelschutters op de laatste actieve doelen van hun zone (R7)
5. Registratievolgorde → doelvolgorde (R8)
6. Streef 5 beurten per doel (R4)
7. Gelijke verdeling over doelen (R9), voorkeur 4 boven 6
8. Gilden op aaneengesloten doelen (R10)
9. Max 2 per gilde per doel (R5) — zacht, zie §6.1
10. Min 2 gilden per doel (R6) — zacht, uitzonderingen in §6.1 en §7.2

> **Nota (te reconcilieren).** Deze tabel zet R6 (min 2 gilden) onderaan, maar dat
> spreekt de eigen voorbeelden tegen: §7.1 houdt `A3B3/A3B3` aan (geen mono-doelen) en
> §7.4 splitst het kleine gilde net voor diversiteit. De implementatie volgt de
> voorbeelden en rangschikt **R6 hoog** (net onder de bezettings-/verdeel-regels, boven
> R8-volgorde en de compactheidsregels). De aanmeldvolgorde (R8/R9) werkt daarbij op
> **gilde-niveau** (vroeger aangemelde gilden vooraan; volgorde binnen een gilde telt
> niet), zodat ze diversiteit niet ondermijnt. Zie de geimplementeerde
> doelfunctie in [ALGORITME_v2.0.md §9b/§10](ALGORITME_v2.0.md) en de motivatie in
> [ALGORITHM_DEFENSE.md §2 en §6](ALGORITHM_DEFENSE.md). Beslissing over de canonieke
> volgorde ligt bij de maintainer.

> **Uitzondering bij restplaatsing:** wanneer overgebleven schutters (losse
> gildeleden + ontkoppelde overflow-paren) per gilde-blok worden geplaatst,
> weegt "gilden op aaneengesloten doelen" (R10) zwaarder dan "streef 5 beurten"
> (punt 6): een doel mag dan tot 6 beurten gevuld worden om een gilde-blok
> samen te houden. Zo blijft ook de laatst ingedeelde gilde op naburige doelen.
> Zie [ALGORITME_v2.0.md §7](ALGORITME_v2.0.md).
