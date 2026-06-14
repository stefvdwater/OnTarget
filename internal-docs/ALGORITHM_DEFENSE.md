# Verdediging: waarom de verfijnde indeling beter is

Dit document beargumenteert waarom het indelingsalgoritme na de toevoeging van een
expliciete doelfunctie en een lokale-zoektocht-verfijning (fase 7) aantoonbaar
betere indelingen produceert dan de pure greedy-constructie, zonder de stabiliteit
of uitlegbaarheid op te geven.

> TL;DR. De auto-indeling is geen sorteerprobleem maar **lexicografische
> constrained optimization**. We maken die doelfunctie expliciet en meetbaar,
> houden de bestaande greedy-constructie als (uitlegbare) startoplossing, en
> voegen een begrensde, deterministische verbeterstap toe die enkel zetten
> aanvaardt die de doelfunctie STRIKT verbeteren. Daardoor is de uitkomst
> bewijsbaar nooit slechter dan voorheen, en op de probleemgevallen strikt beter.
> Het test-harnas (`test/`, `npm test`) maakt "beter" een getal en vangt
> regressies.

---

## 1. Het probleem als optimalisatie

Elke zone is een klein toewijzingsprobleem: verdeel N schutters over K fysieke
doelen onder **harde constraints** (juiste zone, <= 6 beurten/helft, vergrendelde
doelen, >= 4 beurten per actief doel) en minimaliseer de afwijking van een reeks
**zachte voorkeuren in strikte prioriteitsvolgorde** (lexicografisch). De vorige
implementatie was een handmatig getunede greedy heuristiek (paren + tweesporen-LPT,
6 fasen). Greedy heuristieken zijn snel en uitlegbaar maar bereiken zelden het
lexicografische optimum over de hele inputruimte: ze nemen lokaal goede beslissingen
die globaal suboptimaal blijken.

De sleutel om dit als optimalisatie te behandelen is een **expliciete doelfunctie**.
Zonder die functie is "beter" een mening; met die functie is het een vergelijkbaar
getal (een vector).

---

## 2. De doelfunctie (meetinstrument)

Voor elke indeling berekenen we een **lexicografische score-vector** (lager = beter;
twee indelingen worden term per term vergeleken, de eerste verschillende term
beslist). De vector codeert de prioriteitshierarchie:

| # | Term | Regel | Betekenis |
|---|------|-------|-----------|
| 0-1 | `H_zone`, `H_over6` | R1, R3 | harde grenzen (horen 0) |
| 2 | `nietIngedeeld` | R2/R3b | plaats zoveel mogelijk schutters |
| 3 | `onder4` | R4-hard | elk actief doel >= 4 beurten |
| 4 | `dubbelsAchter` | R7 | dubbels op de laatste actieve doelen |
| 5 | `overvol` | R10b/R12 | nooit >5 als het anders kan, gelijk verdelen |
| 6 | `monoGilde` | R6 | minstens 2 gilden per doel (kern-diversiteit) |
| 7 | `volgorde` | R8/R9 | vroeger aangemelde GILDEN op de voorste doelen |
| 8 | `aaneengesloten` | R11b | gilde niet over de hal gesplitst |
| 9 | `uitgesmeerd` | R11 | gilde niet dunner dan ~2/doel (niet uitsmeren) |
| 10 | `stapeling` | R5 | ~2 per gilde, geen 3-stapel (2-2-1-vorm) |
| 11 | `onderstreef` | R10 | doel naar 5 i.p.v. 4 - LAAGSTE (nooit door uitsmeren) |

De functie staat **twee keer onafhankelijk** geimplementeerd: in
[`indeling.ts`](../src/renderer/src/algoritme/indeling.ts) (`scoreToestand`, per zone,
stuurt de verbeterstap) en in [`test/harnas.ts`](../test/harnas.ts) (`scoreVector`,
globaal, onafhankelijke rechter in de tests). Dat de verbeterstap de *onafhankelijke*
score nooit verslechtert (bewezen op 400 fuzz-cases) is sterk bewijs dat beide
encoderingen de bedoeling delen.

### Waarom deze volgorde (en niet de letterlijke §11-tabel)

Twee bewuste keuzes wijken af van de letterlijke tabellen in de docs; beide volgen
de **canonieke voorbeelden**, niet de (tegenstrijdige) opsommingen. Zie §6.

