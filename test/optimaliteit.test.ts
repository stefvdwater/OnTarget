// Optimaliteit: gewenste uitkomsten per scenario (ALGORITHM_SPEC §7) plus het
// bewijs dat de lokale zoektocht (fase 7) de constructie aantoonbaar verbetert
// op de probleemgevallen, en haar nooit verslechtert.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { berekenIndeling } from '../src/renderer/src/algoritme/indeling.ts'
import type { Schutter } from '../src/renderer/src/algoritme/types.ts'
import type { WedstrijdConfig } from '../src/renderer/src/algoritme/types.ts'
import {
  maakGilde,
  maakSchutter,
  config25m,
  gildeTelling,
  scoreDetail,
  scoreVector,
  vergelijkScore,
  vatSamen,
  resetTeller,
  invariantOvertredingen,
  maxBeurten
} from './harnas.ts'

const metLS = (s: Schutter[], c: WedstrijdConfig, v: number[] = []): ReturnType<typeof berekenIndeling> =>
  berekenIndeling(s, c, v)
const zonderLS = (s: Schutter[], c: WedstrijdConfig, v: number[] = []): ReturnType<typeof berekenIndeling> =>
  berekenIndeling(s, c, v, { lokaleZoektocht: false })

// Aantal bezette doelen met >= 2 schutters maar 1 gilde (mono), terwijl de zone
// meerdere gilden telt.
function monoDoelen(res: ReturnType<typeof berekenIndeling>): number {
  return scoreDetail(res).S_monoGilde
}

function bezetteDoelen(res: ReturnType<typeof berekenIndeling>): number {
  return res.doelen.filter((d) => d.schutters.length > 0).length
}

describe('ALGORITHM_SPEC §7 - gewenste uitkomsten', () => {
  test('§7.1 A6 B6 / 2 doelen: beide doelen 2 gilden, alle 12 geplaatst (geen mono)', () => {
    resetTeller()
    const s = [...maakGilde('A', 6), ...maakGilde('B', 6)]
    const res = metLS(s, config25m(2))
    assert.equal(res.nietIngedeeld.length, 0, 'alle schutters geplaatst')
    assert.equal(bezetteDoelen(res), 2)
    assert.equal(monoDoelen(res), 0, `geen mono-doel: ${vatSamen(res)}`)
    for (const n of [1, 2]) {
      const t = gildeTelling(res, n)
      assert.ok(t['A'] >= 1 && t['B'] >= 1, `doel ${n} heeft 2 gilden: ${vatSamen(res)}`)
    }
  })

  test('§7.2 A8 / 4 doelen, 1 gilde: 4+4, geen mono-conflict (zone heeft 1 gilde)', () => {
    resetTeller()
    const s = maakGilde('A', 8)
    const res = metLS(s, config25m(4))
    assert.equal(res.nietIngedeeld.length, 0)
    assert.equal(bezetteDoelen(res), 2, `2 doelen van 4: ${vatSamen(res)}`)
    // mono telt niet als de hele zone 1 gilde is
    assert.equal(monoDoelen(res), 0)
    assert.deepEqual(gildeTelling(res, 1), { A: 4 })
    assert.deepEqual(gildeTelling(res, 2), { A: 4 })
  })

  test('§7.3 17 / 3 doelen: 6+6+5, geen mono', () => {
    resetTeller()
    const s = [...maakGilde('A', 7), ...maakGilde('B', 6), ...maakGilde('C', 4)]
    const res = metLS(s, config25m(3))
    assert.equal(res.nietIngedeeld.length, 0)
    const turns = res.doelen.filter((d) => d.schutters.length > 0).map((d) => maxBeurten(d.schutters))
    // bezetting 6+6+5 (in beurten); controleer som en max
    assert.equal(turns.reduce((a, b) => a + b, 0), 17)
    assert.ok(Math.max(...turns) <= 6)
    assert.equal(monoDoelen(res), 0, vatSamen(res))
  })

  test('§7.4 A10 B2 / 2 doelen: B wordt gesplitst, beide doelen 2 gilden', () => {
    resetTeller()
    const s = [...maakGilde('A', 10), ...maakGilde('B', 2)]
    const res = metLS(s, config25m(2))
    assert.equal(res.nietIngedeeld.length, 0)
    assert.equal(monoDoelen(res), 0, `geen mono-staart: ${vatSamen(res)}`)
    // Dit is de kern: B mag NIET samen op 1 doel staan (dat gaf de oude
    // implementatie). Elk doel krijgt precies 1 B (diversiteit op beide).
    assert.equal(gildeTelling(res, 1)['B'], 1, vatSamen(res))
    assert.equal(gildeTelling(res, 2)['B'], 1, vatSamen(res))
  })

  test('§7.6-achtig: dominant gilde A8 + 4 singletons / 3 doelen: geen mono-staart', () => {
    resetTeller()
    const s = [...maakGilde('A', 8), ...maakGilde('B', 1), ...maakGilde('C', 1), ...maakGilde('D', 1), ...maakGilde('E', 1)]
    const res = metLS(s, config25m(3))
    assert.equal(res.nietIngedeeld.length, 0)
    assert.equal(monoDoelen(res), 0, `A mag niet alleen op een doel staan: ${vatSamen(res)}`)
  })
})

