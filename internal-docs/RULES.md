# On Target — Regels voor Doelindeling

Dit is de **canonieke regellijst** voor de doelindeling: de regels in gewone taal, gegroepeerd per prioriteitsniveau, met een vaste nummering (R1-R19, C1-C4). Hogere niveaus overrulen lagere bij conflicten. Alle andere docs en de code-comments verwijzen naar deze nummering.

- Het gewenste gedrag met randgevallen staat in [ALGORITHM_SPEC.md](ALGORITHM_SPEC.md).
- De implementatie en de doelfunctie staan in [ALGORITHM.md](ALGORITHM.md).

## Context: wedstrijdformaat en doelvolgorde

- Elke wedstrijd bestaat altijd uit **2 helften**.
- De doelen worden in deze volgorde ingedeeld (van voor naar achter): **25m normaal** (op aanmeldvolgorde, met compound-doelen op een manueel aangegeven positie) to **25m compound** to **18m** to **12m** (helemaal achteraan).
- Binnen elke zone staan **dubbelschutters achteraan**, op de **laatste actieve doelen** van die zone: de laatste doelen die effectief gevuld worden, niet de fysiek laatste doelen. Voorbeeld: bij 100 doelen en 20 schutters worden er typisch 4 doelen gebruikt; dubbelschutters komen dan op doel 4, niet op doel 100.
- **Afstand** (niet leeftijd) bepaalt de zone (25m / 18m / 12m). **Boogtype** is enkel op 25m relevant (compound apart); op 18m en 12m maakt het geen verschil voor de plaatsing (wel bijgehouden in het fiche).
- Het aantal doelen per afstand en het totaal zijn configureerbaar per wedstrijd (zie C1-C4 onderaan).

---

## Niveau 1 — Harde constraints (nooit schenden)

**R1.** Een schutter schiet altijd op zijn correcte afstand (25m / 18m / 12m), bepaald door het schuttersfiche, nooit door leeftijd.

**R2.** Er staan altijd minstens **2 verschillende gilden** op een doel.
- Uitzondering: alleen als er onvoldoende schutters zijn (bijv. 1 schutter op een 18m-doel, of 2 schutters van hetzelfde gilde op een dunbezet doel). Wordt altijd gesignaleerd aan de organisatie.

**R3.** Een doel heeft nooit meer dan **6 beurten** per helft.

**R3b.** Als het totaal aantal schutters de maximale capaciteit van alle doelen overschrijdt, verdeelt de software zoveel mogelijk schutters en waarschuwt de organisatie. Het is de verantwoordelijkheid van de organisatie om voldoende doelen te voorzien.

**R4.** Compound schutters op 25m staan nooit op hetzelfde doel als niet-compound schutters op 25m.
- Uitzondering: bij minder dan 3 compound schutters worden zij bij anderen geplaatst (zie R16).

**R4b.** Een compound schutter die op een niet-compound doel staat (uitzondering R4) schiet **altijd als allereerste**, vóór alle andere schutters op dat doel, inclusief dubbelschutters. Dit heeft voorrang op alle andere volgorderegels.

**R5.** Dubbelschutters schieten **als eerste** en hun tweede beurt **als laatste** binnen hun helft, tenzij een compound schutter aanwezig is op hetzelfde doel (zie R4b).

---

## Niveau 2 — Sterke voorkeuren (zo weinig mogelijk afwijken)

**R6.** Doelvolgorde van voor naar achter (per zone): 25m normaal to 25m compound to 18m to 12m. Binnen elke zone staan **dubbeldoelen achteraan** (op de laatste actieve doelen van die zone).
- Het compound startdoel is manueel configureerbaar door de organisatie.
- De aanmeldvolgorde is enkel relevant **binnen dezelfde zone**: een 18m-schutter die vroeg aanmeldt staat toch achteraan omdat 18m altijd achteraan is.

**R7.** Dubbelschutters worden op de **laatste actieve doelen van hun zone** geplaatst, dus op de achterkant van het gevulde blok, **niet** op fysiek lege doelen helemaal achteraan de zone. Wanneer er meerdere dubbelgroepen zijn, krijgt de vroegst aangemelde groep het laagste van die achterste doelen (R9 binnen het dubbel-blok).

