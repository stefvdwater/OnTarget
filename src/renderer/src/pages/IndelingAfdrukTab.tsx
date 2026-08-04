import { useEffect, useMemo, useState } from 'react'
import type { Wedstrijd } from '../types'
import { useAfdrukDoelen } from './useAfdrukDoelen'
import { usePrintPaginering } from './usePrintPaginering'
import PrintDocument, {
  DoelGroepTbody,
  GildeDataRij,
  GildeKopRij,
  PrintHeader,
  PrintTotalen,
  PrintWaarschuwingen,
  TabelKop
} from '../components/PrintDocument'
import {
  bouwExcelModel,
  parseDoelInterval,
  PRINT_PAGINA_MARGE_MM,
  type Groepering,
  type Orientatie,
  type PrintFilters,
  type PrintOpties,
  type PrintPakEenheid
} from '../components/afdruk-helpers'
import { IconPrinter } from '../components/icons/IconPrinter'
import { IconExcel } from '../components/icons/IconExcel'

interface Props {
  wedstrijd: Wedstrijd
}

// Pagina-afmetingen in mm voor de preview-verhouding. We tonen altijd A4
// (210×297mm); de gebruiker kan in de native printdialoog desgewenst een
// ander formaat kiezen.
const A4_KORT = 210
const A4_LANG = 297

