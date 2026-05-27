# Release 0.2.3-alpha.1 (vs 0.2.3-alpha.0)

Doel van dit document: een agent die voor het eerst aan deze codebase werkt na deze release snel laten begrijpen wat er is gewijzigd en welk gedrag vanaf nu geldt.

## Overzicht

Eén gerichte algoritme-aanpassing: **variabele compound-doelen** (issue [#9](https://github.com/stefvdwater/ontarget/issues/9)). Compound-doelen die niet nodig zijn worden voortaan gebruikt voor gewone 25m-schutters.

## Wijziging

### Variabele compound-doelen (issue #9)

Voorheen was `aantal_compound_doelen` een vast aantal: als de organisatie 3 compound-doelen had ingesteld maar er was maar 1 echt nodig, bleven de andere 2 leeg.

Vanaf nu is `aantal_compound_doelen` een **bovengrens**:

1. De compound-zone wordt **vóór** de 25m-zone verwerkt (omdraaiing van de oude volgorde).
2. `verwerkZone` gebruikt zoals altijd alleen het aantal doelen dat écht nodig is (streef 5 per doel, R4-hard min 4). De rest blijft leeg in compound.
3. Daarna worden alle compound-doelen die **geen schutters** kregen én **niet vergrendeld** zijn, omgezet naar `zone = '25m'`. Doelnummer (fysieke positie) blijft behouden.
4. De 25m-zone wordt verwerkt over de samengevoegde lijst `[oorspronkelijke 25m] ∪ [herbestemde compound]`, gesorteerd op doelnummer. R8 (aanmeldvolgorde → doelnummer) en R7 (dubbels achteraan) gelden over de samengevoegde zone.
5. Voor conflictdetectie telt een herbestemd doel als 25m-doel: geen "niet-compound op compound"-waarschuwing.

**Wat is NIET veranderd:**

- De R16-uitzondering (< 3 compound-schutters → mee in 25m, voorin) blijft ongewijzigd. Bij precies 3 compound-schutters krijgen ze een eigen doel met 3 beurten (onder R4-hard min 4) — dat genereert een conflict-waarschuwing, zoals voorheen.
- Een **vergrendeld** compound-doel blijft compound, ook als het leeg is — de organisatie heeft het bewust gereserveerd.
- **Compound-overflow blijft hard**: méér compound-schutters dan de voorziene compound-doelen aankunnen → resterende compound-schutters worden `nietIngedeeld`. Compound-schutters lopen niet over naar 25m (behalve via R16).
- De wedstrijdconfiguratie (`compound_startdoel`, `aantal_compound_doelen`) is ongewijzigd — geen database-migratie nodig.

### Gewijzigde bestanden

- [`src/renderer/src/algoritme/indeling.ts`](../src/renderer/src/algoritme/indeling.ts) — `berekenIndeling` past de zone-volgorde aan en doet de herbestemming.
- [`internal-docs/ALGORITHM_SPEC.md`](ALGORITHM_SPEC.md) — nieuwe §4.2b "Variabele compound-doelen"; §9 vermeldt de conflict-uitzonderingen voor herbestemde doelen.
- [`internal-docs/RULES.md`](RULES.md) — sectie "Compound schutters (25m)" uitgebreid.
- [`internal-docs/RULES_HIERARCHY.md`](RULES_HIERARCHY.md) — nieuwe R19.

## Belangrijkste beslissingen

| Beslissing | Reden |
|---|---|
| Compound vóór 25m verwerken | Pas dán is bekend welke compound-doelen leeg blijven en dus 25m kunnen worden. |
| Doelnummer behouden bij herbestemming | Een herbestemd doel staat fysiek nog op zijn oorspronkelijke plek in de schietzone; nummeren rond breekt verwachtingen van de organisatie. |
| R16-drempel ongewijzigd (< 3) | Aansluiten bij bestaand gedrag. Bij exact 3 compound-schutters → eigen doel, ook al schendt dat R4-hard (zelfde als vóór deze release). |
| Compound-overflow blijft `nietIngedeeld` | Compound-schutters horen niet op niet-compound doelen; de R16-uitzondering geldt enkel onder de drempel, niet bij overflow. |
| Vergrendeld compound-doel blijft compound | Vergrendeling = expliciete intentie van de gebruiker, ook bij lege doelen. |

## Wat NIET is veranderd

- Database-schema, IPC-oppervlak, UI-componenten.
- Het paren-gebaseerde indelingsalgoritme zelf (fases 0–6 van [`ALGORITME_v2.0.md`](ALGORITME_v2.0.md)). Enkel de zone-volgorde en de herbestemmingsstap zijn nieuw.
- De gewone (niet-compound) zones 18m en 12m.
