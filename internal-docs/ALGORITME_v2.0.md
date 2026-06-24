# Indelingsalgoritme v2.0 — Paren-gebaseerd met tweesporen-toewijzing

Dit document beschrijft het indelingsalgoritme zoals geïmplementeerd in
`src/renderer/src/algoritme/indeling.ts` vanaf v2.0. Het vervangt de
"guild interleaving" benadering uit v1.

> Voor de domeinbegrippen, harde regels en voorkeuren zie
> [ALGORITHM_SPEC.md](ALGORITHM_SPEC.md) §1–§3.
> Voor de regelhiërarchie zie [RULES_HIERARCHY.md](RULES_HIERARCHY.md).

---

## 1. Kernidee

Het algoritme redeneert in **paren per gilde** in plaats van individuele
schutters. Twee voordelen volgen direct uit deze representatie:

1. Een paar = 2 schutters van hetzelfde gilde op één doel ⇒ R5 (max 2 per
   gilde per doel) wordt **per constructie** gerespecteerd.
2. Door **twee sporen** parallel over de doelen te leggen — elk spoor
   met paren van een andere reeks gilden — krijgt elk doel automatisch
   2 verschillende gilden (R6) en loopt de diversiteit door tot het
   laatste doel. Er is **geen mono-gilde-staart** zoals soms gebeurde
   bij round-robin verdeling.

De streefbezetting van 5 beurten per doel wordt bereikt door per doel
~2 paren (4 schutters) + 1 lone-schutter (oneven gildelid) te plaatsen.

---

## 2. Verwerkingsvolgorde

Per zone (`25m`, `compound`, `18m`, `12m`) afzonderlijk:

```
Fase 0 — Setup: aantal actieve doelen bepalen (over álle zonebeurten)
Fase 1 — Dubbelschutters plaatsen op de ACHTERSTE actieve doelen
Fase 2 — Paren vormen per gilde
Fase 3 — Tweesporen-toewijzing (de "puzzle") op de voorste actieve doelen
Fase 4 — Lone-schutters verdelen
Fase 5 — R4-hard handhaving (≥ 4 beurten per actief doel)
Fase 6 — Sortering binnen elk doel

Daarna, over alle zones samen (uitschakelbaar via `opties.lokaleZoektocht`):

Fase 7 - Lokale zoektocht: lexicografische verfijning (verplaats/ruil)
```

---

## 3. Fase 0 — Setup

1. `pool` = alle niet-vergrendelde doelen van de zone, in volgorde.
2. Bereken totaal beurten `B` over **alle** schutters in de zone
   (dubbelaars + normalen):
   ```
   B = Σ schutter.beurten   waarbij beurten = (vol-dubbel ? 2 : 1)
   ```
3. Bepaal aantal actieve doelen:
   ```
   aantalActief = min(|pool|, ⌈B/5⌉, ⌊B/4⌋)
   ```
   - `⌈B/5⌉` = streef naar 5 (R10).
   - `⌊B/4⌋` = nooit meer doelen dan we op ≥ 4 beurten kunnen brengen
     (R4-hard).
   - Uitzondering: als `B < 4`, dan `aantalActief = 1`.
4. Garandeer dat alle dubbel-groepen een doel krijgen:
   ```
   aantalActief = min(|pool|, max(aantalActief, M))
   ```
   waarbij `M` = aantal dubbel-groepen uit `groepeerdeDubbelaars`.
5. `actieveDoelen = pool.slice(0, aantalActief)`.
6. Splits in twee blokken:
   ```
   dubbelStart   = aantalActief − M           (≥ 0)
   dubbelDoelen  = actieveDoelen.slice(dubbelStart)   // de achterste M
   normaalDoelen = actieveDoelen.slice(0, dubbelStart) // de voorste
   ```

Belangrijk: omdat `B` over **alle** beurten wordt berekend (incl. de
4 beurten/half van vol-dubbelaars), worden de dubbel-doelen meegerekend
in `aantalActief`. Dubbelaars staan dus altijd op een doel dat ook
effectief wordt gevuld — niet op fysiek lege doelen achteraan de zone.

