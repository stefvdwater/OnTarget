# Test-scenario's voor PR-D (backup-format versiecheck)

Backup-bestanden om de spec-conforme versiecheck van [BACKUP_FORMAT.md "Hoe lezers moeten omgaan met versie-mismatch"](../../../internal-docs/BACKUP_FORMAT.md) handmatig te verifieren. Importeer een bestand via "Importeren / Exporteren" op de wedstrijdenpagina; voor de foutpaden verschijnt het bestand in het batch-resultaat onder "Mislukt" met de exacte foutmelding hieronder.

Tip: selecteer alle bestanden tegelijk in de file-picker. De batch-loop verwerkt ze één voor één en het eindrapport toont per bestand of het geslaagd of mislukt is.

## Geldige paden (moeten importeren)

### 00-baseline-geldig.json

Standaard geldig v1-bestand. **Verwacht**: import succesvol, wedstrijd "Versietest baseline geldig" verschijnt met 2 inschrijvingen, gilde "Versietest Gilde" wordt aangemaakt.

Dit bestand bewijst dat de validator geldige input doorlaat. Voer het ook uit na alle foutpaden om te controleren dat geen state corrupt is geraakt.

### 07-compound-doelen-ontbreekt.json

Geldig v1 maar zonder `aantal_compound_doelen` (zoals pre-0.2.4-backups). **Verwacht**: import succesvol, wedstrijd krijgt `aantal_compound_doelen = 1` als default. Zie de update aan BACKUP_FORMAT.md §"wedstrijd" over schrijver-vs-lezer-tolerantie.

## Foutpaden (moeten gerapporteerd worden in batch-resultaat)

| Bestand | Verwachte foutmelding |
|---|---|
| `01-type-ontbreekt.json` | Bestand is geen OnTarget wedstrijd-backup |
| `02-type-fout.json` | Bestand is geen OnTarget wedstrijd-backup |
| `03-schemaversie-toekomstig.json` | Bestand is gemaakt door een nieuwere versie van OnTarget. Update de app om dit bestand te kunnen openen. |
| `04-schemaversie-niet-integer.json` | Ongeldige of ontbrekende schemaVersie |
| `05-schemaversie-ontbreekt.json` | Ongeldige of ontbrekende schemaVersie |
| `06-schemaversie-nul.json` | Ongeldige of ontbrekende schemaVersie |
| `08-wedstrijd-ontbreekt.json` | Wedstrijd-gegevens ontbreken in bestand |

Belangrijk: bij elk foutpad opent de conflict-modal **niet**. Vóór PR-D liet `importCheck` bestanden zonder geldige `wedstrijd.naam/datum` stilletjes door als "geen conflict", waarna `importApply` pas dieper in de import-flow ontplofte. Nu vangt `valideerEnNormaliseer` het in beide handlers af, dus de batch-catch in `WedstrijdenPage.handleImportBestand` toont de fout meteen onder "Mislukt".

## Regressietest bij multi-file import

Selecteer **alle 9 bestanden tegelijk**. **Verwacht eindrapport**:

- Geslaagd: `00-baseline-geldig.json` (eventueel met conflict-modal als baseline al eerder ingelezen werd), `07-compound-doelen-ontbreekt.json`.
- Mislukt: `01` t.e.m. `06` en `08` met de boodschappen uit de tabel hierboven.

Geen enkel bestand mag de hele batch-loop laten crashen, en de conflict-modal mag bij geen enkel ongeldig bestand opentkomen.
