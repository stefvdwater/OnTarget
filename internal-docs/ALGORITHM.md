# Indelingsalgoritme — implementatie en doelfunctie

Dit document beschrijft het indelingsalgoritme zoals geïmplementeerd in [`src/renderer/src/algoritme/indeling.ts`](../src/renderer/src/algoritme/indeling.ts): de paren-gebaseerde constructie met tweesporen-toewijzing (fase 0-6) en de lexicografische verfijning (fase 7), plus de **doelfunctie** die "beter" meetbaar maakt en de motivatie achter de aanpak.

> Voor de domeinbegrippen, harde regels en het gewenste gedrag met randgevallen: [ALGORITHM_SPEC.md](ALGORITHM_SPEC.md).
> Voor de canonieke regellijst en -nummering (R1-R19): [RULES.md](RULES.md). Alle regelverwijzingen hieronder volgen die nummering.

> **TL;DR.** De auto-indeling is geen sorteerprobleem maar **lexicografische constrained optimization**. We houden de bestaande greedy-constructie als uitlegbare startoplossing, maken de doelfunctie expliciet en meetbaar, en voegen een begrensde, deterministische verbeterstap toe die enkel zetten aanvaardt die de doelfunctie STRIKT verbeteren. Daardoor is de uitkomst bewijsbaar nooit slechter dan voorheen, en op de probleemgevallen strikt beter. Het test-harnas (`test/`, `npm test`) maakt "beter" een getal en vangt regressies.

---

# Deel A — De constructie (fase 0-6)

## 1. Kernidee

Het algoritme redeneert in **paren per gilde** in plaats van individuele schutters. Twee voordelen volgen direct:

1. Een paar = 2 schutters van hetzelfde gilde op één doel, dus de ~2-per-gilde-voorkeur (R11) wordt **per constructie** gerespecteerd (nooit meer dan 2 per gilde per doel uit de constructie).
2. Door **twee sporen** parallel over de doelen te leggen, elk spoor met paren van een andere reeks gilden, krijgt elk doel automatisch 2 verschillende gilden (R2) en loopt de diversiteit door tot het laatste doel. Er is **geen mono-gilde-staart** zoals bij round-robin verdeling.

De streefbezetting van 5 beurten per doel (R10) wordt bereikt door per doel ~2 paren (4 schutters) + 1 lone-schutter (oneven gildelid) te plaatsen.

## 2. Verwerkingsvolgorde

Per zone (`25m`, `compound`, `18m`, `12m`) afzonderlijk:

```
Fase 0 — Setup: aantal actieve doelen bepalen (over alle zonebeurten)
Fase 1 — Dubbelschutters plaatsen op de ACHTERSTE actieve doelen
Fase 2 — Paren vormen per gilde
Fase 3 — Tweesporen-toewijzing (de "puzzle") op de voorste actieve doelen
Fase 4 — Lone-/leftover-schutters verdelen
Fase 5 — Min-4-handhaving (elk actief doel >= 4 beurten, hard)
Fase 6 — Sortering binnen elk doel

Daarna, over alle zones samen (uitschakelbaar via opties.lokaleZoektocht):

Fase 7 — Lokale zoektocht: lexicografische verfijning (verplaats/ruil)
```

> De min-4-handhaving (fase 5) heet in de code en de tests "R4-hard" / `onder4`. Dat is **niet** rule R4 (compound apart), maar de harde ondergrens van R10 (minimum 4 beurten per actief doel). De naam is historisch.

## 3. Fase 0 — Setup

1. `pool` = alle niet-vergrendelde doelen van de zone, in volgorde.
2. Bereken totaal beurten `B` over **alle** schutters in de zone (dubbelaars + normalen): `B = Σ schutter.beurten` waarbij `beurten = (vol-dubbel ? 2 : 1)`.
3. Bepaal aantal actieve doelen: `aantalActief = min(|pool|, ⌈B/5⌉, ⌊B/4⌋)`.
   - `⌈B/5⌉` = streef naar 5 (R10).
   - `⌊B/4⌋` = nooit meer doelen dan we op >= 4 beurten kunnen brengen (de harde min-4).
   - Uitzondering: als `B < 4`, dan `aantalActief = 1`.
