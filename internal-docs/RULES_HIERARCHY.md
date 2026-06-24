# On Target — Regelhiërarchie voor Doelindeling

Regels zijn gegroepeerd per prioriteitsniveau. Hogere niveaus overrulen lagere niveaus bij conflicten.

---

## Niveau 1 — Harde constraints (nooit schenden)

**R1.** Een schutter schiet altijd op zijn correcte afstand (25m / 18m / 12m), bepaald door het schuttersfiche — nooit door leeftijd.

**R2.** Er staan altijd minstens **2 verschillende gilden** op een doel.
- Uitzondering: alleen als er onvoldoende schutters zijn (bijv. 1 schutter op een 18m-doel, of 2 schutters van hetzelfde gilde op een dunbezet doel). Wordt altijd gesignaleerd aan de organisatie.

**R3.** Een doel heeft nooit meer dan **6 beurten** per helft.

**R3b.** Als het totaal aantal schutters de maximale capaciteit van alle doelen overschrijdt, verdeelt de software zoveel mogelijk schutters en waarschuwt de organisatie. Het is de verantwoordelijkheid van de organisatie om voldoende doelen te voorzien.

**R4.** Compound schutters op 25m staan nooit op hetzelfde doel als niet-compound schutters op 25m.
- Uitzondering: bij minder dan 3 compound schutters worden zij bij anderen geplaatst (zie R16).

**R4b.** Een compound schutter die op een niet-compound doel staat (uitzondering R4) schiet **altijd als allereerste**, vóór alle andere schutters op dat doel — inclusief dubbelschutters. Dit heeft voorrang op alle andere volgordeRegels.

**R5.** Dubbelschutters schieten **als eerste** en hun tweede beurt **als laatste** binnen hun helft — tenzij een compound schutter aanwezig is op hetzelfde doel (zie R4b).

---

## Niveau 2 — Sterke voorkeuren (zo weinig mogelijk afwijken)

**R6.** Doelvolgorde van voor naar achter (per zone): 25m normaal → 25m compound → 18m → 12m. Binnen elke zone staan **dubbeldoelen achteraan** (op de laatste actieve doelen van die zone).
- Het compound startdoel is manueel configureerbaar door de organisatie.
- De aanmeldvolgorde is enkel relevant **binnen dezelfde zone** — een 18m-schutter die vroeg aanmeldt staat toch achteraan omdat 18m altijd achteraan is.

**R7.** Dubbelschutters worden op de **laatste actieve doelen van hun zone** geplaatst — dus op de achterkant van het gevulde blok, **niet** op fysiek lege doelen helemaal achteraan de zone. Wanneer er meerdere dubbelgroepen zijn, krijgt de vroegst aangemelde groep het laagste van die achterste doelen (R9 binnen het dubbel-blok).

**R8.** Dubbelschutters worden **samen** op één doel geplaatst.
- Bij **2 of meer dubbelschutters** op een doel: minstens **1 normale schutter** verplicht voor voldoende rusttijd.
- Bij **2 EH- én 2 TH-dubbelschutters** op hetzelfde doel: minstens **2 normale schutters** verplicht (zij fungeren als scoreschrijvers die idealiter niet wisselen tussen helften). Deze 2 normals moeten van **verschillende gilden** zijn.

**R9.** De **aanmeldvolgorde binnen een zone** bepaalt de doeltoewijzing: vroeg aangemeld = voorste doelen binnen die zone.

**R10.** Streef naar **5 schutters** per doel (gemeten in beurten per helft).

**R10b.** Verdeel schutters **gelijkmatig** over de gebruikte doelen binnen een zone. Vul niet het eerste doel maximaal als dat de rest onevenredig leeg laat. Verspreid schutters echter niet over meer doelen dan nodig — R10 heeft prioriteit. Vermijd situaties waarbij meerdere doelen slechts 2 schutters hebben terwijl concentratie op minder doelen dichter bij 5 zou liggen.

