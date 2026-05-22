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
Fase 0 — Setup: aantal actieve doelen bepalen
Fase 1 — Dubbelschutters plaatsen op eerste doelen
Fase 2 — Paren vormen per gilde
Fase 3 — Tweesporen-toewijzing (de "puzzle")
Fase 4 — Lone-schutters verdelen
Fase 5 — R4-hard handhaving (≥ 4 beurten per actief doel)
Fase 6 — Sortering binnen elk doel
```

---

## 3. Fase 0 — Setup

1. `pool` = alle niet-vergrendelde doelen van de zone, in volgorde.
2. Bereken totaal beurten `B`:
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
4. `actieveDoelen = pool.slice(0, aantalActief)`.

---

## 4. Fase 1 — Dubbelschutters (R7, R8, R13)

Identiek aan v1. Groepering via `groepeerdeDubbelaars`:

- **Vol-dubbelaars** in paren van 2 (4 beurten + 1 normaal = 5).
- **EH + TH** gekoppeld, bij voorkeur uit verschillende gilden.
- Resterende EH of TH afzonderlijk op één doel.

Per groep wordt het volgende vrije doel gebruikt. Verplichte normalen
voor rusttijd (R8) worden via `kiesNormalenVoorDubbeldoel` toegevoegd.
Doel wordt aangevuld tot 5 beurten met respect voor R5 (max 2 per gilde),
met fallback waar nodig om R10 (5 beurten) te halen.

Na fase 1: `dubbelCursor` = aantal door fase 1 gevulde doelen.

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

`Tnorm = aantalActief - dubbelCursor` = aantal doelen voor normalen.

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
  plaats spoorA[i].schutters op actieveDoelen[dubbelCursor + i]
voor i = 0 .. min(|spoorB|, Tnorm) - 1:
  plaats spoorB[i].schutters op actieveDoelen[dubbelCursor + i]
```

### 6.4 Randgeval: spoor langer dan Tnorm

Theoretisch kan dit niet voorkomen bij correcte Fase 0. Indien toch:
paren met index ≥ Tnorm worden **ontkoppeld** — beide schutters van
het paar worden teruggegeven aan de lone-pool en in Fase 4 verdeeld.
Dit voorkomt een mono-gilde-staart in extreme gevallen.

---

## 7. Fase 4 — Lone-schutters verdelen

Voor elke `L ∈ lones`, in aanmeldvolgorde:

### Stap A — Voorkeurdoel (eigen gilde dichtbij)

Zoek doelen waar gilde(L) reeds aanwezig is, of doelen die daaraan
grenzen (index ± 1). Filter op:
- `maxBeurten(doel) < 5`
- Toevoeging past op het doel

Sortering kandidaten:
1. Doelen waar gilde(L) **nog niet** 2× aanwezig is (R5 respecteren).
2. Doelen aangrenzend aan andere paren van gilde(L) (R10).
3. Doelen met meeste schutters al (vul vol — R10).

Kies kandidaten[0] indien beschikbaar.

### Stap B — Geen voorkeurdoel

Kies een doel met `< 2` verschillende gilden (R6 prioriteit), filter op
`maxBeurten < 5`. Bij gelijkstand: laagste doelnummer (R9). Indien geen
zulk doel: eerste doel met `maxBeurten < 5` in doelvolgorde.

### Stap C — Geen plek met beurten < 5

Versoepel naar `maxBeurten ≤ 6` (R3 harde grens). Sorteer kandidaten
op minste schutters eerst, daarna minste van gilde(L). Plaats op
kandidaat[0].

### Stap D — Geen plek met beurten ≤ 6

Voeg L toe aan `nietIngedeeld`. Wordt zichtbaar gemaakt als
waarschuwing in de UI.

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

## 10. Prioriteitsvolgorde (samenvatting)

Bij conflicterende regels:

1. **R1** Correcte zone (hard)
2. **R3** Max 6 beurten (hard)
3. **R3** Vergrendelde doelen respecteren (hard)
4. **R4-hard** Min 4 beurten per doel (hard, uitz. zone-totaal < 4)
5. **R7** Dubbelschutters op eerste doelen
6. **R9** Aanmeldvolgorde → doelvolgorde
7. **R10** Streef 5 beurten per doel
8. **R10b** Gelijke verdeling
9. **R11/R15** Aaneengesloten gilden
10. **R5** Max 2 per gilde per doel (zacht)
11. **R6** Min 2 gilden per doel (zacht)

---

## 11. Verificatie

Verwacht gedrag voor de scenario's uit [ALGORITHM_SPEC.md §7](ALGORITHM_SPEC.md):

| § | Scenario | v2.0-resultaat |
|---|---|---|
| 7.1 | A×6, B×6, 2 doelen | LPT → A→spoorA, B→spoorB. Doel 1 & 2 elk `AABB+filler` |
| 7.2 | A×8, 1 zone | Alles op spoorA, spoorB leeg. Doel 1: AAAA, Doel 2: AAAA |
| 7.4 | A×10, B×2, 2 doelen | LPT → A(5p)→spoorA, B(1p)→spoorB. Spoor A overflow → ontkoppeld → lones verdelen via §7 R6-criterium |
| 7.5 | Vergrendeld doel midden | Filtering vooraf, ongewijzigd |
| 7.6 | Gilde-overflow | Geen Stap-B-style overflow nodig: paren+lones structureren reeds R5 |

**Handmatige UI-test**:
1. `npm run dev`
2. Open wedstrijd met diverse gildes.
3. Druk op "Auto".
4. Controleer visueel:
   - Laatste doelen hebben ≥ 2 gilden.
   - Paren van eenzelfde gilde liggen op naburige doelen.
   - Dubbelschutters staan vooraan op eerste doel(en) van hun zone.
   - Geen doel onder 4 beurten (tenzij zone-totaal < 4).