4. Garandeer dat alle dubbel-groepen een doel krijgen: `aantalActief = min(|pool|, max(aantalActief, M))` waarbij `M` = aantal dubbel-groepen.
5. `actieveDoelen = pool.slice(0, aantalActief)`.
6. Splits in twee blokken: `dubbelStart = aantalActief − M`; `dubbelDoelen` = de achterste M; `normaalDoelen` = de voorste.

Omdat `B` over **alle** beurten wordt berekend (incl. de 4 beurten/half van vol-dubbelaars), worden de dubbel-doelen meegerekend in `aantalActief`. Dubbelaars staan dus altijd op een doel dat ook effectief wordt gevuld, niet op fysiek lege doelen achteraan de zone.

## 4. Fase 1 — Dubbelschutters (R7, R8, R13)

Groepering via `groepeerdeDubbelaars`: vol-dubbelaars in paren van 2 (4 beurten + 1 normaal = 5); EH + TH gekoppeld, bij voorkeur uit verschillende gilden (R13); resterende EH of TH afzonderlijk op één doel.

Plaatsing: groep `i` gaat op `dubbelDoelen[i]`. De vroegst aangemelde groep komt op het **laagste van de achterste M actieve doelen** (R9 binnen het dubbel-blok), de laatst aangemelde groep op het achterste doel van de zone.

Per dubbeldoel worden verplichte normalen voor rusttijd (R8) toegevoegd via `kiesNormalenVoorDubbeldoel`. Daarna wordt aangevuld tot 5 beurten met respect voor R11 (~2 per gilde), met fallback waar nodig om R10 (5 beurten) te halen.

**Belangrijk (R8/R9):** de dubbeldoelen staan achteraan, dus hun normale vullers worden gekozen uit de **laatst aangemelde** normalen (`normalenAchteraan`, aflopend op aanmeldvolgorde). Anders zou de vulling de vroegste normalen pakken en een vroeg aangemeld gilde naar de achterste doelen zuigen. Zo blijven vroege gilden vooraan en vullen late gilden de dubbeldoelen.

## 5. Fase 2 — Pair-formation per gilde

Voor elk gilde G (in volgorde van laagste aanmeldvolgorde van de leden): leden gesorteerd op aanmeldvolgorde, opgedeeld in paren `(leden[0], leden[1]), (leden[2], leden[3]), ...`; bij oneven aantal is het laatste lid een `lone`. Elk paar krijgt `firstAanmeld = min(aanmeldvolgorde van beide schutters)` als metadata.

## 6. Fase 3 — Tweesporen-toewijzing

`Tnorm = |normaalDoelen| = aantalActief − M` = aantal doelen voor normalen (de voorste actieve doelen).

### 6.1 LPT bin-packing: gilden over 2 sporen verdelen

**Longest-Processing-Time** scheduling: sorteer gilden op aantal paren (groot to klein); ken elk gilde toe aan het spoor met momenteel het minst aantal paren (bij gelijkstand: spoor met laagste eerste-aanmeldvolgorde). LPT garandeert een gebalanceerde verdeling (<= 4/3 OPT), dus de twee sporen zijn vrijwel even lang en paren op alle actieve doelen, inclusief de laatste, komen uit twee verschillende gilden.

### 6.2 Sortering binnen spoor

Binnen elk spoor worden de gilden op aanmeldvolgorde gesorteerd, en de paren van elk gilde op aanmeldvolgorde. Zo komen vroege schutters op vroege doelen (R8/R9) terwijl paren van eenzelfde gilde aaneengesloten blijven (R11b).

### 6.3 Op doelen plakken

`spoorA[i]` op `normaalDoelen[i]` voor `i = 0 .. min(|spoorA|, Tnorm) − 1`, idem voor `spoorB`.

