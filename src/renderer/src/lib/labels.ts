import type { Schutter } from '../types'

export function geslachtLabel(g: Schutter['geslacht']): 'Heer' | 'Dame' {
  return g === 'M' ? 'Heer' : 'Dame'
}

/**
 * Gecombineerd categorie-label volgens de visuele regels:
 *  - Aspirant / Jeugd / Junior: geen geslacht
 *  - Senior M: "Senior" — Senior V: "Dame"
 *  - Veteraan: altijd met geslacht ("Veteraan Heer" / "Veteraan Dame")
 *  - Compound override: Senior M→"Heer", Senior V→"Dame" (overige categorieën
 *    volgen de defaultregel; Veteraan + Compound is sowieso geblokkeerd).
 *
 * Als `afstand` meegegeven wordt, krijgen Aspirant en Jeugd die erachter
 * ("Jeugd 12m"): die twee categorieën zijn niet op het eerste gezicht
 * duidelijk over welke afstand ze schieten. Bewust een los argument (niet
 * een veld op `s`) zodat callers die `afstand` al apart tonen (bv. een
 * tabelkolom) er niet per ongeluk een dubbele weergave bij krijgen.
 */
export function categorieLabel(
  s: {
    leeftijdscategorie: string
    geslacht: Schutter['geslacht']
    type_boog: string
  },
  afstand?: number
): string {
  const { leeftijdscategorie: cat, geslacht: g, type_boog: boog } = s
  const metAfstand = (label: string): string =>
    (cat === 'Aspirant' || cat === 'Jeugd') && afstand !== undefined
      ? `${label} ${afstand}m`
      : label

  if (boog === 'Compound' && cat === 'Senior') {
    return geslachtLabel(g)
  }

  if (cat === 'Aspirant' || cat === 'Jeugd' || cat === 'Junior') {
    return metAfstand(cat)
  }
  if (cat === 'Senior') {
    return g === 'M' ? 'Senior' : 'Dame'
  }
  return `Veteraan ${geslachtLabel(g)}`
}
