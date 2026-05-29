# Release 0.2.4-alpha.10

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

### Conflict-waarschuwingen respecteren spec-uitzonderingen (PR-A uit openstaande werken)

Twee onterechte aandachtspunten in de Indelingstab werkten gen [ALGORITHM_SPEC.md](ALGORITHM_SPEC.md) tegen:

- **Mono-gilde-zone** (P5-1): de waarschuwing "Alle schutters op dit doel komen van hetzelfde gilde" werd ook getoond als de hele zone slechts 1 gilde bevat, terwijl §7.2 en §9 die uitzondering expliciet maken (er is dan geen werkbaar alternatief). [`voegConflictenToe`](../src/renderer/src/algoritme/conflicten.ts) telt nu per zone het aantal unieke gilden over alle bezette doelen en geeft dat als context mee aan `detecteerConflicten`; de waarschuwing wordt onderdrukt wanneer `zoneGildenCount === 1`.
- **TH-only-dubbelaars** (P5-3): de waarschuwing "Een dubbelschutter staat niet op de eerste positie" werd ook gemeld voor doelen waar enkel tweede-helft-dubbels stonden, die volgens §8 net achteraan horen. Het filter is beperkt tot EH-dubbels en vol-dubbels (`dubbel_eerste_helft === true`); TH-only-dubbels triggeren niets meer.

De publieke API van `voegConflictenToe(doelen)` blijft ongewijzigd; de zone-telling gebeurt intern. Geen wijziging in de daadwerkelijke indeling — enkel de melding-laag is consistent met de spec.

### Variabele compound-zone behouden na tab-wissel