### 6.4 Randgeval: spoor langer dan Tnorm

Theoretisch onmogelijk bij correcte Fase 0. Indien toch: paren met index >= Tnorm worden **ontkoppeld** (beide schutters terug naar de lone-pool, in Fase 4 verdeeld). Dit voorkomt een mono-gilde-staart in extreme gevallen.

## 7. Fase 4 — Leftover-schutters verdelen (`plaatsLeftovers`)

De leftovers zijn de losse schutters (`lones`, oneven gildeleden) plus de schutters van eventueel ontkoppelde overflow-paren (§6.4). Ze worden **per gilde als blok** geplaatst, zodat ook een gilde dat volledig in de leftover-pool belandt (bv. de laatst aangemelde gilde, waarvan het paar overflowde) op aaneengesloten doelen blijft (R11b).

> **Prioriteit hier:** bij restplaatsing weegt **aaneengesloten gilde (R11b) zwaarder dan het streefgetal 5 (R10)**. Een doel mag tot 6 beurten gevuld worden om een gilde-blok samen te houden. De harde grens van 6 beurten (R3) blijft staan.

**Aanpak:**

1. Groepeer de leftovers per gilde. Verwerk de blokken op vroegste aanmeldvolgorde (R9: vroeg to voor, laat to achter; laat-aangemelde gilden krijgen vanzelf de nog vrije achterste doelen).
2. Per blok start de "thuisset" bij de doelindices waar dat gilde al staat uit Fase 1/3 (anker); de set groeit mee terwijl leden geplaatst worden. De **voorkeurszone** = thuisset + directe buren (index ± 1).
3. Plaats elk lid (op aanmeldvolgorde) via de eerste stap die een doel vindt:
   - **Stap a** — voorkeurszone, doel met `maxBeurten < 5` (compact bijvullen, streef 5).
   - **Stap b** — voorkeurszone, sta `maxBeurten <= 6` toe (R11b > streef 5).
   - **Stap c** — gilde nog nergens (volledig overflow): seed op een nog niet vol doel buiten een voorkeurszone.
   - **Stap d** — laatste redmiddel: elk passend doel (`maxBeurten <= 6`).
   - Geen plek: `L to nietIngedeeld` (zichtbaar als UI-waarschuwing).

Doelkeuze binnen elke stap (`kiesDoel`/`beterDoel`): voorkeur voor een doel dat het gilde al bevat (samenhouden), dan het **meest gevulde** doel (blok compact), dan het laagste doelnummer (R9-tiebreak).

## 8. Fase 5 — Min-4-handhaving (hard)

Elk actief doel >= 4 beurten. De enige uitzondering is wanneer de **hele zone** < 4 beurten heeft (`B < 4`); dan is `aantalActief = 1` en mag dat ene doel onder 4 staan.

Door `aantalActief = ⌊B/4⌋` in Fase 0 is er rekenkundig altijd genoeg ruimte, maar een individueel doel kan toch onder 4 zakken. Correctie: voor elk doel `d` met `maxBeurten(d) < 4` worden schutters van de achterste doelen (`maxBeurten > 4`) verschoven naar `d`, zonder R11/R2 op het brondoel te schenden en zonder `d` boven 6 te brengen. Lukt dat niet, dan wordt `d` als laatste redmiddel gedeactiveerd (schutters to `nietIngedeeld`). Dit is de "veiligheidskleppen"-fase.

## 9. Fase 6 — Sortering binnen elk doel

Conform [ALGORITHM_SPEC.md §8](ALGORITHM_SPEC.md):

1. Compound-schutters op niet-compound 25m-doel allereerst (R4b).
2. EH-dubbel en vol-dubbel schutters vooraan (R5).
3. Normalen, gegroepeerd per gilde (R15).
4. TH-only dubbelschutters achteraan (R5).

---

# Deel B — De doelfunctie en de verfijning (fase 7)

## 10. Het probleem als optimalisatie

