# Release 0.2.4-alpha.1

Doel van dit document: een agent of mens die voor het eerst aan deze codebase werkt tijdens of na cyclus 0.2.4 snel laten begrijpen wat er is gewijzigd ten opzichte van 0.2.3.

## Overzicht

Cyclus gestart vanaf [`0.2.3`](RELEASE_0.2.3.md). Eerste alpha-iteratie: enkel een toelichtende code-comment, geen functionele wijziging.

## Wijziging

### Toelichtende comment boven createWindow (issue #13)

Eénregelige Nederlandstalige comment toegevoegd boven `createWindow()` in [`src/main/index.ts`](../src/main/index.ts:8) die kort beschrijft wat de functie doet (preload koppelen, dev-URL of gebouwde index.html laden). Geen gedragswijziging.

Dit issue was opgezet als sandbox-cyclus om de [`ontarget-flow`](../.claude/skills/ontarget-flow/SKILL.md) skill end-to-end te doorlopen.