---

## 4. Fase 1 — Dubbelschutters (R7, R8, R13)

Groepering via `groepeerdeDubbelaars`:

- **Vol-dubbelaars** in paren van 2 (4 beurten + 1 normaal = 5).
- **EH + TH** gekoppeld, bij voorkeur uit verschillende gilden.
- Resterende EH of TH afzonderlijk op één doel.

Plaatsing: groep `i` gaat op `dubbelDoelen[i]`. Met andere woorden, de
vroegst aangemelde groep komt op het **laagste van de achterste M
actieve doelen** (R9 binnen het dubbel-blok), en de laatst aangemelde
groep komt op het hoogste/achterste doel van de zone.

Per dubbeldoel worden verplichte normalen voor rusttijd (R8) toegevoegd
via `kiesNormalenVoorDubbeldoel`. Daarna wordt het doel aangevuld tot
5 beurten met respect voor R5 (max 2 per gilde), met fallback waar
nodig om R10 (5 beurten) te halen.

**Belangrijk (R8/R9):** de dubbeldoelen staan achteraan, dus hun normale
vullers worden gekozen uit de **laatst aangemelde** normalen
(`normalenAchteraan`, aflopend op aanmeldvolgorde). Anders zou de vulling de
vroegste normalen pakken en een vroeg aangemelde gilde naar de achterste
doelen zuigen. Zo blijven vroege gilden vooraan en vullen late gilden de
dubbeldoelen - precies wat de aanmeldvolgorde vraagt.

Na fase 1: de dubbel-doelen zijn gevuld; resterende normalen gaan in
fase 2–3 naar `normaalDoelen`.

---

## 5. Fase 2 — Pair-formation per gilde

Voor elk gilde G (in volgorde van laagste aanmeldvolgorde van de leden):

```
leden_G = normalen-van-G, gesorteerd op aanmeldvolgorde
paren_G = [(leden[0], leden[1]), (leden[2], leden[3]), ...]
lone_G  = (oneven leden.length) ? leden[laatste] : geen
```

Elk paar krijgt als metadata `firstAanmeld = min(aanmeldvolgorde van beide
schutters)` zodat we later op vroege schutter kunnen sorteren.

---

## 6. Fase 3 — Tweesporen-toewijzing

`Tnorm = |normaalDoelen| = aantalActief − M` = aantal doelen voor normalen
(de voorste actieve doelen van de zone).

### 6.1 LPT bin-packing: gilden over 2 sporen verdelen

Het kern-idee is **Longest-Processing-Time** scheduling:

```
sorteer gilden op aantal paren (groot → klein)
spoorA = [], spoorB = []
voor elk gilde G:
  ken G toe aan het spoor met momenteel het minst aantal paren
  (bij gelijkstand: spoor met laagste eerste-aanmeldvolgorde)
```

LPT garandeert een gebalanceerde verdeling (≤ 4/3 OPT). In de praktijk
betekent dit dat de twee sporen vrijwel even lang zijn, dus paren op
alle actieve doelen — inclusief de laatste — komen uit twee verschillende
gilden.

### 6.2 Sortering binnen spoor

Binnen elk spoor worden de gilden op aanmeldvolgorde gesorteerd, en de
paren van elk gilde op aanmeldvolgorde:

```
spoor = sorteer-gilden-op(firstAanmeld)
      → flatten naar lijst van paren in die volgorde
```

Hiermee komen vroege schutters op vroege doelen (R8/R9), terwijl paren
van eenzelfde gilde aaneengesloten blijven (R10).

### 6.3 Op doelen plakken

```
voor i = 0 .. min(|spoorA|, Tnorm) - 1:
  plaats spoorA[i].schutters op normaalDoelen[i]
voor i = 0 .. min(|spoorB|, Tnorm) - 1:
  plaats spoorB[i].schutters op normaalDoelen[i]
```

### 6.4 Randgeval: spoor langer dan Tnorm