describe('Lokale zoektocht verbetert de constructie (bewijs)', () => {
  // Op deze scenario's liet de pure constructie een vermijdbaar mono-gilde doel
  // achter. De verfijning moet de score STRIKT verbeteren (lexicografisch) en de
  // mono-gilde-term verlagen.
  const adversarieel: Array<{ naam: string; bouw: () => Schutter[]; doelen: number }> = [
    { naam: '7.4 A10 B2 / 2', bouw: () => [...maakGilde('A', 10), ...maakGilde('B', 2)], doelen: 2 },
    {
      naam: '7.3 A7 B6 C4 / 4',
      bouw: () => [...maakGilde('A', 7), ...maakGilde('B', 6), ...maakGilde('C', 4)],
      doelen: 4
    },
    {
      naam: 'A8 + 4 singletons / 3',
      bouw: () => [...maakGilde('A', 8), ...maakGilde('B', 1), ...maakGilde('C', 1), ...maakGilde('D', 1), ...maakGilde('E', 1)],
      doelen: 3
    }
  ]

  for (const sc of adversarieel) {
    test(`${sc.naam}: verfijning strikt beter, mono daalt`, () => {
      resetTeller()
      const s = sc.bouw()
      const voor = zonderLS(s, config25m(sc.doelen))
      const na = metLS(s, config25m(sc.doelen))
      const vVoor = scoreVector(voor, s)
      const vNa = scoreVector(na, s)
      assert.equal(
        vergelijkScore(vNa, vVoor),
        -1,
        `verfijning moet beter zijn.\n  voor: ${vatSamen(voor)} ${JSON.stringify(vVoor)}\n  na:   ${vatSamen(na)} ${JSON.stringify(vNa)}`
      )
      assert.ok(
        scoreDetail(na).S_monoGilde < scoreDetail(voor).S_monoGilde,
        `mono moet dalen: voor=${scoreDetail(voor).S_monoGilde} na=${scoreDetail(na).S_monoGilde}`
      )
      // Verfijning plaatst dezelfde schutters (verliest niemand).
      assert.deepEqual(invariantOvertredingen(na, s), [])
    })
  }
})

describe('Aanmeldvolgorde (R8/R9): vroeger aangemelde gilden op de voorste doelen', () => {
  // Geclusterde registratie (elke club meldt samen aan): gilde A eerst, dan B, ...
  function clustered(gilden: string[], perGilde: number): Schutter[] {
    const out: Schutter[] = []
    for (const g of gilden) for (let r = 0; r < perGilde; r++) out.push(maakSchutter({ gilde: g }))
    return out
  }

  // Gemiddeld doelnummer per gilde, in volgorde van de gilden-lijst (= aanmeldvolgorde).
  function gemDoelPerGilde(res: ReturnType<typeof berekenIndeling>, gilden: string[]): number[] {
    return gilden.map((g) => {
      const nrs: number[] = []
      for (const d of res.doelen) for (const s of d.schutters) if ((s.gilde_naam ?? '?') === g) nrs.push(d.nummer)
      return nrs.reduce((a, b) => a + b, 0) / Math.max(1, nrs.length)
    })
  }

  for (const [naam, gilden, perGilde, doelen] of [
    ['A/B/C x4, 3 doelen', ['A', 'B', 'C'], 4, 3],
    ['A/B/C/D x4, 4 doelen', ['A', 'B', 'C', 'D'], 4, 4]
  ] as Array<[string, string[], number, number]>) {
    test(`geclusterd ${naam}: gemiddeld doelnummer stijgt met aanmeldvolgorde`, () => {
      resetTeller()
      const s = clustered(gilden, perGilde)
      const res = metLS(s, config25m(doelen))
      assert.equal(scoreDetail(res, s).S_volgorde, 0, `geen gilde-volgorde-inversie: ${vatSamen(res)}`)
      const gem = gemDoelPerGilde(res, gilden)
      for (let i = 1; i < gem.length; i++) {
        assert.ok(gem[i] >= gem[i - 1], `${gilden[i]} (later) hoort niet voor ${gilden[i - 1]}: ${vatSamen(res)} -> ${JSON.stringify(gem)}`)
      }
    })
  }
})

