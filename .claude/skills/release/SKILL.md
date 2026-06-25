---
name: release
description: Breng een nieuwe versie van OnTarget uit (bump, tag, build, publiceren) of een hotfix op een al uitgebrachte versie. Gebruik dit wanneer de gebruiker een release, versie-bump, of publicatie van de app vraagt.
---

# OnTarget release-runbook

Het beleid (cadans, semver, branching) staat in [CLAUDE.md](../../../CLAUDE.md) onder "Versie- en release-workflow". Dit bestand is de uit te voeren procedure. Releases zijn altijd een bewuste actie; voer geen stap blind uit zonder de gebruiker mee te hebben.

## Vooraf (eenmalig per machine)

- Git committen gebeurt met het GitHub **noreply-adres** (`66273485+stefvdwater@users.noreply.github.com`); het gmail-adres wordt door GitHub-push-protection geweigerd. Staat globaal goed, maar controleer bij een push-fout `git config user.email`.

## Normale release (vanaf `main`)

1. **Pre-flight.** `main` uitgecheckt en up-to-date, working tree schoon. CI op `main` groen. Lokaal getest met `npm run dev` (de dev-versie toont `-dev+<hash>`; een release moet van een schone commit komen, dus geen `-dirty`).

2. **Versienummer bepalen (semver).** Kijk wat er sinds de vorige tag is gemerged (`git log <vorige-tag>..main --oneline`). Enkel bugfixes to patch. Een nieuwe functie erbij to minor. Een breaking change (bv. `schemaVersie` in [BACKUP_FORMAT](../../../internal-docs/BACKUP_FORMAT.md)) to major. De zwaarste wijziging wint; bump maar een keer.

3. **Doc-waarheidspas.** Loop de docs na die deze cyclus geraakt zijn (zie de same-PR-regel in CLAUDE.md to in principe al gebeurd per PR; dit is de vangnet-controle):
   - Lees `git diff <vorige-tag>..main` en vlag docs die de gewijzigde zones beschrijven en mogelijk verouderd zijn ([FEATURES.md](../../../internal-docs/FEATURES.md), de regel-/algoritme-docs, [BACKUP_FORMAT](../../../internal-docs/BACKUP_FORMAT.md)).
   - Controleer op dode interne links in de geraakte docs (relatieve paden die niet meer bestaan).
   - **Website:** is er gebruikerszichtbaar gedrag veranderd, dan kan de handleiding aanpassing nodig hebben (zie de Website-sectie in CLAUDE.md). Screenshots zijn een extra drift-risico.

4. **Changelog afronden.** Het interne `internal-docs/RELEASE_<versie>.md` moet de cyclus dekken (hoort al op de feature-branches te zijn aangevuld). Hernoem het naar het gekozen versienummer indien nodig. Schrijf daarnaast de **gecureerde publieke release-notes** (gebruikersgericht, Vlaams, geen em dashes) naar een tijdelijk bestand voor stap 7, en leg ze voor aan de gebruiker.

5. **Bump + commit + push.** Zet de volledige versie in `package.json`, commit met het **kale versienummer** als message, push `main`.

6. **Taggen en bouwen.** `npm run release`. Dit weigert pre-release-versies (koppelteken), tagt `v<versie>` uit `package.json` en pusht de tag, wat `release.yml` triggert (Windows-runner, installer + draagbare zip).

7. **Workflow afwachten en de conclusie EXPLICIET verifieren.**
   ```bash
   RUN=$(gh run list --workflow=release.yml -L 1 --json databaseId --jq '.[0].databaseId')
   gh run watch "$RUN" >/dev/null 2>&1
   gh run view "$RUN" --json status,conclusion --jq '"status=\(.status) conclusion=\(.conclusion)"'
   ```
   Vertrouw **niet** op de exit-code van `gh run watch` (die gaf 0 terug bij een gefaalde run). Lees `conclusion`: moet `success` zijn. Bij `failure`: `gh run view "$RUN" --log-failed` en diagnose (bekende valkuil: electron-builder dat zelf wil publiceren to `build:win` gebruikt al `--publish never`).

8. **Release verifieren en notes zetten.**
   ```bash
   gh release view v<versie> --json tagName,isPrerelease,assets --jq '{tag:.tagName, prerelease:.isPrerelease, assets:[.assets[].name]}'
   gh release edit v<versie> --notes-file <pad-naar-gecureerde-notes>
   ```
   Verwacht twee assets (`OnTarget-Setup-<versie>.exe` en `OnTarget-<versie>.zip`). `isPrerelease` is `true` voor `v0.x`, `false` voor `v1.0.0`+.

9. **Website-reminder.** Staat er handleiding-/site-werk klaar dat bij deze release hoort? De site is ontkoppeld (`gh-pages`, zie CLAUDE.md); bied aan om mee te deployen, deploy niet automatisch.

## Hotfix (op een al uitgebrachte versie)

1. Is `main` nog gelijk aan de laatste release? Dan gewoon op `main`: fix, patch-bump, en volg de normale release-stappen.
2. Loopt `main` al voor met onuitgebracht werk? Dan:
   - `git checkout -b hotfix/<beschrijving> v<laatste-release>`
   - Fix + lokaal testen.
   - Patch-bump, commit, push, `npm run release` (stappen 6-8 hierboven).
   - Merge `hotfix/<beschrijving>` terug naar `main` zodat de fix niet verloren gaat.