Theoretisch kan dit niet voorkomen bij correcte Fase 0. Indien toch:
paren met index ≥ Tnorm worden **ontkoppeld** — beide schutters van
het paar worden teruggegeven aan de lone-pool en in Fase 4 verdeeld.
Dit voorkomt een mono-gilde-staart in extreme gevallen.

---

## 7. Fase 4 — Leftover-schutters verdelen (`plaatsLeftovers`)

De leftovers zijn de losse schutters (`lones`, oneven gildeleden) plus de
schutters van eventueel ontkoppelde overflow-paren (§6.4). Ze worden
**per gilde als blok** geplaatst, zodat ook een gilde dat volledig in de
leftover-pool belandt (bv. de laatst aangemelde gilde, waarvan het paar
overflowde) op aaneengesloten doelen blijft staan.

> **Prioriteit hier:** bij restplaatsing weegt **R10 (aaneengesloten gilde)
> zwaarder dan het streefgetal 5**. Een doel mag tot 6 beurten gevuld worden
> om een gilde-blok samen te houden. De harde grens van 6 beurten (R3/R2)
> blijft staan.

**Aanpak:**

1. Groepeer de leftovers per gilde. Verwerk de gilde-blokken op vroegste
   aanmeldvolgorde (R9: vroeg → voor, laat → achter — laat-aangemelde gilden
   krijgen vanzelf de nog vrije achterste doelen).
2. Per blok start de "thuisset" bij de doelindices waar dat gilde al staat
   uit Fase 1/3 (anker). De set groeit mee terwijl leden geplaatst worden,
   zodat het blok aaneengesloten blijft. De **voorkeurszone** = thuisset +
   directe buren (index ± 1).
3. Plaats elk lid (op aanmeldvolgorde) via de eerste stap die een doel vindt:
   - **Stap a** — voorkeurszone, doel met `maxBeurten < 5` (compact bijvullen, streef 5).
   - **Stap b** — voorkeurszone, sta `maxBeurten ≤ 6` toe (R10 > streef 5).
   - **Stap c** — gilde nog nergens (volledig overflow): seed op een nog niet
     vol doel (`maxBeurten < 5`) buiten een voorkeurszone.
   - **Stap d** — laatste redmiddel: elk passend doel (`maxBeurten ≤ 6`).
   - Geen plek: `L → nietIngedeeld` (zichtbaar als UI-waarschuwing).

Doelkeuze binnen elke stap (`kiesDoel`/`beterDoel`): voorkeur voor een doel
dat het gilde al bevat (samenhouden), dan het **meest gevulde** doel (blok
compact houden), dan het laagste doelnummer (R9-tiebreak).

---

## 8. Fase 5 — R4-hard handhaving

R4-hard is strikt: elk actief doel ≥ 4 beurten. De enige uitzondering
is wanneer de **hele zone** < 4 beurten heeft (`B < 4`); dan is
`aantalActief = 1` en mag dat ene doel onder 4 staan.

Door `aantalActief = ⌊B/4⌋` in Fase 0 is er rekenkundig altijd genoeg
ruimte. Maar door de gekozen verdeling kan een individueel doel toch
onder 4 zakken (bv. een doel met enkel 1 paar = 2 beurten als spoor B
daar leeg was en geen lone werd toegewezen).

```
voor elk actief doel d met maxBeurten(d) < 4:
  benodigd = 4 - maxBeurten(d)
  loop actieveDoelen achterstevoren (laatste → eerste, excl. d):
    zolang maxBeurten(d') > 4 EN benodigd > 0:
      kies een verplaatsbare schutter van d':
        - verwijdering schendt R5/R6 niet op d'
        - toevoeging past op d (≤ 6 beurten)
      verplaats schutter d' → d
      benodigd--
  als benodigd > 0 na alle verschuivingen:
    laatste redmiddel: deactiveer d (schutters → nietIngedeeld)
```

Deze fase corrigeert achteraf; het is de "veiligheidskleppen"-fase.

---

## 9. Fase 6 — Sortering binnen elk doel

Ongewijzigd t.o.v. v1, conform [ALGORITHM_SPEC.md §8](ALGORITHM_SPEC.md):

