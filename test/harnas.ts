// Test-harnas voor het doelindelingsalgoritme.
//
// Bevat (a) bondige bouwers voor scenario-input, (b) een samenvatter om een
// indeling leesbaar te printen, en (c) de DOELFUNCTIE: een lexicografische
// score-vector waarmee "beter" meetbaar wordt. Lagere waarden zijn beter; twee
// indelingen worden lexicografisch vergeleken (eerste term domineert).
//
// De score-vector codeert de prioriteitshierarchie uit ALGORITHM_SPEC.md /
// RULES_HIERARCHY.md (hoog -> laag):
//
//   [ H_zone, H_over6,           harde constraints (horen 0 te zijn)
//     S_nietIngedeeld,           plaats zoveel mogelijk (R2/R3b)
//     S_onder4,                  min 4 beurten per doel (R4-hard)
//     S_dubbelsAchter,           dubbels op de laatste actieve doelen (R7)
//     S_overvol,                 >5 beurten vermijden, gelijk verdelen (R10b/R12)
//     S_monoGilde,               min 2 gilden per doel (R6) - kern-diversiteit
//     S_volgorde,                vroeger aangemelde GILDEN op voorste doelen (R8/R9)
//     S_aaneengesloten,          gilde-blok niet over de hal gesplitst (R11b)
//     S_uitgesmeerd,             gilde niet dunner dan 2/doel (R11) - compactheid
//     S_stapeling,               ~2 per gilde, geen 3-stapel (R5 / 2-2-1-vorm)
//     S_onderstreef ]            doel naar 5 i.p.v. 4 (streef 5) - LAAGSTE prioriteit
//
// Volgorde-keuzes (gedocumenteerd in DEFENSE):
//   - S_volgorde (R8/R9) meet op GILDE-niveau: gilden die vroeger aanmelden horen op
//     de voorste doelen. De volgorde BINNEN een gilde doet er niet toe. Zo botst de
//     term niet met diversiteit/compactheid en beloont hij geen segregatie.
//   - Diversiteit (mono, R6) staat erboven: §7.1 verbiedt mono-gilde doelen.
//   - Gelijke verdeling/bezetting (R10b) staat boven diversiteit: §7.4 zegt
//     expliciet "gelijke verdeling heeft prioriteit op gildediversiteit".
//   - Een over-de-hal gesplitst gilde (R11b) is een GROVE fout; de 2-2-1-vorm
//     (3-stapel vermijden) is FIJNER en wijkt voor aaneengeslotenheid. Bij gelijke
//     aaneengeslotenheid beslist de vorm wel (2-2 boven 3-1) - de brief-voorbeelden.

import type { Schutter, DoelSlot, Indelingsresultaat } from '../src/renderer/src/algoritme/types.ts'
import type { WedstrijdConfig } from '../src/renderer/src/algoritme/types.ts'

// ─── Bouwers ────────────────────────────────────────────────────────────────

let teller = 0
export function resetTeller(): void {
  teller = 0
}

export interface SchutterOpties {
  gilde: string
  afstand?: 12 | 18 | 25
  type_boog?: Schutter['type_boog']
  aanmeldvolgorde?: number
  eh?: boolean // dubbel eerste helft
  th?: boolean // dubbel tweede helft
}

export function maakSchutter(o: SchutterOpties): Schutter {
  teller += 1
  const eh = o.eh ?? false
  const th = o.th ?? false
  return {
    id: teller,
    wedstrijd_id: 1,
    schutter_id: teller,
    voornaam: `${o.gilde}${teller}`,
    naam: 'X',
    gilde_naam: o.gilde,
    type_boog: o.type_boog ?? 'Recurve',
    afstand: o.afstand ?? 25,
    leeftijdscategorie: 'Senior',
    geslacht: 'M',
    aanmeldvolgorde: o.aanmeldvolgorde ?? teller,
    dubbel_eerste_helft: eh ? 1 : 0,
    dubbel_tweede_helft: th ? 1 : 0
  }
}

// Maak n schutters van eenzelfde gilde (aanmeldvolgorde loopt automatisch op).
export function maakGilde(gilde: string, n: number, o: Omit<SchutterOpties, 'gilde'> = {}): Schutter[] {
  return Array.from({ length: n }, () => maakSchutter({ ...o, gilde }))
}