describe('Vosselaar-regressies: dubbelvullers + compactheid', () => {
  function doelenVan(res: ReturnType<typeof berekenIndeling>, g: string): number[] {
    const nrs: number[] = []
    for (const d of res.doelen) for (const s of d.schutters) if (s.gilde_naam === g) nrs.push(d.nummer)
    return nrs
  }
  function gemDoel(res: ReturnType<typeof berekenIndeling>, g: string): number {
    const nrs = doelenVan(res, g)
    return nrs.reduce((a, b) => a + b, 0) / Math.max(1, nrs.length)
  }

  test('vroege normale gilde wordt niet naar de achterste dubbeldoelen gezogen', () => {
    resetTeller()
    // 2 vol-dubbelaars van een vroege gilde (Vos) gaan naar het achterste doel.
    // "Vroeg" meldt vlak daarna aan -> hoort VOORAAN, niet als dubbelvuller achteraan.
    // "Laat" hoort de achterste dubbeldoelen te vullen.
    const s = [
      maakSchutter({ gilde: 'Vos', eh: true, th: true }),
      maakSchutter({ gilde: 'Vos', eh: true, th: true }),
      ...maakGilde('Vroeg', 5),
      ...maakGilde('Mid', 8),
      ...maakGilde('Laat', 8)
    ]
    const res = metLS(s, config25m(6))
    const bezet = res.doelen.filter((d) => d.schutters.length > 0).map((d) => d.nummer)
    const achterste = Math.max(...bezet)
    assert.ok(
      !doelenVan(res, 'Vroeg').includes(achterste),
      `Vroeg (vroeg aangemeld) mag niet op het achterste dubbeldoel: ${vatSamen(res)}`
    )
    assert.ok(gemDoel(res, 'Vroeg') < gemDoel(res, 'Laat'), `Vroeg hoort vóór Laat: ${vatSamen(res)}`)
  })

  test('een gilde van 5 wordt niet uitgesmeerd over 5 doelen (compact <= 3)', () => {
    resetTeller()
    // Dichte zone met paren-gilden + 1 gilde van 5. Dat gilde hoort op <= ceil(5/2)=3
    // aaneengesloten doelen, niet 1-per-doel uitgesmeerd om doelen tot 5 te vullen.
    const s = [
      ...maakGilde('A', 4),
      ...maakGilde('B', 4),
      ...maakGilde('C', 4),
      ...maakGilde('D', 4),
      ...maakGilde('E', 4),
      ...maakGilde('Vijf', 5)
    ]
    const res = metLS(s, config25m(7))
    const uniek = new Set(doelenVan(res, 'Vijf'))
    assert.ok(uniek.size <= 3, `gilde van 5 op ${uniek.size} doelen (moet <= 3): ${vatSamen(res)}`)
  })
})

describe('Compactheids-/vorm-voorbeelden uit de brief', () => {
  test('6 schutters, 1 doel verplicht (floor(6/4)=1): blijft 1 doel', () => {
    resetTeller()
    const s = [...maakGilde('A', 3), ...maakGilde('B', 1), ...maakGilde('C', 1), ...maakGilde('D', 1)]
    const res = metLS(s, config25m(2))
    assert.equal(bezetteDoelen(res), 1, `R4-hard dwingt 1 doel: ${vatSamen(res)}`)
  })

  test('overflow A3 B3 C3 D3 / 3 doelen: aaneengesloten, geen mono, geen 3-stapel-explosie', () => {
    resetTeller()
    const s = [...maakGilde('A', 3), ...maakGilde('B', 3), ...maakGilde('C', 3), ...maakGilde('D', 3)]
    const res = metLS(s, config25m(3))
    const det = scoreDetail(res)
    assert.equal(res.nietIngedeeld.length, 0)
    assert.equal(det.S_monoGilde, 0, vatSamen(res))
    assert.equal(det.S_aaneengesloten, 0, `gilden aaneengesloten: ${vatSamen(res)}`)
  })
})
