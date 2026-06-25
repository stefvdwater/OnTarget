# Release 0.2.5 (vs 0.2.4)

Doel van dit document: een agent of mens die voor het eerst aan deze codebase werkt tijdens of na cyclus 0.2.5 snel laten begrijpen wat er is gewijzigd ten opzichte van 0.2.4.

## Overzicht

Cyclus gestart vanaf [`0.2.4`](RELEASE_0.2.4.md) met de version-bump naar `0.2.5-alpha.1`. Drie samenhangende wijzigingen, vooral rond de Afdrukken-tab en de documentatie:

1. Waarheids-correcties in [`CLAUDE.md`](../CLAUDE.md) en [`FEATURES.md`](FEATURES.md): dode verwijzingen en achterhaalde beweringen rechtgetrokken.
2. Een nieuwe knop **"Openen in MS Excel"** op de Afdrukken-tab die de indeling als opgemaakt, alleen-lezen `.xlsx`-werkboek exporteert via [`exceljs`](https://github.com/exceljs/exceljs) en opent in Excel. De rij-opbouw wordt gedeeld met de print-preview zodat beide nooit uit elkaar lopen.
3. Een herstelde off-by-one in de positie-nummering waardoor de eerste schutter van elk doel wegviel in de preview, de print en de Excel-export.
4. (Later in de cyclus) Een gerichte fix in het indelingsalgoritme zodat ook de laatst ingedeelde gilde op aaneengesloten doelen blijft staan i.p.v. verspreid te raken.
5. (Later in de cyclus) Een **lexicografische verfijningsstap (fase 7)** boven op de greedy-constructie die mono-gilde-staarten opruimt, plus een **test-harnas** (`npm test`) dat "beter" meetbaar maakt en regressies vangt.
6. (Later in de cyclus) Een **UI-opfrissing** rond verwijderen/bewerken: icoon-acties op het wedstrijd-overzicht en in de schutters-tabel, een gedeelde verwijder-bevestiging, en lege defaults bij het aanmaken van een schutter.
7. (Later in de cyclus) Een **icoon-refactor**: alle inline gedefinieerde `Icon*`-componenten gebundeld in `components/icons/` met een gedeelde `IconBase`-wrapper. Puur structureel, geen gedrags- of zichtbare wijziging.
8. (Later in de cyclus) Een **opsplitsing van `SchuttersPage.tsx`** (CSV-helpers naar `lib/csv.ts`, vier inline modals naar een gedeelde `ConfirmModal`) plus een **taalcorrectie-pas** over de UI-teksten. Gedragsbehoudend, geen schema- of contractwijziging.

Het database-schema blijft onaangeroerd. De twee-sporen-kern bleef ongewijzigd; fase 7 herverdeelt enkel binnen de reeds gekozen actieve doelen en kan de indeling per constructie nooit verslechteren.

## Wijziging

### Documentatie waarheidsgetrouw gemaakt (CLAUDE.md, FEATURES.md)

Twee documentatiebestanden bevatten beweringen die niet meer met de werkelijkheid klopten. Geverifieerd tegen code en repo en rechtgetrokken:

- **[`CLAUDE.md`](../CLAUDE.md)**: de sectie "Openstaande werken" verwees naar `.claude/openstaande-werken.md`, dat niet meer bestaat. Vervangen door een verwijzing naar de changelogs in `internal-docs/RELEASE_*.md` als bron van waarheid. De "Huidige:"-pointer onder "Release-notities" stond nog op `RELEASE_0.2.3.md` en is bijgewerkt naar [`RELEASE_0.2.4.md`](RELEASE_0.2.4.md). De CSV-voorbeeldzin (3 conflict-rijen in [`samples/schutters-demo.csv`](../samples/schutters-demo.csv)) bleef ongemoeid: die is geverifieerd correct (rijen 28, 54, 89).
- **[`FEATURES.md`](FEATURES.md)**: de regel "exporteren naar Excel/CSV nog niet geimplementeerd" was misleidend. Rechtgetrokken, en de bestaande maar niet-vermelde export-paden toegevoegd: schutters-CSV import/export (sectie 1) en JSON-backup per wedstrijd (sectie 6, met verwijzing naar [`BACKUP_FORMAT.md`](BACKUP_FORMAT.md)). De Excel-export uit deze cyclus is later in sectie 4 toegevoegd (zie hieronder).

Afspraak vastgelegd voor het vervolg: FEATURES.md wordt voortaan enkel samen met deze release-notes bijgewerkt, zodat de twee elkaar niet tegenspreken.

### Openen in MS Excel op de Afdrukken-tab

Naast de bestaande print-to-PDF kan de indeling nu rechtstreeks in MS Excel geopend worden. Een nieuwe knop "Openen in MS Excel" in [`AfdrukkenTab`](../src/renderer/src/pages/AfdrukkenTab.tsx) genereert een opgemaakt `.xlsx`-werkboek met **exact dezelfde rijen, kolommen, groepering en filters als de preview**, en opent dat in de standaard-app voor `.xlsx`.

- **Gedeelde rij-opbouw (DRY)**: om drift tussen preview en Excel te vermijden is de rij-logica uit [`PrintDocument`](../src/renderer/src/components/PrintDocument.tsx) geextraheerd naar gedeelde helpers in [`afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts): `bouwDoelGroepen`, `bouwGildeGroepen`, `slotNaarCellen` en `formatDatum`. Zowel de preview als `bouwExcelModel` consumeren diezelfde functies. `PrintDocument` is daarop herschreven; de preview-output blijft identiek.
- **Gedeeld IPC-contract**: het serializeerbare `ExcelModel` (titel, subtitel, kolommen, rijen, totalen, aandachtspunten) leeft in [`src/shared/afdrukTypes.ts`](../src/shared/afdrukTypes.ts), zodat renderer en main hetzelfde type gebruiken (zelfde patroon als `@shared/backupTypes`).
- **Schrijven en openen (main-proces)**: nieuwe IPC-handler `indeling:openInExcel` in [`ipc.ts`](../src/main/ipc.ts) bouwt met `exceljs` een werkboek (vette/bevroren kolomkoppen, titelrij met wedstrijd en datum, gilde-groepkoppen bij groepering per gilde, optioneel totalen en aandachtspunten), schrijft het naar een aparte submap `ontarget-excel/` in de OS-temp en opent het via `shell.openPath`.
- **Opruim bij opstarten**: `ruimExcelTempBestandenOp()` (geexporteerd uit [`ipc.ts`](../src/main/ipc.ts), aangeroepen vanuit [`index.ts`](../src/main/index.ts) bij `app.whenReady`) leegt die submap, zodat de read-only exports zich niet opstapelen in de temp-map. Read-only bestanden krijgen eerst hun schrijfbit terug; een bestand dat nog open is (bv. in Excel) wordt stil overgeslagen. De aparte submap voorkomt dat andere temp-bestanden geraakt worden.
- **Alleen-lezen**: het bestand krijgt het read-only-attribuut (`chmodSync(bestand, 0o444)`). Excel opent het als "Alleen-lezen"; wie wijzigingen wil bewaren doet "Opslaan als" en werkt verder in die kopie (de kopie is een vers bestand zonder read-only-attribuut, dus meteen bewerkbaar). `exceljs` is als runtime-dependency toegevoegd in [`package.json`](../package.json).

Bewuste scope-beperkingen:

- **Geen worksheet-protection**: een eerdere variant vergrendelde het blad zodat Excel elke bewerking meteen weigerde. Dat is teruggedraaid omdat de gebruiker dan de bladbeveiliging handmatig moet opheffen in de kopie (te omslachtig voor niet-technische gebruikers). Enkel het read-only-bestandsattribuut blijft.
- **Geen CSV-export van de indeling**: enkel `.xlsx`. Een rechtstreekse CSV-export blijft een optionele toekomstige uitbreiding.
- **Geen "opslaan als"-dialoog vanuit de app**: het tijdelijke bestand wordt rechtstreeks geopend; opslaan op een vaste locatie gebeurt vanuit Excel zelf.

### Off-by-one in positie-nummering hersteld (preview, print, Excel)

De eerste schutter van elk doel viel weg in het afdruk-overzicht en de andere schutters schoven één rij naar voren. Oorzaak: `slot.positie` is in heel de app **0-based** (het algoritme kent posities toe als array-index, [`indeling.ts`](../src/renderer/src/algoritme/indeling.ts): `d.schutters.forEach((s, i) => (s.positie = i))`), maar de afdruk-helpers gingen uit van 1-based. De vaste-rijen-lus liep `p = 1..6` en zocht `positie === p`, en `positieLetter` rekende met `Math.max(1, x) - 1`. Daardoor werd de schutter met `positie === 0` nooit gevonden.

Fix in [`afdruk-helpers.ts`](../src/renderer/src/components/afdruk-helpers.ts): `positieLetter` en `doelLabel` werken nu 0-based (`positie 0 -> "A"`, `5 -> "F"`) en de vaste-rijen-lus loopt `p = 0..5`. De compact- en gilde-paden gebruikten `slot.positie` al rechtstreeks en kloppen daardoor automatisch mee.

Het was een bestaande bug in de print: de oude `PrintDocument` had dezelfde `p=1..6`-lus. De DRY-extractie hierboven nam hem mee naar de Excel-export, waarna hij in alle drie de outputs tegelijk is opgelost.

Bewuste scope-beperking: de fix raakt enkel de label- en rij-opbouw van het afdruk-overzicht. De Indeling-tab (drag-and-drop) toonde de schutters al correct, want die rendert op array-volgorde en niet op `positie === p`.

### Gilde-restplaatsing: laatste gilde op aaneengesloten doelen

**Probleem (gerapporteerd vanuit de wedstrijd Vosselaar).** De laatst ingeschreven gilde werd over de hele zaal verspreid terwijl de andere gilden mooi samen stonden. Voorbeeld: Herselt (3 schutters op 25m) belandde op doel 1, 6 en 11. Oorzaak in [`indeling.ts`](../src/renderer/src/algoritme/indeling.ts):

- De twee-sporen-toewijzing plaatst maar ~2 paren (4 schutters) per doel; in dichte zones zijn er meer paren dan voorste doelen (`Tnorm`). De staart-paren raakten de overflow-tak en werden **ontkoppeld tot losse schutters**. Omdat elk spoor op aanmeldvolgorde is gesorteerd, is de laatst aangemelde gilde structureel het overflow-slachtoffer.
- De oude `plaatsLones` plaatste elke restschutter daarna **onafhankelijk** in het leegste doel, zonder de eigen restleden van een gilde bij elkaar te houden. Gevolg: de late gilde waaierde uit.

**Fix (gericht, twee-sporen-kern ongemoeid).** `plaatsLones` is vervangen door een gilde-blok-bewuste `plaatsLeftovers`. Alle leftovers (losse schutters + ontkoppelde overflow-paren) worden per gilde gegroepeerd en als blok op aaneengesloten doelen geplaatst, in volgorde van vroegste aanmeldvolgorde (zo krijgen late gilden vanzelf de achterste vrije doelen). Een blok groeit vanaf zijn anker (waar het gilde al staat) of een seed naar directe buren. Om een blok samen te houden mag een doel naar **6 beurten** (R10 weegt bij restplaatsing zwaarder dan het streefgetal 5; de harde grens van 6 blijft). Zie [ALGORITME_v2.0.md §7](ALGORITME_v2.0.md) en de bijgewerkte prioriteitsnoot in [ALGORITHM_SPEC.md §11](ALGORITHM_SPEC.md) / [RULES_HIERARCHY.md R11b](RULES_HIERARCHY.md).

**Geverifieerd** op de Vosselaar-backup: Herselt-25m staat nu op doel 6, 7, 9 (aaneengesloten in de 25m-rij; doel 8 is het compound-doel ertussen), elk ander gilde blijft per zone aaneengesloten, geen doel boven 6 beurten en niets oningedeeld.

Bewuste scope-beperking: `verdeelGildenOverSporen`, `plakSpoor`, de zone-/dubbelaar-logica en `handhaafMin4Beurten` blijven ongewijzigd.

### Lexicografische verfijning (fase 7) + test-harnas

**Probleem.** De auto-indeling is fundamenteel een **constrained optimization**-probleem, geen sorteerprobleem. De greedy-constructie (paren + tweesporen) lost het meeste goed op, maar bij scheve gildegroottes stapelt ze het surplus van een gilde op het laatste actieve doel: een **mono-gilde-staart**. Het canonieke voorbeeld [ALGORITHM_SPEC §7.4](ALGORITHM_SPEC.md) (A×10, B×2, 2 doelen) gaf `A:4 B:2 | A:6` terwijl `A:5 B:1 | A:5 B:1` voorgeschreven is. De v2.0-implementatie deed dit bewust fout (zie de oude §11-tabel).

**Aanpak (construct + improve).** De greedy-constructie blijft de startoplossing (stabiel, uitlegbaar). Een nieuwe **fase 7** ([`indeling.ts`](../src/renderer/src/algoritme/indeling.ts)) doet daarna een begrensde, deterministische **lokale zoektocht**: per zone wordt een schutter VERPLAATST of worden twee schutters GERUILD, en een zet wordt enkel aanvaard als ze een **expliciete lexicografische doelfunctie** (`scoreToestand`) strikt verbetert. De termvolgorde codeert de prioriteitshierarchie (harde grenzen → bezetting → diversiteit → aanmeldvolgorde → compactheid). Dubbeldoelen (R7/R8) en compound-op-25m (R4b/R16) blijven onaangeroerd; geen enkele zet kan een harde grens schenden (die staan bovenaan de vector).

**Waarom dit aantoonbaar beter is.** Omdat enkel strikt verbeterende zetten worden aanvaard, is de uitkomst **nooit slechter** dan de constructie alleen, en op de probleemgevallen **strikt beter**. Concreet wordt §7.4 nu exact `A:5 B:1 | A:5 B:1`, en verdwijnen de mono-staarten in A×7/B×6/C×4 en in "dominant gilde + singletons". Reeds-goede indelingen (§7.1, §7.2) blijven onveranderd. Volledige redenering: [ALGORITHM_DEFENSE.md](ALGORITHM_DEFENSE.md).

**Test-harnas (nieuw, `npm test`).** Er was geen test-script. Toegevoegd in [`test/`](../test/), draaiend op Node's eigen test-runner via een kleine resolver-hook ([`scripts/ts-resolver.mjs`](../scripts/ts-resolver.mjs)) - **geen extra npm-dependency**. Het bevat de §7-scenario's met geasserteerde uitkomsten, het strikte-verbeterings-bewijs, en een fuzz die over **400 willekeurige scenario's** aantoont dat de verfijning de score nooit verslechtert, de harde constraints altijd respecteert en niemand van plaats laat verdwijnen. De doelfunctie staat onafhankelijk geimplementeerd in het harnas (`scoreVector`) als rechter. Tijdens de ontwikkeling ving het harnas een echte bug (contiguiteit gemeten zonder dubbeldoelen in de rang-as).

**Twee verfijningen na test op echte data (wedstrijd Vosselaar, 80 schutters):**

1. **Aanmeldvolgorde op gilde-niveau.** R8/R9 betekent: een gilde dat vroeger aanmeldt staat op de voorste doelen (de volgorde binnen een gilde doet er niet toe). De volgorde-term meet dat op gilde-niveau (gemiddelde aanmeld vs gemiddelde doel-positie). Bovendien worden de achterste **dubbeldoelen** nu met de **laatst** aangemelde normalen gevuld (`normalenAchteraan`), zodat een vroeg aangemelde gilde niet als dubbelvuller naar achteren gezogen wordt.
2. **Niet uitsmeren om tot 5 te vullen.** De bezetting is gesplitst: ">5 vermijden / gelijk verdelen" blijft hoog, maar "een doel naar 5 i.p.v. 4 brengen" (`onderstreef`) staat helemaal onderaan, en "een gilde niet uitsmeren" (`uitgesmeerd`) staat boven "3-stapel vermijden" (`stapeling`). Zo blijft een gilde compact (bv. 5 leden op 3 aaneengesloten doelen) i.p.v. dun over veel doelen verspreid.

Beide gestaafd met regressietests in [`test/optimaliteit.test.ts`](../test/optimaliteit.test.ts) ("Vosselaar-regressies").

**Docs in lockstep:** [ALGORITME_v2.0.md §9b/§10/§11](ALGORITME_v2.0.md), [ALGORITHM_SPEC.md §11](ALGORITHM_SPEC.md) (nota over de R6-positie), [RULES_HIERARCHY.md](RULES_HIERARCHY.md) en de nieuwe [ALGORITHM_DEFENSE.md](ALGORITHM_DEFENSE.md).

Bewuste scope-beperking: fase 7 zoekt een lokaal (niet gegarandeerd globaal) optimum, opent geen nieuwe doelen en raakt dubbeldoelen niet. De twee-sporen-constructie en alle eerdere fasen blijven ongewijzigd; fase 7 is uitschakelbaar via `berekenIndeling(..., { lokaleZoektocht: false })`.

### UI-opfrissing: icoon-acties, gedeelde verwijder-modal en lege schutter-defaults

Een reeks kleine, samenhangende UI-wijzigingen rond verwijderen en bewerken. Geen wijziging aan het database-schema, de IPC-contracten of het algoritme.

- **Prullenbak op de wedstrijdkaart.** Naast de bestaande download/export-knop op elke kaart in [`WedstrijdenPage`](../src/renderer/src/pages/WedstrijdenPage.tsx) staat nu een prullenbak-knop om een wedstrijd rechtstreeks vanuit het overzicht te verwijderen (met bevestiging). Beide knoppen zitten in een gedeelde container die bij hover op de kaart verschijnt.
- **Gedeelde verwijder-bevestiging (DRY).** De bevestigingsmodal voor het verwijderen van een wedstrijd was inline gedupliceerd. Geextraheerd naar [`WedstrijdVerwijderModal`](../src/renderer/src/components/WedstrijdVerwijderModal.tsx) en hergebruikt door zowel het overzicht (de prullenbak) als de Gevarenzone van de [`ConfiguratieTab`](../src/renderer/src/pages/ConfiguratieTab.tsx), zodat bewoording en uitzicht op één plek staan.
- **Icoon-acties in de schutters-tabel.** De tekstknoppen "Bewerken" en "Verwijder" in [`SchuttersPage`](../src/renderer/src/pages/SchuttersPage.tsx) zijn vervangen door icoonknoppen (potlood / prullenbak) in dezelfde stijl als de wedstrijdkaarten: ze verschijnen bij hover op de rij, met een rode danger-hover op de prullenbak. Gedeelde iconen [`IconPencil`](../src/renderer/src/components/icons/IconPencil.tsx) en [`IconTrash`](../src/renderer/src/components/icons/IconTrash.tsx) staan in `components/icons/` (toen nog samen met enkele inline-gedefinieerde iconen elders; die zijn later in de cyclus mee gebundeld, zie "Icoon-refactor" hieronder); de knopstijl is een gedeelde `.icon-knop`-klasse in [`index.css`](../src/renderer/src/index.css) (de vroegere `.wedstrijd-card-actie` ging hierin op).
- **Bewerk-modal opgeschoond.** In [`SchutterFormulier`](../src/renderer/src/components/SchutterFormulier.tsx) is de dubbele "Annuleer" (de kop-knop) weggehaald, en de "Verwijderen"-knop is verwijderd: verwijderen verloopt nu uitsluitend via de prullenbak in de tabel. De nu overbodige `onVerwijder`-prop is mee opgeruimd.
- **Lege defaults bij een nieuwe schutter.** Een nieuwe schutter start volledig ongekozen: geen gilde, en boog/categorie/geslacht/afstand staan leeg (placeholder-opties in de selects, geen actieve knop in de segmented controls). De aanmaak-knop is disabled tot voornaam, naam, boog, categorie, geslacht en afstand allemaal gekozen zijn (gilde mag leeg blijven). De afhankelijkheidsregels blijven: een 25m-categorie vult 25m meteen in, Jeugd (12m/18m) laat de keuze open. Bewerken van een bestaande schutter laadt nog gewoon de opgeslagen waarden.

Deze wijzigingen volgen de afspraak "hergebruiken, niet dupliceren": gedeelde modal, gedeelde iconen en een gedeelde knopstijl in plaats van gekopieerde varianten.

### Icoon-refactor: alle iconen in components/icons/ met gedeelde IconBase

Verlengstuk van de "hergebruiken, niet dupliceren"-lijn hierboven. Tot dan stonden de meeste `Icon*`-componenten als inline functies verspreid over de pagina- en component-bestanden, met flink wat verdubbeling. Geen wijziging aan gedrag, gerenderde markup of styling: de CSS-output bleef byte-identiek en geen enkele callsite veranderde.

- **Bundeling en dedup.** De ~22 inline iconen zijn naar aparte bestanden in [`components/icons/`](../src/renderer/src/components/icons/) verplaatst, in lijn met de reeds bestaande `IconPencil`/`IconTrash`/`IconWarn`. Daarmee verdwenen de verdubbelde definities (`IconPlus` stond 4x; `IconExchange`/`IconUpload`/`IconDownload`/`IconChevron`/`IconSearch`/`IconLock`/`IconUnlock` telkens 2x). Per icoon is er nog maar een bron. Elke component kreeg een `size`-prop met een default gelijk aan de oorspronkelijke hardgecodeerde grootte, zodat geen callsite hoefde te wijzigen.
- **Gedeelde `IconBase`-wrapper.** Alle 25 iconen deelden exact dezelfde SVG-wrapper (`viewBox`, `currentColor` stroke, ronde uiteinden, `aria-hidden` en de `display`/`flexShrink`-stijl). Die staat nu een keer in [`IconBase`](../src/renderer/src/components/icons/IconBase.tsx); elk icoon levert nog enkel zijn pad(en) en stelt waar nodig een afwijkende `strokeWidth` of default-grootte in. De gedeelde `IconProps` leeft mee in `IconBase`. Een toekomstige wijziging aan de gemeenschappelijke rendering (a11y, theming, default-stijl) is daardoor een aanpassing op een plek in plaats van in 25 bestanden.

Bewuste scope-beperking: zuiver structureel. Geen nieuwe iconen, geen visuele wijziging, geen aanraking aan de IPC-contracten, het database-schema of het algoritme. Geverifieerd met `npm run build` (typecheck) en `npm test` (23/23).

### Opsplitsing SchuttersPage + taalcorrectie-pas

[`SchuttersPage.tsx`](../src/renderer/src/pages/SchuttersPage.tsx) mengde te veel verantwoordelijkheden (1042 regels). Twee cohesie-verbeteringen, gedragsbehoudend, gevolgd door een taalcorrectie over de hele UI. Geen wijziging aan het database-schema, de IPC-contracten of het algoritme.

- **CSV-helpers naar `lib/csv.ts`.** De pure `parseCSV` (RFC 4180-stijl quoted fields, CRLF/LF, BOM-strip) en `csvEscape` zijn uit `SchuttersPage` geextraheerd naar een React- en domeinvrije module [`lib/csv.ts`](../src/renderer/src/lib/csv.ts), zodat ze afzonderlijk testbaar zijn. De domeinspecifieke mapping `parseImportTekst` (CSV -> `ImportRij`) blijft in de pagina en leunt op de geextraheerde parser.
- **Gedeelde `ConfirmModal`.** De vier inline `*Bevestig`/`*Bezig`-bevestigingsmodals (verwijder-een, verwijder-alle, lege-gilden, demo) zijn vervangen door een herbruikbare [`ConfirmModal`](../src/renderer/src/components/ConfirmModal.tsx) met props voor titel, bevestig-label, `bezig`-label en een `danger`/`primary`-variant. Eén plek voor bewoording en uitzicht, in lijn met de bestaande [`WedstrijdVerwijderModal`](../src/renderer/src/components/WedstrijdVerwijderModal.tsx). `SchuttersPage` ging van 1042 naar 755 regels.
- **Taalcorrectie-pas.** Alle modals en doorlopende teksten nagelezen op taalfouten. Rechtgetrokken: `gildes` -> `gilden` in [`AfdrukkenTab`](../src/renderer/src/pages/AfdrukkenTab.tsx) (consistent met de rest van de app), een onvolledige zin in [`InschrijvingenTab`](../src/renderer/src/pages/InschrijvingenTab.tsx) ("om er een toe te voegen"), `haar inschrijvingen` -> neutrale formulering in [`WedstrijdenPage`](../src/renderer/src/pages/WedstrijdenPage.tsx), em-/en-dashes uit labels in AfdrukkenTab en [`ConfiguratieTab`](../src/renderer/src/pages/ConfiguratieTab.tsx) (CLAUDE.md-conventie), en correct enkelvoud in de Wedstrijden- en Schutters-subtitel bij precies 1 item.

Deze wijzigingen volgen de afspraak "hergebruiken, niet dupliceren": gedeelde helper-module en gedeelde modal in plaats van gekopieerde logica en markup. Geverifieerd met `npm run build` (typecheck).
