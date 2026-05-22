# OnTarget

Een Electron-desktopapp voor het **automatisch indelen van schutters over doelen**
bij boogschietwedstrijden. Gemaakt voor de organisatie van wedstrijden waar
schutters van verschillende gilden samen schieten op verschillende afstanden
(25m, 18m, 12m), met regels rond gildediversiteit, dubbel-schutters, compound-
doelen en aanmeldvolgorde.

## Wat doet het?

- **Schuttersbeheer**: schutters opslaan met gilde, boogtype, afstand,
  leeftijdscategorie, geslacht.
- **Wedstrijdinschrijving**: schutters inschrijven via zoekbalk, aanmeldvolgorde
  bijhouden, dubbel schieten aangeven.
- **Automatische doelindeling**: één-klik indeling die rekening houdt met
  alle regels (zone, gilde, dubbelschutters, registratievolgorde). Zie
  [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md).
- **Handmatige aanpassing**: schutters slepen tussen doelen, doelen vergrendelen.
- **Conflictdetectie**: gele waarschuwing bij overtreden van zachte regels,
  met uitleg in gewone taal.

## Tech stack

- **Electron 33** + **electron-vite** — desktopapp shell
- **React 18** + **TypeScript** — UI
- **Tailwind CSS** — styling
- **@dnd-kit** — drag-and-drop voor doelindeling
- **sql.js** — embedded SQLite voor lokale opslag (geen server)

## Aan de slag

```bash
npm install
npm run dev          # ontwikkelmodus met hot reload
npm run build        # productie-build
npm run build:win    # Windows installer (.exe)
```

## Projectstructuur

```
target-assignment/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # app entry
│   │   ├── database.ts    # sql.js setup
│   │   └── ipc.ts         # IPC tussen main en renderer
│   ├── preload/           # contextBridge API
│   └── renderer/src/      # React app
│       ├── algoritme/     # indelingsalgoritme (paren-gebaseerd, v2.0)
│       ├── components/    # herbruikbare UI-componenten
│       ├── pages/         # schermen (Wedstrijden, Schutters, Detail)
│       ├── types.ts       # gedeelde TypeScript-types
│       └── App.tsx        # app-root met navigatie
├── docs/                  # specificaties, regels en algoritme-documentatie
└── electron.vite.config.ts
```

## Documentatie

Alle inhoudelijke specificaties staan in [`docs/`](docs/):

| Document | Inhoud |
|---|---|
| [FEATURES.md](docs/FEATURES.md) | Functioneel overzicht van het programma |
| [RULES.md](docs/RULES.md) | Indelingsregels in gewone taal |
| [RULES_HIERARCHY.md](docs/RULES_HIERARCHY.md) | Regels per prioriteitsniveau (R1–R18) |
| [ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md) | Gewenst gedrag van de indeling (input/output, randgevallen) |
| [ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md) | Werking van het huidige algoritme (paren + tweesporen-toewijzing) |

## Voor AI-agents

Bij wijzigingen aan het indelingsalgoritme:
1. Lees eerst [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md) (gedrag) en
   [docs/RULES_HIERARCHY.md](docs/RULES_HIERARCHY.md) (prioriteit).
2. Voor de huidige implementatie zie
   [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md) en
   [`src/renderer/src/algoritme/indeling.ts`](src/renderer/src/algoritme/indeling.ts).
3. Voor UI-werk zie de componenten in `src/renderer/src/components/`.
