# Wedstrijd-backup JSON-formaat

Specificatie van het JSON-bestandsformaat dat de OnTarget app exporteert en importeert via de "Importeren / Exporteren"-actie op de wedstrijdenpagina. Dit document is de **bron van waarheid** voor het formaat: lezers en schrijvers in de code moeten overeenkomen met wat hier staat, en het formaat moet doorheen versies bruikbaar blijven.

## Doel

Een backup-bestand bevat één wedstrijd in haar volledigheid, zelfstandig herstelbaar op een andere installatie:

- de wedstrijdconfiguratie (doelen, afstanden, compound-startdoel),
- alle inschrijvingen met aanmeldvolgorde en dubbel-vlaggen,
- de berekende doelindeling (welke schutter staat op welk doel en welke positie),
- de vergrendelde-doelen-status,
- de schutters die bij de inschrijvingen horen, inclusief hun gilde.

Een geïmporteerd bestand levert dus een wedstrijd in exact dezelfde staat op, zonder dat het algoritme opnieuw hoeft te lopen of dat de gebruiker manueel schutters moet toevoegen.

## Stabiliteitscontract

Dit zijn de **harde garanties** voor dit formaat. Elke wijziging in code moet hieraan blijven voldoen.

1. **De top-level discriminator blijft `"type": "ontarget-wedstrijd-backup"`.** Lezers gebruiken dit om te valideren dat het bestand voor deze app bedoeld is. Wijzig deze string nooit.
2. **`schemaVersie` is een positief geheel getal en groeit monotoon.** Elke nieuwe versie krijgt een hogere waarde dan alle voorgaande. Versie-nummers worden niet hergebruikt.
3. **Bestanden met een eerdere of gelijke `schemaVersie` blijven importeerbaar door alle latere app-versies.** Een v1-bestand uit 2025 moet in 2030 nog steeds in te lezen zijn. De importer mag nieuwe velden negeren bij oudere schemas; ontbrekende velden krijgen hun gedocumenteerde default.
4. **Binnen één `schemaVersie` mogen alleen additieve wijzigingen.** Nieuwe velden zijn altijd optioneel met een duidelijke default. Bestaande velden worden niet hernoemd, hertypeerd, of verwijderd zolang de schemaVersie hetzelfde blijft.
5. **Een breaking change vereist een bump van `schemaVersie`** en behoud van de lezer voor de oude versie. De export schrijft de nieuwste versie; de import herkent alle versies vanaf 1.
6. **Onbekende velden mogen niet leiden tot een error.** Een lezer ouder dan de schrijver moet onbekende velden negeren zonder de import te blokkeren.

## Top-level structuur (schemaVersie 1)

```jsonc
{
  "type": "ontarget-wedstrijd-backup",
  "schemaVersie": 1,
  "geexporteerdOp": "2026-05-28T14:32:11.000Z",
  "wedstrijd": { /* WedstrijdConfig */ },
  "schutters": [ /* Schutter[] */ ],
  "inschrijvingen": [ /* Inschrijving[] */ ],
  "indeling": [ /* IndelingRij[] */ ],
  "vergrendeldeDoelen": [ /* number[] */ ]
}
```

Alle objectsleutels zijn camelCase aan de top-level. Binnen genest objecten (zoals `wedstrijd`, `schutters[]`, `inschrijvingen[]`) is de conventie snake_case, omdat die rechtstreeks de databasekolommen weergeven. Wijk daar nooit van af; oudere bestanden gebruiken deze sleutels en moeten leesbaar blijven.

## Velddefinities

### `type` (string, verplicht)

Letterlijk de string `"ontarget-wedstrijd-backup"`. Lezers wijzen elk bestand af waar deze string niet exact gelijk is. Geen alternatieven, geen hoofdletter-varianten.

### `schemaVersie` (integer, verplicht)