Elke zone is een klein toewijzingsprobleem: verdeel N schutters over K fysieke doelen onder **harde constraints** (juiste zone, <= 6 beurten/helft, vergrendelde doelen, >= 4 beurten per actief doel) en minimaliseer de afwijking van een reeks **zachte voorkeuren in strikte prioriteitsvolgorde** (lexicografisch). De greedy-constructie (deel A) is snel en uitlegbaar, maar bereikt zelden het lexicografische optimum over de hele inputruimte: lokaal goede beslissingen blijken globaal soms suboptimaal. De sleutel is een **expliciete doelfunctie**: zonder die is "beter" een mening, met die functie is het een vergelijkbaar getal (een vector).

## 11. De doelfunctie (meetinstrument)

Voor elke indeling berekenen we een **lexicografische score-vector** (lager = beter; twee indelingen worden term per term vergeleken, de eerste verschillende term beslist):

| # | Term | Regel | Betekenis |
|---|------|-------|-----------|
| 0-1 | `H_zone`, `H_over6` | R1, R3 | harde grenzen (horen 0) |
| 2 | `nietIngedeeld` | R3b | plaats zoveel mogelijk schutters |
| 3 | `onder4` | min-4-hard | elk actief doel >= 4 beurten |
| 4 | `dubbelsAchter` | R7 | dubbels op de laatste actieve doelen |
| 5 | `overvol` | R10b/R12 | nooit >5 als het anders kan, gelijk verdelen |
| 6 | `monoGilde` | R2 | minstens 2 gilden per doel (kern-diversiteit) |
| 7 | `volgorde` | R9 | vroeger aangemelde GILDEN op de voorste doelen |
| 8 | `aaneengesloten` | R11b | gilde niet over de hal gesplitst |
| 9 | `uitgesmeerd` | R11 | gilde niet dunner dan ~2/doel (niet uitsmeren) |
| 10 | `stapeling` | R11 | ~2 per gilde, geen 3-stapel (2-2-1-vorm) |
| 11 | `onderstreef` | R10 | doel naar 5 i.p.v. 4 - LAAGSTE (nooit door uitsmeren) |

De functie staat **twee keer onafhankelijk** geimplementeerd: in [`indeling.ts`](../src/renderer/src/algoritme/indeling.ts) (`scoreToestand`, per zone, stuurt de verbeterstap) en in [`test/harnas.ts`](../test/harnas.ts) (`scoreVector`, globaal, onafhankelijke rechter in de tests). Dat de verbeterstap de *onafhankelijke* score nooit verslechtert (bewezen op 400 fuzz-cases) is sterk bewijs dat beide encoderingen de bedoeling delen.

### Waarom deze volgorde

Twee bewuste keuzes volgen de **canonieke voorbeelden**, niet de letterlijke oude prioriteitstabellen (zie de open beslispunten in [RULES.md](RULES.md)):

