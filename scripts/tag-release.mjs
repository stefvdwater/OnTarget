// Tagt de huidige commit met de versie uit package.json (bv. v0.2.5) en pusht de tag.
// Een tag-push van de vorm v* triggert de release-workflow (.github/workflows/release.yml),
// die de Windows-installer en de draagbare zip bouwt en als GitHub pre-release publiceert.
//
// Gebruik (na de versie-bump-commit op main, conform de projectconventie):
//   npm run release
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const tag = `v${pkg.version}`

// Pre-releases (bv. 0.2.5-alpha.3) worden bewust niet publiek uitgebracht.
// De release-workflow negeert zulke tags ook; we stoppen hier om verwarring te vermijden.
if (pkg.version.includes('-')) {
  console.error(
    `Versie ${pkg.version} is een pre-release; die wordt niet publiek uitgebracht.\n` +
      `Bump eerst naar een volledige versie (bv. 0.2.5) en draai dan opnieuw.`
  )
  process.exit(1)
}

// Bestaat de tag al? Dan stoppen we, om per ongeluk overschrijven te vermijden.
const bestaande = execSync('git tag --list', { encoding: 'utf8' }).split('\n')
if (bestaande.includes(tag)) {
  console.error(`Tag ${tag} bestaat al. Bump eerst de versie in package.json.`)
  process.exit(1)
}

execSync(`git tag ${tag}`, { stdio: 'inherit' })
execSync(`git push origin ${tag}`, { stdio: 'inherit' })
console.log(`Getagd en gepusht: ${tag}`)
