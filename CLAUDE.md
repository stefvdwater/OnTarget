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

## Versie- en release-workflow

Dit is het beleid. De volledige stap-voor-stap runbook staat in de [`/release`-skill](.claude/skills/release/SKILL.md), niet hier.

- **Trunk-based.** `main` is de enige ontwikkellijn: feature-branch to PR to `main`, releases zijn tags op `main`. Geen langlevende release- of onderhoudsbranches; er is altijd maar een huidige versie in omloop.
- **Semver.** patch (`1.0.1`) = enkel bugfixes, minor (`1.1.0`) = nieuwe functie met behoud van compatibiliteit, major (`2.0.0`) = breaking change (bv. een `schemaVersie`-bump in [BACKUP_FORMAT](internal-docs/BACKUP_FORMAT.md) die de oude lezer breekt). De zwaarste wijziging in een cyclus bepaalt de bump, en je bumpt maar een keer (een release met een functie en drie fixes is een minor).
- **Cadans: bumpen pas bij de release.** Tussen releases blijft `package.json` op de laatste uitgebrachte versie; feature-merges bumpen niet. Bij het releasen kies je in een keer het volgende nummer op basis van wat sinds de vorige tag is gemerged. Git vertelt je wat onuitgebracht is, niet het versienummer.
- **Een release uitvoeren:** bump naar de volledige versie, commit (kaal versienummer als message), push `main`, dan `npm run release` (tagt `v<versie>` uit `package.json` to triggert `release.yml`). De [`/release`-skill](.claude/skills/release/SKILL.md) doet dit volledig, inclusief het afwachten en **expliciet verifieren** van de workflow-conclusie en het zetten van de gecureerde release-notes.
- **Hotfix.** Is `main` nog gelijk aan de laatste release, dan fix je op `main` en bump je een patch. Loopt `main` al voor met onuitgebracht werk, dan een korte `hotfix/x`-branch vanaf de release-tag, fix + patch-release, daarna terug mergen naar `main`.
- **Geen publieke pre-releases.** Testen gebeurt lokaal (test-harnas + `npm run dev`). Op twee niveaus afgedwongen: `npm run release` ([`scripts/tag-release.mjs`](scripts/tag-release.mjs)) weigert elke versie met een koppelteken, en `release.yml` filtert die tags weg (`!v*-*`). Stabiliteit volgt de versie: `v0.x` to publieke pre-release, `v1.0.0` en hoger to stabiele "Latest"-release.
- **Dev-versie in de UI.** De rechteronderhoek toont `__APP_VERSION__` ([`electron.vite.config.ts`](electron.vite.config.ts)): een echte build toont het kale nummer (`1.0.0`), de dev-server toont `1.0.0-dev+<hash>[-dirty]` zodat je de dev- en stable-instantie naast elkaar uit elkaar houdt.
- **CI.** [`ci.yml`](.github/workflows/ci.yml) draait `npm test` + `npm run build` op elke PR en push naar `main` (Node 24, want het test-harnas leunt op native TS-stripping). Een versie-bump triggert dus nooit een release, enkel een tag-push doet dat. [`release.yml`](.github/workflows/release.yml) bouwt op die tag de installer (nsis) en de draagbare zip op een Windows-runner.
- **Signing.** De builds zijn voorlopig ongesigneerd (Windows SmartScreen waarschuwt). Aanvaard voor handverdeling onder gilden; te herbekijken bij bredere verdeling.

## Documentatie-onderhoud

Doel: docs blijven waarheidsgetrouw zonder reactief opkuiswerk (zoals de "documentatie waarheidsgetrouw gemaakt"-pas in [RELEASE_0.2.5](internal-docs/RELEASE_0.2.5.md)). Drie regels:

1. **Een bron van waarheid per feit, de rest linkt ernaar.** Herhaal een feit niet in meerdere docs; verwijs met een link of een regel-ID. De algoritme-/regel-docs worden hiertoe geconsolideerd (5 to 3: een canonieke regellijst, een spec, een implementatie+verdediging).
2. **Same-PR doc-updates (verplicht).** Een PR die gedrag X wijzigt, werkt in dezelfde PR de doc(s) bij die X beschrijven. Geldt expliciet voor [BACKUP_FORMAT](internal-docs/BACKUP_FORMAT.md) (contract), [FEATURES.md](internal-docs/FEATURES.md) (gebruikersgedrag) en de regel-/algoritme-docs.
3. **Waarheidspas bij elke release.** De [`/release`-skill](.claude/skills/release/SKILL.md) bevat een doc-auditstap: loop de docs na die deze cyclus geraakt zijn, controleer op dode interne links, en kijk of de website-handleiding mee moet.

De `RELEASE_*.md`-changelogs zijn append-only momentopnames en worden nooit herschreven, ook niet bij een doc-consolidatie. Voor de website-handleiding: een gebruikerszichtbare gedragswijziging kan een handleiding-aanpassing vereisen, en screenshots zijn een extra drift-risico bij UI-wijzigingen.

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
