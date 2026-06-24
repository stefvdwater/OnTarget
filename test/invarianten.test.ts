// Invarianten + fuzz: bewijs dat (a) de indeling de harde constraints altijd
// respecteert, en (b) de lokale zoektocht de score NOOIT verslechtert en niemand
// van plaats laat verdwijnen. Plus gerichte tests voor dubbels (R7), vergrendelde
// doelen (R3), compound-zone (R19) en meerdere zones.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { berekenIndeling } from '../src/renderer/src/algoritme/indeling.ts'
import type { Schutter, WedstrijdConfig } from '../src/renderer/src/algoritme/types.ts'
import {
  maakSchutter,
  maakGilde,
  config25m,
  maakRng,
  scoreVector,
  scoreDetail,
  vergelijkScore,
  vatSamen,
  geplaatsteIds,
  invariantOvertredingen,
  resetTeller
} from './harnas.ts'

const metLS = (s: Schutter[], c: WedstrijdConfig, v: number[] = []): ReturnType<typeof berekenIndeling> =>
  berekenIndeling(s, c, v)
const zonderLS = (s: Schutter[], c: WedstrijdConfig, v: number[] = []): ReturnType<typeof berekenIndeling> =>
  berekenIndeling(s, c, v, { lokaleZoektocht: false })

const GILDEN = ['A', 'B', 'C', 'D', 'E', 'F']

// Willekeurig 25m-scenario, eventueel met enkele dubbelschutters.
function willekeurig25m(rng: () => number, metDubbels: boolean): { schutters: Schutter[]; doelen: number } {
  const nGilden = 1 + Math.floor(rng() * 5)
  const n = 3 + Math.floor(rng() * 28)
  const schutters: Schutter[] = []
  for (let i = 0; i < n; i++) {
    const g = GILDEN[Math.floor(rng() * nGilden)]
    let eh = false
    let th = false
    if (metDubbels) {
      const r = rng()
      if (r < 0.06) {
        eh = true
        th = true
      } else if (r < 0.1) {
        eh = true
      } else if (r < 0.14) {
        th = true
      }
    }
    schutters.push(maakSchutter({ gilde: g, afstand: 25, eh, th }))
  }
  const doelen = 2 + Math.floor(rng() * 7)
  return { schutters, doelen }
}

describe('Fuzz: harde invarianten + lokale zoektocht verslechtert nooit', () => {
  for (const metDubbels of [false, true]) {
    test(`200 willekeurige 25m-scenario's (${metDubbels ? 'met' : 'zonder'} dubbels)`, () => {
      const rng = maakRng(metDubbels ? 0xc0ffee : 0x1234)
      for (let iter = 0; iter < 200; iter++) {
        resetTeller()
        const { schutters, doelen } = willekeurig25m(rng, metDubbels)
        const config = config25m(doelen)
        const voor = zonderLS(schutters, config)
        const na = metLS(schutters, config)

        // Harde invarianten in beide modi.
        assert.deepEqual(invariantOvertredingen(voor, schutters), [], `constructie iter ${iter}: ${vatSamen(voor)}`)
        assert.deepEqual(invariantOvertredingen(na, schutters), [], `verfijnd iter ${iter}: ${vatSamen(na)}`)

        // Verfijning verslechtert de score nooit (lexicografisch <= constructie).
        const vVoor = scoreVector(voor, schutters)
        const vNa = scoreVector(na, schutters)
        assert.notEqual(
          vergelijkScore(vNa, vVoor),
          1,
          `verfijning verslechterde iter ${iter}:\n  voor: ${vatSamen(voor)} ${JSON.stringify(vVoor)}\n  na:   ${vatSamen(na)} ${JSON.stringify(vNa)}`
        )

        // Verfijning plaatst exact dezelfde schutters (verliest/wint niemand).
        const idsVoor = geplaatsteIds(voor).sort((a, b) => a - b)
        const idsNa = geplaatsteIds(na).sort((a, b) => a - b)
        assert.deepEqual(idsNa, idsVoor, `verfijning veranderde de geplaatste set iter ${iter}`)
        assert.deepEqual(
          na.nietIngedeeld.map((s) => s.schutter_id).sort((a, b) => a - b),
          voor.nietIngedeeld.map((s) => s.schutter_id).sort((a, b) => a - b)
        )
      }
    })
  }
})