// Config met enkel een 25m-zone (geen 18m/12m, geen compound-zone).
export function config25m(aantalDoelen: number): WedstrijdConfig {
  return {
    aantalDoelen,
    aantalDoelen18m: 0,
    aantalDoelen12m: 0,
    compoundStartdoel: aantalDoelen + 1,
    aantalCompoundDoelen: 0
  }
}

// Deterministische PRNG (mulberry32) voor reproduceerbare fuzz-tests.
export function maakRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Beurten-boekhouding (gelijk aan indeling.ts / conflicten.ts) ─────────────

export function beurtenEersteHelft(slots: DoelSlot[]): number {
  return slots.reduce((som, s) => {
    if (!s.dubbel_eerste_helft && s.dubbel_tweede_helft) return som
    return som + (s.dubbel_eerste_helft ? 2 : 1)
  }, 0)
}
export function beurtenTweedeHelft(slots: DoelSlot[]): number {
  return slots.reduce((som, s) => {
    if (s.dubbel_eerste_helft && !s.dubbel_tweede_helft) return som
    return som + (s.dubbel_tweede_helft ? 2 : 1)
  }, 0)
}
export function maxBeurten(slots: DoelSlot[]): number {
  return Math.max(beurtenEersteHelft(slots), beurtenTweedeHelft(slots))
}

function gildeVan(s: DoelSlot): string {
  return s.gilde_naam ?? '__geen__'
}
function isDubbelSlot(s: DoelSlot): boolean {
  return !!s.dubbel_eerste_helft || !!s.dubbel_tweede_helft
}

// ─── Samenvatten ──────────────────────────────────────────────────────────────

// Compacte tekstweergave per bezet doel, bv: "D1[25m] A:2 B:2 =4 | D2[25m] A:5 B:1 =6"
export function vatSamen(res: Indelingsresultaat): string {
  const delen: string[] = []
  for (const d of res.doelen) {
    if (d.schutters.length === 0) continue
    const perGilde = new Map<string, number>()
    for (const s of d.schutters) perGilde.set(gildeVan(s), (perGilde.get(gildeVan(s)) ?? 0) + 1)
    const gilden = [...perGilde.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([g, n]) => `${g}:${n}`)
      .join(' ')
    delen.push(`D${d.nummer}[${d.zone}] ${gilden} =${maxBeurten(d.schutters)}`)
  }
  if (res.nietIngedeeld.length > 0) {
    delen.push(`NIET:${res.nietIngedeeld.map((s) => s.gilde_naam ?? '?').join(',')}`)
  }
  return delen.join(' | ')
}

// Alle schutter-id's die ergens geplaatst zijn (op een doel).
export function geplaatsteIds(res: Indelingsresultaat): number[] {
  const ids: number[] = []
  for (const d of res.doelen) for (const s of d.schutters) ids.push(s.schutter_id)
  return ids
}

// Controleer harde invarianten. Geeft een lijst overtredingen (leeg = ok).
export function invariantOvertredingen(res: Indelingsresultaat, input: Schutter[]): string[] {
  const fouten: string[] = []
  const verwacht: Record<string, number> = { '25m': 25, compound: 25, '18m': 18, '12m': 12 }

  // Behoud: elke input-schutter exact 1x (op een doel of nietIngedeeld).
  const geplaatst = geplaatsteIds(res)
  const niet = res.nietIngedeeld.map((s) => s.schutter_id)
  const alle = [...geplaatst, ...niet].sort((a, b) => a - b)
  const inputIds = input.map((s) => s.schutter_id).sort((a, b) => a - b)
  if (alle.length !== inputIds.length) {
    fouten.push(`aantal mismatch: ${alle.length} verwerkt vs ${inputIds.length} input`)
  }
  const gezien = new Set<number>()
  for (const id of [...geplaatst, ...niet]) {
    if (gezien.has(id)) fouten.push(`schutter ${id} dubbel geplaatst`)
    gezien.add(id)
  }
  for (const id of inputIds) if (!gezien.has(id)) fouten.push(`schutter ${id} verdwenen`)

  // Geen doel boven 6 beurten; correcte zone.
  for (const d of res.doelen) {
    if (d.schutters.length === 0) continue
    if (maxBeurten(d.schutters) > 6) fouten.push(`doel ${d.nummer} > 6 beurten`)
    const v = verwacht[d.zone]
    for (const s of d.schutters) {
      if (s.afstand !== v) fouten.push(`schutter ${s.schutter_id} (${s.afstand}m) op ${d.zone}-doel ${d.nummer}`)
    }
  }
  return fouten
}