- **De volgorde-term werkt op GILDE-niveau, niet op individuele schutters.**
  R8/R9 betekent: een gilde dat vroeger aanmeldt hoort op de voorste doelen. De
  volgorde BINNEN een gilde doet er niet toe. Concreet: per gilde een aanmeld-sleutel
  (gemiddelde aanmeldvolgorde van zijn leden) en een positie (gemiddelde doel-rang);
  we tellen de gilde-paren waarbij het vroeger aangemelde gilde gemiddeld op een later
  doel staat. Een individuele (pairwise) maat zou twee gilden uiteenrafelen (D1 =
  alleen A, D2 = alleen B) om inversies te minimaliseren - precies wat
  [ALGORITHM_SPEC §7.1](ALGORITHM_SPEC.md) verbiedt. De gilde-maat heeft dat probleem
  niet: A3B3/A3B3 en A6/B6 scoren er gelijk op, dus diversiteit (hoger) beslist.
- **Diversiteit (`monoGilde`, term 6) staat boven de volgorde-term.**
  Zo wordt nooit een mono-gilde doel gemaakt om gilden te ordenen.
- **`overvol` (gelijke verdeling / >5 vermijden) boven `monoGilde`.**
  [ALGORITHM_SPEC §7.4](ALGORITHM_SPEC.md) zegt letterlijk "gelijke verdeling heeft
  prioriteit op gildediversiteit".
- **De bezetting is GESPLITST: `overvol` (hoog) en `onderstreef` (laagste).**
  Een doel >5 vullen (richting 6) is slecht en blijft hoog bestraft. Maar een doel op
  4 i.p.v. 5 is prima (R4-hard voldaan); dat naar 5 brengen (`onderstreef`) staat
  onderaan. Anders smeert het algoritme een gilde 1-per-doel uit enkel om doelen tot 5
  te vullen (de "Schoonbroek dun verspreid"-klacht). Streef-5 mag nooit compactheid
  kopen.
- **`uitgesmeerd` (R11) boven `stapeling` (R5, 2-2-1-vorm).**
  Een gilde over veel doelen uitsmeren is erger dan een enkele 3-stapel: een compacte
  3-stapel (5 leden op 3 doelen als 2+2+1 of 1+1+3) verslaat een gilde over 5 doelen.
  Bij gelijke compactheid beslist de vorm wel (2-2 boven 3-1, 2-2-2 boven 3-3) - de
  voorbeelden uit de brief, want daar is er geen uitsmeer-afweging.
- **`aaneengesloten` (R11b) boven beide compactheidstermen.**
  Een gilde over de hal splitsen is de grofste compactheidsfout.

---

## 3. Architectuur: construct + improve

We hebben drie opties afgewogen:

1. **Pure greedy verder tunen.** Lage risico's, maar elke fix is ad-hoc en de
   suboptimaliteit verschuift naar de volgende inputklasse. Geen garantie.
2. **Volledige herschrijving naar een exacte solver (ILP/branch-and-bound per zone).**
   Dichtst bij optimaal, maar verliest uitlegbaarheid (organisatoren moeten de output
   vertrouwen en soms voorspellen), is zwaarder, en riskeert de stabiele, vertrouwde
   uitkomsten te vervangen door "anders maar even goed".
3. **Construct + improve (gekozen).** Behoud de greedy-constructie als warme start
   (stabiel, uitlegbaar), en voeg een **lokale zoektocht** (hill-climbing) toe die
   enkel STRIKT verbeterende zetten aanvaardt op de expliciete doelfunctie.