describe('Stabiliteit: geen onnodige wijziging op reeds-goede indelingen', () => {
  const goed: Array<{ naam: string; bouw: () => Schutter[]; doelen: number }> = [
    { naam: '§7.1 A6 B6 / 2', bouw: () => [...maakGilde('A', 6), ...maakGilde('B', 6)], doelen: 2 },
    { naam: '§7.2 A8 / 4', bouw: () => maakGilde('A', 8), doelen: 4 },
    { naam: 'B6 C6 / 3', bouw: () => [...maakGilde('B', 6), ...maakGilde('C', 6)], doelen: 3 }
  ]
  for (const sc of goed) {
    test(`${sc.naam}: verfijning verslechtert niet en churnt de samenstelling niet`, () => {
      resetTeller()
      const s = sc.bouw()
      const voor = zonderLS(s, config25m(sc.doelen))
      const na = metLS(s, config25m(sc.doelen))
      // Nooit slechter (de volgorde-pas mag de aanmeldvolgorde wel verbeteren).
      assert.notEqual(
        vergelijkScore(scoreVector(na, s), scoreVector(voor, s)),
        1,
        `verslechtering:\n  voor: ${vatSamen(voor)}\n  na:   ${vatSamen(na)}`
      )
      // De samenstelling (diversiteit/bezetting/compactheid) blijft ongewijzigd:
      // op reeds-goede indelingen raakt de verfijning enkel de aanmeldvolgorde.
      const dv = scoreDetail(voor, s)
      const dn = scoreDetail(na, s)
      for (const k of ['S_monoGilde', 'S_overvol', 'S_aaneengesloten', 'S_stapeling', 'S_uitgesmeerd'] as const) {
        assert.equal(dn[k], dv[k], `${k} mocht niet wijzigen:\n  voor: ${vatSamen(voor)}\n  na: ${vatSamen(na)}`)
      }
    })
  }
})

describe('Dubbelschutters (R7): op de laatste actieve doelen', () => {
  test('2 vol-dubbel A, 2 vol-dubbel B + 6 normaal C: dubbels achteraan, geen normaal-only doel erachter', () => {
    resetTeller()
    const s = [
      maakSchutter({ gilde: 'A', eh: true, th: true }),
      maakSchutter({ gilde: 'A', eh: true, th: true }),
      maakSchutter({ gilde: 'B', eh: true, th: true }),
      maakSchutter({ gilde: 'B', eh: true, th: true }),
      ...maakGilde('C', 6)
    ]
    const res = metLS(s, config25m(5))
    assert.equal(res.nietIngedeeld.length, 0)
    assert.equal(scoreDetail(res).S_dubbelsAchter, 0, `dubbels horen achteraan: ${vatSamen(res)}`)
    assert.deepEqual(invariantOvertredingen(res, s), [])
  })
})

describe('Vergrendeld doel (R3): blijft ongemoeid', () => {
  test('vergrendeld doel 2 wordt overgeslagen in de verdeling', () => {
    resetTeller()
    const s = maakGilde('A', 6, {}).concat(maakGilde('B', 6))
    // Doel 2 vergrendeld: krijgt geen auto-schutters (de caller herstelt de inhoud).
    const res = metLS(s, config25m(4), [2])
    const doel2 = res.doelen.find((d) => d.nummer === 2)!
    assert.equal(doel2.schutters.length, 0, 'vergrendeld doel blijft leeg in de berekening')
    assert.deepEqual(invariantOvertredingen(res, s), [])
  })
})

describe('Compound-zone (R19) + meerdere zones', () => {
  test('compound + 25m + 18m: correcte zones, ongebruikte compound-doelen worden 25m', () => {
    resetTeller()
    const s = [
      ...maakGilde('A', 4, { afstand: 25 }),
      ...maakGilde('B', 4, { afstand: 25 }),
      ...maakGilde('A', 4, { afstand: 25, type_boog: 'Compound' }),
      ...maakGilde('C', 3, { afstand: 18 })
    ]
    // 6 doelen: 1..4 = 25m, compound-zone start 3 (2 doelen), 5..6 = 18m
    const config: WedstrijdConfig = {
      aantalDoelen: 6,
      aantalDoelen18m: 2,
      aantalDoelen12m: 0,
      compoundStartdoel: 3,
      aantalCompoundDoelen: 2
    }
    const res = metLS(s, config)
    assert.deepEqual(invariantOvertredingen(res, s), [], vatSamen(res))
    // compound-schutters (>=3) krijgen een eigen compound-doel
    const compoundDoelen = res.doelen.filter((d) => d.zone === 'compound' && d.schutters.length > 0)
    assert.ok(compoundDoelen.length >= 1, `compound-doel bezet: ${vatSamen(res)}`)
    for (const d of compoundDoelen) {
      for (const sch of d.schutters) assert.equal(sch.type_boog, 'Compound')
    }
  })

  test('< 3 compound (R16): compounds gaan mee naar 25m', () => {
    resetTeller()
    const s = [
      ...maakGilde('A', 5, { afstand: 25 }),
      ...maakGilde('B', 5, { afstand: 25 }),
      ...maakGilde('C', 2, { afstand: 25, type_boog: 'Compound' })
    ]
    const config: WedstrijdConfig = {
      aantalDoelen: 4,
      aantalDoelen18m: 0,
      aantalDoelen12m: 0,
      compoundStartdoel: 3,
      aantalCompoundDoelen: 1
    }
    const res = metLS(s, config)
    assert.deepEqual(invariantOvertredingen(res, s), [], vatSamen(res))
    // geen enkel doel houdt zone 'compound' met schutters (want < 3)
    const compoundBezet = res.doelen.filter((d) => d.zone === 'compound' && d.schutters.length > 0)
    assert.equal(compoundBezet.length, 0, `compounds horen op 25m: ${vatSamen(res)}`)
  })
})
