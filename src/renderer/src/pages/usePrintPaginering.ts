import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { DoelMetConflicten } from '../algoritme/types'
import {
  berekenBruikbareHoogtePx,
  berekenZichtbareTotalen,
  bouwDoelGroepen,
  bouwGildeGroepen,
  pakInPaginas,
  verzamelConflicten,
  type GemetenEenheid,
  type PrintOpties,
  type PrintPakEenheid
} from '../components/afdruk-helpers'

/**
 * Meet een verborgen, ongepagineerde kopie van het indelingsdocument (zie
 * IndelingAfdrukTab: dezelfde `doelen`/`opties` renderen via <PrintDocument>
 * in een element waarop `meetRef` gezet wordt) en pakt de inhoud in
 * pagina's die overeenkomen met wat er ook echt wordt afgedrukt. De echte
 * afdruk blijft de ongesplitste, verborgen kopie gebruiken; dit is enkel
 * voor de schermweergave.
 */
export function usePrintPaginering(
  doelen: DoelMetConflicten[],
  opties: PrintOpties,
  hoogteMm: number
): { meetRef: RefObject<HTMLDivElement>; paginas: PrintPakEenheid[][] } {
  const meetRef = useRef<HTMLDivElement>(null)
  const [paginas, setPaginas] = useState<PrintPakEenheid[][]>([])

  useLayoutEffect(() => {
    const container = meetRef.current
    if (!container) return

    const headerHoogtePx = container.querySelector('.print-header')?.getBoundingClientRect().height ?? 0
    const theadHoogtePx =
      container.querySelector('.print-tabel thead')?.getBoundingClientRect().height ?? 0

    const eenheden: GemetenEenheid[] = []

    if (opties.groepering === 'doel') {
      const groepen = bouwDoelGroepen(doelen, opties)
      const groepEls = container.querySelectorAll('.print-doel-groep')
      groepen.forEach((groep, i) => {
        eenheden.push({
          eenheid: { soort: 'doel-groep', groep },
          hoogtePx: groepEls[i]?.getBoundingClientRect().height ?? 0
        })
      })
    } else {
      const groepen = bouwGildeGroepen(doelen, opties)
      const rijEls = container.querySelectorAll('.print-tabel tbody > tr')
      let idx = 0
      for (const groep of groepen) {
        eenheden.push({
          eenheid: { soort: 'gilde-kop', gilde: groep.gilde, aantal: groep.rijen.length },
          hoogtePx: rijEls[idx]?.getBoundingClientRect().height ?? 0
        })
        idx++
        for (const rij of groep.rijen) {
          eenheden.push({
            eenheid: { soort: 'gilde-rij', rij },
            hoogtePx: rijEls[idx]?.getBoundingClientRect().height ?? 0
          })
          idx++
        }
      }
    }

    if (opties.totalenTonen) {
      const totalen = berekenZichtbareTotalen(doelen, opties)
      if (totalen.totaalSchutters > 0) {
        eenheden.push({
          eenheid: { soort: 'totalen', totalen },
          hoogtePx: container.querySelector('.print-totalen')?.getBoundingClientRect().height ?? 0
        })
      }
    }

    if (opties.waarschuwingenTonen) {
      const conflicten = verzamelConflicten(doelen, opties)
      if (conflicten.length > 0) {
        eenheden.push({
          eenheid: { soort: 'waarschuwingen', conflicten },
          hoogtePx:
            container.querySelector('.print-waarschuwingen')?.getBoundingClientRect().height ?? 0
        })
      }
    }

    setPaginas(
      pakInPaginas(eenheden, {
        bruikbareHoogtePx: berekenBruikbareHoogtePx(hoogteMm),
        theadHoogtePx,
        headerHoogtePx
      })
    )
  }, [doelen, opties, hoogteMm])

  return { meetRef, paginas }
}