Optie 3 combineert het beste van beide: de basis blijft de indeling die organisatoren
kennen, en de verbeterstap doet enkel kleine, individueel verdedigbare ruilen
("schutter X van doel 5 naar doel 6, want dat geeft doel 6 een tweede gilde zonder
iets hogers te schenden"). Cruciaal voor het bewijs: omdat enkel verbeteringen worden
aanvaard, **kan de uitkomst nooit slechter zijn dan de constructie alleen**.

### De verbeterstap (fase 7)

- **Buurt:** een schutter VERPLAATSEN naar een ander actief doel van dezelfde zone,
  of twee schutters RUILEN tussen twee doelen.
- **Aanvaarding:** best-improvement, deterministisch; een zet wordt enkel toegepast
  als ze de zone-score lexicografisch strikt verlaagt. Begrensd (max 200 iteraties
  per zone; in de praktijk enkele).
- **Veiligheid:** dubbeldoelen (R7/R8) en hun schutters blijven onaangeroerd; een
  compound-schutter op een 25m-doel (R4b/R16) blijft staan. De harde grenzen zitten
  als bovenste score-termen, dus ze kunnen nooit ingeruild worden voor een lagere
  voorkeur. Dubbeldoelen tellen wel mee in de fysieke rang-as, zodat een gilde dat
  over een dubbeldoel heen ligt correct als niet-aaneengesloten telt.
- **Determinisme:** vaste iteratievolgorde en tie-breaks. Dezelfde input geeft altijd
  dezelfde output (organisatoren kunnen de uitkomst voorspellen).

---

## 4. De gevonden zwakte: mono-gilde-staarten

De paren+tweesporen-constructie stapelt het surplus van een scheef gilde op het
**laatste actieve doel**, wat een mono-gilde doel oplevert waar diversiteit haalbaar
was. Drie representatieve gevallen (constructie -> verfijnd):

**§7.4 - A×10, B×2, 2 doelen** (het canonieke voorbeeld dat de v2.0-implementatie
bewust fout deed):

```
constructie:  D1 A:4 B:2 (6) | D2 A:6 (6)        <- D2 mono-A
verfijnd:     D1 A:5 B:1 (6) | D2 A:5 B:1 (6)     <- exact ALGORITHM_SPEC §7.4
```

De verfijning ruilt een B van D1 met een A van D2: beide doelen krijgen twee gilden.
`monoGilde` 1 -> 0; B raakt minder compact (op 2 doelen i.p.v. 1), maar dat is een
lagere prioriteit - precies de afweging "diversiteit wint, compactheid wijkt".

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

In elk geval daalt de mono-term naar 0 en verbetert de volledige score-vector
lexicografisch strikt. De reeds-goede indelingen (§7.1 `A3B3/A3B3`, §7.2 `A4/A4`,
`B2C2`-rijen) blijven **onveranderd**: daar vindt de zoektocht geen verbeterende zet.

### 4b. Twee zwaktes uit echte data (wedstrijd Vosselaar, 80 schutters)

- **Gilde dun uitgesmeerd.** Een gilde van 5 (Schoonbroek) raakte over 5 doelen
  verspreid (1 per doel), omdat de score "een doel naar 5 vullen" boven "een gilde
  niet uitsmeren" zette. Opgelost door de bezetting te splitsen (`onderstreef`
  helemaal onderaan) en `uitgesmeerd` boven `stapeling` te plaatsen. Resultaat: het
  gilde staat nu compact op 3 aaneengesloten doelen (2+2+1).
- **Vroege gilde achteraan door dubbelvulling.** Een vroeg aangemelde gilde
  (Herentals, aanmeld 8-12) werd volledig naar de achterste dubbeldoelen gezogen,
  omdat die doelen met de VROEGSTE beschikbare normalen werden gevuld. Opgelost door
  dubbeldoelen (die achteraan staan) te vullen met de LAATST aangemelde normalen
  (`normalenAchteraan`). Resultaat: Herentals staat nu vooraan (doel 1-2), en de
  dubbeldoelen worden door de laatst aangemelde gilden gevuld. Regressietests in
  [`test/optimaliteit.test.ts`](../test/optimaliteit.test.ts) ("Vosselaar-regressies").

---

## 5. Garanties en bewijs

Alles in [`test/`](../test/), draaien met `npm test` (zero-dependency: Node's eigen
test-runner via een kleine resolver-hook, geen extra npm-pakket).

1. **Nooit slechter (monotonie).** Over **400 willekeurige scenario's** (200 zonder,
   200 met dubbels; `invarianten.test.ts`) geldt `score(verfijnd) <= score(constructie)`
   lexicografisch, altijd. De verfijning kan per definitie geen hogere voorkeur
   opofferen voor een lagere.
2. **Strikt beter op de probleemgevallen.** `optimaliteit.test.ts` bewijst voor de
   drie scenario's uit §4 dat de score strikt daalt en de mono-term afneemt.
3. **Harde constraints altijd gerespecteerd.** In alle 400 fuzz-cases: geen doel
   > 6 beurten, elke schutter in de juiste zone, niemand verdwenen of dubbel
   geplaatst. De verfijning plaatst exact dezelfde schutters als de constructie.
