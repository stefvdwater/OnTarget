import type { Schutter } from '../types'

export function geslachtLabel(g: Schutter['geslacht']): 'Heren' | 'Dames' {
  return g === 'M' ? 'Heren' : 'Dames'
}

export function categorieLabel(
  leeftijd: Schutter['leeftijdscategorie'],
  geslacht: Schutter['geslacht']
): string {
  return `${leeftijd} ${geslachtLabel(geslacht)}`
}
