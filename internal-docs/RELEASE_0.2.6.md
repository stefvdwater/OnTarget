# Release 0.2.6 (vs 0.2.5)

Doel van dit document: een agent of mens die voor het eerst aan deze codebase werkt tijdens of na cyclus 0.2.6 snel laten begrijpen wat er is gewijzigd ten opzichte van [`0.2.5`](RELEASE_0.2.5.md).

> Voorlopige versienaam. Deze cyclus kan ook de stap naar `1.0.0` worden. Hernoem dit bestand als de volgende release effectief 1.0.0 is.

## Overzicht

Cyclus gestart vanaf `0.2.5`. Tot nu toe puur tooling rond de ontwikkelervaring, geen wijziging aan de app voor de eindgebruiker:

1. Een **dev-versie-markering** in de rechteronderhoek: de dev-server toont een ander versienummer dan een echte build, zodat je in een oogopslag ziet in welke instantie je zit.

Het database-schema, de IPC-contracten en het algoritme blijven onaangeroerd.

## Wijziging

### Dev-versie-markering (hash + dirty) plus tsbuildinfo-opkuis

De versie in de rechteronderhoek komt uit `__APP_VERSION__`, dat bij build-tijd geinjecteerd wordt in [`electron.vite.config.ts`](../electron.vite.config.ts). Tot nu toe was dat altijd het kale `package.json`-nummer, of je nu `npm run dev` draaide of een release bouwde. Met de gekozen cadans (bumpen pas bij een release) stond `package.json` tussen releases op de laatste stable, dus de dev-server toonde exact het nummer van de voorgaande release. Verwarrend wanneer je de dev-instantie naast de geinstalleerde stable openhebt.

- **Onderscheid op build-context.** [`electron.vite.config.ts`](../electron.vite.config.ts) is nu een functie die `command` meekrijgt. In de dev-server (`command === 'serve'`) krijgt `__APP_VERSION__` een achtervoegsel; een echte build (`command === 'build'`) houdt het kale nummer. Dev toont bv. `0.2.5-dev+a1b2c3d`, een release toont `0.2.5`.
- **Hash + dirty.** Het achtervoegsel bevat de korte git-hash van `HEAD` op het moment dat de dev-server start, plus `-dirty` als er ongecommit werk bovenop ligt (`0.2.5-dev+a1b2c3d-dirty`). Zo zie je niet enkel dat het dev is, maar ook welke commit je draait en of dat overeenkomt met een echte commit. De git-info wordt veilig berekend: valt git weg, dan blijft het bij een kaal `-dev`.
- **tsbuildinfo-opkuis (nodig voor een eerlijke dirty-vlag).** `tsconfig.web.tsbuildinfo` is een TypeScript incremental-build-cache die bij elke build verandert. Hij stond getrackt en niet in `.gitignore`, waardoor de werkboom bijna altijd "vuil" was en de `-dirty`-markering constante ruis zou geven. `*.tsbuildinfo` is nu genegeerd en het bestand is untracked (blijft lokaal staan).

Bewuste scope-beperking: dit raakt enkel de getoonde versie in de dev-server. De release-build toont onveranderd het kale nummer, dus voor de eindgebruiker wijzigt er niets.
