import type { DoelSlot } from '../algoritme/types'

export type Groepering = 'doel' | 'gilde'
export type SorteringDoel = 'positie' | 'naam' | 'gilde'
export type SorteringGilde = 'naam' | 'positie'
export type Papier = 'A4' | 'A3'
export type Orientatie = 'portret' | 'landschap'

export interface PrintFilters {
  doelen: 'alle' | number[]
  gildes: 'alle' | string[]
  afstanden: Set<12 | 18 | 25>
}

export interface PrintOpties {
  papier: Papier
  orientatie: Orientatie
  groepering: Groepering
  sortering: SorteringDoel | SorteringGilde
  filters: PrintFilters
  totalenTonen: boolean
  waarschuwingenTonen: boolean
}

/**
 * Parseert een interval-uitdrukking zoals "1-10, 15, 18-20" naar een
 * gesorteerde lijst unieke doelnummers. Whitespace wordt genegeerd. Lege
 * input → null. Bij syntaxfouten (niet-numeriek, omgekeerd interval,
 * negatieve waarden) → { fout: string }.
 */
export function parseDoelInterval(
  input: string,
  maxDoel: number
): { nummers: number[] } | { fout: string } {
  const schoon = input.trim()
  if (schoon === '') return { nummers: [] }
  const stukken = schoon.split(',').map((s) => s.trim()).filter(Boolean)
  const nummers = new Set<number>()
  for (const stuk of stukken) {
    if (stuk.includes('-')) {
      const [aRaw, bRaw, ...rest] = stuk.split('-')
      if (rest.length > 0) return { fout: `Ongeldig interval: "${stuk}"` }
      const a = parseInt(aRaw, 10)
      const b = parseInt(bRaw, 10)
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return { fout: `Ongeldig interval: "${stuk}"` }
      }
      if (a < 1 || b < 1) return { fout: `Doelnummers beginnen bij 1: "${stuk}"` }
      if (a > b) return { fout: `Interval omgekeerd: "${stuk}"` }
      if (a > maxDoel || b > maxDoel) {
        return { fout: `Doel ${a > maxDoel ? a : b} bestaat niet (max ${maxDoel})` }
      }
      for (let i = a; i <= b; i++) nummers.add(i)
    } else {
      const n = parseInt(stuk, 10)
      if (!Number.isFinite(n)) return { fout: `Ongeldig getal: "${stuk}"` }
      if (n < 1) return { fout: `Doelnummers beginnen bij 1: "${stuk}"` }
      if (n > maxDoel) return { fout: `Doel ${n} bestaat niet (max ${maxDoel})` }
      nummers.add(n)
    }
  }
  return { nummers: Array.from(nummers).sort((x, y) => x - y) }
}

/** Positie 1 → "A", 2 → "B", … 6 → "F" (1-indexed). */
export function positieLetter(positieOfIndex: number): string {
  // positieOfIndex is verwacht 1-based — geef letter A..F (clampen op Z voor veiligheid)
  const idx = Math.max(1, positieOfIndex) - 1
  return String.fromCharCode(65 + Math.min(idx, 25))
}

/** "1A", "12F" enz. */
export function doelLabel(doelNummer: number, positie1based: number): string {
  return `${doelNummer}${positieLetter(positie1based)}`
}

export interface PrintRij {
  doelNummer: number
  positie: number // 1-based
  slot: DoelSlot | null // null = lege positie
}

/** Sorteervergelijking voor schutters binnen een groep. */
export function vergelijkSchutters(
  a: DoelSlot,
  b: DoelSlot,
  sortering: SorteringDoel | SorteringGilde
): number {
  if (sortering === 'positie') return a.positie - b.positie
  if (sortering === 'naam') {
    const an = `${a.naam} ${a.voornaam}`.toLowerCase()
    const bn = `${b.naam} ${b.voornaam}`.toLowerCase()
    return an.localeCompare(bn, 'nl')
  }
  // gilde
  const ag = (a.gilde_naam ?? '').toLowerCase()
  const bg = (b.gilde_naam ?? '').toLowerCase()
  const cmp = ag.localeCompare(bg, 'nl')
  if (cmp !== 0) return cmp
  return a.positie - b.positie
}

export function passeertFilters(slot: DoelSlot, doelNummer: number, f: PrintFilters): boolean {
  if (f.doelen !== 'alle' && !f.doelen.includes(doelNummer)) return false
  if (f.gildes !== 'alle') {
    const g = slot.gilde_naam ?? ''
    if (!f.gildes.includes(g)) return false
  }
  if (!f.afstanden.has(slot.afstand as 12 | 18 | 25)) return false
  return true
}

export function doelPasseertFilter(doelNummer: number, f: PrintFilters): boolean {
  if (f.doelen === 'alle') return true
  return f.doelen.includes(doelNummer)
}

export interface Totalen {
  totaalSchutters: number
  perBoog: Record<string, number>
  perGilde: Record<string, number>
  aantalDubbel: number
}

export function berekenTotalen(slots: DoelSlot[]): Totalen {
  const perBoog: Record<string, number> = {}
  const perGilde: Record<string, number> = {}
  let aantalDubbel = 0
  for (const s of slots) {
    perBoog[s.type_boog] = (perBoog[s.type_boog] ?? 0) + 1
    const g = s.gilde_naam ?? '(Geen gilde)'
    perGilde[g] = (perGilde[g] ?? 0) + 1
    if (s.dubbel_eerste_helft || s.dubbel_tweede_helft) aantalDubbel++
  }
  return {
    totaalSchutters: slots.length,
    perBoog,
    perGilde,
    aantalDubbel
  }
}

/**
 * Korte categorie-codes voor compacte print-weergave. Mapping op basis van
 * de uitvoer van categorieLabel():
 *   Senior → SE        Veteraan Heer → VHE   Veteraan Dame → VDA
 *   Dame → DA          Heer → HE             Junior → JR
 *   Aspirant → ASP     Jeugd → JEUGD
 * Onbekende labels worden onveranderd doorgegeven.
 */
export function categorieAfkorting(label: string): string {
  switch (label) {
    case 'Senior': return 'SE'
    case 'Veteraan Heer': return 'VHE'
    case 'Veteraan Dame': return 'VDA'
    case 'Dame': return 'DA'
    case 'Heer': return 'HE'
    case 'Junior': return 'JR'
    case 'Aspirant': return 'ASP'
    case 'Jeugd': return 'JEUGD'
    default: return label
  }
}

export function dubbelLabel(s: DoelSlot): string {
  if (s.dubbel_eerste_helft && s.dubbel_tweede_helft) return '1e+2e'
  if (s.dubbel_eerste_helft) return '1e'
  if (s.dubbel_tweede_helft) return '2e'
  return ''
}
