import type { Schutter, Doel, DoelSlot, Indelingsresultaat, WedstrijdConfig } from './types'
import { configVanWedstrijd } from './types'
import { voegConflictenToe } from './conflicten'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVolDubbel(s: Schutter): boolean {
  return !!s.dubbel_eerste_helft && !!s.dubbel_tweede_helft
}

function isEerstHelftDubbel(s: Schutter): boolean {
  return !!s.dubbel_eerste_helft && !s.dubbel_tweede_helft
}

function isTweedeHelftDubbel(s: Schutter): boolean {
  return !s.dubbel_eerste_helft && !!s.dubbel_tweede_helft
}

function isDubbel(s: Schutter): boolean {
  return !!s.dubbel_eerste_helft || !!s.dubbel_tweede_helft
}

function beurtenEersteHelft(slots: DoelSlot[]): number {
  return slots.reduce((som, s) => {
    if (!s.dubbel_eerste_helft && s.dubbel_tweede_helft) return som
    return som + (s.dubbel_eerste_helft ? 2 : 1)
  }, 0)
}

function beurtenTweedeHelft(slots: DoelSlot[]): number {
  return slots.reduce((som, s) => {
    if (s.dubbel_eerste_helft && !s.dubbel_tweede_helft) return som
    return som + (s.dubbel_tweede_helft ? 2 : 1)
  }, 0)
}

function maxBeurten(slots: DoelSlot[]): number {
  return Math.max(beurtenEersteHelft(slots), beurtenTweedeHelft(slots))
}

function passtOpDoel(doel: Doel, schutter: Schutter): boolean {
  return maxBeurten([...doel.schutters, schutterNaarSlot(schutter, 0)]) <= 6
}

function schutterNaarSlot(s: Schutter, positie: number): DoelSlot {
  return {
    schutter_id: s.schutter_id,
    voornaam: s.voornaam,
    naam: s.naam,
    gilde_naam: s.gilde_naam,
    type_boog: s.type_boog,
    afstand: s.afstand,
    dubbel_eerste_helft: !!s.dubbel_eerste_helft,
    dubbel_tweede_helft: !!s.dubbel_tweede_helft,
    positie
  }
}

function voegToeAanDoel(doel: Doel, schutter: Schutter): void {
  doel.schutters.push(schutterNaarSlot(schutter, doel.schutters.length))
}

// ─── Zone bepaling ─────────────────────────────────────────────────────────────

function bepaalZones(config: WedstrijdConfig) {
  const doelen25m = config.aantalDoelen - config.aantalDoelen18m - config.aantalDoelen12m
  const einde25m = doelen25m
  const eindeCompound = Math.min(
    config.compoundStartdoel + config.aantalCompoundDoelen - 1,
    einde25m
  )
  const start18m = doelen25m + 1
  const einde18m = doelen25m + config.aantalDoelen18m
  const start12m = einde18m + 1
  return {
    einde25m,
    startCompound: config.compoundStartdoel,
    eindeCompound,
    start18m,
    einde18m,
    start12m,
    einde12m: config.aantalDoelen
  }
}

function maakLegeDoelen(config: WedstrijdConfig): Doel[] {
  const z = bepaalZones(config)
  const doelen: Doel[] = []
  for (let i = 1; i <= config.aantalDoelen; i++) {
    let zone: Doel['zone']
    if (i >= z.start12m && i <= z.einde12m) zone = '12m'
    else if (i >= z.start18m && i <= z.einde18m) zone = '18m'
    else if (i >= z.startCompound && i <= z.eindeCompound) zone = 'compound'
    else zone = '25m'
    doelen.push({ nummer: i, zone, schutters: [], vergrendeld: false })
  }
  return doelen
}

// ─── Dubbelschutters groepering ────────────────────────────────────────────────

