# Release 0.2.3-alpha.0 (vs 0.2.2)

Doel van dit document: een agent die voor het eerst aan deze codebase werkt na de alpha-release snel laten begrijpen wat er is gewijzigd, waarom, en welke conventies vanaf nu gelden.

## Overzicht

De alpha bundelt vier veranderingen:

1. Import-modal van schutters krijgt duplicaat-detectie en per-rij toggle (issues [#4](https://github.com/stefvdwater/ontarget/issues/4) en [#5](https://github.com/stefvdwater/ontarget/issues/5)).
2. Landingpagina kreeg een "Aan de slag"-kolom met een handleiding-placeholder, en de mobiele layout werd hersteld.
3. App-header heeft een globe-knop naar de website.
4. Nieuwe stijl-conventies: geen em dashes en geen gradient-fades.

## Wijzigingen

### Import-modal: duplicaat-detectie (issue #4)

Vóór deze versie kon je CSV's importeren zonder check op duplicaten; identieke schutters konden meermaals in de database belanden.

**Wat is nieuw**

- `detecteerDuplicaten()` in [`src/renderer/src/components/ImportReviewModal.tsx`](../src/renderer/src/components/ImportReviewModal.tsx) markeert rijen die matchen met (a) een bestaande schutter in de DB of (b) een eerdere rij in hetzelfde CSV-bestand.
- Match-criterium: `voornaam + naam + gilde_naam`, case-insensitief, getrimd.
- Voor elke duplicaat-rij toont de modal een blauw blok met drie acties:
  - **Behoud (bestaande / rij N)**: de matchende rij blijft, deze rij wordt overgeslagen. Default.
  - **Vervang met deze rij**: voor DB-match → `schutters.update` op het bestaande record. Voor CSV-match → de eerdere matchende rij wordt inactief, deze rij blijft.
  - **Importeer beide**: voer een gewone INSERT uit naast de matchende rij. Resulteert in twee records met dezelfde naam (toegestaan door schema).
- Velden die afwijken van de bestaande DB-schutter krijgen een blauwe `.afwijkend`-rand zodat het verschil meteen zichtbaar is.

**Beslissingen die zijn vastgelegd**

- 4 opties (Behoud / Vervang / Beide / Skip) werden gereduceerd tot 3: "Behoud" en "Skip" hadden dezelfde uitkomst (rij niet importeren).
- Per-rij checkbox aanvinken op een blauwe duplicaat-rij stelt default `vervang` in, niet `beide`. De redenering: als iemand een duplicaat bewust aanvinkt, wil hij meestal het bestaande record updaten.
- De bulk-toggle "Alles aan" gebruikt `beide` (alles importeren). `vervang` zou bij CSV-intern duplicaten de eerdere rij net deactiveren, wat tegenstrijdig is met "alles aan".
- Voor CSV-intern duplicaten flipt de actie-keuze automatisch de `actief`-state van de paired earlier rij (`zetCsvActie`).
- Geen UI-element voor "vervangen" bij CSV-intern is fundamenteel anders dan bij DB-match: bij CSV-intern levert "vervang" geen UPDATE op (er is geen DB-record om te updaten), maar wel een INSERT plus deactivatie van de paired rij.

### Import-modal: per-rij toggle (issue #5)

Vóór deze versie moest een ongeldige rij worden gecorrigeerd of de hele import werd geblokkeerd. Nu kun je rijen uitvinken en de import doorzetten met de geldige rijen.

**Wat is nieuw**

- `ImportRij.actief: boolean` (default `true`).
- Checkbox links per rij + bulk-toggle "Alles aan/uit" bovenin de modal (met indeterminate state).
- Uitgevinkte rijen blokkeren de import-knop niet, ook al zijn ze ongeldig.
- Import-knop toont `"Importeer N schutters"` waarbij N het aantal aangevinkte rijen is.
- Duplicaten staan default uitgevinkt (`actief: false` voor zowel DB-match als CSV-followers).

**Beslissingen**

- Validatie loopt op alle rijen, maar telt enkel mee voor blokkeren als de rij actief is. Zo blijft de waarschuwing zichtbaar terwijl de gebruiker de rij uitvinkt.
- De CSV-parser zet `actief: true`; de modal markeert duplicaten en zet die op `false` bij opening.

### Landing page en docs site

- Nieuwe middelste kolom "Aan de slag" met 5-stappenplan en link naar [`docs/handleiding.html`](../docs/handleiding.html) (placeholder).
- Mobiele layout gefixt: release-box scrollbar is beperkt tot de changelog (download-knoppen blijven onderaan zichtbaar), en de pagina scrollt natuurlijk op mobiele schermen zodat kolommen niet samengeperst worden.
- Brand mark linkt nu terug naar home vanaf docs-pagina.

### App-header: website-knop

Globe-knop naast de dark-mode toggle in [`src/renderer/src/components/Header.tsx`](../src/renderer/src/components/Header.tsx). Opent `ontarget.stefvdwater.be` via de bestaande `setWindowOpenHandler` in main, dus geen extra IPC nodig.

## Nieuwe conventies (verplicht in alle code/UI/tekst)

### Geen em dashes
Em dashes (—) en en dashes (–) worden in Vlaams niet gebruikt. Vervang door:
- Gewone hyphen `-`
- Dubbele punt `:`
- Komma
- Of herstructureer de zin

Dit geldt voor: code-comments, UI-strings (placeholders, labels), commit messages, documentatie, antwoorden in chat.

### Geen gradient-fades
Gebruik volle kleuren voor achtergronden van rijen, kaarten, panels en zones. Vermijd `linear-gradient()` voor achtergronden.

Praktisch: gebruik vlakke `var(--*-soft)` tints met een `var(--*-soft-border)` of `var(--*-deep)` accent. Tokens hebben automatische dark-mode varianten in `:root.dark`.

Voorbeelden van plekken die al zijn aangepast: `.import-review-row.duplicaat`, `.import-review-row.fout`, `.config-card.danger`.

## Belangrijke beslissingen samengevat

| Beslissing | Reden |
|---|---|
| Match-key = voornaam+naam+gilde, ci, getrimd | Twee 'Jan Janssen' uit verschillende gilden zijn geen duplicaat. Trim/case voorkomt false negatives door spaties/hoofdletters. |
| 3 acties ipv 4 (geen 'Skip') | 'Behoud' en 'Skip' hadden identieke uitkomst (niets importeren). Reductie geeft minder UI-ruis. |
| Per-rij default = 'vervang' | Bij bewust aanvinken van een duplicaat is updaten meestal de bedoeling. |
| Bulk-aan = 'beide', niet 'vervang' | 'vervang' deactiveert paired rijen, strijdig met "alles importeren". |
| Uitgevinkte rijen blokkeren niet | Anders moet je foute rijen handmatig corrigeren of de hele import annuleren. |
| Solid colors, geen gradients | Visueel rustiger en consistenter; gebruiker-feedback. |
| Geen em dashes | Vlaamse conventie. |

## Bestanden om te kennen

- [`src/renderer/src/components/ImportReviewModal.tsx`](../src/renderer/src/components/ImportReviewModal.tsx): duplicaat-detectie, per-rij toggle, actie-radio.
- [`src/renderer/src/pages/SchuttersPage.tsx`](../src/renderer/src/pages/SchuttersPage.tsx): laadt bestaande schutters voor de modal en doet de commit (update bij 'vervang', create elders).
- [`src/renderer/src/index.css`](../src/renderer/src/index.css): duplicaat- en toggle-styling, no-fade rules.
- [`samples/test-scenarios/`](../samples/test-scenarios): vier CSV's die de import-scenarios afdekken (csv-intern, db-match, ongeldig/togglen, gemengd). Zie de bestanden zelf voor wat ze testen.

## Wat NIET is veranderd

- Het indelingsalgoritme (`src/renderer/src/algoritme/`). Stabiel; raak alleen aan na lezen van [`ALGORITHM_SPEC.md`](ALGORITHM_SPEC.md) en [`ALGORITME_v2.0.md`](ALGORITME_v2.0.md).
- Database-schema. Geen migraties in deze release.
- IPC-oppervlak. `schutters.update` bestond al en wordt nu hergebruikt voor 'vervang'.
