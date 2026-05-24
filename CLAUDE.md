Dit is OnTarget — een Electron + React + TypeScript desktopapp voor het automatisch indelen van boogschutters over doelen bij wedstrijden van Vlaamse schuttersgilden. De app draait lokaal met sql.js (geen server), drag-and-drop via @dnd-kit, en theming via CSS variables met dark-mode-ondersteuning.



Lees eerst, in deze volgorde:



README.md — overzicht, tech stack, projectstructuur, en sectie "Voor AI-agents"

docs/RULES.md — alle indelingsregels in gewone taal

docs/RULES\_HIERARCHY.md — regels gesorteerd per prioriteitsniveau (harde regels → zachte voorkeuren)

docs/ALGORITHM\_SPEC.md — gewenst gedrag van de indeling: input/output, randgevallen

docs/ALGORITME\_v2.0.md — werking van het huidige paren-gebaseerde algoritme (LPT bin-packing over 2 sporen)

docs/FEATURES.md — functioneel overzicht (UI-functionaliteit)

Belangrijke conventies:



Het algoritme leeft in src/renderer/src/algoritme/ en is stabiel — raak alleen aan als nodig en lees eerst de specs.

UI volgt het ontwerp uit docs/ (niet meer aanwezig, maar afgeleid in src/renderer/src/index.css). Gebruik bestaande CSS-classes (.btn, .card, .chip, .schutter, .doel, …) en CSS-variables uit :root/:root.dark — voeg geen Tailwind utility classes toe.

Validatieregels voor schutters (categorie × boog × afstand) staan gecentraliseerd in valideerImportRij in src/renderer/src/components/ImportReviewModal.tsx en de helpers afstandToegestaan / categorieToegestaan in src/renderer/src/components/SchutterFormulier.tsx. Hergebruik die.

Database staat in Electron's userData-folder (niet in repo). Schema in src/main/database.ts, IPC-handlers in src/main/ipc.ts, geëxposeerd via src/preload/index.ts + index.d.ts.

Project is Nederlandstalig (Vlaams) — code-commentaar, UI-teksten, variabelennamen volgen die conventie.

