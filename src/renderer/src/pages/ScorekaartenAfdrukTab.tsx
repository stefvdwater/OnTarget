import { useEffect, useMemo, useState } from 'react'
import type { Wedstrijd } from '../types'
import { useAfdrukDoelen } from './useAfdrukDoelen'
import ScorekaartenDocument from '../components/ScorekaartenDocument'
import {
  bouwScorekaartPaginas,
  parseDoelInterval,
  type PrintFilters
} from '../components/afdruk-helpers'
import { IconPrinter } from '../components/icons/IconPrinter'

interface Props {
  wedstrijd: Wedstrijd
}

const A4_KORT = 210

export default function ScorekaartenAfdrukTab({ wedstrijd }: Props): JSX.Element {
  const doelen = useAfdrukDoelen(wedstrijd)

  const [alleDoelen, setAlleDoelen] = useState(true)
  const [doelInterval, setDoelInterval] = useState('')
  const [doelIntervalFout, setDoelIntervalFout] = useState<string | null>(null)
  const [doelIntervalGeldig, setDoelIntervalGeldig] = useState<number[]>([])

  const [afstand25, setAfstand25] = useState(true)
  const [afstand18, setAfstand18] = useState(true)
  const [afstand12, setAfstand12] = useState(true)

  // ── Parsing doel-interval (live) ───────────────────────
  useEffect(() => {
    if (alleDoelen) {
      setDoelIntervalFout(null)
      return
    }
    const r = parseDoelInterval(doelInterval, wedstrijd.aantal_doelen)
    if ('fout' in r) {
      setDoelIntervalFout(r.fout)
    } else {
      setDoelIntervalFout(null)
      setDoelIntervalGeldig(r.nummers)
    }
  }, [doelInterval, alleDoelen, wedstrijd.aantal_doelen])

  const filters: PrintFilters = useMemo(() => {
    const afstanden = new Set<12 | 18 | 25>()
    if (afstand12) afstanden.add(12)
    if (afstand18) afstanden.add(18)
    if (afstand25) afstanden.add(25)

    return {
      doelen: alleDoelen ? 'alle' : doelIntervalGeldig,
      gildes: 'alle',
      afstanden
    }
  }, [alleDoelen, doelIntervalGeldig, afstand12, afstand18, afstand25])

  const paginas = useMemo(() => bouwScorekaartPaginas(doelen, filters), [doelen, filters])

  // ── Dynamische @page styling: scorekaarten zijn altijd A4 portret ──
  useEffect(() => {
    const id = 'ontarget-dynamic-page'
    let stijl = document.getElementById(id) as HTMLStyleElement | null
    if (!stijl) {
      stijl = document.createElement('style')
      stijl.id = id
      document.head.appendChild(stijl)
    }
    stijl.textContent = `
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
    `
  }, [])

  function afdrukken(): void {
    window.print()
  }

  return (
    <div className="afdrukken-layout">
      {/* Linker paneel: opties */}
      <aside className="card afdrukken-opties">
        <h3 className="afdruk-h3">Afdrukopties</h3>

        <Sectie label="Doelen">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={alleDoelen}
              onChange={(e) => setAlleDoelen(e.target.checked)}
            />
            Alle doelen
          </label>
          {!alleDoelen && (
            <>
              <input
                className="input"
                placeholder="bv. 1-10, 15"
                value={doelInterval}
                onChange={(e) => setDoelInterval(e.target.value)}
                style={{ marginTop: 6, width: '100%' }}
              />
              {doelIntervalFout && <div className="afdruk-fout">{doelIntervalFout}</div>}
            </>
          )}
        </Sectie>

        <Sectie label="Afstand">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={afstand25}
              onChange={(e) => setAfstand25(e.target.checked)}
            />
            25m
          </label>
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={afstand18}
              onChange={(e) => setAfstand18(e.target.checked)}
            />
            18m
          </label>
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={afstand12}
              onChange={(e) => setAfstand12(e.target.checked)}
            />
            12m
          </label>
        </Sectie>

        <button className="btn btn-accent-yellow afdruk-knop" onClick={afdrukken}>
          <IconPrinter /> Afdrukken
        </button>
      </aside>

      {/* Rechter paneel: preview */}
      <section className="afdrukken-preview-wrap">
        <div className="afdrukken-preview-meta">
          Voorbeeld: {paginas.length} {paginas.length === 1 ? 'pagina' : "pagina's"} (A4 portret)
        </div>
        <div className="afdrukken-preview-pagina">
          <div
            className="print-root scorekaarten-print-root"
            style={{ width: `${A4_KORT}mm` }}
          >
            <ScorekaartenDocument wedstrijd={wedstrijd} paginas={paginas} />
            {paginas.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
                Geen scorekaarten om te tonen voor de huidige filters.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Sectie({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="afdruk-sectie">
      <div className="afdruk-sectie-label">{label}</div>
      <div className="afdruk-sectie-body">{children}</div>
    </div>
  )
}