1. Compound-schutters op niet-compound 25m-doel allereerst (R4b).
2. EH-dubbel en vol-dubbel schutters vooraan (R5).
3. Normalen, gegroepeerd per gilde (R15).
4. TH-only dubbelschutters achteraan (R5).

---

## 9b. Fase 7: Lokale zoektocht (lexicografische verfijning)

De gelaagde greedy-constructie (fase 0-6) geeft een goede, uitlegbare start, maar
bereikt niet altijd het lexicografische optimum. Bij **scheve gildegroottes** stapelt
ze het surplus van een gilde soms op het laatste actieve doel, wat een
**mono-gilde-staart** oplevert (een doel met maar 1 gilde terwijl 2 gilden haalbaar
waren). Klassiek voorbeeld: A×10, B×2 op 2 doelen gaf `A:4 B:2 | A:6` (D2 mono),
terwijl [ALGORITHM_SPEC §7.4](ALGORITHM_SPEC.md) `A:5 B:1 | A:5 B:1` voorschrijft.

Fase 7 lost dit op met **hill-climbing** over een kleine buurt, gestuurd door een
**expliciete doelfunctie**. Per zone:

1. Bereken de lexicografische zone-score (`scoreToestand`). De termvolgorde (hoog →
   laag): `over6 → onder4 → overvol → mono → volgorde → aaneengesloten → uitgesmeerd
   → stapeling → onderstreef`. De harde grenzen staan bovenaan en kunnen dus nooit
   voor een zachte voorkeur worden ingeruild. Let op twee bewuste keuzes: (a) `overvol`
   (>5 vermijden, gelijk verdelen) staat hoog, maar `onderstreef` (een doel naar 5
   i.p.v. 4 brengen) staat HELEMAAL onderaan - een doel op 4 is prima en we smeren er
   geen gilde voor uit; (b) `uitgesmeerd` (niet dunner dan ~2/doel) staat BOVEN
   `stapeling` (3-stapel vermijden): een compacte 3-stapel is beter dan een gilde over
   veel doelen verspreiden. Zie [ALGORITHM_DEFENSE.md §2](ALGORITHM_DEFENSE.md).
2. Zoek de best verbeterende **zet**: een schutter VERPLAATSEN naar een ander actief
   doel, of twee schutters RUILEN tussen twee doelen. Pas ze enkel toe als ze de
   zone-score **strikt** verlaagt (best-improvement, deterministisch). Herhaal tot
   geen verbetering meer mogelijk is (begrensd op 200 iteraties).

**Veiligheid en garanties:**

- **Nooit slechter.** Omdat enkel strikt verbeterende zetten worden aanvaard, kan de
  uitkomst nooit een slechtere score hebben dan de constructie alleen. Bewezen op 400
  fuzz-scenario's (`test/invarianten.test.ts`).
- **Harde constraints blijven.** Geen doel boven 6 (elke zet gecheckt), elke schutter
  blijft in zijn zone, en `over6`/`onder4` als bovenste score-termen beschermen R3/R4.
- **Dubbeldoelen onaangeroerd.** Doelen met een dubbelschutter (R7/R8) en hun vulling
  worden niet gewijzigd; een compound-schutter op een 25m-doel (R4b/R16) blijft staan.
  Dubbeldoelen tellen wél mee in de fysieke rang-as, zodat contiguiteit correct meet.
- **Geen nieuwe doelen.** Het aantal actieve doelen (fase 0) blijft; fase 7 herverdeelt
  enkel binnen de actieve doelen.
- **Determinisme.** Vaste iteratie- en tie-break-volgorde; dezelfde input → dezelfde
  output.

De finale binnen-doel-sortering (fase 6, `sorteerSchuttersOpDoel`) wordt ná fase 7
toegepast, zodat de volgorderegels (R4b/R5/R15) op het verfijnde resultaat gelden.

Uitschakelbaar via `berekenIndeling(..., { lokaleZoektocht: false })`, gebruikt door
het test-harnas om constructie en verfijning te vergelijken.

---

## 10. Prioriteitsvolgorde (samenvatting)

Bij conflicterende regels (dit is exact de score-vector van fase 7):