---

## Niveau 3 — Zachte voorkeuren (best-effort)

**R11.** Plaats **~2 schutters van hetzelfde gilde** per doel.

**R11b.** Schutters van hetzelfde gilde staan op **aaneengesloten doelen** binnen hun zone, niet verspreid over de hal. Dit geldt ook voor de laatst ingedeelde gilde: overgebleven schutters worden per gilde als blok op naburige doelen geplaatst (zie [ALGORITME_v2.0.md §7](ALGORITME_v2.0.md)).
- Bij **restplaatsing** weegt aaneengesloten houden zwaarder dan het streefgetal van 5 (R10): een doel mag dan tot 6 beurten gevuld worden om een gilde-blok samen te houden. De harde grens van 6 beurten (R3) blijft staan.

**R12.** Bij over- of onderbezetting: kies liever voor **4 schutters** per doel dan voor **6**.

**R13.** Een eerste-helft-dubbelschutter (EH) en een tweede-helft-dubbelschutter (TH) worden bij voorkeur **gecombineerd op hetzelfde doel**.

**R14.** De normale schutter(s) op een dubbeldoel zijn bij voorkeur van **hetzelfde gilde** als de dubbelschutters — maar enkel als R2 (minstens 2 gilden) hierdoor niet geschonden wordt.

---

## Niveau 4 — Overige regels

**R15.** Schutters van hetzelfde gilde schieten **na elkaar** binnen een doel (volgorde binnen het doel).

**R16.** Minder dan 3 compound schutters: zij worden bij andere 25m-schutters geplaatst en schieten als allereersten (zie R4b).

**R17.** Lege doelen zijn toegestaan. Niet alle doelen moeten gevuld worden.

**R18.** De volgorde van schutters **binnen** een doel maakt niet uit, behalve waar expliciete volgordeRegels gelden (R4b, R5).

**R19.** Het geconfigureerde **aantal compound-doelen** is een bovengrens. De compound-zone wordt eerst verwerkt; compound-doelen die geen schutters kregen en niet vergrendeld zijn, worden herbestemd tot 25m-doelen. Zij behouden hun doelnummer (fysieke positie) en doen mee in de 25m-indeling. Op een herbestemd doel geldt de compound-conflictwaarschuwing niet.

---

## Geimplementeerde doelfunctie (fase 7)

De auto-indeling optimaliseert deze hierarchie als een **lexicografische score-vector**
(zie [ALGORITME_v2.0.md §9b/§10](ALGORITME_v2.0.md)). Een verfijningsstap (lokale
zoektocht) verbetert de greedy-constructie tot een lokaal optimum zonder ooit een
hogere regel voor een lagere op te offeren. Twee punten verdienen aandacht bij het
lezen van de niveaus hierboven:

- **R2 (min 2 gilden per doel) weegt zwaar**, niet licht: de implementatie plaatst het
  hoog in de doelfunctie, conform de voorbeelden in [ALGORITHM_SPEC §7.1/§7.4](ALGORITHM_SPEC.md).
  De aanmeldvolgorde (R9) werkt op **gilde-niveau** (vroeger aangemelde gilden vooraan;
  de volgorde binnen een gilde telt niet) en staat eronder.
- De onderlinge volgorde van **R11b (aaneengesloten)** en de **2-2-1-vorm (R11)** is een
  bewuste keuze (aaneengesloten weegt zwaarder dan een enkele 3-stapel vermijden).

Volledige motivatie en openstaande beslispunten: [ALGORITHM_DEFENSE.md](ALGORITHM_DEFENSE.md).

## Configureerbare parameters (per wedstrijd)

**C1.** Totaal aantal beschikbare doelen.
**C2.** Aantal 18m-doelen.
**C3.** Aantal 12m-doelen.
**C4.** Startdoel voor compound schutters (binnen de 25m-zone).
