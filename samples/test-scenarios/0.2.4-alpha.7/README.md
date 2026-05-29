# Test-scenario's voor 0.2.4-alpha.7

Wedstrijd-backup JSON's om gerichte gedragsregressies van het algoritme handmatig te kunnen verifiëren. Importeer een bestand via "Importeren" op de wedstrijdenpagina, open de wedstrijd en klik "Bereken indeling".

## 12m-een-gilde-zone-r4hard.json

Verifieert de fix uit P5-4: `handhaafMin4Beurten` blokkeerde elke R4-hard verschuiving in een zone met slechts 1 gilde, omdat de "bron moet ≥ 2 gilden behouden"-check structureel onhaalbaar is. Volgens [ALGORITHM_SPEC §7.2](../../../internal-docs/ALGORITHM_SPEC.md) heft een 1-gilde-zone die eis op.

**Opzet**: 10 doelen, 0 op 18m, 2 op 12m (doelen 9 en 10). Geen compound-zone. Acht jeugdschutters, allen uit `Sint-Sebastiaan Testgilde`, geen dubbelaars.

**Verwacht gedrag**:

- *Zonder* de fix: `plaatsLones` vult doel 9 tot 5 schutters (5 beurten), doel 10 blijft op 3 schutters (3 beurten) zitten. Fase 5 wil één schutter verplaatsen van 9 naar 10, maar de 2-gilden-blokkade in `handhaafMin4Beurten` weigert elke verplaatsing — doel 10 zou na verwijdering nog steeds 1 gilde overhouden, dus de filter laat niets toe. Doel 10 blijft onder R4-hard.
- *Met* de fix: `verwerkZone` telt `zoneGildenCount === 1`, de blokkade wordt overgeslagen, één schutter verschuift van doel 9 naar doel 10. Eindstand: **doel 9 = 4 beurten, doel 10 = 4 beurten**, beide voldoen aan R4-hard.

Waarom dit scenario en niet eentje met een dubbelaar: `handhaafMin4Beurten` opereert in Fase B uitsluitend op normaal-doelen (de dubbeldoelen zijn al volledig opgevuld in Fase A en worden niet als bron meegegeven). Om de bug te triggeren zijn dus ≥ 2 *normaal*-doelen nodig — pure normalen op een mono-gilde-zone is de minimale opzet.
