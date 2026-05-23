# OnTarget

Een Electron-desktopapp voor het **automatisch indelen van schutters over doelen**
bij boogschietwedstrijden. Gemaakt voor de organisatie van wedstrijden waar
schutters van verschillende gilden samen schieten op verschillende afstanden
(25m, 18m, 12m), met regels rond gildediversiteit, dubbel-schutters, compound-
doelen en aanmeldvolgorde.

## Wat doet het?

- **Schuttersbeheer**: schutters opslaan met gilde, boogtype, afstand,
  leeftijdscategorie en geslacht. Filteren op boogtype + afstand, zoeken op naam
  of gilde.
- **CSV-import / -export** van het volledige ledenbestand (UTF-8 met BOM,
  Excel-compatibel). Onbekende gilden worden automatisch aangemaakt bij import.
- **Wedstrijdbeheer**: wedstrijden aanmaken, configureren (datum, locatie,
  aantal doelen per zone, compound-startdoel) en verwijderen via de
  Configuratie-tab.
- **Inschrijvingen**: schutters inschrijven via een zoekbalk in een sticky
  zijbalk, dubbel-schieten aanduiden per helft, nieuwe schutter inline aanmaken.
- **Automatische doelindeling**: één-klik indeling die rekening houdt met
  alle regels (zone, gilde-diversiteit, dubbelschutters, registratievolgorde).
  Gebruikt het paren-gebaseerde algoritme met tweesporen-toewijzing —
  zie [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md).
- **Handmatige aanpassing**: schutters slepen tussen doelen of terug naar
  de aanmeldlijst, doelen individueel of allemaal tegelijk vergrendelen,
  indeling leegmaken.
- **Conflictdetectie**: gele waarschuwing per doel én een hover-samenvatting
  bovenaan met alle aandachtspunten over alle doelen.
- **Dark mode**: volgt systeemvoorkeur bij eerste start, met handmatige
  toggle (zon/maan-icoon rechts in de topbar) en localStorage-persistentie.

## Tech stack

- **Electron 33** + **electron-vite** — desktopapp shell
- **React 18** + **TypeScript** — UI
- **CSS variables** (light + `:root.dark`) — theming
- **IBM Plex Sans / Mono** — typografie
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
│   ├── main/                # Electron main process
│   │   ├── index.ts         # app entry
│   │   ├── database.ts      # sql.js setup + schema
│   │   └── ipc.ts           # IPC handlers (gilden, schutters,
│   │                        #               wedstrijden, inschrijvingen,
│   │                        #               indeling, demo)
│   ├── preload/             # contextBridge API + window.api types
│   └── renderer/src/        # React app
│       ├── algoritme/       # paren-gebaseerd indelingsalgoritme (v2.0)
│       │   ├── indeling.ts  # hoofdalgoritme
│       │   ├── conflicten.ts
│       │   └── types.ts
│       ├── components/      # herbruikbare UI-componenten
│       │   ├── Header.tsx           # topbar met brand + nav + thema-toggle
│       │   ├── SchutterKaart.tsx    # draggable kaart (4-hoekenlayout)
│       │   ├── DoelKolom.tsx        # doel met head, body, beurten-teller
│       │   ├── NietIngedeeldBalk.tsx
│       │   └── SchutterFormulier.tsx
│       ├── pages/           # schermen
│       │   ├── WedstrijdenPage.tsx
│       │   ├── SchuttersPage.tsx
│       │   ├── WedstrijdDetailPage.tsx
│       │   ├── ConfiguratieTab.tsx
│       │   ├── InschrijvingenTab.tsx
│       │   ├── IndelingTab.tsx
│       │   └── AfdrukkenTab.tsx
│       ├── hooks/
│       │   └── useDarkMode.ts
│       ├── types.ts         # gedeelde TypeScript-types
│       ├── index.css        # design tokens (CSS vars) + componentstijlen
│       └── App.tsx          # app-root met navigatie
├── docs/                    # specificaties, regels, algoritme-documentatie
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

## CSV-formaat

Voor import/export van het schuttersbestand:

```csv
voornaam,naam,gilde_naam,type_boog,leeftijdscategorie,geslacht,afstand
Jan,Janssen,Gilde De Gulden Pijl,Recurve,Senior,M,25
Marie,Peeters,Gilde De Gulden Pijl,Compound,Senior,V,25
```

- Header is **verplicht** en bepaalt de kolomvolgorde.
- `type_boog` ∈ `{Recurve, Compound, Barebow, Andere}`.
- `leeftijdscategorie` ∈ `{Aspirant, Jeugd, Junior, Senior, Veteraan}`.
- `geslacht` ∈ `{M, V}`.
- `afstand` ∈ `{12, 18, 25}` (in meter).
- Onbekende gilde-namen worden automatisch aangemaakt.
- Excel-vriendelijk: export schrijft een UTF-8 BOM voor correcte
  weergave van accenten.

## Visuele identiteit

Light-mode gebruikt een warme grijsschaal met de drie kleuren van een
boogschiet-doel als accenten:

- **Geel** `#f5c518` — primaire actie-accent (auto-indelen, dubbel-badge)
- **Rood** `#e63946` — compound-zone, gevarenzone
- **Blauw** `#1d70b8` — secundair accent (focus rings, links)

Boogtype is herkenbaar aan een 4-pixel gekleurde linkerstrip op elke
schutterkaart: blauw=Recurve, rood=Compound, geel=Barebow.

## Voor AI-agents

Bij wijzigingen aan het **indelingsalgoritme**:
1. Lees eerst [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md) (gewenst gedrag)
   en [docs/RULES_HIERARCHY.md](docs/RULES_HIERARCHY.md) (prioriteit).
2. Voor de huidige implementatie zie
   [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md) en
   [`src/renderer/src/algoritme/indeling.ts`](src/renderer/src/algoritme/indeling.ts).

Bij wijzigingen aan de **UI**:
- Design-tokens en alle componentstijlen staan in
  [`src/renderer/src/index.css`](src/renderer/src/index.css) — gebruik de
  bestaande klassen (`.btn`, `.card`, `.chip`, `.schutter`, `.doel`,
  `.aanmeldlijst`, `.split-pane`, …) en de CSS-variables uit `:root`.
- Dark mode werkt automatisch: zet enkel CSS-variables in `:root.dark` om
  ze in beide modi gedekt te hebben.
- Componenten in `src/renderer/src/components/` zijn herbruikbaar;
  schermen in `src/renderer/src/pages/` orkestreren ze.

Bij wijzigingen aan de **database**:
- Schema en migraties in [`src/main/database.ts`](src/main/database.ts).
- IPC-handlers in [`src/main/ipc.ts`](src/main/ipc.ts), via `window.api` in
  de renderer (zie [`src/preload/index.ts`](src/preload/index.ts) en
  [`src/preload/index.d.ts`](src/preload/index.d.ts)).
