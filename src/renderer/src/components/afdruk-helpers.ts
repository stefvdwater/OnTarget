import type { DoelSlot, DoelMetConflicten } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import type { ExcelKolom, ExcelModel, ExcelRij } from '@shared/afdrukTypes'
import { categorieLabel } from '../lib/labels'

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
 * Opties-state van de Indeling-afdrukmodus (IndelingAfdrukTab), gescheiden
 * van PrintOpties: dit zijn de rauwe formulierwaarden (bv. `alleDoelen` +
 * ruwe `doelInterval`-tekst), PrintOpties/PrintFilters is de afgeleide vorm
 * die de print-opbouw effectief gebruikt. Leeft in WedstrijdDetailPage
 * (zie issue #42) zodat wisselen van tab of modus deze niet reset.
 */
export interface IndelingAfdrukFilters {
  orientatie: Orientatie
  groepering: Groepering
  alleDoelen: boolean
  doelInterval: string
  alleGildes: boolean
  geselGildes: Set<string>
  afstand25: boolean
  afstand18: boolean
  afstand12: boolean
  totalenTonen: boolean
  waarschuwingenTonen: boolean
}

export function maakIndelingAfdrukFiltersDefault(): IndelingAfdrukFilters {
  return {
    orientatie: 'portret',
    groepering: 'doel',
    alleDoelen: true,
    doelInterval: '',
    alleGildes: true,
    geselGildes: new Set(),
    afstand25: true,
    afstand18: true,
    afstand12: true,
    totalenTonen: true,
    waarschuwingenTonen: false
  }
}

/** Zelfde opzet als IndelingAfdrukFilters, voor ScorekaartenAfdrukTab. */
export interface ScorekaartenAfdrukFilters {
  alleDoelen: boolean
  doelInterval: string
  afstand25: boolean
  afstand18: boolean
  afstand12: boolean
  legeDoelenOpnemen: boolean
}

export function maakScorekaartenAfdrukFiltersDefault(): ScorekaartenAfdrukFilters {
  return {
    alleDoelen: true,
    doelInterval: '',
    afstand25: true,
    afstand18: true,
    afstand12: true,
    legeDoelenOpnemen: false
  }
}

/**
 * Parseert een interval-uitdrukking zoals "1-10, 15, 18-20" naar een
 * gesorteerde lijst unieke doelnummers. Whitespace wordt genegeerd. Lege
 * input → lege lijst. Open intervallen toegestaan: "2-" = 2 tot en met
 * laatste doel; "-3" = vanaf doel 1 tot en met 3; "-" = alle doelen. Bij
 * syntaxfouten (niet-numeriek, omgekeerd interval, buiten bereik) →
 * { fout: string }.
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
      const aTrim = aRaw.trim()
      const bTrim = bRaw.trim()
      const a = aTrim === '' ? 1 : parseInt(aTrim, 10)
      const b = bTrim === '' ? maxDoel : parseInt(bTrim, 10)
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

/**
 * Positie 0 → "A", 1 → "B", … 5 → "F" (0-indexed, zoals slot.positie).
 * Het algoritme kent posities toe als array-index (0-based), dus deze helper
 * verwacht dezelfde 0-based waarde.
 */
export function positieLetter(positie0based: number): string {
  // 0-based positie → letter A..F (clampen op Z voor veiligheid)
  const idx = Math.max(0, positie0based)
  return String.fromCharCode(65 + Math.min(idx, 25))
}

/** "1A", "12F" enz. positie is 0-based (zoals slot.positie). */
export function doelLabel(doelNummer: number, positie0based: number): string {
  return `${doelNummer}${positieLetter(positie0based)}`
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

/** Verzamelt alle (gefilterde) ingedeelde schutters en berekent de totalen. */
export function berekenZichtbareTotalen(
  doelen: DoelMetConflicten[],
  opties: PrintOpties
): Totalen {
  const gefilterd: DoelSlot[] = []
  for (const d of doelen) {
    for (const s of d.schutters) {
      if (passeertFilters(s, d.nummer, opties.filters)) gefilterd.push(s)
    }
  }
  return berekenTotalen(gefilterd)
}

export interface PrintConflict {
  doelNr: number
  bericht: string
}

/** Verzamelt de conflict-waarschuwingen voor de (gefilterde) doelen, in doelvolgorde. */
export function verzamelConflicten(
  doelen: DoelMetConflicten[],
  opties: PrintOpties
): PrintConflict[] {
  return doelen
    .filter((d) => d.conflicten.length > 0 && doelPasseertFilter(d.nummer, opties.filters))
    .flatMap((d) => d.conflicten.map((c) => ({ doelNr: d.nummer, bericht: c.bericht })))
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

// ── Gedeelde rij-opbouw (preview + Excel-export) ────────────
// PrintDocument en de Excel-export bouwen dezelfde rijen op via deze helpers,
// zodat de twee outputs nooit uit elkaar lopen.

/** De 7 celwaarden voor één rij. `slot === null` geeft een lege rij (enkel het doel-label). */
export function slotNaarCellen(label: string, slot: DoelSlot | null): string[] {
  return [
    label,
    slot ? `${slot.voornaam} ${slot.naam}` : '',
    slot?.gilde_naam ?? '',
    slot?.type_boog ?? '',
    slot ? categorieAfkorting(categorieLabel(slot)) : '',
    slot ? `${slot.afstand}m` : '',
    slot ? dubbelLabel(slot) : ''
  ]
}

export interface DoelGroep {
  doelNummer: number
  rijen: { label: string; slot: DoelSlot | null }[]
}

/**
 * Bouwt de rijen voor de "Per doel"-groepering. Bij een gilde-filter compact
 * (enkel passerende schutters, werkelijke positie als label); anders 6 vaste
 * rijen per doel waarbij gaten leeg blijven. Identiek aan de preview-logica.
 */
export function bouwDoelGroepen(
  doelen: DoelMetConflicten[],
  opties: PrintOpties
): DoelGroep[] {
  const sortering = opties.sortering as SorteringDoel
  const compactModus = opties.filters.gildes !== 'alle'
  const zichtbaar = doelen
    .filter((d) => doelPasseertFilter(d.nummer, opties.filters))
    .sort((a, b) => a.nummer - b.nummer)

  const groepen: DoelGroep[] = []
  for (const doel of zichtbaar) {
    const passerende = doel.schutters
      .filter((s) => passeertFilters(s, doel.nummer, opties.filters))
      .slice()
      .sort((a, b) => vergelijkSchutters(a, b, sortering))

    const rijen: { label: string; slot: DoelSlot | null }[] = []
    if (compactModus) {
      for (const s of passerende) {
        rijen.push({ label: doelLabel(doel.nummer, s.positie), slot: s })
      }
    } else {
      // 6 vaste rijen; slot.positie is 0-based (0..5), gaten blijven leeg.
      for (let p = 0; p < 6; p++) {
        const slot = passerende.find((s) => s.positie === p) ?? null
        rijen.push({ label: doelLabel(doel.nummer, p), slot })
      }
    }
    if (rijen.length === 0) continue
    groepen.push({ doelNummer: doel.nummer, rijen })
  }
  return groepen
}

export interface GildeGroep {
  gilde: string
  rijen: { doelNummer: number; positie1: number; slot: DoelSlot }[]
}

/**
 * Bouwt de rijen voor de "Per gilde"-groepering: per gilde een blok schutters,
 * gesorteerd op doel+positie of op naam. Identiek aan de preview-logica.
 */
export function bouwGildeGroepen(
  doelen: DoelMetConflicten[],
  opties: PrintOpties
): GildeGroep[] {
  const sortering = opties.sortering as SorteringGilde
  const allesPerGilde = new Map<string, GildeGroep['rijen']>()
  for (const d of doelen) {
    if (!doelPasseertFilter(d.nummer, opties.filters)) continue
    const gesorteerd = d.schutters.slice().sort((a, b) => a.positie - b.positie)
    gesorteerd.forEach((s) => {
      if (!passeertFilters(s, d.nummer, opties.filters)) return
      const key = s.gilde_naam ?? '(Geen gilde)'
      if (!allesPerGilde.has(key)) allesPerGilde.set(key, [])
      allesPerGilde.get(key)!.push({ doelNummer: d.nummer, positie1: s.positie, slot: s })
    })
  }

  const gildeKeys = Array.from(allesPerGilde.keys()).sort((a, b) => {
    if (a === '(Geen gilde)') return 1
    if (b === '(Geen gilde)') return -1
    return a.localeCompare(b, 'nl')
  })

  return gildeKeys.map((gilde) => {
    const rijen = allesPerGilde.get(gilde)!.slice().sort((a, b) => {
      if (sortering === 'positie') {
        if (a.doelNummer !== b.doelNummer) return a.doelNummer - b.doelNummer
        return a.positie1 - b.positie1
      }
      return vergelijkSchutters(a.slot, b.slot, 'naam')
    })
    return { gilde, rijen }
  })
}

// ── Gepagineerde schermvoorbeeld (indeling) ─────────────────
// Bij het echte afdrukken laat de browser de inhoud zelf over meerdere
// pagina's vloeien (page-break-inside: avoid per doel-groep resp. per rij).
// Voor het schermvoorbeeld pakken we exact diezelfde eenheden greedy na, op
// basis van werkelijk gemeten hoogtes (zie usePrintPaginering.ts), zodat de
// preview toont wat er ook effectief wordt afgedrukt.

export type PrintPakEenheid =
  | { soort: 'doel-groep'; groep: DoelGroep }
  | { soort: 'gilde-kop'; gilde: string; aantal: number }
  | { soort: 'gilde-rij'; rij: GildeGroep['rijen'][number] }
  // Totalen blijft één atomair blok: het is altijd precies 4 vaste regels, de
  // enige groei zit in de tekstterugloop van de "Per gilde"-regel zelf, wat
  // toch niet oplosbaar is door enkel op regelniveau te splitsen. Bij het
  // echte afdrukken (page-break-inside: auto) kan dat blok in theorie
  // alsnog midden in een regel breken; gezien de beperkte hoogte (hooguit
  // enkele tientallen px extra bij veel gilden) is dat een bewust aanvaarde,
  // kleine afwijking.
  | { soort: 'totalen'; totalen: Totalen }
  // Waarschuwingen groeit wel onbegrensd (één regel per conflict) en is dus
  // per item gepakt, net als gilde-rij, zodat een lange lijst net als bij het
  // echte afdrukken (page-break-inside: auto) over een paginagrens kan
  // vallen in plaats van als één blok te verspringen.
  | { soort: 'waarschuwingen-titel' }
  | { soort: 'waarschuwingen-item'; conflict: PrintConflict }

export interface GemetenEenheid {
  eenheid: PrintPakEenheid
  hoogtePx: number
}

export interface PakBudget {
  /** Bruikbare hoogte per pagina in px (paginahoogte min padding). */
  bruikbareHoogtePx: number
  /** Hoogte van de kolomkop (thead), herhaalt op elke pagina met een tabel. */
  theadHoogtePx: number
  /** Hoogte van de documentkop, enkel op de eerste pagina. */
  headerHoogtePx: number
}

/** Welke eenheden tabelinhoud zijn (tellen mee voor het thead-budget). */
export function isTabelEenheid(eenheid: PrintPakEenheid): boolean {
  return eenheid.soort === 'doel-groep' || eenheid.soort === 'gilde-kop' || eenheid.soort === 'gilde-rij'
}

/**
 * Pakt gemeten eenheden greedy in pagina's: een eenheid gaat pas naar de
 * volgende pagina als hij niet meer past op de huidige. Elke eenheid is
 * atomair (nooit gesplitst): dat is exact wat page-break-inside: avoid bij
 * het echte afdrukken ook doet. De thead-hoogte telt enkel mee op pagina's
 * die effectief tabelinhoud bevatten; de documentkop enkel op de eerste
 * pagina.
 */
export function pakInPaginas(
  eenheden: GemetenEenheid[],
  budget: PakBudget
): PrintPakEenheid[][] {
  const paginas: PrintPakEenheid[][] = []
  let huidige: PrintPakEenheid[] = []
  let huidigeHoogte = 0
  let huidigeHeeftTabel = false

  for (const { eenheid, hoogtePx } of eenheden) {
    const isEerstePagina = paginas.length === 0
    // De eerste pagina toont altijd een tabel (met kolomkop), ook leeg, zie
    // PrintPaginaInhoud se toonTabel. Reserveer de thead-hoogte dus sowieso
    // op de eerste pagina, anders klopt het budget niet met wat er echt
    // gerenderd wordt wanneer die pagina toevallig geen tabel-eenheden bevat
    // (bv. enkel een waarschuwingen-blok, met alle doel-groepen weggefilterd).
    const heeftTabelOpDezePagina = huidigeHeeftTabel || isTabelEenheid(eenheid) || isEerstePagina
    const beschikbaar =
      budget.bruikbareHoogtePx -
      (heeftTabelOpDezePagina ? budget.theadHoogtePx : 0) -
      (isEerstePagina ? budget.headerHoogtePx : 0)

    if (huidige.length > 0 && huidigeHoogte + hoogtePx > beschikbaar) {
      paginas.push(huidige)
      huidige = []
      huidigeHoogte = 0
      huidigeHeeftTabel = false
    }
    huidige.push(eenheid)
    huidigeHoogte += hoogtePx
    if (isTabelEenheid(eenheid)) huidigeHeeftTabel = true
  }
  if (huidige.length > 0) paginas.push(huidige)
  return paginas
}

/** CSS-referentiewaarde: 96px per inch, 25.4mm per inch. */
export const MM_NAAR_PX = 96 / 25.4

/**
 * De echte @page-marge bij het afdrukken (zie de dynamische stijl in
 * IndelingAfdrukTab/ScorekaartenAfdrukTab). Dit is NIET hetzelfde als de
 * 14mm padding van .print-root/.print-pagina-vel: die padding is enkel
 * cosmetisch voor het schermvoorbeeld. Voor de paginering moet gerekend
 * worden met wat er echt op papier past, dus met deze marge.
 */
export const PRINT_PAGINA_MARGE_MM = 12

/** Bruikbare hoogte in px van een afgedrukte pagina (paginahoogte min @page-marges). */
export function berekenBruikbareHoogtePx(hoogteMm: number): number {
  return (hoogteMm - 2 * PRINT_PAGINA_MARGE_MM) * MM_NAAR_PX
}

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

/** "2026-06-13" → "13 juni 2026". */
export function formatDatum(datum: string): string {
  const [y, m, d] = datum.split('-')
  return `${parseInt(d, 10)} ${MAANDEN[parseInt(m, 10) - 1]} ${y}`
}

/** "2026-06-13" → "13/06/2026". */
export function formatDatumKort(datum: string): string {
  const [y, m, d] = datum.split('-')
  return `${d}/${m}/${y}`
}

// ── Scorekaarten (blanco kaarten per schutter) ──────────

/**
 * Een pagina komt overeen met exact één doel (max. 6 posities, zie R10 in
 * RULES.md). `posities` is altijd lengte 6; `null` = lege positie, die als
 * blanco kaart wordt afgedrukt. Een volledige dubbelschutter (1e+2e) kan
 * tweemaal voorkomen (zie `bouwKaartPosities`).
 */
export interface ScorekaartPagina {
  doelNummer: number
  posities: (DoelSlot | null)[]
}

const AANTAL_POSITIES = 6

function isVolledigDubbel(s: DoelSlot): boolean {
  return s.dubbel_eerste_helft && s.dubbel_tweede_helft
}

/**
 * Bouwt de 6 kaartposities voor één doel. Elke schutter krijgt normaal 1
 * kaart, in de schietvolgorde (`positie`, al gesorteerd conform R5/R13),
 * vanaf de eerste positie. Een volledige dubbelschutter (1e+2e) schiet als
 * eerste én als laatste beurt binnen het doel (R5 in RULES.md): zijn tweede
 * kaart komt daarom niet zomaar na de andere kaarten, maar telt terug vanaf
 * de laatste positie van de pagina, zodat de effectief laatste kaart van het
 * doel ook zijn laatste beurt is. Bij meerdere volledige dubbelschutters
 * blijft hun onderlinge volgorde behouden, bv. `A B C _ A B` (zie RULES.md,
 * "Volledig dubbel"). Tussenliggende lege posities blijven blanco kaarten.
 */
function bouwKaartPosities(schutters: DoelSlot[]): (DoelSlot | null)[] {
  const gesorteerd = schutters.slice().sort((a, b) => a.positie - b.positie)
  const volDubbelaars = gesorteerd.filter(isVolledigDubbel)

  const posities: (DoelSlot | null)[] = new Array(AANTAL_POSITIES).fill(null)
  gesorteerd.forEach((s, i) => {
    if (i < AANTAL_POSITIES) posities[i] = s
  })
  volDubbelaars.forEach((s, i) => {
    const idx = AANTAL_POSITIES - volDubbelaars.length + i
    if (idx >= 0 && idx < AANTAL_POSITIES) posities[idx] = s
  })
  return posities
}

/**
 * Bouwt één pagina per doel dat door het doel-interval komt. Doelen zonder
 * enige passerende schutter (leeg of volledig weggefilterd) krijgen enkel
 * een pagina (met 6 blanco kaarten) als `legeDoelenOpnemen` aan staat;
 * anders worden ze overgeslagen.
 */
export function bouwScorekaartPaginas(
  doelen: DoelMetConflicten[],
  filters: PrintFilters,
  legeDoelenOpnemen: boolean = false
): ScorekaartPagina[] {
  const paginas: ScorekaartPagina[] = []
  const zichtbaar = doelen
    .filter((d) => doelPasseertFilter(d.nummer, filters))
    .sort((a, b) => a.nummer - b.nummer)

  for (const doel of zichtbaar) {
    const passerend = doel.schutters.filter((s) => passeertFilters(s, doel.nummer, filters))
    const posities = bouwKaartPosities(passerend)
    const heeftInhoud = posities.some((s) => s !== null)
    if (heeftInhoud || legeDoelenOpnemen) {
      paginas.push({ doelNummer: doel.nummer, posities })
    }
  }
  return paginas
}

// ── Excel-model (serializeerbaar, naar het main-proces) ─────

// Kolombreedtes (in Excel-karaktereenheden) afgeleid van de preview-verhoudingen
// 7/24/24/10/15/10/10%. Enkel strings als celwaarden, dus volledig serializeerbaar.
const EXCEL_KOLOMMEN: ExcelKolom[] = [
  { kop: 'Doel', breedte: 8 },
  { kop: 'Naam', breedte: 28 },
  { kop: 'Gilde', breedte: 28 },
  { kop: 'Boog', breedte: 12 },
  { kop: 'Categorie', breedte: 12 },
  { kop: 'Afstand', breedte: 9 },
  { kop: 'Dubbel', breedte: 9 }
]

/**
 * Zet de huidige indeling + afdrukopties om naar een serializeerbaar Excel-model
 * met exact dezelfde rijen, kolommen, groepering en filters als de preview.
 */
export function bouwExcelModel(
  wedstrijd: Wedstrijd,
  doelen: DoelMetConflicten[],
  opties: PrintOpties
): ExcelModel {
  const rijen: ExcelRij[] = []

  if (opties.groepering === 'doel') {
    for (const groep of bouwDoelGroepen(doelen, opties)) {
      for (const r of groep.rijen) {
        rijen.push({ soort: 'data', cellen: slotNaarCellen(r.label, r.slot) })
      }
    }
  } else {
    for (const groep of bouwGildeGroepen(doelen, opties)) {
      rijen.push({ soort: 'groepkop', tekst: `${groep.gilde} (${groep.rijen.length})` })
      for (const r of groep.rijen) {
        rijen.push({
          soort: 'data',
          cellen: slotNaarCellen(doelLabel(r.doelNummer, r.positie1), r.slot)
        })
      }
    }
  }

  const totalen: string[] = []
  if (opties.totalenTonen) {
    const t = berekenZichtbareTotalen(doelen, opties)
    if (t.totaalSchutters > 0) {
      totalen.push(`Totaal schutters: ${t.totaalSchutters}`)
      totalen.push(
        'Per boog: ' +
          Object.entries(t.perBoog)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([b, n]) => `${b}: ${n}`)
            .join(' · ')
      )
      totalen.push(
        'Per gilde: ' +
          Object.entries(t.perGilde)
            .sort(([a], [b]) => a.localeCompare(b, 'nl'))
            .map(([g, n]) => `${g}: ${n}`)
            .join(' · ')
      )
      totalen.push(`Dubbelschutters: ${t.aantalDubbel}`)
    }
  }

  const waarschuwingen: string[] = []
  if (opties.waarschuwingenTonen) {
    for (const c of verzamelConflicten(doelen, opties)) {
      waarschuwingen.push(`Doel ${String(c.doelNr).padStart(2, '0')}: ${c.bericht}`)
    }
  }

  const subtitel =
    `${formatDatum(wedstrijd.datum)}` +
    `${wedstrijd.locatie ? ` · ${wedstrijd.locatie}` : ''}` +
    ` · ${wedstrijd.aantal_doelen} doelen`

  return {
    titel: wedstrijd.naam,
    subtitel,
    datum: wedstrijd.datum,
    kolommen: EXCEL_KOLOMMEN,
    rijen,
    totalen,
    waarschuwingen
  }
}
