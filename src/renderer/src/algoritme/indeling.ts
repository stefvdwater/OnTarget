import type { Schutter, Doel, DoelSlot, Indelingsresultaat, WedstrijdConfig } from './types'
import { configVanWedstrijd } from './types'
import { voegConflictenToe } from './conflicten'
import { pasRuntimeCompoundZoneToe } from './zones'

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
    leeftijdscategorie: s.leeftijdscategorie,
    geslacht: s.geslacht,
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

// Kies de index van het best passende doel onder een predicaat.
// Voorkeur: doel dat het gilde al bevat (samenhouden), dan het meest gevulde doel
// (blok compact houden), dan het laagste doelnummer (R9-tiebreak).
function beterDoel(a: Doel, b: Doel, gilde: string): boolean {
  const aHeeft = a.schutters.some((s) => gildeKey(s) === gilde) ? 1 : 0
  const bHeeft = b.schutters.some((s) => gildeKey(s) === gilde) ? 1 : 0
  if (aHeeft !== bHeeft) return aHeeft > bHeeft
  if (a.schutters.length !== b.schutters.length) return a.schutters.length > b.schutters.length
  return a.nummer < b.nummer
}

function kiesDoel(
  doelen: Doel[],
  geschikt: (d: Doel, i: number) => boolean,
  gilde: string
): number {
  let beste = -1
  for (let i = 0; i < doelen.length; i++) {
    if (!geschikt(doelen[i], i)) continue
    if (beste < 0 || beterDoel(doelen[i], doelen[beste], gilde)) beste = i
  }
  return beste
}

