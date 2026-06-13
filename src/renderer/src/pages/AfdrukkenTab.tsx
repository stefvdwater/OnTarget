import { useEffect, useMemo, useState } from 'react'
import type { Wedstrijd } from '../types'
import type { Doel, DoelMetConflicten } from '../algoritme/types'
import { voegConflictenToe } from '../algoritme/conflicten'
import { pasRuntimeCompoundZoneToe } from '../algoritme/zones'
import PrintDocument from '../components/PrintDocument'
import {
  bouwExcelModel,
  parseDoelInterval,
  type Groepering,
  type Orientatie,
  type PrintFilters,
  type PrintOpties
} from '../components/afdruk-helpers'

interface Props {
  wedstrijd: Wedstrijd
}

// Pagina-afmetingen in mm voor de preview-verhouding. We tonen altijd A4
// (210×297mm); de gebruiker kan in de native printdialoog desgewenst een
// ander formaat kiezen.
const A4_KORT = 210
const A4_LANG = 297

export default function AfdrukkenTab({ wedstrijd }: Props): JSX.Element {
  const [doelen, setDoelen] = useState<DoelMetConflicten[]>([])

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

  // ── Laad data ──────────────────────────────────────────
  useEffect(() => {
    laadIndeling()
  }, [wedstrijd.id])

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
    setDoelen(voegConflictenToe(lege as Doel[]))
  }

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

  const opties: PrintOpties = {
    papier: 'A4',
    orientatie,
    groepering,
    // Sortering wordt impliciet bepaald: doel → positie, gilde → naam.
    sortering: groepering === 'doel' ? 'positie' : 'naam',
    filters,
    totalenTonen,
    waarschuwingenTonen
  }

  // Pagina-afmetingen voor de preview (A4 in portret/landschap)
  const { breedteMm, hoogteMm } = useMemo(() => {
    return orientatie === 'portret'
      ? { breedteMm: A4_KORT, hoogteMm: A4_LANG }
      : { breedteMm: A4_LANG, hoogteMm: A4_KORT }
  }, [orientatie])

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
        margin: 12mm;
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

        <Sectie label="Gildes">
          <label className="afdruk-check">
            <input
              type="checkbox"
              checked={alleGildes}
              onChange={(e) => setAlleGildes(e.target.checked)}
            />
            Alle gildes
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
                  Geen gildes in de huidige indeling.
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
          Voorbeeld — A4 {orientatie === 'portret' ? 'portret' : 'landschap'}
        </div>
        <div className="afdrukken-preview-pagina">
          <div
            className="print-root"
            style={{ width: `${breedteMm}mm`, minHeight: `${hoogteMm}mm` }}
          >
            <PrintDocument
              wedstrijd={wedstrijd}
              doelen={doelen}
              opties={opties}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────

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

function IconPrinter(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function IconExcel(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  )
}