- **De volgorde-term werkt op GILDE-niveau, niet op individuele schutters.** R9 betekent: een gilde dat vroeger aanmeldt hoort op de voorste doelen; de volgorde BINNEN een gilde doet er niet toe. Per gilde een aanmeld-sleutel (gemiddelde aanmeldvolgorde) en een positie (gemiddelde doel-rang); we tellen de gilde-paren waar het vroeger aangemelde gilde gemiddeld op een later doel staat. Een individuele (pairwise) maat zou twee gilden uiteenrafelen (D1 = alleen A, D2 = alleen B) om inversies te minimaliseren, precies wat [ALGORITHM_SPEC §7.1](ALGORITHM_SPEC.md) verbiedt. De gilde-maat heeft dat probleem niet: A3B3/A3B3 en A6/B6 scoren er gelijk op, dus diversiteit beslist.
- **Diversiteit (`monoGilde`, R2) staat boven de volgorde-term**, zodat nooit een mono-gilde doel wordt gemaakt om gilden te ordenen.
- **`overvol` (gelijke verdeling / >5 vermijden) boven `monoGilde`.** [ALGORITHM_SPEC §7.4](ALGORITHM_SPEC.md) zegt letterlijk "gelijke verdeling heeft prioriteit op gildediversiteit".
- **De bezetting is GESPLITST: `overvol` (hoog) en `onderstreef` (laagste).** Een doel >5 vullen blijft hoog bestraft; een doel op 4 i.p.v. 5 is prima (min-4 voldaan). Anders smeert het algoritme een gilde 1-per-doel uit enkel om doelen tot 5 te vullen (de "dun verspreid"-klacht). Streef-5 mag nooit compactheid kopen.
- **`uitgesmeerd` (R11) boven `stapeling`.** Een gilde over veel doelen uitsmeren is erger dan een enkele 3-stapel: een compacte 3-stapel (5 leden als 2+2+1) verslaat een gilde over 5 doelen. Bij gelijke compactheid beslist de vorm wel (2-2 boven 3-1, 2-2-2 boven 3-3).
- **`aaneengesloten` (R11b) boven beide compactheidstermen.** Een gilde over de hal splitsen is de grofste compactheidsfout.

## 12. Architectuur: construct + improve

Afgewogen opties: (1) pure greedy verder tunen (ad-hoc, geen garantie); (2) volledige herschrijving naar een exacte solver (ILP/branch-and-bound, dichtst bij optimaal maar verliest uitlegbaarheid en stabiliteit); (3) **construct + improve (gekozen)**: behoud de greedy-constructie als warme start en voeg een **lokale zoektocht** (hill-climbing) toe die enkel STRIKT verbeterende zetten aanvaardt op de expliciete doelfunctie.

Optie 3 combineert het beste van beide: de basis blijft de indeling die organisatoren kennen, en de verbeterstap doet enkel kleine, individueel verdedigbare ruilen. Cruciaal voor het bewijs: omdat enkel verbeteringen worden aanvaard, **kan de uitkomst nooit slechter zijn dan de constructie alleen**.

## 13. De verbeterstap (fase 7)

- **Buurt:** een schutter VERPLAATSEN naar een ander actief doel van dezelfde zone, of twee schutters RUILEN tussen twee doelen.
- **Aanvaarding:** best-improvement, deterministisch; een zet wordt enkel toegepast als ze de zone-score lexicografisch strikt verlaagt. Begrensd (max 200 iteraties per zone; in de praktijk enkele).
- **Veiligheid:** dubbeldoelen (R7/R8) en hun schutters blijven onaangeroerd; een compound-schutter op een 25m-doel (R4b/R16) blijft staan. De harde grenzen zitten als bovenste score-termen, dus ze kunnen nooit ingeruild worden voor een lagere voorkeur. Dubbeldoelen tellen wel mee in de fysieke rang-as, zodat een gilde dat over een dubbeldoel heen ligt correct als niet-aaneengesloten telt.
- **Determinisme:** vaste iteratievolgorde en tie-breaks; dezelfde input geeft altijd dezelfde output.

De finale binnen-doel-sortering (fase 6) wordt ná fase 7 toegepast, zodat de volgorderegels (R4b/R5/R15) op het verfijnde resultaat gelden. Uitschakelbaar via `berekenIndeling(..., { lokaleZoektocht: false })`, gebruikt door het test-harnas om constructie en verfijning te vergelijken.

## 14. De gevonden zwakte: mono-gilde-staarten

De paren+tweesporen-constructie stapelt het surplus van een scheef gilde op het **laatste actieve doel**, wat een mono-gilde doel oplevert waar diversiteit haalbaar was. Drie representatieve gevallen (constructie to verfijnd):

**§7.4 - A×10, B×2, 2 doelen** (het canonieke voorbeeld dat de oude implementatie bewust fout deed):

```
constructie:  D1 A:4 B:2 (6) | D2 A:6 (6)        <- D2 mono-A
verfijnd:     D1 A:5 B:1 (6) | D2 A:5 B:1 (6)     <- exact ALGORITHM_SPEC §7.4
```