**R8.** Dubbelschutters worden **samen** op één doel geplaatst.
- Bij **2 of meer dubbelschutters** op een doel: minstens **1 normale schutter** verplicht voor voldoende rusttijd.
- Bij **2 EH- én 2 TH-dubbelschutters** op hetzelfde doel: minstens **2 normale schutters** verplicht (zij fungeren als scoreschrijvers die idealiter niet wisselen tussen helften). Deze 2 normals moeten van **verschillende gilden** zijn.

**R9.** De **aanmeldvolgorde binnen een zone** bepaalt de doeltoewijzing: vroeg aangemeld = voorste doelen binnen die zone. De volgorde **binnen** een doel maakt niet uit.

**R10.** Streef naar **5 schutters** per doel (gemeten in beurten per helft). Minimum is 4, maximum is 6.

**R10b.** Verdeel schutters **gelijkmatig** over de gebruikte doelen binnen een zone. Vul niet het eerste doel maximaal als dat de rest onevenredig leeg laat. Verspreid schutters echter niet over meer doelen dan nodig: R10 heeft prioriteit. Vermijd situaties waarbij meerdere doelen slechts 2 schutters hebben terwijl concentratie op minder doelen dichter bij 5 zou liggen.

---

## Niveau 3 — Zachte voorkeuren (best-effort)

**R11.** Plaats **~2 schutters van hetzelfde gilde** per doel.

**R11b.** Schutters van hetzelfde gilde staan op **aaneengesloten doelen** binnen hun zone, niet verspreid over de hal. Dit geldt ook voor de laatst ingedeelde gilde: overgebleven schutters worden per gilde als blok op naburige doelen geplaatst (zie [ALGORITHM.md](ALGORITHM.md), restplaatsing).
- Bij **restplaatsing** weegt aaneengesloten houden zwaarder dan het streefgetal van 5 (R10): een doel mag dan tot 6 beurten gevuld worden om een gilde-blok samen te houden. De harde grens van 6 beurten (R3) blijft staan.

**R12.** Bij over- of onderbezetting: kies liever voor **4 schutters** per doel dan voor **6**.

**R13.** Een eerste-helft-dubbelschutter (EH) en een tweede-helft-dubbelschutter (TH) worden bij voorkeur **gecombineerd op hetzelfde doel**.

**R14.** De normale schutter(s) op een dubbeldoel zijn bij voorkeur van **hetzelfde gilde** als de dubbelschutters, maar enkel als R2 (minstens 2 gilden) hierdoor niet geschonden wordt. De 2-gilden-regel heeft altijd prioriteit.

---

## Niveau 4 — Overige regels

**R15.** Schutters van hetzelfde gilde schieten **na elkaar** binnen een doel (volgorde binnen het doel).

**R16.** Minder dan 3 compound schutters: zij worden bij andere 25m-schutters geplaatst en schieten als allereersten (zie R4b). Vanaf 3 compound schutters krijgen zij altijd een eigen doel.

**R17.** Lege doelen zijn toegestaan. Niet alle doelen moeten gevuld worden.

**R18.** De volgorde van schutters **binnen** een doel maakt niet uit, behalve waar expliciete volgorderegels gelden (R4b, R5).

**R19.** Het geconfigureerde **aantal compound-doelen** is een bovengrens. De compound-zone wordt eerst verwerkt; compound-doelen die geen schutters kregen en niet vergrendeld zijn, worden herbestemd tot 25m-doelen. Zij behouden hun doelnummer (fysieke positie) en doen mee in de 25m-indeling. Op een herbestemd doel geldt de compound-conflictwaarschuwing niet. Een vergrendeld compound-doel blijft compound, ook als het leeg is.

---

## Dubbel schieten — voorbeelden

Dubbel schieten is wanneer een schutter een gemiste wedstrijd inhaalt in dezelfde sessie. De gilderegel (R2, ~2 per gilde) geldt ook voor doelen met dubbelschutters.