4. **Geen onnodige wijziging.** Op reeds-optimale indelingen is de verfijning een
   no-op (gelijke score) - ze churnt geen vertrouwde uitkomsten.
5. **Determinisme en terminatie.** Strikt dalende lexicografische score over
   begrensde gehele vectoren -> eindig; plus een harde iteratiecap.

Het harnas ving ook een echte bug tijdens de ontwikkeling: een vroege versie mat
contiguiteit in een samengeperste rang-as (zonder dubbeldoelen) en verslechterde zo
de onafhankelijke score. Dat is precies de waarde van het meetinstrument.

---

## 6. Noten over regels die fout of onderbepaald zijn (ter beslissing van de mens)

Niet eenzijdig gewijzigd; gesignaleerd zoals de brief vraagt.

1. **Positie van R6 (min 2 gilden) in de prioriteitstabellen is tegenstrijdig.**
   Zowel [ALGORITHM_SPEC §11](ALGORITHM_SPEC.md) als de opsomming in de brief zetten
   "min 2 gilden per doel" ONDERAAN, maar de canonieke voorbeelden §7.1 (`A3B3/A3B3`,
   geen `A6/B6`) en §7.4 (B splitsen voor diversiteit) en de brief-proza ("diversiteit
   wint ... het belangrijkste blijft: minstens 2 gilden per doel") behandelen
   diversiteit als HOGE prioriteit. De implementatie volgt de voorbeelden (diversiteit
   hoog, net onder gelijke verdeling). **Aanbeveling:** verplaats R6 in §11 naar net
   onder de bezettings-/verdeel-regels en boven de compactheids- en max-2-regels.

2. **Rule-nummering verschilt tussen documenten.** In ALGORITHM_SPEC is R4 = streef-5,
   R5 = max-2, R6 = min-2-gilden, R10 = aaneengesloten; in RULES_HIERARCHY is R10 =
   streef-5, R11b = aaneengesloten, enz. Dezelfde naam verwijst naar verschillende
   regels. **Aanbeveling:** een canonieke nummering kiezen en de andere docs eraan
   refereren.

3. **`aaneengesloten` (R11b) vs 2-2-1-vorm (R5) onderlinge volgorde is onderbepaald.**
   De brief zegt "diversiteit wint, compactheid wijkt", maar de 2-2-1-vorm is zelf een
   diversiteits-verfijning. We kozen: een gilde NIET over de hal splitsen weegt zwaarder
   dan een enkele 3-stapel vermijden (zie §2). Ter bevestiging door de mens.

4. **`floor(B/4)` dwingt soms hoge bezetting bij weinig schutters.** 6 schutters met 2
   vrije doelen komen op 1 doel (6 beurten), want 2 doelen zouden onder 4 zakken. Dit is
   conform R4-hard maar kan een organisator verrassen (waarom niet 3+3 met een
   waarschuwing?). Ter beslissing of R4-hard hier een uitzondering verdient.

5. **Compound-op-25m-waarschuwing (R16-uitzondering).** [`conflicten.ts`](../src/renderer/src/algoritme/conflicten.ts)
   geeft "compound schutter op niet-compound doel" altijd, terwijl
   [ALGORITHM_SPEC §9](ALGORITHM_SPEC.md) zegt dat die waarschuwing bij de <3-uitzondering
   (R16) NIET hoort te verschijnen. Bestaande discrepantie, niet aangeraakt in dit werk.

---

## 7. Scope en grenzen

- De verfijning zoekt een **lokaal** optimum (hill-climbing), geen gegarandeerd globaal
  optimum. In de praktijk ruimt ze de mono-staarten en losse contiguiteits-defecten op;
  ze herstructureert geen hele zone. Dat is een bewuste afweging voor snelheid,
  determinisme en uitlegbaarheid.
- De verfijning raakt **dubbeldoelen niet** (hun samenstelling is al zorgvuldig
  opgebouwd in fase 1, en rusttijd-regels R8 zitten niet in de doelfunctie). Een
  zeldzame mono-staart die volledig uit dubbeldoel-vulling bestaat blijft dus staan -
  maar die is doorgaans onvermijdelijk (alle normalen van 1 gilde).
- De verfijning **opent geen nieuwe doelen**: het aantal actieve doelen blijft zoals de
  constructie het koos (dat codeert R10/R4-hard). Ze herverdeelt enkel binnen de actieve
  doelen.
```
