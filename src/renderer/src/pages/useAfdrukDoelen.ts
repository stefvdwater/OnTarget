import { useEffect, useState } from 'react'
import type { Wedstrijd } from '../types'
import type { Doel, DoelMetConflicten } from '../algoritme/types'
import { voegConflictenToe } from '../algoritme/conflicten'
import { pasRuntimeCompoundZoneToe } from '../algoritme/zones'

/**
 * Laadt de huidige indeling van een wedstrijd als DoelMetConflicten[],
 * gedeeld tussen IndelingAfdrukTab en SchutterskaartenAfdrukTab zodat beide
 * exact dezelfde doelen-/conflictenopbouw gebruiken.
 */
export function useAfdrukDoelen(wedstrijd: Wedstrijd): DoelMetConflicten[] {
  const [doelen, setDoelen] = useState<DoelMetConflicten[]>([])

  useEffect(() => {
    let actief = true

    async function laadIndeling(): Promise<void> {
      const rijen = await window.api.indeling.getByWedstrijd(wedstrijd.id)
      const vergrendeldeDoelen = await window.api.indeling.getVergrendeldeDoelen(wedstrijd.id)
      const vergrendeldeSet = new Set<number>(vergrendeldeDoelen)
      const lege = maakLegeDoelen(wedstrijd)

      rijen.forEach((r: any) => {
        const doel = lege.find((d) => d.nummer === r.doel_nummer)
        if (doel) {
          doel.schutters.push({
            schutter_id: r.schutter_id,
            voornaam: r.voornaam,
            naam: r.naam,
            gilde_naam: r.gilde_naam,
            type_boog: r.type_boog,
            afstand: r.afstand,
            leeftijdscategorie: r.leeftijdscategorie,
            geslacht: r.geslacht,
            dubbel_eerste_helft: !!r.dubbel_eerste_helft,
            dubbel_tweede_helft: !!r.dubbel_tweede_helft,
            positie: r.positie
          })
        }
      })
      lege.forEach((d) => {
        d.schutters.sort((a, b) => a.positie - b.positie)
        d.vergrendeld = vergrendeldeSet.has(d.nummer)
      })
      pasRuntimeCompoundZoneToe(lege as Doel[])
      if (actief) setDoelen(voegConflictenToe(lege as Doel[]))
    }

    laadIndeling()
    return () => {
      actief = false
    }
  }, [wedstrijd.id])

  return doelen
}

function maakLegeDoelen(wedstrijd: Wedstrijd): DoelMetConflicten[] {
  const totaal = wedstrijd.aantal_doelen
  const doelen18 = wedstrijd.aantal_doelen_18m
  const doelen12 = wedstrijd.aantal_doelen_12m
  const doelen25 = totaal - doelen18 - doelen12
  const compoundStart = wedstrijd.compound_startdoel
  const compoundEinde = compoundStart + (wedstrijd.aantal_compound_doelen ?? 1) - 1

  const doelen: DoelMetConflicten[] = []
  for (let i = 1; i <= totaal; i++) {
    let zone: Doel['zone']
    if (i > doelen25 + doelen18) zone = '12m'
    else if (i > doelen25) zone = '18m'
    else if (i >= compoundStart && i <= compoundEinde) zone = 'compound'
    else zone = '25m'
    doelen.push({ nummer: i, zone, schutters: [], vergrendeld: false, conflicten: [] })
  }
  return doelen
}
