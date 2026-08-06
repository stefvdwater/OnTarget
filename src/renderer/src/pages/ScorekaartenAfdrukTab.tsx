import { useEffect, useMemo, useState } from 'react'
import type { Wedstrijd } from '../types'
import { useAfdrukDoelen } from './useAfdrukDoelen'
import ScorekaartenDocument from '../components/ScorekaartenDocument'
import {
  bouwScorekaartPaginas,
  parseDoelInterval,
  PRINT_PAGINA_MARGE_MM,
  type PrintFilters,
  type ScorekaartenAfdrukFilters
} from '../components/afdruk-helpers'
import type { PatchFn } from '../hooks/usePatchState'
import { IconPrinter } from '../components/icons/IconPrinter'

interface Props {
  wedstrijd: Wedstrijd
  filters: ScorekaartenAfdrukFilters
  onFiltersChange: PatchFn<ScorekaartenAfdrukFilters>
}

const A4_KORT = 210

export default function ScorekaartenAfdrukTab({
  wedstrijd,
  filters,
  onFiltersChange
}: Props): JSX.Element {
  const doelen = useAfdrukDoelen(wedstrijd)

  const { alleDoelen, doelInterval, afstand25, afstand18, afstand12, legeDoelenOpnemen } = filters

  // Ephemeer; initieel al berekend uit doelInterval i.p.v. op [] te starten
  // (zie IndelingAfdrukTab voor waarom: anders toont de preview kortstondig
  // 0 doelen na een tab-/modus-wissel).
  const [doelIntervalFout, setDoelIntervalFout] = useState<string | null>(null)
  const [doelIntervalGeldig, setDoelIntervalGeldig] = useState<number[]>(() => {
    const r = parseDoelInterval(doelInterval, wedstrijd.aantal_doelen)
    return 'nummers' in r ? r.nummers : []
  })

  // Zet een enkel veld: collapse van de near-identieke inline onChange's
  // hieronder tot een aanroep per veld.
  function patchVeld<K extends keyof ScorekaartenAfdrukFilters>(
    veld: K,
    waarde: ScorekaartenAfdrukFilters[K]
  ): void {
    onFiltersChange({ [veld]: waarde } as Partial<ScorekaartenAfdrukFilters>)
  }

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

  const printFilters: PrintFilters = useMemo(() => {
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

  const paginas = useMemo(
    () => bouwScorekaartPaginas(doelen, printFilters, legeDoelenOpnemen),
    [doelen, printFilters, legeDoelenOpnemen]
  )

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
        margin: ${PRINT_PAGINA_MARGE_MM}mm;
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
              onChange={(e) => patchVeld('alleDoelen', e.target.checked)}
            />
            Alle doelen
          </label>
          {!alleDoelen && (
            <>
              <input
                className="input"
                placeholder="bv. 1-10, 15"
                value={doelInterval}
                onChange={(e) => patchVeld('doelInterval', e.target.value)}
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
              onChange={(e) => patchVeld('afstand25', e.target.checked)}
            />
            25m
          </label>
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={afstand18}
              onChange={(e) => patchVeld('afstand18', e.target.checked)}
            />
            18m
          </label>
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={afstand12}
              onChange={(e) => patchVeld('afstand12', e.target.checked)}
            />
            12m
          </label>
        </Sectie>

        <Sectie label="Extra">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={legeDoelenOpnemen}
              onChange={(e) => patchVeld('legeDoelenOpnemen', e.target.checked)}
            />
            Lege doelen ook opnemen
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
          <div className="afdrukken-preview-paginas">
            {paginas.length === 0 ? (
              <div
                className="print-pagina-vel scorekaarten-print-root"
                style={{ width: `${A4_KORT}mm` }}
              >
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
                  Geen scorekaarten om te tonen voor de huidige filters.
                </div>
              </div>
            ) : (
              paginas.map((pagina) => (
                <div
                  key={pagina.doelNummer}
                  className="print-pagina-vel scorekaarten-print-root"
                  style={{ width: `${A4_KORT}mm` }}
                >
                  <ScorekaartenDocument wedstrijd={wedstrijd} paginas={[pagina]} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Verborgen, ongepagineerde kopie: enige bron voor het echte afdrukken
          (window.print gebruikt .print-root, .print-root *). Scorekaarten
          zijn al vooraf één-pagina-per-doel opgebouwd, dus hier is geen
          meting nodig zoals bij IndelingAfdrukTab. De leeg-melding hoort hier
          ook thuis: zonder deze zou een afdruk bij 0 scorekaarten gewoon een
          blanco pagina geven in plaats van uit te leggen waarom. */}
      <div className="print-root-meetkopie">
        <div className="print-root scorekaarten-print-root" style={{ width: `${A4_KORT}mm` }}>
          {paginas.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
              Geen scorekaarten om te tonen voor de huidige filters.
            </div>
          ) : (
            <ScorekaartenDocument wedstrijd={wedstrijd} paginas={paginas} />
          )}
        </div>
      </div>
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