**Volledig dubbel** (eerste en tweede helft). Voorbeeld met 2 dubbelschutters (A, B) en 1 normale schutter (C):
- Volgorde: `A to B to C to A to B` (5 beurten op dat doel).

**Half dubbel** (enkel eerste of tweede helft, bijv. bij vroeg vertrek of late aankomst). Ook dan schiet die persoon eerst en laatst binnen die helft. Een EH-dubbel kan gecombineerd worden met een TH-dubbel (R13):
- 1e helft: `A to B to C to D to A`
- 2e helft: `E to B to C to D to E`
- (A schiet enkel dubbel in de eerste helft, E enkel in de tweede; B, C, D zijn gewone schutters.)

---

## Geimplementeerde doelfunctie (fase 7)

De auto-indeling optimaliseert deze hierarchie als een **lexicografische score-vector** (zie [ALGORITHM.md](ALGORITHM.md), de doelfunctie). Een verfijningsstap (lokale zoektocht) verbetert de greedy-constructie tot een lokaal optimum zonder ooit een hogere regel voor een lagere op te offeren. Twee punten verdienen aandacht bij het lezen van de niveaus hierboven:

- **R2 (min 2 gilden per doel) weegt zwaar**, niet licht: de implementatie plaatst het hoog in de doelfunctie, conform de voorbeelden in [ALGORITHM_SPEC §7.1/§7.4](ALGORITHM_SPEC.md). De aanmeldvolgorde (R9) werkt op **gilde-niveau** (vroeger aangemelde gilden vooraan; de volgorde binnen een gilde telt niet) en staat eronder.
- De onderlinge volgorde van **R11b (aaneengesloten)** en de **2-2-1-vorm (R11)** is een bewuste keuze (aaneengesloten weegt zwaarder dan een enkele 3-stapel vermijden).

## Open beslispunten (ter bevestiging door de mens)

Punten waar de regels onderbepaald of historisch tegenstrijdig waren; gesignaleerd, niet eenzijdig beslist. Volledige motivatie: [ALGORITHM.md](ALGORITHM.md), sectie doelfunctie.

1. **Positie van R2 (min 2 gilden) in de prioriteit.** Oudere prioriteitstabellen zetten "min 2 gilden per doel" onderaan, maar de canonieke voorbeelden (§7.1 `A3B3/A3B3` i.p.v. `A6/B6`; §7.4 B splitsen voor diversiteit) behandelen diversiteit als hoge prioriteit. De implementatie volgt de voorbeelden: diversiteit hoog, net onder gelijke verdeling. Deze canonieke lijst weerspiegelt dat al (R2 op niveau 1 als harde min, en zwaar gewogen in de doelfunctie).
2. **`aaneengesloten` (R11b) vs 2-2-1-vorm onderlinge volgorde.** Gekozen: een gilde NIET over de hal splitsen weegt zwaarder dan een enkele 3-stapel vermijden. Ter bevestiging.
3. **`floor(B/4)` dwingt soms hoge bezetting bij weinig schutters.** 6 schutters met 2 vrije doelen komen op 1 doel (6 beurten), want 2 doelen zouden onder 4 zakken. Conform R3/R10-min, maar kan een organisator verrassen (waarom niet 3+3 met een waarschuwing?). Ter beslissing of de min-4 hier een uitzondering verdient.
4. **Compound-op-25m-waarschuwing (R16-uitzondering).** [`conflicten.ts`](../src/renderer/src/algoritme/conflicten.ts) geeft "compound schutter op niet-compound doel" altijd, terwijl [ALGORITHM_SPEC §9](ALGORITHM_SPEC.md) zegt dat die waarschuwing bij de <3-uitzondering (R16) niet hoort te verschijnen. Bestaande discrepantie.

## Configureerbare parameters (per wedstrijd)

**C1.** Totaal aantal beschikbare doelen.
**C2.** Aantal 18m-doelen.
**C3.** Aantal 12m-doelen.
**C4.** Startdoel voor compound schutters (binnen de 25m-zone).

## Toekomstige regels

> Hier volgen nog complexere regels die later worden toegevoegd.