De verfijning ruilt een B van D1 met een A van D2: beide doelen krijgen twee gilden. `monoGilde` 1 to 0; B raakt minder compact, maar dat is een lagere prioriteit: precies "diversiteit wint, compactheid wijkt".

**§7.3 - A×7, B×6, C×4, 4 doelen:**

```
constructie:  A3B2(5) | A2B2(4) | A2B2(4) | C:4(4)          <- D4 mono-C
verfijnd:     A2B2(4) | A2B2(4) | A2B1C2(5) | A1B1C2(4)     <- 0 mono, 0 3-stapel
```

**Dominant gilde + singletons - A×8, B/C/D/E ×1, 3 doelen:**

```
constructie:  A3B1(4) | A1C1D1E1(4) | A:4(4)     <- D3 mono-A
verfijnd:     A3B1(4) | A2C1D1(4) | A3E1(4)      <- 0 mono
```

In elk geval daalt de mono-term naar 0 en verbetert de volledige score-vector strikt. Reeds-goede indelingen (§7.1 `A3B3/A3B3`, §7.2 `A4/A4`) blijven **onveranderd**.

### 14b. Twee zwaktes uit echte data (wedstrijd Vosselaar, 80 schutters)

- **Gilde dun uitgesmeerd.** Een gilde van 5 (Schoonbroek) raakte over 5 doelen verspreid (1 per doel), omdat de score "een doel naar 5 vullen" boven "een gilde niet uitsmeren" zette. Opgelost door de bezetting te splitsen (`onderstreef` helemaal onderaan) en `uitgesmeerd` boven `stapeling`. Resultaat: compact op 3 aaneengesloten doelen (2+2+1).
- **Vroege gilde achteraan door dubbelvulling.** Een vroeg aangemeld gilde (Herentals, aanmeld 8-12) werd naar de achterste dubbeldoelen gezogen, omdat die met de VROEGSTE normalen werden gevuld. Opgelost door dubbeldoelen te vullen met de LAATST aangemelde normalen (`normalenAchteraan`). Regressietests in [`test/optimaliteit.test.ts`](../test/optimaliteit.test.ts) ("Vosselaar-regressies").

## 15. Garanties en bewijs

