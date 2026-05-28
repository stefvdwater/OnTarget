# Release 0.2.4-alpha.5

Doel van dit document: een agent of mens die voor het eerst aan deze codebase werkt tijdens of na cyclus 0.2.4 snel laten begrijpen wat er is gewijzigd ten opzichte van 0.2.3.

## Overzicht

Cyclus gestart vanaf [`0.2.3`](RELEASE_0.2.3.md). Vier kleine UI/structurele aanpassingen aan het begin: een toelichtende code-comment ([#13](https://github.com/stefvdwater/ontarget/issues/13)), het vervangen van emoji's door inline-SVG iconen ([#12](https://github.com/stefvdwater/ontarget/issues/12)), het rechttrekken van de verticale uitlijning van die iconen ([#16](https://github.com/stefvdwater/ontarget/issues/16)) en het stabiliseren van de pagina-layout bij tab-wissel met consistente afgeronde scrollbars ([#11](https://github.com/stefvdwater/ontarget/issues/11)). Daarna een grotere uitbreiding rond backups: per-wedstrijd export en import in een gespecificeerd JSON-formaat ([#3](https://github.com/stefvdwater/ontarget/issues/3)) en een backup-prompt in de destructieve modals op de schutterspagina ([#2](https://github.com/stefvdwater/ontarget/issues/2)). De backup-feature voegt nieuwe IPC-handlers toe in [`src/main/ipc.ts`](../src/main/ipc.ts) en een nieuwe gedeelde lib [`src/renderer/src/lib/wedstrijdBackup.ts`](../src/renderer/src/lib/wedstrijdBackup.ts); het indelingsalgoritme en het database-schema blijven onaangeroerd.

## Wijziging

### Toelichtende comment boven createWindow (issue #13)

Eénregelige Nederlandstalige comment toegevoegd boven `createWindow()` in [`src/main/index.ts`](../src/main/index.ts:8) die kort beschrijft wat de functie doet (preload koppelen, dev-URL of gebouwde index.html laden). Geen gedragswijziging.

Dit issue was opgezet als sandbox-cyclus om de [`ontarget-flow`](../.claude/skills/ontarget-flow/SKILL.md) skill end-to-end te doorlopen.

### Emoji's vervangen door IconWarn-component (issue #12)

Drie emoji's in de UI vervangen door inline-SVG iconen in dezelfde stijl als de bestaande iconen in de header en importreview:

- `⚠` in de configuratie-waarschuwing (compound-doelen buiten de 25m-zone) → `<IconWarn size={16} />`.
- `⚠` in de chip "X aandachtspunten" boven de indeling → `<IconWarn size={12} />` (kleinere maat, past beter bij de 11px chip-tekst).
- `🎯` in de lege staat van de aanmeldlijst ("Iedereen ingedeeld 🎯") verwijderd zonder vervanging.

De `IconWarn`-functie die voorheen lokaal in [`ImportReviewModal.tsx`](../src/renderer/src/components/ImportReviewModal.tsx) leefde, is verplaatst naar een gedeelde locatie [`src/renderer/src/components/icons/IconWarn.tsx`](../src/renderer/src/components/icons/IconWarn.tsx) en accepteert een optionele `size`-prop (default 14). Bestaande callsites in `ImportReviewModal` blijven werken zonder gedragswijziging.

`.config-warn` in [`index.css`](../src/renderer/src/index.css) is een flex-container geworden (`display: flex; align-items: center; gap: 6px`) om het inline-SVG verticaal te kunnen uitlijnen met de tekst. De pixel-perfecte uitlijning wordt opgepakt in [#16](https://github.com/stefvdwater/ontarget/issues/16).

### Verticale uitlijning waarschuwingsiconen (issue #16)

De waarschuwingsdriehoek stond in alle callsites visueel te hoog t.o.v. tekst en container-midden. Twee oorzaken aangepakt in [`IconWarn.tsx`](../src/renderer/src/components/icons/IconWarn.tsx):

- Het svg-pad is herontworpen zodat de driehoek de viewBox vult en symmetrisch rond y=12 staat (top y=2, basis y=22). De oorspronkelijke asymmetrie (top y=3.86, basis y=21) liet meer lucht boven dan onder de driehoek, waardoor `align-items: center` op de container toch optisch scheef oogde.
- `display: block` en `flex-shrink: 0` op de svg om de inline-SVG-baseline-quirk uit te schakelen en te voorkomen dat het icoon krimpt in krappe flex-containers.

Het uitroepteken is proportioneel meegeschoven (streep y=8-13, dot y=18) zodat de verhoudingen binnen de driehoek bewaard blijven.

In [`DoelKolom.tsx`](../src/renderer/src/components/DoelKolom.tsx) leefde nog een lokale duplicate `IconWarn` (nalatenschap van #12); die is verwijderd en vervangen door een import van de gedeelde component met expliciete `size={13}` om de visuele grootte te behouden.

Geen wijziging aan de container-CSS-klassen (`.config-warn`, `.chip`, `.doel-warn`, `.dup-label`, `.import-review-row-warn`, `.import-review-row-head .status`): die gebruikten al de juiste `flex` + `align-items`, het probleem zat in de svg zelf.

### Stabiele pagina-layout bij tab-wissel en consistente scrollbars (issue #11)

Bij het wisselen tussen Wedstrijden en Schutters verspringt de pagina-inhoud niet meer enkele pixels naar links wanneer de ene tab wel en de andere geen scrollbar nodig had. Ook de twee knoppen rechtsboven (dark mode + website) blijven nu op hun plek.

De hoofdscroll van de app verhuist van `html`/`body` naar een nieuwe `.app-main` wrapper rond `.content` in [`App.tsx`](../src/renderer/src/App.tsx). Op die wrapper staat `overflow-y: auto` met `scrollbar-gutter: stable`, zodat de scrollbar-ruimte altijd gereserveerd is, ook als er niets te scrollen valt. De `.app` is nu vaste viewport-hoogte (`height: 100vh`) en de topbar is een gewone flex-child in plaats van `position: sticky`, waardoor de header tot aan de vensterrand loopt in plaats van te eindigen vóór de gutter-strook. Interne scroll-containers (`.aanmeldlijst-body`, `.beschikbaar-paneel-list`, `.modal-body`, `.import-review-list`, `.afdrukken-opties`, `.afdruk-gildelijst`) krijgen dezelfde `scrollbar-gutter: stable` behandeling.

In dezelfde wijziging zijn de scrollbar-stijlen geüniformeerd: de bestaande `::-webkit-scrollbar`-regels voor Aanmeldingen en Beschikbare schutters zijn vervangen door één globale set in [`index.css`](../src/renderer/src/index.css) (10px breed, transparante track, afgeronde thumb met `border-radius: 5px`, hover-state via `var(--text-2)`). Alle scrollbars in de app (pagina, modals, paneel-lijsten, Afdrukken-opties) zien er nu hetzelfde uit, zowel in light- als dark-mode via de bestaande kleur-tokens.

### Backup-export en -import van wedstrijden (issue #3)

Een wedstrijd kan nu volledig geëxporteerd worden naar een JSON-bestand en later (op dezelfde of een andere installatie) terug ingelezen worden, met haar inschrijvingen, doelindeling en vergrendelde-doelen-status intact. Het volledige formaat is gespecificeerd in [`internal-docs/BACKUP_FORMAT.md`](BACKUP_FORMAT.md) — dat document is de bron van waarheid en bevat het stabiliteitscontract dat het formaat doorheen versies bruikbaar houdt (vaste top-level `type`-string, monotoon groeiende `schemaVersie`, oude bestanden blijven altijd leesbaar, binnen één versie enkel additieve wijzigingen). Wie de export- of import-handler aanraakt, moet ook dat document mee bijwerken; dat is een afspraak die in [`CLAUDE.md`](../CLAUDE.md) staat onder de nieuwe sectie "Bestandsformaten (stabiele contracten)".

Backend in [`src/main/ipc.ts`](../src/main/ipc.ts):

- `wedstrijden:exportBackup(id)` levert de volledige payload voor één wedstrijd als JSON-object. Bevat de wedstrijd-configuratie, alle inschrijvingen, de indeling, de vergrendelde doelen, en de schutters die in de inschrijvingen voorkomen mét hun gilde-naam (zodat het bestand zelfstandig importeerbaar is).
- `wedstrijden:exportBackupBulk(ids)` opent éénmalig een `dialog.showOpenDialog` met `openDirectory + createDirectory` en schrijft per wedstrijd één JSON-bestand met `fs.writeFileSync` naar die map. Geen save-prompt per bestand. Returnt `{ geannuleerd, opgeslagen, map, fouten }`.
- `wedstrijden:importCheck(payload)` rapporteert of er al een wedstrijd met dezelfde `naam` + `datum` bestaat, zonder iets te wijzigen.
- `wedstrijden:importApply(payload, actie)` voert de import in één transactie uit. `actie` is `'vervang'`, `'kopie'`, of `'geen'`. Bij `'kopie'` krijgt de nieuwe wedstrijd de suffix `(kopie)`, `(kopie 2)`, ... tot een vrije naam. Schutters worden gematcht op `(LOWER(voornaam), LOWER(naam), LOWER(gilde_naam))`; geen match betekent nieuwe schutter (en eventueel nieuw gilde) aanmaken. Inschrijvingen en indeling-rijen krijgen de gemapte database-id's.

Bestandsformaat-helper en exporter-helpers leven in [`src/renderer/src/lib/wedstrijdBackup.ts`](../src/renderer/src/lib/wedstrijdBackup.ts), zodat zowel [`WedstrijdenPage`](../src/renderer/src/pages/WedstrijdenPage.tsx) als [`SchuttersPage`](../src/renderer/src/pages/SchuttersPage.tsx) dezelfde logica gebruiken. De slugify-functie voor bestandsnamen is bewust gedupliceerd in [`src/main/ipc.ts`](../src/main/ipc.ts) omdat main- en renderer-bundles niet rechtstreeks code delen; beide implementaties moeten in sync blijven.

UI in [`WedstrijdenPage.tsx`](../src/renderer/src/pages/WedstrijdenPage.tsx):

- Per wedstrijdkaart een klein download-icoon rechtsboven (`.wedstrijd-card-export`), zichtbaar op hover/focus, dat één wedstrijd via `<a download>` exporteert. De kaart zelf is daarom geen `<button>` meer maar een `<div role="button" tabIndex={0}>` om geneste interactive elements te vermijden.
- Dropdown "Importeren / Exporteren" bovenaan met twee echte knoppen: "Wedstrijden importeren" (file-input met `multiple`, accepteert `.json`) en "Alle exporteren" (sub-tekst toont het aantal). Submelding bij nul wedstrijden disablet de export-knop.
- Multi-file import verwerkt bestanden sequentieel. Per bestand wordt eerst `importCheck` gedaan; bij conflict opent dezelfde modal met (bij batch ≥ 2) een sub-header `Bestand X van Y: <bestandsnaam>` en drie keuzes: **Vervangen / Als kopie importeren / Overslaan**. Buiten de modal klikken = overslaan. Sequentiële await werkt via een Promise-resolver-ref (`conflictResolverRef`) zodat de batch-loop blokkeert tot de gebruiker kiest.
- Eén `BatchSamenvatting`-modal aan het einde toont per bestand de status (✓/–/✗), de uiteindelijke wedstrijdnaam (met hernoemd-notitie bij kopie), of de foutdetail. Totalen bovenaan: aantal geïmporteerd, overgeslagen, mislukt, en totale nieuwe schutters/gilden.
- Na een succesvolle bulk-export verschijnt een `exportResultaat`-modal die de gekozen map toont met aantal opgeslagen bestanden.

CSS in [`index.css`](../src/renderer/src/index.css): nieuwe stijlen `.wedstrijd-card-export` (subtiele icon-button met opacity-fade op hover), `.menu-item-info` (informatieve sub-tegel in een dropdown, niet-klikbaar). De wedstrijd-card kreeg `position: relative` voor de absolute positionering van de export-knop.

Bewuste exclusies in dit issue:

- Geen ZIP-bundel; één JSON per wedstrijd blijft de eenheid, ook bij bulk.
- De single-export (per-kaart-knop) gebruikt nog steeds `<a download>` omdat één save-prompt geen overlast geeft. Alleen de bulk-export is via `showOpenDialog` voor de UX-reden uit issue #2's discussie.
- Geen feature-flag of opt-out; het JSON-formaat is direct beschikbaar voor alle gebruikers vanaf deze versie.

### Backup-prompt bij destructieve schutters-acties (issue #2)

De bevestigingsmodals voor "Alle schutters verwijderen" en "Demo data laden" in [`SchuttersPage.tsx`](../src/renderer/src/pages/SchuttersPage.tsx) bevatten nu een gele tip-box (`.backup-prompt`) die de gebruiker uitnodigt om eerst alle wedstrijden te exporteren. De knop "Backup wedstrijden" hergebruikt `exporteerWedstrijden` uit de gedeelde lib en opent één map-keuze-dialoog. Na een succesvolle export wordt de knop "Backup opnieuw maken" en verschijnt eronder een status met aantal en gekozen map. Bij geen wedstrijden is het hele backup-blok afwezig.

Backup en destructieve actie zijn twee bewuste stappen: het maken van een backup voert het verwijderen of demo-laden niet automatisch uit. De gebruiker klikt eerst op "Backup wedstrijden", controleert de status, en pas dan op de eigenlijke bevestigingsknop ("Definitief verwijderen" of "Demo data laden"). Annuleren van de map-keuze-dialoog laat de modal in zijn beginstand zonder valse succes-melding.

De demo-modal tekst is bij deze gelegenheid gecorrigeerd: voorheen stond er misleidend "Wedstrijden en inschrijvingen worden ook gewist", terwijl `demo:laad` enkel inschrijvingen, indeling, vergrendelde doelen, schutters en gilden wist; de wedstrijden zelf blijven bestaan (zij het zonder schutters). De nieuwe tekst zegt dat expliciet.

De wedstrijden worden bij mount van de pagina meegeladen via `window.api.wedstrijden.getAll()` (uitbreiding van `laadSchutters`) zodat de tip-box kan weten of hij relevant is.

### Helper-component `WedstrijdBackupBlok`

Het backup-blok is een lokale component onderaan [`SchuttersPage.tsx`](../src/renderer/src/pages/SchuttersPage.tsx). Het houdt zijn eigen `bezig`- en `resultaat`-state, zodat de modal-mount automatisch een verse status geeft elke keer dat hij wordt geopend. Hergebruik buiten deze twee modals is mogelijk maar nog niet nodig; als het ergens anders relevant wordt, kan het naar `src/renderer/src/components/` verhuizen.