function groepeerdeDubbelaars(dubbelaars: Schutter[]): Schutter[][] {
  const volDubbel = dubbelaars.filter(isVolDubbel)
  const eersteHelft = dubbelaars.filter(isEerstHelftDubbel)
  const tweedeHelft = dubbelaars.filter(isTweedeHelftDubbel)
  const groepen: Schutter[][] = []

  // Vol-dubbel: max 2 per groep (2 × 2 beurten = 4; past nog 1 normaal)
  let huidigeGroep: Schutter[] = []
  for (const s of volDubbel) {
    huidigeGroep.push(s)
    if (huidigeGroep.length >= 2) {
      groepen.push([...huidigeGroep])
      huidigeGroep = []
    }
  }
  if (huidigeGroep.length > 0) groepen.push([...huidigeGroep])

  // Koppel EH met TH (R13): voorkeur voor ander gilde
  const gepaardEH = new Set<number>()
  const gepaardTH = new Set<number>()
  for (const eh of eersteHelft) {
    if (gepaardEH.has(eh.schutter_id)) continue
    const th =
      tweedeHelft.find(
        (t) => !gepaardTH.has(t.schutter_id) && t.gilde_naam !== eh.gilde_naam
      ) ?? tweedeHelft.find((t) => !gepaardTH.has(t.schutter_id))
    if (th) {
      groepen.push([eh, th])
      gepaardEH.add(eh.schutter_id)
      gepaardTH.add(th.schutter_id)
    } else {
      groepen.push([eh])
      gepaardEH.add(eh.schutter_id)
    }
  }
  for (const th of tweedeHelft) {
    if (!gepaardTH.has(th.schutter_id)) groepen.push([th])
  }

  return groepen
}

function berekenMinNormalen(groep: Schutter[]): number {
  const ehCount = groep.filter((s) => isEerstHelftDubbel(s) || isVolDubbel(s)).length
  const thCount = groep.filter((s) => isTweedeHelftDubbel(s) || isVolDubbel(s)).length
  if (ehCount >= 2 && thCount >= 2) return 2
  if (groep.length >= 2) return 1
  return 0
}

// ─── Normalen kiezen voor dubbeldoel ──────────────────────────────────────────

function kiesNormalenVoorDubbeldoel(
  normalen: Schutter[],
  doel: Doel,
  minNorm: number,
  gebruikteIds: Set<number>
): Schutter[] {
  if (minNorm === 0) return []
  const geselecteerd: Schutter[] = []
  const kandidaten = normalen.filter((s) => !gebruikteIds.has(s.schutter_id))

  // R2: als alle dubbelaars van 1 gilde zijn, moet de eerste normaal van een ander gilde komen
  const doelGilden = new Set(doel.schutters.map((s) => s.gilde_naam ?? '__geen__'))
  const behoeftAnderGilde = doelGilden.size === 1

  for (const k of kandidaten) {
    if (geselecteerd.length >= minNorm) break
    if (!passtOpDoel(doel, k)) continue
    const kGilde = k.gilde_naam ?? '__geen__'
    // Eerste normaal: R2-afdwinging
    if (behoeftAnderGilde && geselecteerd.length === 0 && doelGilden.has(kGilde)) continue
    // Tweede normaal: ander gilde dan eerste (R8)
    if (minNorm >= 2 && geselecteerd.length === 1) {
      if (kGilde === (geselecteerd[0].gilde_naam ?? '__geen__')) continue
    }
    geselecteerd.push(k)
    gebruikteIds.add(k.schutter_id)
  }

  // Fallback: gilde-restricties laten vallen als min niet gehaald
  if (geselecteerd.length < minNorm) {
    for (const k of kandidaten) {
      if (geselecteerd.length >= minNorm) break
      if (geselecteerd.some((g) => g.schutter_id === k.schutter_id)) continue
      if (!passtOpDoel(doel, k)) continue
      geselecteerd.push(k)
      gebruikteIds.add(k.schutter_id)
    }
  }

  return geselecteerd
}

