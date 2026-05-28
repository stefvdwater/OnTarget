import type { Doel } from './types'

// Compound-doelen die niet daadwerkelijk door compound-schutters worden bezet,
// worden herbestemd tot 25m-doelen (issue #9). Een vergrendeld compound-doel
// blijft compound, ook al staat er geen compound-schutter op. Deze regel wordt
// zowel direct na auto-indeling toegepast (binnen berekenIndeling) als bij het
// herladen van een opgeslagen indeling uit de database — anders verspringt de
// zone bij elke tab-wissel terug naar de config-waarde.
export function pasRuntimeCompoundZoneToe(doelen: Doel[]): void {
  for (const d of doelen) {
    if (d.zone !== 'compound') continue
    if (d.vergrendeld) continue
    const heeftCompoundSchutter = d.schutters.some((s) => s.type_boog === 'Compound')
    if (!heeftCompoundSchutter) d.zone = '25m'
  }
}