export default function IndelingAfdrukTab({ wedstrijd }: Props): JSX.Element {
  const doelen = useAfdrukDoelen(wedstrijd)

  // Opties
  const [orientatie, setOrientatie] = useState<Orientatie>('portret')
  const [groepering, setGroepering] = useState<Groepering>('doel')

  const [alleDoelen, setAlleDoelen] = useState(true)
  const [doelInterval, setDoelInterval] = useState('')
  const [doelIntervalFout, setDoelIntervalFout] = useState<string | null>(null)
  const [doelIntervalGeldig, setDoelIntervalGeldig] = useState<number[]>([])

  const [alleGildes, setAlleGildes] = useState(true)
  const [geselGildes, setGeselGildes] = useState<Set<string>>(new Set())

  const [afstand25, setAfstand25] = useState(true)
  const [afstand18, setAfstand18] = useState(true)
  const [afstand12, setAfstand12] = useState(true)

  const [totalenTonen, setTotalenTonen] = useState(true)
  const [waarschuwingenTonen, setWaarschuwingenTonen] = useState(false)

  const [excelBezig, setExcelBezig] = useState(false)
  const [excelFout, setExcelFout] = useState<string | null>(null)

  // ── Gilde-lijst afgeleid uit ingedeelde schutters ──────
  const gildeNamen = useMemo(() => {
    const set = new Set<string>()
    for (const d of doelen) {
      for (const s of d.schutters) {
        set.add(s.gilde_naam ?? '(Geen gilde)')
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'))
  }, [doelen])

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

  // ── Build PrintOpties ─────────────────────────────────
  const filters: PrintFilters = useMemo(() => {
    const afstanden = new Set<12 | 18 | 25>()
    if (afstand12) afstanden.add(12)
    if (afstand18) afstanden.add(18)
    if (afstand25) afstanden.add(25)

    return {
      // Bij parsefout houden we de laatste geldige selectie aan zodat de
      // preview niet uitvalt terwijl de gebruiker typt.
      doelen: alleDoelen ? 'alle' : doelIntervalGeldig,
      gildes: alleGildes ? 'alle' : Array.from(geselGildes),
      afstanden
    }
  }, [
    alleDoelen,
    doelIntervalGeldig,
    alleGildes,
    geselGildes,
    afstand12,
    afstand18,
    afstand25
  ])

  // Gememoized: usePrintPaginering hieronder herrekent de paginering bij elke
  // wijziging van deze referentie. Een nieuw object-literal bij elke render
  // (bv. door excelBezig-wissels) zou die herrekening blijven triggeren en
  // via setPaginas in een oneindige render-lus terechtkomen.
  const opties: PrintOpties = useMemo(
    () => ({
      papier: 'A4',
      orientatie,
      groepering,
      // Sortering wordt impliciet bepaald: doel → positie, gilde → naam.
      sortering: groepering === 'doel' ? 'positie' : 'naam',
      filters,
      totalenTonen,
      waarschuwingenTonen
    }),
    [orientatie, groepering, filters, totalenTonen, waarschuwingenTonen]
  )

  // Pagina-afmetingen voor de preview (A4 in portret/landschap)
  const { breedteMm, hoogteMm } = useMemo(() => {
    return orientatie === 'portret'
      ? { breedteMm: A4_KORT, hoogteMm: A4_LANG }
      : { breedteMm: A4_LANG, hoogteMm: A4_KORT }
  }, [orientatie])

  // Gepagineerde schermweergave: meet de verborgen kopie hieronder en pakt
  // de inhoud in pagina's die overeenkomen met wat er echt wordt afgedrukt.
  const { meetRef, paginas } = usePrintPaginering(doelen, opties, hoogteMm)
  const weerTeGevenPaginas = paginas.length > 0 ? paginas : [[]]

  // ── Dynamische @page styling ──────────────────────────
  // Default A4 + de gekozen oriëntatie. De gebruiker kan in de native
  // print-dialoog (bv. Microsoft Print to PDF) altijd een ander formaat
  // kiezen — dit blok zet enkel de standaardwaarde.
  useEffect(() => {
    const id = 'ontarget-dynamic-page'
    let stijl = document.getElementById(id) as HTMLStyleElement | null
    if (!stijl) {
      stijl = document.createElement('style')
      stijl.id = id
      document.head.appendChild(stijl)
    }
    const orient = orientatie === 'landschap' ? 'landscape' : 'portrait'
    stijl.textContent = `
      @page {
        size: A4 ${orient};
        margin: ${PRINT_PAGINA_MARGE_MM}mm;
      }
    `
  }, [orientatie])

  function toggleGilde(g: string): void {
    setGeselGildes((prev) => {
      const n = new Set(prev)
      if (n.has(g)) n.delete(g)
      else n.add(g)
      return n
    })
  }

  function alleGildesAanvinken(): void {
    setGeselGildes(new Set(gildeNamen))
    setAlleGildes(false)
  }

  function geenGildesAanvinken(): void {
    setGeselGildes(new Set())
    setAlleGildes(false)
  }

  function afdrukken(): void {
    window.print()
  }

  async function openenInExcel(): Promise<void> {
    setExcelBezig(true)
    setExcelFout(null)
    try {
      const model = bouwExcelModel(wedstrijd, doelen, opties)
      const res = await window.api.indeling.openInExcel(model)
      if (!res.ok) {
        setExcelFout(res.fout ?? 'Kon het Excel-bestand niet openen.')
      }
    } catch (e) {
      setExcelFout((e as Error).message)
    } finally {
      setExcelBezig(false)
    }
  }

  return (
    <div className="afdrukken-layout">
      {/* Linker paneel: opties */}
      <aside className="card afdrukken-opties">
        <h3 className="afdruk-h3">Afdrukopties</h3>

        <Sectie label="Oriëntatie">
          <RadioGroep
            naam="orientatie"
            waarde={orientatie}
            opties={[
              { v: 'portret', label: 'Portret' },
              { v: 'landschap', label: 'Landschap' }
            ]}
            onChange={(v) => setOrientatie(v as Orientatie)}
          />
        </Sectie>

        <Sectie label="Groepering">
          <RadioGroep
            naam="groepering"
            waarde={groepering}
            opties={[
              { v: 'doel', label: 'Per doel' },
              { v: 'gilde', label: 'Per gilde' }
            ]}
            onChange={(v) => setGroepering(v as Groepering)}
          />
        </Sectie>

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
              {doelIntervalFout && (
                <div className="afdruk-fout">{doelIntervalFout}</div>
              )}
            </>
          )}
        </Sectie>

        <Sectie label="Gilden">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={alleGildes}
              onChange={(e) => setAlleGildes(e.target.checked)}
            />
            Alle gilden
          </label>
          {!alleGildes && (
            <div className="afdruk-gildelijst">
              <div className="afdruk-gildeacties">
                <button className="btn btn-ghost btn-sm" onClick={alleGildesAanvinken}>
                  Alles aan
                </button>
                <button className="btn btn-ghost btn-sm" onClick={geenGildesAanvinken}>
                  Alles uit
                </button>
              </div>
              {gildeNamen.map((g) => (
                <label key={g} className="afdruk-check">
                  <input
                    type="checkbox"
                    checked={geselGildes.has(g)}
                    onChange={() => toggleGilde(g)}
                  />
                  {g}
                </label>
              ))}
              {gildeNamen.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  Geen gilden in de huidige indeling.
                </div>
              )}
            </div>
          )}
        </Sectie>

        <Sectie label="Afstand">
          <label className="afdruk-check">
            <input type="checkbox" checked={afstand25} onChange={(e) => setAfstand25(e.target.checked)} />
            25m
          </label>
          <label className="afdruk-check">
            <input type="checkbox" checked={afstand18} onChange={(e) => setAfstand18(e.target.checked)} />
            18m
          </label>
          <label className="afdruk-check">
            <input type="checkbox" checked={afstand12} onChange={(e) => setAfstand12(e.target.checked)} />
            12m
          </label>
        </Sectie>

        <Sectie label="Extra">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={totalenTonen}
              onChange={(e) => setTotalenTonen(e.target.checked)}
            />
            Totalen tonen
          </label>
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={waarschuwingenTonen}
              onChange={(e) => setWaarschuwingenTonen(e.target.checked)}
            />
            Conflict-waarschuwingen tonen
          </label>
        </Sectie>

        <button className="btn btn-accent-yellow afdruk-knop" onClick={afdrukken}>
          <IconPrinter /> Afdrukken
        </button>

        <button
          className="btn afdruk-knop afdruk-knop-excel"
          onClick={openenInExcel}
          disabled={excelBezig}
        >
          <IconExcel /> {excelBezig ? 'Bezig met openen…' : 'Openen in MS Excel'}
        </button>
        {excelFout && <div className="afdruk-fout">{excelFout}</div>}
      </aside>

      {/* Rechter paneel: preview */}
      <section className="afdrukken-preview-wrap">
        <div className="afdrukken-preview-meta">
          Voorbeeld: {weerTeGevenPaginas.length}{' '}
          {weerTeGevenPaginas.length === 1 ? 'pagina' : "pagina's"} · A4{' '}
          {orientatie === 'portret' ? 'portret' : 'landschap'}
        </div>
        <div className="afdrukken-preview-pagina">
          <div className="afdrukken-preview-paginas">
            {weerTeGevenPaginas.map((eenheden, i) => (
              <div
                key={i}
                className="print-pagina-vel"
                style={{ width: `${breedteMm}mm`, minHeight: `${hoogteMm}mm` }}
              >
                <PrintPaginaInhoud
                  wedstrijd={wedstrijd}
                  eenheden={eenheden}
                  toonHeader={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verborgen, ongepagineerde kopie: enige bron voor het echte afdrukken
          (window.print gebruikt .print-root, .print-root *) en tegelijk de
          meetbron voor de pagina-indeling hierboven. */}
      <div className="print-root-meetkopie" ref={meetRef}>
        <div
          className="print-root"
          style={{
            // padding:0 + de werkelijke @page-content-breedte, want dit is
            // wat er ook echt wordt afgedrukt (@media print zet .print-root
            // toch al op padding:0 + width:100%). De 14mm schermpadding van
            // .print-root is enkel cosmetisch voor de zichtbare .print-pagina-vel
            // -vellen; hier zou ze de tekstterugloop (en dus de gemeten
            // rijhoogtes) onterecht smaller meten dan wat effectief afdrukt.
            width: `${breedteMm - 2 * PRINT_PAGINA_MARGE_MM}mm`,
            minHeight: `${hoogteMm}mm`,
            padding: 0
          }}
        >
          <PrintDocument wedstrijd={wedstrijd} doelen={doelen} opties={opties} />
        </div>
      </div>
    </div>
  )
}

// ── Pagina-inhoud (schermweergave) ──────────────────────────

function PrintPaginaInhoud({
  wedstrijd,
  eenheden,
  toonHeader
}: {
  wedstrijd: Wedstrijd
  eenheden: PrintPakEenheid[]
  toonHeader: boolean
}): JSX.Element {
  const tabelEenheden = eenheden.filter(
    (e) => e.soort === 'doel-groep' || e.soort === 'gilde-kop' || e.soort === 'gilde-rij'
  )
  const totalenEenheid = eenheden.find(
    (e): e is Extract<PrintPakEenheid, { soort: 'totalen' }> => e.soort === 'totalen'
  )
  const waarschuwingenEenheid = eenheden.find(
    (e): e is Extract<PrintPakEenheid, { soort: 'waarschuwingen' }> => e.soort === 'waarschuwingen'
  )
  // De eerste pagina toont de tabel altijd, ook leeg (zelfde gedrag als de
  // ongepagineerde tabel voorheen); latere pagina's enkel als er iets op staat.
  const toonTabel = toonHeader || tabelEenheden.length > 0

  return (
    <>
      {toonHeader && <PrintHeader wedstrijd={wedstrijd} />}
      {toonTabel && (
        <table className="print-tabel">
          <TabelKop />
          <TabelInhoud eenheden={tabelEenheden} />
        </table>
      )}
      {totalenEenheid && <PrintTotalen totalen={totalenEenheid.totalen} />}
      {waarschuwingenEenheid && <PrintWaarschuwingen conflicten={waarschuwingenEenheid.conflicten} />}
    </>
  )
}

function TabelInhoud({ eenheden }: { eenheden: PrintPakEenheid[] }): JSX.Element {
  if (eenheden.some((e) => e.soort === 'doel-groep')) {
    return (
      <>
        {eenheden.map((e, i) =>
          e.soort === 'doel-groep' ? <DoelGroepTbody key={i} groep={e.groep} /> : null
        )}
      </>
    )
  }
  return (
    <tbody>
      {eenheden.map((e, i) => {
        if (e.soort === 'gilde-kop') return <GildeKopRij key={i} gilde={e.gilde} aantal={e.aantal} />
        if (e.soort === 'gilde-rij') return <GildeDataRij key={i} rij={e.rij} />
        return null
      })}
    </tbody>
  )
}

// ── Helpers ────────────────────────────────────────────────

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

function RadioGroep<T extends string>({
  naam,
  waarde,
  opties,
  onChange
}: {
  naam: string
  waarde: T
  opties: { v: T; label: string }[]
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="afdruk-radio-rij">
      {opties.map((o) => (
        <label key={o.v} className="afdruk-radio">
          <input
            type="radio"
            name={naam}
            checked={waarde === o.v}
            onChange={() => onChange(o.v)}
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}