// Map van doelnummer -> aantal per gilde, handig voor assertions.
export function gildeTelling(res: Indelingsresultaat, doelNummer: number): Record<string, number> {
  const d = res.doelen.find((x) => x.nummer === doelNummer)
  const uit: Record<string, number> = {}
  if (!d) return uit
  for (const s of d.schutters) uit[gildeVan(s)] = (uit[gildeVan(s)] ?? 0) + 1
  return uit
}

// ─── Doelfunctie: lexicografische score-vector ───────────────────────────────

const VERWACHTE_AFSTAND: Record<string, number> = { '25m': 25, compound: 25, '18m': 18, '12m': 12 }

export interface ScoreDetail {
  H_zone: number
  H_over6: number
  S_nietIngedeeld: number
  S_onder4: number
  S_dubbelsAchter: number
  S_overvol: number // >5 beurten vermijden (hoog, R12 + gelijk verdelen)
  S_volgorde: number
  S_monoGilde: number
  S_stapeling: number
  S_aaneengesloten: number
  S_uitgesmeerd: number
  S_onderstreef: number // doel naar 5 i.p.v. 4 (laagste prioriteit)
}

export function scoreDetail(res: Indelingsresultaat, schutters?: Schutter[]): ScoreDetail {
  const aanmeldById = new Map<number, number>()
  if (schutters) for (const s of schutters) aanmeldById.set(s.schutter_id, s.aanmeldvolgorde)
  const aanmeld = (id: number): number => aanmeldById.get(id) ?? id

  const d: ScoreDetail = {
    H_zone: 0,
    H_over6: 0,
    S_nietIngedeeld: res.nietIngedeeld.length,
    S_onder4: 0,
    S_dubbelsAchter: 0,
    S_overvol: 0,
    S_volgorde: 0,
    S_monoGilde: 0,
    S_stapeling: 0,
    S_aaneengesloten: 0,
    S_uitgesmeerd: 0,
    S_onderstreef: 0
  }

  // Groepeer bezette doelen per zone, in fysieke volgorde.
  const perZone = new Map<string, typeof res.doelen>()
  for (const doel of res.doelen) {
    if (doel.schutters.length === 0) continue
    if (!perZone.has(doel.zone)) perZone.set(doel.zone, [])
    perZone.get(doel.zone)!.push(doel)
  }

  for (const [zone, doelen] of perZone) {
    doelen.sort((a, b) => a.nummer - b.nummer)
    const verwacht = VERWACHTE_AFSTAND[zone]
    const zoneGilden = new Set<string>()
    for (const doel of doelen) for (const s of doel.schutters) zoneGilden.add(gildeVan(s))

    // Per-doel termen
    for (const doel of doelen) {
      const turns = maxBeurten(doel.schutters)
      if (verwacht !== undefined) {
        for (const s of doel.schutters) if (s.afstand !== verwacht) d.H_zone++
      }
      if (turns > 6) d.H_over6++
      d.S_onder4 += Math.max(0, 4 - turns)
      d.S_overvol += turns > 5 ? 2 * (turns - 5) : 0
      d.S_onderstreef += turns < 5 ? 5 - turns : 0

      const perGilde = new Map<string, number>()
      for (const s of doel.schutters) perGilde.set(gildeVan(s), (perGilde.get(gildeVan(s)) ?? 0) + 1)
      // Mono-gilde (R6): >=2 schutters maar 1 gilde, terwijl de zone meerdere gilden heeft.
      if (doel.schutters.length >= 2 && perGilde.size === 1 && zoneGilden.size > 1) d.S_monoGilde++
      // Stapeling (R5 / 2-2-1-vorm): elk gilde > 2 op een doel.
      for (const n of perGilde.values()) d.S_stapeling += Math.max(0, n - 2)
    }

    // R7: dubbels op de laatste actieve doelen. Straf elk normaal-only doel dat
    // fysiek achter een dubbeldoel ligt.
    const dubbelIdx: number[] = []
    const normaalOnlyIdx: number[] = []
    doelen.forEach((doel, i) => {
      const heeftDubbel = doel.schutters.some(isDubbelSlot)
      if (heeftDubbel) dubbelIdx.push(i)
      else normaalOnlyIdx.push(i)
    })
    for (const di of dubbelIdx) for (const ni of normaalOnlyIdx) if (ni > di) d.S_dubbelsAchter++

    // R8/R9: gilden die vroeger aanmelden horen op de voorste doelen (zie
    // indeling.ts scoreToestand). Per gilde: aanmeld-sleutel (gemiddelde
    // aanmeldvolgorde) en positie (gemiddelde doel-rang); tel de gilde-paren waarbij
    // het vroeger aangemelde gilde gemiddeld op een later doel staat. Volgorde BINNEN
    // een gilde telt niet mee. Dubbeldoelen (achteraan, R7) tellen niet mee.
    const aggVolg = new Map<string, { somA: number; somR: number; n: number }>()
    doelen.forEach((doel, i) => {
      if (doel.schutters.some(isDubbelSlot)) return
      for (const s of doel.schutters) {
        const g = gildeVan(s)
        const e = aggVolg.get(g) ?? { somA: 0, somR: 0, n: 0 }
        e.somA += aanmeld(s.schutter_id)
        e.somR += i
        e.n += 1
        aggVolg.set(g, e)
      }
    })
    const statsVolg = [...aggVolg.values()].map((e) => ({ key: e.somA / e.n, pos: e.somR / e.n }))
    for (let i = 0; i < statsVolg.length; i++) {
      for (let j = i + 1; j < statsVolg.length; j++) {
        const dk = statsVolg[i].key - statsVolg[j].key
        const dp = statsVolg[i].pos - statsVolg[j].pos
        if ((dk < 0 && dp > 0) || (dk > 0 && dp < 0)) d.S_volgorde++
      }
    }

    // Compactheid per gilde: aaneengesloten (R11b) + niet uitgesmeerd (R11).
    const gildeRangen = new Map<string, number[]>()
    const gildeLeden = new Map<string, number>()
    doelen.forEach((doel, i) => {
      const gezien = new Set<string>()
      for (const s of doel.schutters) {
        const g = gildeVan(s)
        gildeLeden.set(g, (gildeLeden.get(g) ?? 0) + 1)
        if (!gezien.has(g)) {
          gezien.add(g)
          if (!gildeRangen.has(g)) gildeRangen.set(g, [])
          gildeRangen.get(g)!.push(i)
        }
      }
    })
    for (const [g, rangen] of gildeRangen) {
      const uniek = [...new Set(rangen)].sort((a, b) => a - b)
      const gaten = uniek[uniek.length - 1] - uniek[0] + 1 - uniek.length
      d.S_aaneengesloten += gaten
      const leden = gildeLeden.get(g) ?? 0
      const compactMin = Math.ceil(leden / 2)
      d.S_uitgesmeerd += Math.max(0, uniek.length - compactMin)
    }
  }

  return d
}

export function scoreVector(res: Indelingsresultaat, schutters?: Schutter[]): number[] {
  const d = scoreDetail(res, schutters)
  return [
    d.H_zone,
    d.H_over6,
    d.S_nietIngedeeld,
    d.S_onder4,
    d.S_dubbelsAchter,
    d.S_overvol,
    d.S_monoGilde,
    d.S_volgorde,
    d.S_aaneengesloten,
    d.S_uitgesmeerd,
    d.S_stapeling,
    d.S_onderstreef
  ]
}

// Lexicografische vergelijking: -1 als a beter (kleiner), 1 als b beter, 0 gelijk.
export function vergelijkScore(a: number[], b: number[]): -1 | 0 | 1 {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av < bv) return -1
    if (av > bv) return 1
  }
  return 0
}