1. **R1** Correcte zone (hard)
2. **R3** Max 6 beurten (hard)
3. **R3** Vergrendelde doelen respecteren (hard)
4. **R2/R3b** Zoveel mogelijk plaatsen (minimaliseer nietIngedeeld)
5. **R4-hard** Min 4 beurten per doel (hard, uitz. zone-totaal < 4)
6. **R7** Dubbelschutters op de laatste actieve doelen van hun zone
7. **R10b/R12** Overvol vermijden: nooit >5 als het anders kan, gelijk verdelen
8. **R6** Min 2 gilden per doel (geen mono-gilde doel)
9. **R8/R9** Vroeger aangemelde gilden op de voorste doelen (op gilde-niveau)
10. **R11b** Gilden op aaneengesloten doelen (niet over de hal)
11. **R11/R15** Compactheid: gilde niet dunner dan ~2 per doel (niet uitsmeren)
12. **R5** Max ~2 per gilde per doel (2-2-1-vorm, geen 3-stapel)
13. **R10** Streef 5: een doel op 4 naar 5 brengen (LAAGSTE, nooit door uit te smeren)

> **Let op (afwijking van de oude tabel):** R6 (min 2 gilden) staat hier HOOG, niet
> onderaan. De oude opsomming en [ALGORITHM_SPEC §11](ALGORITHM_SPEC.md) zetten R6
> laatst, maar dat spreekt de canonieke voorbeelden §7.1/§7.4 tegen. De aanmeldvolgorde
> (R8/R9) werkt op **gilde-niveau** (een vroeger aangemeld gilde hoort vooraan; de
> volgorde binnen een gilde doet er niet toe), zodat ze niet botst met diversiteit of
> compactheid. Motivatie en openstaande nota: [ALGORITHM_DEFENSE.md §2 en §6](ALGORITHM_DEFENSE.md).

> **Uitzondering bij restplaatsing (Fase 4):** om een gilde-blok aaneengesloten
> te houden mag een doel naar 6 beurten gevuld worden. Daar weegt aaneengesloten
> gilde (R10) dus zwaarder dan het streefgetal 5 — enkel voor de leftover-schutters.

---

## 11. Verificatie

Verwacht gedrag voor de scenario's uit [ALGORITHM_SPEC.md §7](ALGORITHM_SPEC.md):

| § | Scenario | v2.0-resultaat |
|---|---|---|
| 7.1 | A×6, B×6, 2 doelen | LPT → A→spoorA, B→spoorB. Doel 1 & 2 elk `AABB+filler` |
| 7.2 | A×8, 1 zone | Alles op spoorA, spoorB leeg. Doel 1: AAAA, Doel 2: AAAA |
| 7.4 | A×10, B×2, 2 doelen | Constructie geeft `A:4 B:2 \| A:6` (D2 mono); **fase 7 ruilt → `A:5 B:1 \| A:5 B:1`**, exact zoals §7.4 voorschrijft |
| 7.5 | Vergrendeld doel midden | Filtering vooraf, ongewijzigd |
| 7.6 | Gilde-overflow | Geen Stap-B-style overflow nodig: paren+lones structureren reeds R5 |

Sinds fase 7 zijn de mono-gilde-staarten uit deze klasse weg. Het volledige bewijs
(strikte verbetering op de probleemgevallen, monotonie op 400 fuzz-cases, behoud van
alle harde constraints) staat in [`test/`](../test/) en draait met `npm test`. Zie
ook [ALGORITHM_DEFENSE.md §4-§5](ALGORITHM_DEFENSE.md).

**Handmatige UI-test**:
1. `npm run dev`
2. Open wedstrijd met diverse gildes.
3. Druk op "Auto".
4. Controleer visueel:
   - Laatste doelen hebben ≥ 2 gilden.
   - Paren van eenzelfde gilde liggen op naburige doelen.
   - Dubbelschutters staan op de laatste actieve doel(en) van hun zone — niet op fysiek lege doelen achteraan.
   - Geen doel onder 4 beurten (tenzij zone-totaal < 4).