`berekenIndeling` herbestemt sinds [#9](https://github.com/stefvdwater/ontarget/issues/9) ongebruikte compound-doelen tot `25m`-doelen, maar die runtime-rebrand werd niet gepersisteerd. Bij elke tab-wissel reconstrueerde [`IndelingTab.laadIndeling`](../src/renderer/src/pages/IndelingTab.tsx) de zones puur uit de wedstrijd-config, waardoor het doel terug compound werd en de 25m-schutters erop onterecht conflict-rood opleverden.

De DRY-extractie [`pasRuntimeCompoundZoneToe`](../src/renderer/src/algoritme/zones.ts) past één regel toe: een compound-doel dat geen compound-schutter draagt en niet vergrendeld is wordt `25m`. Drie callers gebruiken de helper:

- `berekenIndeling` (verving het inline-blok dat het oude gedrag implementeerde).
- `IndelingTab.laadIndeling` na het verdelen van de schutters uit de database.
- `AfdrukkenTab.laadIndeling` idem; deze handler leest nu ook `indeling.getVergrendeldeDoelen` op zodat lege vergrendelde compound-doelen consistent compound blijven, ook in de print-preview.

Bewuste beperking: de helper wordt **niet** aangeroepen na een drag-and-drop. Een rebrand-doel (nu 25m) waar je daarna een compound-schutter naartoe sleept blijft 25m tot een nieuwe auto-indeling. Het algoritme is ontworpen als one-shot; tussenliggende handmatige verschuivingen veranderen de zone-typering niet. Bij twijfel: opnieuw "Automatisch indelen".

### R4-hard verschuiving in zones met één gilde (PR-B uit openstaande werken)

`handhaafMin4Beurten` (Fase 5 van de normaal-verdeling in [`indeling.ts`](../src/renderer/src/algoritme/indeling.ts)) blokkeerde elke verschuiving tussen normaaldoelen in een zone die maar één gilde telt: de filter "bron moet na verwijdering nog ≥ 2 gilden bevatten" werd toegepast op alle bron-doelen, en die voorwaarde is onhaalbaar als er sowieso maar één gilde is. Bij ongelijke lone-verdeling kon een normaaldoel zo onder de harde minimum van vier beurten blijven hangen (R4-hard), terwijl [ALGORITHM_SPEC §7.2](ALGORITHM_SPEC.md) die 2-gilden-eis voor mono-gilde-zones net expliciet opheft.

`verwerkZone` telt nu eenmalig het aantal unieke gilden over de hele zone met `gildeKey` (waarbij schutters zonder gilde één virtueel `__geen__`-gilde delen, consistent met de rest van het algoritme) en geeft de telling door aan `verdeelNormalen` → `handhaafMin4Beurten`. Daar wordt de 2-gilden-blokkade enkel nog toegepast wanneer `zoneGildenCount > 1`; bij precies één gilde is de filter overgeslagen en kunnen schutters van overvolle bron-doelen alsnog verplaatst worden tot elk normaaldoel ≥ 4 beurten haalt.

Concreet test-scenario in [`samples/test-scenarios/0.2.4-alpha.7/12m-een-gilde-zone-r4hard.json`](../samples/test-scenarios/0.2.4-alpha.7/12m-een-gilde-zone-r4hard.json): 12m-zone met twee doelen, acht jeugdschutters van hetzelfde gilde, geen dubbelaars. Importeren en "Bereken indeling" levert nu een 4-4-verdeling i.p.v. 5-3.

Bewuste scope-beperking: de fix raakt enkel Fase 5 binnen `verdeelNormalen`, dus de bron- en doel-doelen zijn allebei normaal-doelen. Dubbeldoelen worden in Fase A al volledig opgevuld en niet als bron meegegeven aan Fase 5. Zones met twee of meer gilden blijven het bestaande gedrag aanhouden — de 2-gilden-voorkeur per doel wordt daar nog steeds bewaakt door dezelfde filter.

### Duurzaamheid van de data layer (PR-C uit openstaande werken)

Vier samenhangende correcties in [`src/main/database.ts`](../src/main/database.ts), [`src/main/index.ts`](../src/main/index.ts) en [`src/main/ipc.ts`](../src/main/ipc.ts) maken de sql.js-laag robuuster tegen crashes, snelle quits en geneste schrijfacties. Geen schemawijziging; bestaande databases blijven leesbaar.

- **Flush bij afsluiten** (P1-1): `scheduleSave()` debounct 500ms. Wie de app sloot binnen die marge na een schrijfactie verloor die laatste wijziging. Een nieuwe export `flushDatabaseSync()` in `database.ts` annuleert de wachtende timeout en schrijft synchroon naar disk. `index.ts` koppelt die aan `app.on('before-quit', ...)` zodat de save altijd wordt afgerond voor het proces eindigt.
- **Geen scheduleSave mid-transactie + nested-tx guard** (P1-2): elke `run()` plande voorheen een save, ook tijdens een open transactie. Bij een transactie met N statements werden N+1 saves gepland (door debounce meestal samengevoegd, maar het was lekkend gedrag). Een module-niveau `inTransaction`-vlag onderdrukt nu `scheduleSave()` tijdens een transactie; `transaction()` zelf plant één save na een succesvolle commit. Tegelijk weigert `transaction()` geneste aanroepen expliciet (`throw new Error('Nested transaction not supported')`) omdat sql.js geen geneste `BEGIN` ondersteunt en de vorige stille SQL-fout moeilijk te diagnosticeren was. Geen huidige callsite is genest; de guard is dus een veiligheidsnet voor toekomstige wijzigingen.
- **Cascade-cleanup in `schutters:delete`** (P1-3): met `PRAGMA foreign_keys = ON` faalde een directe `DELETE FROM schutters` zodra de schutter ingeschreven of ingedeeld was; de UI kreeg een onleesbare SQLite-foutmelding. De handler ruimt nu eerst rijen uit `indeling` en `inschrijvingen` (gefilterd op `schutter_id`) op binnen één transactie, en verwijdert pas dan de schutter zelf. `vergrendelde_doelen` blijft ongemoeid: vergrendeling is een configuratie-keuze, niet afgeleid uit bezetting. Een doel dat door deze delete leeg achterblijft, blijft dus vergrendeld (consistent met "leeg gereserveerd doel").
- **Foutafhandeling in `saveToDisk`** (P1-4): `writeFileSync` kon eerder het main-proces laten crashen bij volle disk, read-only filesystem of antivirus-interventie. De functie zit nu in een `try/catch`: bij een fout wordt gelogd én een `dialog.showErrorBox('Opslagfout', ...)` getoond met een Nederlandstalige uitleg. Geen automatische retry, om retry-loops te voorkomen; de gebruiker krijgt de melding zichtbaar en kan zelf actie ondernemen (schijfruimte, rechten, herstart).

### Backup-format versiecheck spec-conform en centraal getypeerd (PR-D uit openstaande werken)

Vier samenhangende correcties rond het wedstrijd-backup JSON-formaat, allemaal gedragsmatig consistent met [BACKUP_FORMAT.md](BACKUP_FORMAT.md) als bron van waarheid. Geen schemawijziging; bestaande v1-backups blijven onveranderd importeerbaar.

- **Spec-conforme versiecheck** (P3-1 / P1-5): `wedstrijden:importApply` deed voorheen strikt `schemaVersie !== 1`, wat toevallig OK was zolang enkel v1 bestond maar het [stabiliteitscontract §3-5](BACKUP_FORMAT.md) schond. De check zit nu in een pure `valideerEnNormaliseer(payload)` in de nieuwe gedeelde module [`src/shared/backupTypes.ts`](../src/shared/backupTypes.ts) en volgt de tabel "Hoe lezers moeten omgaan met versie-mismatch": ontbrekende of foute `type` geeft *"Bestand is geen OnTarget wedstrijd-backup"*, een niet-integer of `< 1` schemaVersie geeft *"Ongeldige of ontbrekende schemaVersie"*, en een toekomstige `> HUIDIGE_SCHEMA` geeft de gedocumenteerde update-de-app boodschap. De huidige `HUIDIGE_SCHEMA = 1` blijft het enige werkende leespad; toevoegen van een toekomstige v2-lezer betekent simpelweg dispatch toevoegen binnen dezelfde validator.
- **Vroege validatie in `importCheck`** (P3-5): de conflict-detectie accepteerde elk JSON-object met `wedstrijd.naam + datum`, waardoor random JSON eerst de conflict-modal triggerde en pas in `importApply` ontplofte. `importCheck` roept nu dezelfde validator aan; ongeldige bestanden worden door de bestaande try/catch in [`WedstrijdenPage.handleImportBestand`](../src/renderer/src/pages/WedstrijdenPage.tsx) als 'fout' opgenomen in het batch-resultaat zonder dat de modal opent.
- **Centraal `BackupPayloadV1`-type** (P3-6): nieuw [`src/shared/backupTypes.ts`](../src/shared/backupTypes.ts) volgt letterlijk BACKUP_FORMAT.md §"Top-level structuur". `bouwBackupPayload` heeft return-type `BackupPayloadV1` zodat drift tussen exporter en spec compile-time wordt gevangen. `importCheck` en `importApply` nemen `unknown` aan en typen via de validator. Eerste bewoner van de `@shared`-alias die al in de tsconfigs en (renderer-)vite-config klaarstond; main- en preload-vite-configs in [`electron.vite.config.ts`](../electron.vite.config.ts) hebben de alias erbij gekregen.
- **Pre-0.2.4 tolerantie expliciet gemaakt** (P3-2): de import-handler defaultte al naar `aantal_compound_doelen = 1` voor backups uit pre-0.2.4 versies (waar het veld nog niet bestond), maar BACKUP_FORMAT.md zei dat het veld verplicht is. De spec onderscheidt nu schrijvers (verplicht meegeven) en lezers (tolerant, default 1), consistent met §"Compatibiliteitsregels in detail" punt 4. Het type weerspiegelt dat (`aantal_compound_doelen?: number`).

Negen handmatige import-scenario's in [`samples/test-scenarios/0.2.4-alpha.8/`](../samples/test-scenarios/0.2.4-alpha.8/) dekken elk pad af: één geldig baseline-bestand, één v1 zonder `aantal_compound_doelen`, en zeven foutpaden (type ontbreekt/fout, schemaVersie toekomstig/niet-integer/ontbreekt/nul, wedstrijd-blok ontbreekt) elk met de exact verwachte foutmelding gedocumenteerd in de [README](../samples/test-scenarios/0.2.4-alpha.8/README.md).

Bewuste scope-beperking: geen lezer-extractie naar een aparte `lezerV1(payload)`-functie. De code is nog v1-only en een aparte interne representatie zou premature abstractie zijn. De gedeelde validator is wel een natuurlijk uitbreidingspunt: bij toevoeging van v2 splits hij in versie-specifieke dispatch zonder de call-sites te raken.

### UI hardening: race, debounce en accidentele modal-dismiss (PR-E uit openstaande werken)

Drie samenhangende UX-correcties zonder schema- of algoritmewijziging. Bestaande data blijft ongemoeid.

- **Atomair-toegekende aanmeldvolgorde** (P4-1): de renderer berekende voorheen `Math.max(...inschrijvingen.map(i => i.aanmeldvolgorde)) + 1` op zijn lokale state en stuurde dat mee naar `inschrijvingen:create`. Twee snelle clicks lazen dezelfde stale state en konden zo identieke volgorde-nummers claimen. De allocatie is verhuisd naar het main-process: [`inschrijvingen:create`](../src/main/ipc.ts) wikkelt nu een `SELECT COALESCE(MAX(aanmeldvolgorde), 0) + 1` plus de bijhorende `INSERT` binnen één `transaction()`. Race uitgesloten zonder dat een UNIQUE-constraint of renderer-retry-logica nodig is. De payload van `inschrijvingen:create` bevat dus geen `aanmeldvolgorde` meer; `voegToe` en `maakNieuw` in [`InschrijvingenTab`](../src/renderer/src/pages/InschrijvingenTab.tsx) sturen het niet meer mee. De handler returnt de toegekende volgorde mee in het resultaatobject, al gebruikt de renderer dat vandaag niet (volle refetch via `laad()` blijft het patroon).
- **300ms debounce op wedstrijd-config** (P4-2): elke toetsaanslag op naam of locatie in de Configuratie-tab veroorzaakte voorheen één `wedstrijden:update`-IPC en bijhorende sql.js-write. [`WedstrijdDetailPage`](../src/renderer/src/pages/WedstrijdDetailPage.tsx) houdt nu via een ref de laatste pending Wedstrijd-payload bij en plant één `setTimeout` van `CONFIG_SAVE_DEBOUNCE_MS` (300ms). Volgende edits binnen dat venster vervangen de pending payload en herstarten de timer. Een `flushConfigSave()`-helper wordt aangeroepen bij component-unmount, bij `wedstrijd.id`-wissel (cleanup van de id-effect), bij tab-wissel weg van Configuratie, en bij `window.blur`/`beforeunload`. De flush schrijft synchroon de pending payload weg via dezelfde `window.api.wedstrijden.update`-call, zodat de daaropvolgende `flushDatabaseSync()` (al gekoppeld aan `before-quit` sinds PR-C) de data effectief op disk krijgt. Geen sichtbare gedragswijziging bij normale workflow; enkel het aantal DB-writes daalt.
- **Modals die niet meer per ongeluk dismissen** (P3-3): de wedstrijd-import conflict-modal in [`WedstrijdenPage`](../src/renderer/src/pages/WedstrijdenPage.tsx) interpreteerde een backdrop-klik als "Overslaan", waardoor een misklik bij multi-file import een bestand stilletjes liet vallen. Backdrop-klik is no-op geworden (`onClick={(e) => e.stopPropagation()}`). Dezelfde behandeling op alle modals waar dismiss data of werk kost: de CSV-import-review in [`ImportReviewModal`](../src/renderer/src/components/ImportReviewModal.tsx) verloor zijn Escape-handler en backdrop-dismiss, en de twee `Modal`-wrappers voor het schutter-formulier in [`SchuttersPage`](../src/renderer/src/pages/SchuttersPage.tsx) en [`InschrijvingenTab`](../src/renderer/src/pages/InschrijvingenTab.tsx) idem (de `onClose`-prop is uit hun signatuur verdwenen omdat hij intern niet meer wordt gebruikt; cancel loopt nu enkel via de Annuleren-knop in het formulier zelf). Ook de bevestig-modals voor verwijderen of resetten ([`ConfiguratieTab`](../src/renderer/src/pages/ConfiguratieTab.tsx) "wedstrijd verwijderen", [`SchuttersPage`](../src/renderer/src/pages/SchuttersPage.tsx) "alle schutters", "lege gilden", "schutter verwijderen", "demo laden", en [`IndelingTab`](../src/renderer/src/pages/IndelingTab.tsx) "herberekenen" en "leegmaken") krijgen geen backdrop-dismiss meer. Info-modals (`Import-resultaat`, `Export voltooid`) blijven ongewijzigd: daar is dismissen via backdrop het verwachte gedrag.

Bewuste scope-beperking: geen consolidatie van de twee bijna-identieke `Modal`-wrappers naar één gedeelde component. Beide leven binnen hun eigen pagina-bestand en de duplicatie blijft expliciet leesbaar — een refactor zou de scope van PR-E onnodig breed maken en kan later opgepakt worden als andere pagina's vergelijkbare modals nodig hebben.