Positief geheel getal. Huidige waarde: **1**. Zie de [stabiliteitscontract-sectie](#stabiliteitscontract) voor de regels rond bumpen.

### `geexporteerdOp` (string, optioneel, informatief)

ISO-8601 timestamp van het moment van export, in UTC. Bedoeld als diagnostische hulp voor de gebruiker (zien wanneer een bestand gemaakt is). Importers doen hier niets functioneels mee en mogen het veld negeren of leeg laten.

### `wedstrijd` (object, verplicht)

De configuratie van de wedstrijd. De sleutels komen rechtstreeks van de `wedstrijden`-tabel.

| Sleutel | Type | Verplicht | Betekenis |
|---|---|---|---|
| `naam` | string | ja | Naam van de wedstrijd |
| `datum` | string (`YYYY-MM-DD`) | ja | Wedstrijddatum, ISO-formaat |
| `locatie` | string of null | nee | Locatie, mag null of leeg zijn |
| `aantal_doelen` | integer | ja | Totaal aantal doelen op de schietstand |
| `aantal_doelen_18m` | integer | ja | Aantal doelen op 18m |
| `aantal_doelen_12m` | integer | ja | Aantal doelen op 12m |
| `compound_startdoel` | integer | ja | Eerste doel waarop compound-schutters mogen staan |
| `aantal_compound_doelen` | integer | ja (schrijver) / nee (lezer) | Aantal opeenvolgende doelen vanaf `compound_startdoel` voor compound. Schrijvers van schemaVersie 1 moeten dit veld altijd meegeven. Lezers tolereren ontbreken en vallen terug op `1`, omdat backups uit pre-0.2.4-versies dit veld nog niet hadden. Dit volgt §"Compatibiliteitsregels in detail" punt 4 over default-en van ontbrekende velden. |

De id van de wedstrijd wordt **bewust niet** opgenomen, bij import wordt een nieuwe id toegekend in de doel-database.

### `schutters` (array, verplicht)

De schutters die in `inschrijvingen` voorkomen, mét hun gilde-naam zodat ze bij import gematcht of aangemaakt kunnen worden.

| Sleutel | Type | Verplicht | Betekenis |
|---|---|---|---|
| `id` | integer | ja | Lokale schutter-id zoals die in de bron-database staat. Wordt enkel gebruikt als sleutel binnen het bestand om naar deze schutter te verwijzen vanuit `inschrijvingen` en `indeling`. Wordt bij import niet hergebruikt. |
| `voornaam` | string | ja | |
| `naam` | string | ja | Familienaam |
| `gilde_naam` | string of null | nee | Naam van het gilde. Null/leeg betekent: schutter zonder gilde. |
| `type_boog` | string | ja | Een van: `"Recurve"`, `"Compound"`, `"Barebow"`, `"Andere"`. |
| `leeftijdscategorie` | string | ja | Een van: `"Aspirant"`, `"Jeugd"`, `"Junior"`, `"Senior"`, `"Veteraan"`. |
| `geslacht` | string | ja | `"M"` of `"V"`. |
| `afstand` | integer | ja | Een van: `12`, `18`, `25`. |

**Belangrijk:** `schutters[].id` is een **interne referentie binnen dit bestand**, geen stabiele identifier op een installatie. Verschillende exports van dezelfde schutter op verschillende installaties kunnen verschillende ids hebben. Bij import worden de ids gemapt naar de overeenkomstige ids in de doel-database (zie [Schutter-matching bij import](#schutter-matching-bij-import)).

### `inschrijvingen` (array, verplicht)

Lijst van inschrijvingen voor deze wedstrijd. De `wedstrijd_id` wordt bewust niet opgenomen (impliciet: de wedstrijd uit dit bestand).

| Sleutel | Type | Verplicht | Betekenis |
|---|---|---|---|
| `schutter_id` | integer | ja | Verwijst naar `schutters[].id` binnen dit bestand. |
| `aanmeldvolgorde` | integer | ja | 1-gebaseerde volgorde waarin de schutter is ingeschreven. |
| `dubbel_eerste_helft` | 0 of 1 | ja | 1 als de schutter de eerste helft dubbel schiet. |
| `dubbel_tweede_helft` | 0 of 1 | ja | 1 als de schutter de tweede helft dubbel schiet. |

### `indeling` (array, verplicht, mag leeg zijn)

De berekende doelindeling op het moment van export. Een lege array betekent: er was nog geen indeling gemaakt voor deze wedstrijd.

| Sleutel | Type | Verplicht | Betekenis |
|---|---|---|---|
| `doel_nummer` | integer | ja | Nummer van het doel (1-gebaseerd). |
| `schutter_id` | integer | ja | Verwijst naar `schutters[].id` binnen dit bestand. |
| `positie` | integer | ja | Positie op het doel (1 t.e.m. typisch 4). |

`vergrendeld` wordt **niet** per indeling-rij opgeslagen; vergrendeling werkt op doel-niveau via `vergrendeldeDoelen`.

### `vergrendeldeDoelen` (array van integers, verplicht, mag leeg zijn)

Lijst van doelnummers die door de gebruiker zijn vergrendeld zodat het algoritme ze niet meer aanraakt bij her-indeling.

## Volledig voorbeeld

```json
{
  "type": "ontarget-wedstrijd-backup",
  "schemaVersie": 1,
  "geexporteerdOp": "2026-05-28T14:32:11.000Z",
  "wedstrijd": {
    "naam": "Provinciaal kampioenschap",
    "datum": "2026-06-12",
    "locatie": "Brasschaat",
    "aantal_doelen": 10,
    "aantal_doelen_18m": 2,
    "aantal_doelen_12m": 1,
    "compound_startdoel": 6,
    "aantal_compound_doelen": 1
  },
  "schutters": [
    {
      "id": 42,
      "voornaam": "Jan",
      "naam": "Janssens",
      "gilde_naam": "Gilde De Gulden Pijl",
      "type_boog": "Recurve",
      "leeftijdscategorie": "Senior",
      "geslacht": "M",
      "afstand": 25
    },
    {
      "id": 57,
      "voornaam": "Els",
      "naam": "Peeters",
      "gilde_naam": "Gilde De Gulden Pijl",
      "type_boog": "Compound",
      "leeftijdscategorie": "Senior",
      "geslacht": "V",
      "afstand": 25
    }
  ],
  "inschrijvingen": [
    { "schutter_id": 42, "aanmeldvolgorde": 1, "dubbel_eerste_helft": 0, "dubbel_tweede_helft": 0 },
    { "schutter_id": 57, "aanmeldvolgorde": 2, "dubbel_eerste_helft": 1, "dubbel_tweede_helft": 0 }
  ],
  "indeling": [
    { "doel_nummer": 1, "schutter_id": 42, "positie": 1 },
    { "doel_nummer": 6, "schutter_id": 57, "positie": 1 }
  ],
  "vergrendeldeDoelen": [6]
}
```

## Compatibiliteitsregels in detail

### Wat mag wel binnen schemaVersie 1

- **Nieuwe optionele velden toevoegen** aan een bestaand object (bijvoorbeeld een `notitie` op `wedstrijd` of een `aangemaakt_op` op een schutter). De lezer moet een ontbrekend veld als null/leeg/0 interpreteren volgens de gedocumenteerde default.
- **Nieuwe top-level arrays toevoegen** met informatie die geen invloed heeft op bestaande importers (bijvoorbeeld een `metadata`-blok). Oudere lezers negeren het zonder error.

### Wat mag niet binnen schemaVersie 1

- Een veld **verwijderen** dat in deze spec gedocumenteerd is.
- Een veld **hernoemen** (ook niet alleen casing aanpassen).
- Het **type** van een veld wijzigen (bijvoorbeeld string naar integer, of een waarde-enum uitbreiden waar oude importers van zouden falen).
- De semantiek van een waarde herinterpreteren (bijvoorbeeld `aantal_doelen` ineens 0-gebaseerd maken).
- De geneste sleutel-conventie wijzigen (snake_case binnen geneste objecten, camelCase aan top-level).

### Wanneer schemaVersie bumpen

Bump naar `schemaVersie: 2` zodra je een wijziging wil die niet binnen de regels hierboven past, bijvoorbeeld:

- Een verplicht veld moet weg of van type wijzigen.
- Een nieuwe enum-waarde wordt verplicht (oude lezers mogen die niet kennen).
- De structuur van een geneste sectie wordt fundamenteel anders.

Bij een bump:

1. Verhoog `schemaVersie` met 1.
2. Documenteer in dit bestand de nieuwe versie naast de oude (sectie per versie).
3. Behoud de **lezer** voor versie 1 onveranderd. De importer moet de versie inspecteren en de juiste lezer kiezen.
4. De **exporter** schrijft altijd de hoogste versie die op dat moment bestaat.

### Hoe lezers moeten omgaan met versie-mismatch

| Situatie | Gedrag |
|---|---|
| `type` ontbreekt of fout | Reject met duidelijke fout: "Bestand is geen OnTarget wedstrijd-backup". |
| `schemaVersie` ontbreekt | Reject met fout. |
| `schemaVersie` hoger dan wat de app kent | Reject met fout: "Bestand is gemaakt door een nieuwere versie van OnTarget. Update de app om dit bestand te kunnen openen." |
| `schemaVersie` lager dan huidige | Gebruik de lezer voor die specifieke versie. Onbekende velden worden genegeerd; ontbrekende nieuwe velden krijgen hun gedocumenteerde default. |
| `schemaVersie` gelijk aan huidige | Gebruik de huidige lezer. |

## Schutter-matching bij import

Bij import worden de `schutters[].id`-waarden uit het bestand niet rechtstreeks overgenomen. In plaats daarvan:

1. Voor elke schutter in `schutters[]` zoekt de importer een match in de doel-database op de tuple `(LOWER(voornaam), LOWER(naam), LOWER(gilde_naam))` waarbij een leeg/null gilde gelijk is aan zichzelf.
2. **Match gevonden** → de bestaande schutter wordt hergebruikt. Het bestand-id wordt gemapt naar de bestaande database-id.
3. **Geen match** → een nieuwe schutter wordt aangemaakt met alle velden uit het bestand. Als de `gilde_naam` ook nog niet bestaat in `gilden`, wordt het gilde eveneens aangemaakt.

Vervolgens worden `inschrijvingen[]` en `indeling[]` doorlopen en hun `schutter_id` vervangen door de gemapte database-id. Een rij waarvan de `schutter_id` niet in de mapping zit (bv. omdat de schutter ontbrak in `schutters[]`), wordt overgeslagen zonder error.

Deze strategie is gedocumenteerd zodat exporters in de toekomst alle relevante schutters blijven includeren, en importers consistent blijven matchen.

## Conflict-resolutie op naam + datum

De combinatie (`wedstrijd.naam`, `wedstrijd.datum`) wordt door de UI behandeld als unieke identifier voor een wedstrijd binnen een installatie. Bij conflict tijdens import krijgt de gebruiker drie keuzes:

- **Vervangen**: de bestaande wedstrijd (en haar inschrijvingen, indeling, vergrendelde doelen) wordt verwijderd en de backup wordt aangemaakt.
- **Als kopie importeren**: een nieuwe wedstrijd wordt aangemaakt met `" (kopie)"` achteraan de naam (of `" (kopie 2)"`, `" (kopie 3)"`, ... tot een unieke combinatie). De bestaande wedstrijd blijft onaangeraakt.
- **Overslaan**: dit bestand wordt genegeerd. Bij multi-file import gaat de loop door met het volgende bestand.

Het bestand zelf bevat geen voorkeur over hoe een conflict opgelost moet worden; die keuze is altijd interactief.

## Wat NIET in de backup zit

Bewuste exclusies, en waarom:

- **Database-ids** voor `wedstrijden`, `inschrijvingen`, `indeling` en `vergrendelde_doelen`. Bij import wordt een verse id toegekend.
- **Andere wedstrijden, gilden of schutters** dan die bij deze ene wedstrijd horen. Het is een per-wedstrijd-backup, geen volledige database-dump.
- **Gilden die geen schutter hebben** in `schutters[]`. Verlaten gilden zijn niet relevant voor deze wedstrijd.
- **App-instellingen, dark-mode-keuze, vensterpositie, enz.** Geen relevantie voor het herstellen van een wedstrijd.

## Bestandsnaam

De exporter genereert de bestandsnaam als `wedstrijd-<slug>-<datum>.json`, waarbij `<slug>` een lowercase, ascii-genormaliseerde versie is van de wedstrijdnaam (max 40 tekens, niet-alfanumerieke tekens worden hyphens). Bestandsnaam heeft geen functionele betekenis; de inhoud is leidend bij import.

## Referenties naar de code

| Concept | Locatie |
|---|---|
| Export-handler (schrijft dit formaat) | [`src/main/ipc.ts`](../src/main/ipc.ts) — `wedstrijden:exportBackup` |
| Import-check (conflict-detectie) | [`src/main/ipc.ts`](../src/main/ipc.ts) — `wedstrijden:importCheck` |
| Import-apply (leest dit formaat) | [`src/main/ipc.ts`](../src/main/ipc.ts) — `wedstrijden:importApply` |
| UI (knoppen, modals, file-input) | [`src/renderer/src/pages/WedstrijdenPage.tsx`](../src/renderer/src/pages/WedstrijdenPage.tsx) |
| Database-schema (de bron van de velden) | [`src/main/database.ts`](../src/main/database.ts) |

Wijzig dit document mee zodra je iets aan de export- of import-handler verandert. Een wijziging zonder bijhorende update hier is per definitie een fout in de PR.
