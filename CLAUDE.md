# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OnTarget — een Electron + React + TypeScript desktopapp voor het automatisch indelen van boogschutters over doelen bij wedstrijden van Vlaamse schuttersgilden. Lokaal, geen server: sql.js voor opslag, @dnd-kit voor drag-and-drop, theming via CSS variables met dark-mode.

Project is **Nederlandstalig (Vlaams)** — code-commentaar, UI-teksten en variabelennamen volgen die conventie.

## Openstaande werken en context

De changelogs in `internal-docs/RELEASE_*.md` zijn de bron van waarheid voor recent werk, design-afspraken en de aanpak achter eerdere PR's. Lees de meest recente vóór je een nieuwe taak oppakt: vaak hangt het werk samen met een eerder afgesproken aanpak. Zie de sectie "Release-notities" hieronder voor de huidige versie.

## Commands

```bash
npm install
npm run dev          # electron-vite dev met hot reload
npm run build        # productie-build (out/)
npm run build:win    # Windows installer (.exe) via electron-builder
npm test             # algoritme-tests (Node test-runner, geen extra dependency)
```

Er is **geen lint-script** geconfigureerd. TypeScript-typecheck loopt via `electron-vite build`. Voor het indelingsalgoritme is er wel een test-harnas: `npm test` draait de scenario- en fuzz-tests in [`test/`](test/) (zie [internal-docs/ALGORITHM_DEFENSE.md](internal-docs/ALGORITHM_DEFENSE.md)).

## Architectuur

Drie processen volgens het standaard electron-vite layout:

- **`src/main/`** — Electron main process. App entry in `index.ts`, sql.js setup + schema in `database.ts`, IPC-handlers in `ipc.ts` (gilden, schutters, wedstrijden, inschrijvingen, indeling, demo). De database leeft in Electron's `userData`-folder, niet in de repo.
- **`src/preload/`** — `contextBridge` API. Renderer praat met de main process via `window.api`, getypeerd in `src/preload/index.d.ts`.
- **`src/renderer/src/`** — React app. `pages/` orkestreren `components/`. Schermen: `WedstrijdenPage`, `SchuttersPage`, `WedstrijdDetailPage` (met sub-tabs `Configuratie`, `Inschrijvingen`, `Indeling`, `Afdrukken`).

### Het indelingsalgoritme (`src/renderer/src/algoritme/`)

Paren-gebaseerd algoritme met LPT bin-packing over twee sporen — zie [internal-docs/ALGORITME_v2.0.md](internal-docs/ALGORITME_v2.0.md). **Stabiel — alleen aanraken als nodig**, en eerst lezen:

1. [internal-docs/ALGORITHM_SPEC.md](internal-docs/ALGORITHM_SPEC.md) — gewenst gedrag, input/output, randgevallen.
2. [internal-docs/RULES_HIERARCHY.md](internal-docs/RULES_HIERARCHY.md) — regels per prioriteit (harde → zachte).
3. [internal-docs/ALGORITME_v2.0.md](internal-docs/ALGORITME_v2.0.md) - huidige implementatie (incl. fase 7, de lexicografische verfijning).
4. [internal-docs/ALGORITHM_DEFENSE.md](internal-docs/ALGORITHM_DEFENSE.md) - de doelfunctie, waarom de verfijning beter is, en openstaande regelnotities.

[internal-docs/RULES.md](internal-docs/RULES.md) bevat alle regels in gewone taal; [internal-docs/FEATURES.md](internal-docs/FEATURES.md) is het functioneel overzicht.

### Release-notities

Per alpha/release-bump ligt er een changelog-bestand in `internal-docs/RELEASE_<versie>.md`. Lees de meest recente vóór je werk begint, vooral voor recent gewijzigde features en nieuwe conventies. Huidige: [internal-docs/RELEASE_0.2.4.md](internal-docs/RELEASE_0.2.4.md).

### Gedeelde logica — hergebruiken, niet dupliceren

- **Schutter-validatie (categorie × boog × afstand)**: pure validator `valideerImportRij` in [`src/renderer/src/components/ImportReviewModal.tsx`](src/renderer/src/components/ImportReviewModal.tsx). De helpers `afstandToegestaan` / `categorieToegestaan` in [`src/renderer/src/components/SchutterFormulier.tsx`](src/renderer/src/components/SchutterFormulier.tsx) hergebruiken die voor form-disable/filter-logica.
  - Regels: Jeugd → 12m/18m; Aspirant/Junior/Senior/Veteraan → 25m; Veteraan + Compound geblokkeerd.