Alles in [`test/`](../test/), draaien met `npm test` (zero-dependency: Node's eigen test-runner via een resolver-hook):

1. **Nooit slechter (monotonie).** Over **400 willekeurige scenario's** (200 zonder, 200 met dubbels; `invarianten.test.ts`) geldt `score(verfijnd) <= score(constructie)` lexicografisch, altijd.
2. **Strikt beter op de probleemgevallen.** `optimaliteit.test.ts` bewijst voor de drie scenario's uit §14 dat de score strikt daalt en de mono-term afneemt.
3. **Harde constraints altijd gerespecteerd.** In alle 400 fuzz-cases: geen doel > 6 beurten, elke schutter in de juiste zone, niemand verdwenen of dubbel geplaatst.
4. **Geen onnodige wijziging.** Op reeds-optimale indelingen is de verfijning een no-op (gelijke score).
5. **Determinisme en terminatie.** Strikt dalende lexicografische score over begrensde gehele vectoren to eindig; plus een harde iteratiecap.

Het harnas ving ook een echte bug tijdens de ontwikkeling: een vroege versie mat contiguiteit in een samengeperste rang-as (zonder dubbeldoelen) en verslechterde zo de onafhankelijke score. Dat is precies de waarde van het meetinstrument.

## 16. Scope en grenzen

- De verfijning zoekt een **lokaal** optimum (hill-climbing), geen gegarandeerd globaal optimum. Ze ruimt de mono-staarten en losse contiguiteits-defecten op; ze herstructureert geen hele zone. Bewuste afweging voor snelheid, determinisme en uitlegbaarheid.
- De verfijning raakt **dubbeldoelen niet** (hun samenstelling is al zorgvuldig opgebouwd in fase 1, en rusttijd-regels R8 zitten niet in de doelfunctie). Een zeldzame mono-staart die volledig uit dubbeldoel-vulling bestaat blijft dus staan, maar die is doorgaans onvermijdelijk (alle normalen van 1 gilde).
- De verfijning **opent geen nieuwe doelen**: het aantal actieve doelen (fase 0) blijft; ze herverdeelt enkel binnen de actieve doelen.

---

# Deel C — Prioriteitsvolgorde en verificatie

## 17. Prioriteitsvolgorde (samenvatting)

Bij conflicterende regels (dit is exact de score-vector van fase 7):

1. **R1** Correcte zone (hard)
2. **R3** Max 6 beurten (hard)
3. **R3** Vergrendelde doelen respecteren (hard)
4. **R3b** Zoveel mogelijk plaatsen (minimaliseer nietIngedeeld)
5. **min-4-hard** Min 4 beurten per doel (hard, uitz. zone-totaal < 4)
6. **R7** Dubbelschutters op de laatste actieve doelen van hun zone
7. **R10b/R12** Overvol vermijden: nooit >5 als het anders kan, gelijk verdelen
8. **R2** Min 2 gilden per doel (geen mono-gilde doel)
9. **R9** Vroeger aangemelde gilden op de voorste doelen (op gilde-niveau)
10. **R11b** Gilden op aaneengesloten doelen (niet over de hal)
11. **R11** Compactheid: gilde niet dunner dan ~2 per doel (niet uitsmeren)
12. **R11** ~2 per gilde per doel (2-2-1-vorm, geen 3-stapel)
13. **R10** Streef 5: een doel op 4 naar 5 brengen (LAAGSTE, nooit door uit te smeren)

> **Let op:** R2 (min 2 gilden) staat hier HOOG, niet onderaan. Oudere prioriteitstabellen zetten "min 2 gilden" laatst, maar dat spreekt de canonieke voorbeelden §7.1/§7.4 tegen. De aanmeldvolgorde (R9) werkt op **gilde-niveau**, zodat ze niet botst met diversiteit of compactheid. Zie de open beslispunten in [RULES.md](RULES.md).

> **Uitzondering bij restplaatsing (Fase 4):** om een gilde-blok aaneengesloten te houden mag een doel naar 6 beurten gevuld worden. Daar weegt aaneengesloten gilde (R11b) dus zwaarder dan het streefgetal 5 (R10), enkel voor de leftover-schutters.

## 18. Verificatie

Verwacht gedrag voor de scenario's uit [ALGORITHM_SPEC.md §7](ALGORITHM_SPEC.md):

| § | Scenario | Resultaat |
|---|---|---|
| 7.1 | A×6, B×6, 2 doelen | LPT to A→spoorA, B→spoorB. Doel 1 & 2 elk `AABB+filler` |
| 7.2 | A×8, 1 zone | Alles op spoorA, spoorB leeg. Doel 1: AAAA, Doel 2: AAAA |
| 7.4 | A×10, B×2, 2 doelen | Constructie geeft `A:4 B:2 \| A:6` (D2 mono); **fase 7 ruilt to `A:5 B:1 \| A:5 B:1`** |
| 7.5 | Vergrendeld doel midden | Filtering vooraf, ongewijzigd |
| 7.6 | Gilde-overflow | Paren+lones structureren reeds de ~2-per-gilde |

Sinds fase 7 zijn de mono-gilde-staarten uit deze klasse weg. Het volledige bewijs staat in [`test/`](../test/) en draait met `npm test`.

**Handmatige UI-test:** `npm run dev` to open een wedstrijd met diverse gilden to "Auto" to controleer visueel: laatste doelen hebben >= 2 gilden; paren van eenzelfde gilde liggen op naburige doelen; dubbelschutters staan op de laatste actieve doel(en) van hun zone; geen doel onder 4 beurten (tenzij zone-totaal < 4).
