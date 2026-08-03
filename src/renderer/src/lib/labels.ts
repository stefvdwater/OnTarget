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
 */
export function categorieLabel(s: {
  leeftijdscategorie: string
  geslacht: Schutter['geslacht']
  type_boog: string
}): string {
  const { leeftijdscategorie: cat, geslacht: g, type_boog: boog } = s

  if (boog === 'Compound' && cat === 'Senior') {
    return geslachtLabel(g)
  }

  if (cat === 'Aspirant' || cat === 'Jeugd' || cat === 'Junior') {
    return cat
  }
  if (cat === 'Senior') {
    return g === 'M' ? 'Senior' : 'Dame'
  }
  return `Veteraan ${geslachtLabel(g)}`
}