// ─── Normale schutters verdelen — v2.0 paren-gebaseerd ────────────────────────

interface Paar {
  gilde: string
  schutters: [Schutter, Schutter]
  firstAanmeld: number
}

function gildeKey(s: Schutter | DoelSlot): string {
  return s.gilde_naam ?? '__geen__'
}

function passtSlotOpDoel(doel: Doel, slot: DoelSlot): boolean {
  return maxBeurten([...doel.schutters, slot]) <= 6
}

// Fase 2: paren vormen per gilde
function vormParen(normalen: Schutter[]): { parenPerGilde: Paar[][]; lones: Schutter[] } {
  const perGilde = new Map<string, Schutter[]>()
  for (const s of normalen) {
    const g = gildeKey(s)
    if (!perGilde.has(g)) perGilde.set(g, [])
    perGilde.get(g)!.push(s)
  }

  const gildenGesorteerd = [...perGilde.entries()].sort((a, b) => {
    const minA = Math.min(...a[1].map((s) => s.aanmeldvolgorde))
    const minB = Math.min(...b[1].map((s) => s.aanmeldvolgorde))
    return minA - minB
  })

  const parenPerGilde: Paar[][] = []
  const lones: Schutter[] = []

  for (const [gilde, leden] of gildenGesorteerd) {
    leden.sort((a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde)
    const paren: Paar[] = []
    for (let i = 0; i + 1 < leden.length; i += 2) {
      paren.push({
        gilde,
        schutters: [leden[i], leden[i + 1]],
        firstAanmeld: Math.min(leden[i].aanmeldvolgorde, leden[i + 1].aanmeldvolgorde)
      })
    }
    if (leden.length % 2 === 1) lones.push(leden[leden.length - 1])
    if (paren.length > 0) parenPerGilde.push(paren)
  }

  return { parenPerGilde, lones }
}

// Fase 3.1: LPT bin-packing — verdeel gilden over 2 sporen
function verdeelGildenOverSporen(parenPerGilde: Paar[][]): { spoorA: Paar[]; spoorB: Paar[] } {
  const opGrootte = [...parenPerGilde].sort((a, b) => b.length - a.length)

  const tracksA: Paar[][] = []
  const tracksB: Paar[][] = []
  let countA = 0
  let countB = 0

  for (const gildeParen of opGrootte) {
    if (countA <= countB) {
      tracksA.push(gildeParen)
      countA += gildeParen.length
    } else {
      tracksB.push(gildeParen)
      countB += gildeParen.length
    }
  }

  // Binnen elk spoor sorteren op aanmeldvolgorde
  tracksA.sort((a, b) => a[0].firstAanmeld - b[0].firstAanmeld)
  tracksB.sort((a, b) => a[0].firstAanmeld - b[0].firstAanmeld)

  return { spoorA: tracksA.flat(), spoorB: tracksB.flat() }
}

// Fase 4: lone-schutters verdelen
function plaatsLones(lones: Schutter[], actieveDoelen: Doel[], nietIngedeeld: Schutter[]): void {
  for (const L of lones.sort((a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde)) {
    const g = gildeKey(L)

    // Indices van doelen waar gilde al aanwezig is, plus naburen
    const gildeIndices = actieveDoelen
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.schutters.some((s) => gildeKey(s) === g))
      .map(({ i }) => i)

    const voorkeurSet = new Set<number>()
    for (const i of gildeIndices) {
      voorkeurSet.add(i)
      if (i > 0) voorkeurSet.add(i - 1)
      if (i < actieveDoelen.length - 1) voorkeurSet.add(i + 1)
    }

    const stapA = [...voorkeurSet]
      .map((i) => actieveDoelen[i])
      .filter((d) => maxBeurten(d.schutters) < 5 && passtOpDoel(d, L))

    if (stapA.length > 0) {
      stapA.sort((a, b) => {
        const aGilde2x = a.schutters.filter((s) => gildeKey(s) === g).length >= 2 ? 1 : 0
        const bGilde2x = b.schutters.filter((s) => gildeKey(s) === g).length >= 2 ? 1 : 0
        if (aGilde2x !== bGilde2x) return aGilde2x - bGilde2x
        return b.schutters.length - a.schutters.length
      })
      voegToeAanDoel(stapA[0], L)
      continue
    }

    // Stap B — geen voorkeurdoel: doel met < 2 gilden prioriteit (R6)
    const stapB = actieveDoelen.filter(
      (d) => maxBeurten(d.schutters) < 5 && passtOpDoel(d, L)
    )
    if (stapB.length > 0) {
      stapB.sort((a, b) => {
        const aGilden = new Set(a.schutters.map(gildeKey)).size
        const bGilden = new Set(b.schutters.map(gildeKey)).size
        const aMinder2 = aGilden < 2 ? 0 : 1
        const bMinder2 = bGilden < 2 ? 0 : 1
        if (aMinder2 !== bMinder2) return aMinder2 - bMinder2
        return a.nummer - b.nummer
      })
      voegToeAanDoel(stapB[0], L)
      continue
    }

    // Stap C — versoepel naar ≤ 6 beurten
    const stapC = actieveDoelen.filter((d) => passtOpDoel(d, L))
    if (stapC.length > 0) {
      stapC.sort((a, b) => {
        if (a.schutters.length !== b.schutters.length) return a.schutters.length - b.schutters.length
        const pg = a.schutters.filter((x) => gildeKey(x) === g).length
        const cg = b.schutters.filter((x) => gildeKey(x) === g).length
        return pg - cg
      })
      voegToeAanDoel(stapC[0], L)
      continue
    }

    // Stap D
    nietIngedeeld.push(L)
  }
}

// Fase 5: R4-hard handhaving — verschuif schutters tot elk doel ≥ 4 beurten
function handhaafMin4Beurten(actieveDoelen: Doel[], totaleBeurten: number): void {
  if (totaleBeurten < 4) return // zone-totaal < 4 → uitzondering

  for (const d of actieveDoelen) {
    let benodigd = 4 - maxBeurten(d.schutters)
    if (benodigd <= 0) continue

    for (let i = actieveDoelen.length - 1; i >= 0 && benodigd > 0; i--) {
      const bron = actieveDoelen[i]
      if (bron === d) continue

      while (maxBeurten(bron.schutters) > 4 && benodigd > 0) {
        const verplaatsbaar = bron.schutters.find((slot) => {
          const restGilden = new Set(
            bron.schutters.filter((x) => x.schutter_id !== slot.schutter_id).map(gildeKey)
          )
          if (bron.schutters.length - 1 >= 2 && restGilden.size < 2) return false
          return passtSlotOpDoel(d, slot)
        })
        if (!verplaatsbaar) break
        bron.schutters = bron.schutters.filter(
          (s) => s.schutter_id !== verplaatsbaar.schutter_id
        )
        d.schutters.push(verplaatsbaar)
        benodigd--
      }
    }
  }
}

function verdeelNormalen(
  schutters: Schutter[],
  zoneDoelen: Doel[],
  doelStartIndex: number,
  nietIngedeeld: Schutter[]
): void {
  if (schutters.length === 0) return

  const beschikbareDoelen = zoneDoelen.slice(doelStartIndex).filter((d) => !d.vergrendeld)

  if (beschikbareDoelen.length === 0) {
    for (const s of schutters) {
      const doel = zoneDoelen.find((d) => !d.vergrendeld && passtOpDoel(d, s))
      if (doel) voegToeAanDoel(doel, s)
      else nietIngedeeld.push(s)
    }
    return
  }

  // Fase 0: bepaal aantal actieve doelen (R4, R4-hard, R10)
  const totaleBeurten = schutters.reduce((sum, s) => sum + (isVolDubbel(s) ? 2 : 1), 0)
  let aantalActief: number
  if (totaleBeurten < 4) {
    aantalActief = 1
  } else {
    aantalActief = Math.min(
      beschikbareDoelen.length,
      Math.max(1, Math.ceil(totaleBeurten / 5)),
      Math.max(1, Math.floor(totaleBeurten / 4))
    )
  }
  const actieveDoelen = beschikbareDoelen.slice(0, aantalActief)

  // Fase 2: paren vormen per gilde
  const { parenPerGilde, lones } = vormParen(schutters)

  // Fase 3: tweesporen-toewijzing
  const { spoorA, spoorB } = verdeelGildenOverSporen(parenPerGilde)
  const extraLones: Schutter[] = []
  const Tnorm = actieveDoelen.length

  const plakSpoor = (spoor: Paar[]) => {
    for (let i = 0; i < spoor.length; i++) {
      if (i >= Tnorm) {
        // Randgeval (zou niet mogen voorkomen): ontkoppel paar
        extraLones.push(spoor[i].schutters[0], spoor[i].schutters[1])
      } else {
        voegToeAanDoel(actieveDoelen[i], spoor[i].schutters[0])
        voegToeAanDoel(actieveDoelen[i], spoor[i].schutters[1])
      }
    }
  }
  plakSpoor(spoorA)
  plakSpoor(spoorB)

  // Fase 4: lones plaatsen
  plaatsLones([...lones, ...extraLones], actieveDoelen, nietIngedeeld)

  // Fase 5: R4-hard handhaving
  handhaafMin4Beurten(actieveDoelen, totaleBeurten)
}

// ─── Zone verwerking ──────────────────────────────────────────────────────────

function verwerkZone(
  schutters: Schutter[],
  zoneDoelen: Doel[],
  nietIngedeeld: Schutter[]
): void {
  if (schutters.length === 0) return
  if (zoneDoelen.length === 0) {
    schutters.forEach((s) => nietIngedeeld.push(s))
    return
  }

  const dubbelaars = schutters.filter(isDubbel)
  const normalen = schutters.filter((s) => !isDubbel(s))
  const gebruikteIds = new Set<number>()
  let doelCursor = 0

  // Fase A: Dubbelaars op eerste doel(en) (R7, R8, R13)
  for (const groep of groepeerdeDubbelaars(dubbelaars)) {
    if (doelCursor >= zoneDoelen.length) {
      groep.forEach((s) => nietIngedeeld.push(s))
      continue
    }

    const doel = zoneDoelen[doelCursor++]
    groep.forEach((s) => voegToeAanDoel(doel, s))

    // Verplichte normalen (R8) — begrensd door beschikbare ruimte tot 5 beurten
    const ruimteVoor5 = Math.max(0, 5 - maxBeurten(doel.schutters))
    const verplichten = kiesNormalenVoorDubbeldoel(
      normalen,
      doel,
      Math.min(berekenMinNormalen(groep), ruimteVoor5),
      gebruikteIds
    )
    verplichten.forEach((s) => voegToeAanDoel(doel, s))

    // Aanvullen tot 5 beurten (R10), met gilde-voorkeur (R11, max 2 per gilde)
    for (const n of normalen) {
      if (maxBeurten(doel.schutters) >= 5) break
      if (gebruikteIds.has(n.schutter_id)) continue
      if (!passtOpDoel(doel, n)) continue
      const nGilde = n.gilde_naam ?? '__geen__'
      const aantalVanGilde = doel.schutters.filter(
        (s) => (s.gilde_naam ?? '__geen__') === nGilde
      ).length
      if (aantalVanGilde >= 2) continue
      voegToeAanDoel(doel, n)
      gebruikteIds.add(n.schutter_id)
    }
    // Fallback: gilde-restrictie laten vallen om 5 te bereiken (R10 > R11)
    for (const n of normalen) {
      if (maxBeurten(doel.schutters) >= 5) break
      if (gebruikteIds.has(n.schutter_id)) continue
      if (!passtOpDoel(doel, n)) continue
      voegToeAanDoel(doel, n)
      gebruikteIds.add(n.schutter_id)
    }
  }

  // Fase B: Resterende normalen (R9, R10, R10b)
  const restNormalen = normalen.filter((s) => !gebruikteIds.has(s.schutter_id))
  verdeelNormalen(restNormalen, zoneDoelen, doelCursor, nietIngedeeld)
}

// ─── Sortering binnen een doel ────────────────────────────────────────────────

function sorteerSchuttersOpDoel(slots: DoelSlot[], zone: Doel['zone']): DoelSlot[] {
  // R4b: compound op niet-compound 25m doel (uitzondering R16) → allereerst
  const compoundUitz = zone === '25m' ? slots.filter((s) => s.type_boog === 'Compound') : []
  const rest = zone === '25m' ? slots.filter((s) => s.type_boog !== 'Compound') : slots

  // R5: EH + vol-dubbel vooraan; TH-only achteraan
  const ehEnVol = rest.filter((s) => s.dubbel_eerste_helft)
  const thOnly = rest.filter((s) => s.dubbel_tweede_helft && !s.dubbel_eerste_helft)
  const normalen = rest.filter((s) => !s.dubbel_eerste_helft && !s.dubbel_tweede_helft)

  // R15: normalen gegroepeerd per gilde
  const gildeGroepen = new Map<string, DoelSlot[]>()
  for (const s of normalen) {
    const g = s.gilde_naam ?? '__geen__'
    if (!gildeGroepen.has(g)) gildeGroepen.set(g, [])
    gildeGroepen.get(g)!.push(s)
  }

  return [...compoundUitz, ...ehEnVol, ...[...gildeGroepen.values()].flat(), ...thOnly]
}

// ─── Hoofdalgoritme ───────────────────────────────────────────────────────────

export function berekenIndeling(
  inschrijvingen: Schutter[],
  config: WedstrijdConfig
): Indelingsresultaat {
  const doelen = maakLegeDoelen(config)
  const nietIngedeeld: Schutter[] = []

  // Sorteer op aanmeldvolgorde (R9)
  const gesorteerd = [...inschrijvingen].sort((a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde)

  const compound25 = gesorteerd.filter((s) => s.afstand === 25 && s.type_boog === 'Compound')
  const normaal25 = gesorteerd.filter((s) => s.afstand === 25 && s.type_boog !== 'Compound')
  const schutters18 = gesorteerd.filter((s) => s.afstand === 18)
  const schutters12 = gesorteerd.filter((s) => s.afstand === 12)

  // R16: < 3 compound → bij normaal 25m plaatsen, gesorteerd op aanmeldvolgorde
  // Sortering (R4b) plaatst hen allereerst binnen hun doel
  let normaal25Def = normaal25
  let compound25Def = compound25
  if (compound25.length > 0 && compound25.length < 3) {
    normaal25Def = [...normaal25, ...compound25].sort(
      (a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde
    )
    compound25Def = []
  }

  verwerkZone(normaal25Def, doelen.filter((d) => d.zone === '25m'), nietIngedeeld)
  if (compound25Def.length >= 3) {
    verwerkZone(compound25Def, doelen.filter((d) => d.zone === 'compound'), nietIngedeeld)
  }
  verwerkZone(schutters18, doelen.filter((d) => d.zone === '18m'), nietIngedeeld)
  verwerkZone(schutters12, doelen.filter((d) => d.zone === '12m'), nietIngedeeld)

  doelen.forEach((d) => {
    d.schutters = sorteerSchuttersOpDoel(d.schutters, d.zone)
    d.schutters.forEach((s, i) => (s.positie = i))
  })

  return { doelen: voegConflictenToe(doelen), nietIngedeeld }
}

export { configVanWedstrijd }