// Fase 4: leftover-schutters (losse schutters + ontkoppelde overflow-paren) per gilde plaatsen.
// Elk gilde-blok blijft op aaneengesloten doelen (R11b). R11b weegt hier zwaarder dan het streefgetal 5:
// een doel mag tot 6 beurten gevuld worden om een gilde samen te houden (cap blijft 6 wegens R3).
function plaatsLeftovers(
  leftovers: Schutter[],
  actieveDoelen: Doel[],
  nietIngedeeld: Schutter[]
): void {
  // Groepeer per gilde; verwerk de gilde-blokken op vroegste aanmeldvolgorde
  // (R9: vroeg aangemeld -> voorste doelen, laat -> achterste).
  const perGilde = new Map<string, Schutter[]>()
  for (const L of leftovers) {
    const g = gildeKey(L)
    if (!perGilde.has(g)) perGilde.set(g, [])
    perGilde.get(g)!.push(L)
  }
  const blokken = [...perGilde.entries()].sort((a, b) => {
    const minA = Math.min(...a[1].map((s) => s.aanmeldvolgorde))
    const minB = Math.min(...b[1].map((s) => s.aanmeldvolgorde))
    return minA - minB
  })

  for (const [g, leden] of blokken) {
    leden.sort((a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde)

    // Doelindices waar dit blok al zit: start bij de doelen waar het gilde uit de paren-fase staat
    // (anker). Groeit mee terwijl we leden plaatsen, zodat het blok aaneengesloten blijft.
    const blokIndices = new Set<number>()
    actieveDoelen.forEach((d, i) => {
      if (d.schutters.some((s) => gildeKey(s) === g)) blokIndices.add(i)
    })

    for (const L of leden) {
      // Voorkeurszone: de doelen van dit blok plus hun directe buren.
      const voorkeur = new Set<number>()
      for (const i of blokIndices) {
        voorkeur.add(i)
        if (i > 0) voorkeur.add(i - 1)
        if (i < actieveDoelen.length - 1) voorkeur.add(i + 1)
      }
      const inVoorkeur = (i: number): boolean => voorkeur.has(i)

      // Stap a: binnen de voorkeurszone een doel met < 5 beurten -> compact bijvullen (streef 5).
      let doelIdx = kiesDoel(
        actieveDoelen,
        (d, i) => inVoorkeur(i) && maxBeurten(d.schutters) < 5 && passtOpDoel(d, L),
        g
      )
      // Stap b: binnen de voorkeurszone, sta 5 -> 6 toe om het gilde samen te houden (R11b > streef 5).
      if (doelIdx < 0) {
        doelIdx = kiesDoel(actieveDoelen, (d, i) => inVoorkeur(i) && passtOpDoel(d, L), g)
      }
      // Stap c: gilde nog nergens (volledig overflow) -> seed op een nog niet vol doel.
      if (doelIdx < 0) {
        doelIdx = kiesDoel(actieveDoelen, (d) => maxBeurten(d.schutters) < 5 && passtOpDoel(d, L), g)
      }
      // Stap d: laatste redmiddel -> elk passend doel (tot 6 beurten).
      if (doelIdx < 0) {
        doelIdx = kiesDoel(actieveDoelen, (d) => passtOpDoel(d, L), g)
      }

      if (doelIdx < 0) {
        nietIngedeeld.push(L)
        continue
      }
      voegToeAanDoel(actieveDoelen[doelIdx], L)
      blokIndices.add(doelIdx)
    }
  }
}

// Fase 5: R4-hard handhaving — verschuif schutters tot elk doel ≥ 4 beurten
function handhaafMin4Beurten(
  actieveDoelen: Doel[],
  totaleBeurten: number,
  zoneGildenCount: number
): void {
  if (totaleBeurten < 4) return // zone-totaal < 4 → uitzondering

  // §7.2: in een zone met slechts 1 gilde vervalt de 2-gilden-eis
  const eenGildeZone = zoneGildenCount <= 1

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
          if (!eenGildeZone && bron.schutters.length - 1 >= 2 && restGilden.size < 2) return false
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
  actieveDoelen: Doel[],
  nietIngedeeld: Schutter[],
  zoneGildenCount: number
): void {
  if (schutters.length === 0) return

  if (actieveDoelen.length === 0) {
    schutters.forEach((s) => nietIngedeeld.push(s))
    return
  }

  const totaleBeurten = schutters.reduce((sum, s) => sum + (isVolDubbel(s) ? 2 : 1), 0)

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

  // Fase 4: leftovers (losse + ontkoppelde overflow-paren) per gilde aaneengesloten plaatsen
  plaatsLeftovers([...lones, ...extraLones], actieveDoelen, nietIngedeeld)

  // Fase 5: R4-hard handhaving
  handhaafMin4Beurten(actieveDoelen, totaleBeurten, zoneGildenCount)
}

// ─── Fase 7: Lokale zoektocht (verfijning) ───────────────────────────────────
//
// De gelaagde greedy-constructie (fase 0-5) geeft een goede, uitlegbare start,
// maar laat bij scheve gildegroottes soms een MONO-GILDE doel achteraan staan
// (een gilde dat zijn surplus op het laatste actieve doel stapelt) of een gilde
// dat net niet aaneengesloten ligt. Dit is een OPTIMALISATIErest: de constructie
// vindt niet altijd het lexicografisch beste punt.
//
// Deze fase doet een begrensde, deterministische hill-climbing over een kleine
// buurt (een schutter VERPLAATSEN of twee schutters RUILEN tussen twee actieve
// doelen van dezelfde zone). Een zet wordt enkel aanvaard als ze de zone-score
// STRIKT verbetert (lexicografisch). Daardoor kan de uitkomst nooit slechter
// zijn dan de constructie alleen, en op de probleemgevallen aantoonbaar beter.
//
// Veiligheid: dubbeldoelen (R7/R8) en hun schutters blijven onaangeroerd, evenals
// compound-schutters op een 25m-doel (R4b/R16). De harde grenzen (zone, <= 6
// beurten, >= 4 beurten) zitten als bovenste score-termen en kunnen dus nooit
// worden ingeruild voor een lagere voorkeur.

function isDubbelSlot(s: DoelSlot): boolean {
  return !!s.dubbel_eerste_helft || !!s.dubbel_tweede_helft
}

// Bezettingsstraf per doel: streef 5; te weinig telt licht, te veel zwaarder
// (R12: liever 4 dan 6). 5->0, 4->1, 6->2, 3->2.
// Lexicografische zone-score (lager is beter) over een lijst van doel-slots
// in fysieke volgorde. De termvolgorde codeert de prioriteitshierarchie:
//   [ over6, onder4, overvol, mono, volgorde, aaneengesloten, stapeling, uitgesmeerd, onderstreef ]
// over6/onder4 (harde grenzen) en overvol (>5 vermijden, gelijk verdelen) bovenaan;
// dan mono (>= 2 gilden per doel, R2), de aanmeldvolgorde op gilde-niveau, en de
// compactheid. ONDERSTREEF (een doel naar 5 i.p.v. 4 brengen) staat HELEMAAL
// onderaan: een doel op 4 is prima (R4-hard voldaan), en het is NIET de moeite
// waard om er een gilde voor uit te smeren (1-per-doel). Zo voorkomen we dat een
// gilde dun verspreid raakt enkel om doelen tot 5 te vullen.
//
// Waarom diversiteit (mono) BOVEN de volgorde staat: het uiteenrafelen van twee
// gilden over aparte doelen (D1=allemaal A, D2=allemaal B) zou de volgorde "verbeteren"
// maar levert mono-gilde doelen op - precies wat ALGORITHM_SPEC §7.1 verbiedt.
function scoreToestand(state: DoelSlot[][], aanmeldById: Map<number, number>): number[] {
  let over6 = 0
  let onder4 = 0
  let overvol = 0
  let onderstreef = 0
  let mono = 0
  let stapeling = 0

  const zoneGilden = new Set<string>()
  for (const slots of state) for (const s of slots) zoneGilden.add(gildeKey(s))
  const meerdereGilden = zoneGilden.size > 1

  for (const slots of state) {
    const turns = maxBeurten(slots)
    if (turns > 6) over6++
    onder4 += Math.max(0, 4 - turns)
    overvol += turns > 5 ? 2 * (turns - 5) : 0 // >5 vermijden (R12: liever 4 dan 6)
    onderstreef += turns < 5 ? 5 - turns : 0 // streef 5 (laagste prioriteit)
    const perGilde = new Map<string, number>()
    for (const s of slots) perGilde.set(gildeKey(s), (perGilde.get(gildeKey(s)) ?? 0) + 1)
    if (slots.length >= 2 && perGilde.size === 1 && meerdereGilden) mono++
    for (const n of perGilde.values()) stapeling += Math.max(0, n - 2)
  }

  // Volgorde (R9): gilden die VROEGER aanmelden horen op de VOORSTE doelen. We
  // meten dit op GILDE-niveau: per gilde een aanmeld-sleutel (gemiddelde
  // aanmeldvolgorde van zijn leden) en een positie (gemiddelde doel-rang). We tellen
  // de inversies: paren gilden waarbij het vroeger aangemelde gilde gemiddeld op een
  // LATER doel staat. De volgorde BINNEN een gilde doet er niet toe (dat zou
  // segregatie belonen). Dubbeldoelen (achteraan, R7) tellen niet mee.
  const gildeAgg = new Map<string, { somA: number; somR: number; n: number }>()
  state.forEach((slots, r) => {
    if (slots.some(isDubbelSlot)) return
    for (const s of slots) {
      const g = gildeKey(s)
      const e = gildeAgg.get(g) ?? { somA: 0, somR: 0, n: 0 }
      e.somA += aanmeldById.get(s.schutter_id) ?? s.schutter_id
      e.somR += r
      e.n += 1
      gildeAgg.set(g, e)
    }
  })
  const gildeStats = [...gildeAgg.values()].map((e) => ({ key: e.somA / e.n, pos: e.somR / e.n }))
  let volgorde = 0
  for (let i = 0; i < gildeStats.length; i++) {
    for (let j = i + 1; j < gildeStats.length; j++) {
      const dk = gildeStats[i].key - gildeStats[j].key
      const dp = gildeStats[i].pos - gildeStats[j].pos
      if ((dk < 0 && dp > 0) || (dk > 0 && dp < 0)) volgorde++
    }
  }

  // Aaneengesloten (R11b) + uitgesmeerd (R11) per gilde.
  let aaneengesloten = 0
  let uitgesmeerd = 0
  const rangen = new Map<string, Set<number>>()
  const leden = new Map<string, number>()
  state.forEach((slots, r) => {
    for (const s of slots) {
      const g = gildeKey(s)
      leden.set(g, (leden.get(g) ?? 0) + 1)
      if (!rangen.has(g)) rangen.set(g, new Set())
      rangen.get(g)!.add(r)
    }
  })
  for (const [g, set] of rangen) {
    const u = [...set].sort((a, b) => a - b)
    aaneengesloten += u[u.length - 1] - u[0] + 1 - u.length
    uitgesmeerd += Math.max(0, u.length - Math.ceil((leden.get(g) ?? 0) / 2))
  }

  return [over6, onder4, overvol, mono, volgorde, aaneengesloten, uitgesmeerd, stapeling, onderstreef]
}

function lexVergelijk(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

// Verfijn een enkele zone met hill-climbing (best-improvement, deterministisch).
function verfijnZone(zoneDoelen: Doel[], aanmeldById: Map<number, number>): void {
  // Alle bezette, niet-vergrendelde doelen vormen de FYSIEKE ruimte (rang-as) waarin
  // we contiguiteit/volgorde meten. Dubbeldoelen (R7) zitten ertussen en tellen mee
  // voor de score, maar worden NOOIT gewijzigd: zo blijft de maat consistent met de
  // onafhankelijke score-functie (een gilde dat over een dubbeldoel heen ligt telt
  // wel degelijk als niet-aaneengesloten).
  const bezet = zoneDoelen
    .filter((d) => !d.vergrendeld && d.schutters.length > 0)
    .sort((a, b) => a.nummer - b.nummer)
  if (bezet.length < 2) return

  const zone = bezet[0].zone
  // Een doel is wijzigbaar als het geen dubbelschutter bevat.
  const wijzigbaar = bezet.map((d) => !d.schutters.some(isDubbelSlot))
  if (wijzigbaar.filter(Boolean).length < 2) return

  // Een compound-schutter op een 25m-doel (R16) blijft op zijn plek (R4b: eerst).
  const verplaatsbaar = (s: DoelSlot): boolean =>
    !isDubbelSlot(s) && !(zone === '25m' && s.type_boog === 'Compound')

  const state: DoelSlot[][] = bezet.map((d) => [...d.schutters])
  let huidige = scoreToestand(state, aanmeldById)

  const MAX_ITER = 200
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let besteVector = huidige
    let beste: { type: 'move' | 'swap'; i: number; s: number; j: number; t: number } | null = null

    // VERPLAATS een schutter van doel i naar doel j (beide wijzigbaar).
    for (let i = 0; i < state.length; i++) {
      if (!wijzigbaar[i]) continue
      for (let s = 0; s < state[i].length; s++) {
        if (!verplaatsbaar(state[i][s])) continue
        for (let j = 0; j < state.length; j++) {
          if (i === j || !wijzigbaar[j]) continue
          if (maxBeurten([...state[j], state[i][s]]) > 6) continue
          const na = state.map((arr) => arr.slice())
          const [slot] = na[i].splice(s, 1)
          na[j].push(slot)
          const v = scoreToestand(na, aanmeldById)
          if (lexVergelijk(v, besteVector) < 0) {
            besteVector = v
            beste = { type: 'move', i, s, j, t: -1 }
          }
        }
      }
    }

    // RUIL een schutter van doel i met een van doel j (verschillende gilden).
    for (let i = 0; i < state.length; i++) {
      if (!wijzigbaar[i]) continue
      for (let j = i + 1; j < state.length; j++) {
        if (!wijzigbaar[j]) continue
        for (let s = 0; s < state[i].length; s++) {
          if (!verplaatsbaar(state[i][s])) continue
          for (let t = 0; t < state[j].length; t++) {
            if (!verplaatsbaar(state[j][t])) continue
            if (gildeKey(state[i][s]) === gildeKey(state[j][t])) continue // zinloze ruil
            const na = state.map((arr) => arr.slice())
            const tmp = na[i][s]
            na[i][s] = na[j][t]
            na[j][t] = tmp
            const v = scoreToestand(na, aanmeldById)
            if (lexVergelijk(v, besteVector) < 0) {
              besteVector = v
              beste = { type: 'swap', i, s, j, t }
            }
          }
        }
      }
    }

    if (!beste) break
    if (beste.type === 'move') {
      const [slot] = state[beste.i].splice(beste.s, 1)
      state[beste.j].push(slot)
    } else {
      const tmp = state[beste.i][beste.s]
      state[beste.i][beste.s] = state[beste.j][beste.t]
      state[beste.j][beste.t] = tmp
    }
    huidige = besteVector
  }

  bezet.forEach((d, k) => (d.schutters = state[k]))
}

function verfijnMetLokaleZoektocht(doelen: Doel[], aanmeldById: Map<number, number>): void {
  const perZone = new Map<string, Doel[]>()
  for (const d of doelen) {
    if (!perZone.has(d.zone)) perZone.set(d.zone, [])
    perZone.get(d.zone)!.push(d)
  }
  for (const zoneDoelen of perZone.values()) verfijnZone(zoneDoelen, aanmeldById)
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
  const dubbelGroepen = groepeerdeDubbelaars(dubbelaars)
  const M = dubbelGroepen.length

  // §7.2: aantal unieke gilden in de zone (incl. dubbelaars en normalen)
  const zoneGildenCount = new Set(schutters.map(gildeKey)).size

  const beschikbareDoelen = zoneDoelen.filter((d) => !d.vergrendeld)

  if (beschikbareDoelen.length === 0) {
    schutters.forEach((s) => nietIngedeeld.push(s))
    return
  }

  // Fase 0: bepaal aantal actieve doelen op basis van ALLE zonebeurten (R10 streef 5, R4-hard min 4)
  const totaleBeurten = schutters.reduce((sum, s) => sum + (isVolDubbel(s) ? 2 : 1), 0)
  let aantalActief: number
  if (totaleBeurten < 4) {
    aantalActief = Math.min(1, beschikbareDoelen.length)
  } else {
    aantalActief = Math.min(
      beschikbareDoelen.length,
      Math.max(1, Math.ceil(totaleBeurten / 5)),
      Math.max(1, Math.floor(totaleBeurten / 4))
    )
  }
  // Garandeer dat alle dubbel-groepen passen, voor zover capaciteit toelaat
  aantalActief = Math.min(beschikbareDoelen.length, Math.max(aantalActief, M))

  const actieveDoelen = beschikbareDoelen.slice(0, aantalActief)
  const dubbelStart = Math.max(0, aantalActief - M)
  const dubbelDoelen = actieveDoelen.slice(dubbelStart)
  const normaalDoelen = actieveDoelen.slice(0, dubbelStart)

  const gebruikteIds = new Set<number>()

  // Dubbeldoelen staan achteraan (R7). Hun normale "rust"-vullers kiezen we uit de
  // LAATST aangemelde normalen, zodat vroeg aangemelde gilden vooraan blijven (R8/R9)
  // i.p.v. naar de achterste dubbeldoelen gezogen te worden. (Voorheen pikte de
  // vulling de vroegste normalen, waardoor een vroege gilde op de achterste doelen
  // belandde.)
  const normalenAchteraan = [...normalen].sort((a, b) => b.aanmeldvolgorde - a.aanmeldvolgorde)

  // Fase A: Dubbelaars op de achterste actieve doelen (R7, R8, R13)
  // Volgorde: vroegst aangemelde groep op het laagste dubbeldoel (R9 binnen het achter-blok)
  for (let i = 0; i < dubbelGroepen.length; i++) {
    const groep = dubbelGroepen[i]
    if (i >= dubbelDoelen.length) {
      groep.forEach((s) => nietIngedeeld.push(s))
      continue
    }

    const doel = dubbelDoelen[i]
    groep.forEach((s) => voegToeAanDoel(doel, s))

    // Verplichte normalen (R8) — begrensd door beschikbare ruimte tot 5 beurten
    const ruimteVoor5 = Math.max(0, 5 - maxBeurten(doel.schutters))
    const verplichten = kiesNormalenVoorDubbeldoel(
      normalenAchteraan,
      doel,
      Math.min(berekenMinNormalen(groep), ruimteVoor5),
      gebruikteIds
    )
    verplichten.forEach((s) => voegToeAanDoel(doel, s))

    // Aanvullen tot 5 beurten (R10), met gilde-voorkeur (R11, max 2 per gilde)
    for (const n of normalenAchteraan) {
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
    for (const n of normalenAchteraan) {
      if (maxBeurten(doel.schutters) >= 5) break
      if (gebruikteIds.has(n.schutter_id)) continue
      if (!passtOpDoel(doel, n)) continue
      voegToeAanDoel(doel, n)
      gebruikteIds.add(n.schutter_id)
    }
  }

  // Fase B: Resterende normalen op de voorste actieve doelen (R9, R10, R10b)
  const restNormalen = normalen.filter((s) => !gebruikteIds.has(s.schutter_id))
  if (normaalDoelen.length === 0) {
    restNormalen.forEach((s) => nietIngedeeld.push(s))
  } else {
    verdeelNormalen(restNormalen, normaalDoelen, nietIngedeeld, zoneGildenCount)
  }
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

export interface IndelingsOpties {
  // Lokale-zoektocht-verfijning (fase 7). Standaard aan. Uitschakelbaar om de
  // pure constructie te vergelijken (test-harnas / regressie-bewijs).
  lokaleZoektocht?: boolean
}

export function berekenIndeling(
  inschrijvingen: Schutter[],
  config: WedstrijdConfig,
  vergrendeldeDoelNummers: number[] = [],
  opties: IndelingsOpties = {}
): Indelingsresultaat {
  const doelen = maakLegeDoelen(config)
  if (vergrendeldeDoelNummers.length > 0) {
    const set = new Set(vergrendeldeDoelNummers)
    doelen.forEach((d) => {
      if (set.has(d.nummer)) d.vergrendeld = true
    })
  }
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

  // Compound EERST verwerken (issue #9): zo zijn de niet-benodigde compound-doelen
  // bekend voordat de 25m-zone wordt ingedeeld, en kunnen ze als 25m worden hergebruikt.
  if (compound25Def.length >= 3) {
    verwerkZone(compound25Def, doelen.filter((d) => d.zone === 'compound'), nietIngedeeld)
  }

  pasRuntimeCompoundZoneToe(doelen)

  verwerkZone(normaal25Def, doelen.filter((d) => d.zone === '25m'), nietIngedeeld)
  verwerkZone(schutters18, doelen.filter((d) => d.zone === '18m'), nietIngedeeld)
  verwerkZone(schutters12, doelen.filter((d) => d.zone === '12m'), nietIngedeeld)

  // Fase 7: lexicografische verfijning (lokale zoektocht). Standaard aan.
  if (opties.lokaleZoektocht !== false) {
    const aanmeldById = new Map<number, number>()
    for (const s of inschrijvingen) aanmeldById.set(s.schutter_id, s.aanmeldvolgorde)
    verfijnMetLokaleZoektocht(doelen, aanmeldById)
  }

  doelen.forEach((d) => {
    d.schutters = sorteerSchuttersOpDoel(d.schutters, d.zone)
    d.schutters.forEach((s, i) => (s.positie = i))
  })

  return { doelen: voegConflictenToe(doelen), nietIngedeeld }
}

export { configVanWedstrijd }