- **Categorie/geslacht-label** (UI-weergave): één helper `categorieLabel` in [`src/renderer/src/lib/labels.ts`](src/renderer/src/lib/labels.ts). Geen ad-hoc varianten — breid de helper uit als de regels wijzigen.

### Database

Schema + migraties in [`src/main/database.ts`](src/main/database.ts). Voor bulk-acties altijd `transaction(() => { … })` gebruiken (zie `schutters:deleteAll` en `demo:laad`). Aparte cleanup-IPC's voor afhankelijke tabellen (bv. `gilden:deleteLege`).

### Bestandsformaten (stabiele contracten)

- **Wedstrijd-backup JSON**: gespecificeerd in [internal-docs/BACKUP_FORMAT.md](internal-docs/BACKUP_FORMAT.md). Doorheen versies stabiel: de top-level discriminator (`"type": "ontarget-wedstrijd-backup"`) en `schemaVersie` blijven, en binnen één versie zijn alleen additieve wijzigingen toegelaten. Een breaking change vereist een `schemaVersie`-bump met behoud van de oude lezer. Update het document mee zodra je iets aan de export- of import-handler raakt — dat is verplicht, geen optie.
- **Schutter-CSV**: zie de "CSV import/export"-sectie onderaan dit document.

## Website (GitHub Pages)

De publieke website (`ontarget.stefvdwater.be`) staat **niet** in `main`. Ze leeft volledig op de losgekoppelde **`gh-pages`** branch en is bewust ontkoppeld van de app-versie: een commit op `main` triggert geen Pages-deploy, alleen een push naar `gh-pages` doet dat.

- **`gh-pages`** is een orphan branch met de statische site aan de root (`index.html`, `handleiding.html`, `styles.css`, `404.html`, `CNAME`, `.nojekyll`). Geen app-code. Pages-bron in GitHub Settings staat op `gh-pages` /root.
- **Worktree-workflow**: de site is uitgecheckt als sibling-folder `../target-assignment-site` (branch `gh-pages`), zodat je de live app-code in deze repo (`main`) kan lezen terwijl je de site bewerkt. Een feature documenteren = app-code hier lezen, pagina daar schrijven.
- **Deployen** = committen en pushen in die worktree:
  ```bash
  cd ../target-assignment-site
  git add -A && git commit -m "..." && git push
  ```
- Bestaat de worktree (nog) niet, dan: `git worktree add ../target-assignment-site gh-pages`.

## UI-conventies

- **Geen Tailwind utility classes toevoegen**, ook al staat Tailwind in `devDependencies`. Alle styling gaat via bestaande klassen (`.btn`, `.card`, `.chip`, `.schutter`, `.doel`, `.aanmeldlijst`, `.split-pane`, `.config-card`, …) en CSS-variables uit `:root` / `:root.dark` in [`src/renderer/src/index.css`](src/renderer/src/index.css).
- **Dark mode** werkt automatisch via CSS-vars in `:root.dark`: zet variabelen, geen aparte selectors per component.
- **Geen gradient-fades** op achtergronden. Gebruik vlakke `var(--*-soft)` tints met een gekleurde border. Tokens hebben automatische dark-mode varianten.
- **Geen em dashes** (—) of en dashes (–) in tekst, UI, comments, commits. Vlaams gebruikt ze niet. Vervang door hyphen, dubbele punt, komma, of herstructureer.
- Boogtype is herkenbaar aan een 4-pixel gekleurde linkerstrip op de schutterkaart: blauw=Recurve, rood=Compound, geel=Barebow.
- Doel-accenten: geel `#f5c518` (primair), rood `#e63946` (compound/gevaar), blauw `#1d70b8` (focus/links).

## CSV import/export

Header verplicht: `voornaam,naam,gilde_naam,type_boog,leeftijdscategorie,geslacht,afstand`. Export schrijft UTF-8 met BOM (Excel-compat). Een export is direct weer importeerbaar. Onbekende gilden worden bij commit automatisch aangemaakt. Voorbeeld met 3 conflict-rijen: [`samples/schutters-demo.csv`](samples/schutters-demo.csv).
