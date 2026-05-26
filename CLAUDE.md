# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OnTarget — een Electron + React + TypeScript desktopapp voor het automatisch indelen van boogschutters over doelen bij wedstrijden van Vlaamse schuttersgilden. Lokaal, geen server: sql.js voor opslag, @dnd-kit voor drag-and-drop, theming via CSS variables met dark-mode.

Project is **Nederlandstalig (Vlaams)** — code-commentaar, UI-teksten en variabelennamen volgen die conventie.

## Commands

```bash
npm install
npm run dev          # electron-vite dev met hot reload
npm run build        # productie-build (out/)
npm run build:win    # Windows installer (.exe) via electron-builder
```

Er is **geen test- of lint-script** geconfigureerd. TypeScript-typecheck loopt via `electron-vite build`.

## Architectuur

Drie processen volgens het standaard electron-vite layout:

- **`src/main/`** — Electron main process. App entry in `index.ts`, sql.js setup + schema in `database.ts`, IPC-handlers in `ipc.ts` (gilden, schutters, wedstrijden, inschrijvingen, indeling, demo). De database leeft in Electron's `userData`-folder, niet in de repo.
- **`src/preload/`** — `contextBridge` API. Renderer praat met de main process via `window.api`, getypeerd in `src/preload/index.d.ts`.
- **`src/renderer/src/`** — React app. `pages/` orkestreren `components/`. Schermen: `WedstrijdenPage`, `SchuttersPage`, `WedstrijdDetailPage` (met sub-tabs `Configuratie`, `Inschrijvingen`, `Indeling`, `Afdrukken`).

### Het indelingsalgoritme (`src/renderer/src/algoritme/`)

Paren-gebaseerd algoritme met LPT bin-packing over twee sporen — zie [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md). **Stabiel — alleen aanraken als nodig**, en eerst lezen:

1. [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md) — gewenst gedrag, input/output, randgevallen.
2. [docs/RULES_HIERARCHY.md](docs/RULES_HIERARCHY.md) — regels per prioriteit (harde → zachte).
3. [docs/ALGORITME_v2.0.md](docs/ALGORITME_v2.0.md) — huidige implementatie.

[docs/RULES.md](docs/RULES.md) bevat alle regels in gewone taal; [docs/FEATURES.md](docs/FEATURES.md) is het functioneel overzicht.

### Gedeelde logica — hergebruiken, niet dupliceren

- **Schutter-validatie (categorie × boog × afstand)**: pure validator `valideerImportRij` in [`src/renderer/src/components/ImportReviewModal.tsx`](src/renderer/src/components/ImportReviewModal.tsx). De helpers `afstandToegestaan` / `categorieToegestaan` in [`src/renderer/src/components/SchutterFormulier.tsx`](src/renderer/src/components/SchutterFormulier.tsx) hergebruiken die voor form-disable/filter-logica.
  - Regels: Jeugd → 12m/18m; Aspirant/Junior/Senior/Veteraan → 25m; Veteraan + Compound geblokkeerd.
- **Categorie/geslacht-label** (UI-weergave): één helper `categorieLabel` in [`src/renderer/src/lib/labels.ts`](src/renderer/src/lib/labels.ts). Geen ad-hoc varianten — breid de helper uit als de regels wijzigen.

### Database

Schema + migraties in [`src/main/database.ts`](src/main/database.ts). Voor bulk-acties altijd `transaction(() => { … })` gebruiken (zie `schutters:deleteAll` en `demo:laad`). Aparte cleanup-IPC's voor afhankelijke tabellen (bv. `gilden:deleteLege`).

## UI-conventies

- **Geen Tailwind utility classes toevoegen**, ook al staat Tailwind in `devDependencies`. Alle styling gaat via bestaande klassen (`.btn`, `.card`, `.chip`, `.schutter`, `.doel`, `.aanmeldlijst`, `.split-pane`, `.config-card`, …) en CSS-variables uit `:root` / `:root.dark` in [`src/renderer/src/index.css`](src/renderer/src/index.css).
- **Dark mode** werkt automatisch via CSS-vars in `:root.dark` — zet variabelen, geen aparte selectors per component.
- Boogtype is herkenbaar aan een 4-pixel gekleurde linkerstrip op de schutterkaart: blauw=Recurve, rood=Compound, geel=Barebow.
- Doel-accenten: geel `#f5c518` (primair), rood `#e63946` (compound/gevaar), blauw `#1d70b8` (focus/links).

## CSV import/export

Header verplicht: `voornaam,naam,gilde_naam,type_boog,leeftijdscategorie,geslacht,afstand`. Export schrijft UTF-8 met BOM (Excel-compat). Een export is direct weer importeerbaar. Onbekende gilden worden bij commit automatisch aangemaakt. Voorbeeld met 3 conflict-rijen: [`samples/schutters-demo.csv`](samples/schutters-demo.csv).
