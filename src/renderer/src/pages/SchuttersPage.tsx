import { useEffect, useMemo, useRef, useState } from 'react'
import type { Gilde, Schutter, SchutterFormData, Wedstrijd } from '../types'
import SchutterFormulier, {
  afstandToegestaan,
  categorieToegestaan
} from '../components/SchutterFormulier'
import ImportReviewModal, {
  type ImportRij,
  valideerImportRij
} from '../components/ImportReviewModal'
import { categorieLabel } from '../lib/labels'
import { exporteerWedstrijden } from '../lib/wedstrijdBackup'

type Modal = { type: 'nieuw'; zoek: string } | { type: 'bewerk'; schutter: Schutter } | null

interface ImportResultaat {
  toegevoegd: number
  fouten: string[]
  nieuweGilden: number
}

interface ImportSessie {
  rijen: ImportRij[]
  bekendeGilden: Gilde[]
  bestaandeSchutters: Schutter[]
}

export default function SchuttersPage(): JSX.Element {
  const [schutters, setSchutters] = useState<Schutter[]>([])
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [zoek, setZoek] = useState('')
  const [filterBoog, setFilterBoog] = useState('alle')
  const [filterAfstand, setFilterAfstand] = useState('alle')
  const [modal, setModal] = useState<Modal>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)
  const [demoBevestig, setDemoBevestig] = useState(false)
  const [demoBezig, setDemoBezig] = useState(false)
  const [verwijderBevestig, setVerwijderBevestig] = useState<Schutter | null>(null)
  const [verwijderAllesBevestig, setVerwijderAllesBevestig] = useState(false)
  const [verwijderAllesBezig, setVerwijderAllesBezig] = useState(false)
  const [legeGildenBevestig, setLegeGildenBevestig] = useState(false)
  const [legeGildenBezig, setLegeGildenBezig] = useState(false)
  const [aantalLegeGilden, setAantalLegeGilden] = useState(0)
  const [importBezig, setImportBezig] = useState(false)
  const [importResultaat, setImportResultaat] = useState<ImportResultaat | null>(null)
  const [importSessie, setImportSessie] = useState<ImportSessie | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const ioRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    laadSchutters()
  }, [])

  useEffect(() => {
    if (!filterOpen && !ioOpen) return
    const onDown = (e: MouseEvent): void => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false)
      if (ioOpen && ioRef.current && !ioRef.current.contains(e.target as Node)) setIoOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [filterOpen, ioOpen])

  async function laadSchutters(): Promise<void> {
    const [data, alleGilden, metSchutters, alleWedstrijden] = await Promise.all([
      window.api.schutters.getAll(),
      window.api.gilden.getAll(),
      window.api.gilden.getMetSchutters(),
      window.api.wedstrijden.getAll()
    ])
    setSchutters(data)
    setAantalLegeGilden(alleGilden.length - metSchutters.length)
    setWedstrijden(alleWedstrijden)
  }

  const actieveFilters =
    (filterBoog !== 'alle' ? 1 : 0) + (filterAfstand !== 'alle' ? 1 : 0)

  function wisFilters(): void {
    setFilterBoog('alle')
    setFilterAfstand('alle')
  }

  const gilden = useMemo(() => {
    const m = new Map<number, string>()
    for (const s of schutters) {
      if (s.gilde_id != null && s.gilde_naam) m.set(s.gilde_id, s.gilde_naam)
    }
    return m.size
  }, [schutters])

  const lijst = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return schutters.filter((s) => {
      if (filterBoog !== 'alle' && s.type_boog !== filterBoog) return false
      if (filterAfstand !== 'alle' && String(s.afstand) !== filterAfstand) return false
      if (q) {
        const hay = `${s.voornaam} ${s.naam} ${s.gilde_naam ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [schutters, zoek, filterBoog, filterAfstand])

  async function handleBevestig(data: SchutterFormData): Promise<void> {
    let gilde_id = data.gilde_id
    if (data.gilde_naam_nieuw.trim()) {
      const r = await window.api.gilden.create(data.gilde_naam_nieuw.trim())
      gilde_id = r.lastInsertRowid
    }
    if (modal?.type === 'bewerk') {
      await window.api.schutters.update({ ...data, gilde_id, id: modal.schutter.id })
    } else {
      await window.api.schutters.create({ ...data, gilde_id })
    }
    setModal(null)
    laadSchutters()
  }

  async function handleVerwijder(id: number): Promise<void> {
    await window.api.schutters.delete(id)
    setModal(null)
    laadSchutters()
  }

  async function handleLaadDemo(): Promise<void> {
    setDemoBezig(true)
    setDemoBevestig(false)
    await window.api.demo.laad()
    setDemoBezig(false)
    laadSchutters()
  }

  async function handleVerwijderAlles(): Promise<void> {
    setVerwijderAllesBezig(true)
    await window.api.schutters.deleteAll()
    setVerwijderAllesBezig(false)
    setVerwijderAllesBevestig(false)
    laadSchutters()
  }

  async function handleVerwijderLegeGilden(): Promise<void> {
    setLegeGildenBezig(true)
    await window.api.gilden.deleteLege()
    setLegeGildenBezig(false)
    setLegeGildenBevestig(false)
    laadSchutters()
  }

  // ── CSV export ────────────────────────────────────────
  function handleExport(): void {
    setIoOpen(false)
    const kolommen = [
      'voornaam',
      'naam',
      'gilde_naam',
      'type_boog',
      'leeftijdscategorie',
      'geslacht',
      'afstand'
    ]
    const rijen = schutters.map((s) => [
      s.voornaam,
      s.naam,
      s.gilde_naam ?? '',
      s.type_boog,
      s.leeftijdscategorie,
      s.geslacht,
      String(s.afstand)
    ])
    const csv = [kolommen, ...rijen].map((r) => r.map(csvEscape).join(',')).join('\r\n')
    // UTF-8 BOM zodat Excel non-ASCII tekens correct toont
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const datum = new Date().toISOString().slice(0, 10)
    a.download = `schutters-${datum}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── CSV import ────────────────────────────────────────
  function handleImportKies(): void {
    setIoOpen(false)
    fileRef.current?.click()
  }

  async function handleImportBestand(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const bestand = e.target.files?.[0]
    e.target.value = '' // reset zodat hetzelfde bestand opnieuw kan
    if (!bestand) return

    setImportBezig(true)
    const tekst = await bestand.text()
    const parseResult = parseImportTekst(tekst)
    setImportBezig(false)

    if (!parseResult.ok) {
      setImportResultaat({ toegevoegd: 0, nieuweGilden: 0, fouten: parseResult.fouten })
      return
    }

    // Voor autocomplete alleen gilden tonen die al schutters hebben — verlaten
    // gilden zijn ruis voor de gebruiker. Bij commit gebruiken we wél de
    // volledige lijst voor dedup (zie commitImportRijen).
    const [gildenSuggestie, alleSchutters] = await Promise.all([
      window.api.gilden.getMetSchutters(),
      window.api.schutters.getAll()
    ])
    // Altijd review-modal tonen zodat de gebruiker zelfs zonder conflicten kan
    // controleren wat geïmporteerd wordt.
    setImportSessie({
      rijen: parseResult.rijen,
      bekendeGilden: gildenSuggestie,
      bestaandeSchutters: alleSchutters
    })
  }

  async function bevestigImportReview(gecorrigeerd: ImportRij[]): Promise<void> {
    if (!importSessie) return
    setImportBezig(true)
    const resultaat = await commitImportRijen(gecorrigeerd)
    setImportBezig(false)
    setImportSessie(null)
    setImportResultaat(resultaat)
    laadSchutters()
  }

  async function commitImportRijen(rijen: ImportRij[]): Promise<ImportResultaat> {
    // Voor dedup gebruiken we de volledige gilde-lijst (inclusief verlaten
    // gilden), zodat we geen duplicaat aanmaken bij een naam-match.
    const alleGilden: Gilde[] = await window.api.gilden.getAll()
    const gildeMap = new Map<string, number>()
    for (const g of alleGilden) gildeMap.set(g.naam.toLowerCase(), g.id)

    let toegevoegd = 0
    let nieuweGilden = 0
    const fouten: string[] = []

    for (const rij of rijen) {
      // Uitgevinkte rijen importeren we niet (issue #5) en duplicaten met
      // 'behoud'/'skip' (issue #4) hebben actief=false.
      if (!rij.actief) continue

      const v = valideerImportRij(rij)
      if (!v.ok) {
        fouten.push(`Rij ${rij.regel}: ${v.redenen.join(' · ')}`)
        continue
      }

      let gildeId: number | null = null
      const gildeNaam = rij.gilde_naam.trim()
      if (gildeNaam) {
        const sleutel = gildeNaam.toLowerCase()
        if (gildeMap.has(sleutel)) {
          gildeId = gildeMap.get(sleutel)!
        } else {
          const res = await window.api.gilden.create(gildeNaam)
          gildeId = res.lastInsertRowid
          gildeMap.set(sleutel, gildeId!)
          nieuweGilden++
        }
      }

      const payload = {
        voornaam: rij.voornaam.trim(),
        naam: rij.naam.trim(),
        gilde_id: gildeId,
        type_boog: rij.type_boog,
        leeftijdscategorie: rij.leeftijdscategorie,
        geslacht: rij.geslacht,
        afstand: rij.afstand
      }

      try {
        if (rij.duplicaat?.bron === 'db' && rij.duplicaat.actie === 'vervang') {
          await window.api.schutters.update({ id: rij.duplicaat.bestaande.id, ...payload })
        } else {
          await window.api.schutters.create(payload)
        }
        toegevoegd++
      } catch (err) {
        fouten.push(`Rij ${rij.regel}: ${(err as Error).message}`)
      }
    }

    return { toegevoegd, nieuweGilden, fouten }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Schutters</h1>
          <div className="sub">
            {schutters.length} geregistreerde schutters in {gilden} gilden
          </div>
        </div>
        <div className="page-actions">
          <div className="search">
            <IconSearch />
            <input
              className="input"
              placeholder="Zoek op naam of gilde…"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
            />
          </div>

          <div className="filter-dropdown" ref={filterRef}>
            <button
              className={'btn' + (filterOpen ? ' btn-active' : '')}
              onClick={() => setFilterOpen((o) => !o)}
            >
              <IconFilter /> Filter
              {actieveFilters > 0 && <span className="filter-count">{actieveFilters}</span>}
            </button>
            {filterOpen && (
              <div className="filter-panel" onMouseDown={(e) => e.stopPropagation()}>
                <label>
                  <span>Boogtype</span>
                  <select
                    className="select"
                    value={filterBoog}
                    onChange={(e) => setFilterBoog(e.target.value)}
                  >
                    <option value="alle">Alle boogtypes</option>
                    <option value="Recurve">Recurve</option>
                    <option value="Compound">Compound</option>
                    <option value="Barebow">Barebow</option>
                    <option value="Andere">Andere</option>
                  </select>
                </label>
                <label>
                  <span>Afstand</span>
                  <select
                    className="select"
                    value={filterAfstand}
                    onChange={(e) => setFilterAfstand(e.target.value)}
                  >
                    <option value="alle">Alle afstanden</option>
                    <option value="25">25m</option>
                    <option value="18">18m</option>
                    <option value="12">12m</option>
                  </select>
                </label>
                <div className="filter-panel-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={wisFilters}
                    disabled={actieveFilters === 0}
                  >
                    Wis filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="filter-dropdown" ref={ioRef}>
            <button
              className={'btn' + (ioOpen ? ' btn-active' : '')}
              onClick={() => setIoOpen((o) => !o)}
            >
              <IconExchange /> Importeren / Exporteren
              <IconChevron />
            </button>
            {ioOpen && (
              <div className="menu-panel" onMouseDown={(e) => e.stopPropagation()}>
                <button className="menu-item" onClick={handleImportKies} disabled={importBezig}>
                  <IconUpload />
                  <span>
                    <span className="menu-label">
                      {importBezig ? 'Bezig met importeren…' : 'Importeren'}
                    </span>
                    <span className="menu-sub">Schutters uit CSV inladen</span>
                  </span>
                </button>
                <button
                  className="menu-item"
                  onClick={handleExport}
                  disabled={schutters.length === 0}
                >
                  <IconDownload />
                  <span>
                    <span className="menu-label">Exporteren</span>
                    <span className="menu-sub">Volledige lijst als CSV</span>
                  </span>
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setIoOpen(false)
                    setDemoBevestig(true)
                  }}
                >
                  <IconSparkle />
                  <span>
                    <span className="menu-label">Demo-data laden</span>
                    <span className="menu-sub">Reset met 100 voorbeeld-schutters</span>
                  </span>
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleImportBestand}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setModal({ type: 'nieuw', zoek })}>
            <IconPlus /> Nieuwe schutter
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '24%' }}>Naam</th>
              <th style={{ width: '26%' }}>Gilde</th>
              <th>Boogtype</th>
              <th>Categorie</th>
              <th>Afstand</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>
                    {s.voornaam} {s.naam}
                  </strong>
                </td>
                <td>{s.gilde_naam ?? '—'}</td>
                <td>
                  <BoogChip boog={s.type_boog} />
                </td>
                <td>{categorieLabel(s)}</td>
                <td className="mono">{s.afstand}m</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setModal({ type: 'bewerk', schutter: s })}
                    >
                      Bewerken
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => setVerwijderBevestig(s)}
                    >
                      Verwijder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {lijst.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}
                >
                  {zoek || actieveFilters > 0
                    ? 'Geen schutters gevonden.'
                    : 'Nog geen schutters toegevoegd.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Gevarenzone */}
      <section className="config-card danger" style={{ marginTop: 28 }}>
        <header>
          <h2>Gevarenzone</h2>
          <p>
            Onomkeerbare acties — gebruik alleen wanneer je echt opnieuw wilt beginnen.
            Wedstrijden zelf blijven steeds behouden.
          </p>
        </header>
        <div className="config-actions">
          <button
            className="btn danger"
            onClick={() => setVerwijderAllesBevestig(true)}
            disabled={schutters.length === 0}
          >
            Alle schutters verwijderen
          </button>
          <button
            className="btn"
            onClick={() => setLegeGildenBevestig(true)}
            disabled={aantalLegeGilden === 0}
          >
            Lege gilden verwijderen
            {aantalLegeGilden > 0 && (
              <span className="mono" style={{ marginLeft: 4, opacity: 0.7 }}>
                ({aantalLegeGilden})
              </span>
            )}
          </button>
        </div>
      </section>

      {modal && (
        <Modal>
          <SchutterFormulier
            bestaand={modal.type === 'bewerk' ? modal.schutter : null}
            initieelZoek={modal.type === 'nieuw' ? modal.zoek : ''}
            onAnnuleer={() => setModal(null)}
            onBevestig={handleBevestig}
            onVerwijder={
              modal.type === 'bewerk' ? () => handleVerwijder(modal.schutter.id) : undefined
            }
          />
        </Modal>
      )}

      {importSessie && (
        <ImportReviewModal
          rijen={importSessie.rijen}
          bekendeGilden={importSessie.bekendeGilden}
          bestaandeSchutters={importSessie.bestaandeSchutters}
          bezig={importBezig}
          onAnnuleer={() => setImportSessie(null)}
          onBevestig={bevestigImportReview}
        />
      )}

      {verwijderAllesBevestig && (
        <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Alle schutters verwijderen?</header>
            <div className="modal-text">
              <p>
                <strong className="mono">{schutters.length}</strong> schutter
                {schutters.length !== 1 ? 's' : ''} en al hun inschrijvingen +
                doelindelingen worden permanent verwijderd. Gilden en wedstrijden zelf
                blijven behouden. Deze actie kan niet ongedaan gemaakt worden.
              </p>
              <WedstrijdBackupBlok wedstrijden={wedstrijden} />
            </div>
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => setVerwijderAllesBevestig(false)}
                disabled={verwijderAllesBezig}
              >
                Annuleer
              </button>
              <button
                className="btn danger"
                onClick={handleVerwijderAlles}
                disabled={verwijderAllesBezig}
              >
                {verwijderAllesBezig ? 'Bezig…' : 'Definitief verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {legeGildenBevestig && (
        <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Lege gilden verwijderen?</header>
            <div className="modal-text">
              <strong className="mono">{aantalLegeGilden}</strong> gilde
              {aantalLegeGilden !== 1 ? 'n' : ''} zonder schutters worden permanent
              verwijderd. Gilden met minstens één schutter blijven uiteraard behouden.
            </div>
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => setLegeGildenBevestig(false)}
                disabled={legeGildenBezig}
              >
                Annuleer
              </button>
              <button
                className="btn danger"
                onClick={handleVerwijderLegeGilden}
                disabled={legeGildenBezig}
              >
                {legeGildenBezig ? 'Bezig…' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verwijderBevestig && (
        <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Schutter verwijderen?</header>
            <div className="modal-text">
              <strong>
                {verwijderBevestig.voornaam} {verwijderBevestig.naam}
              </strong>{' '}
              wordt permanent verwijderd, samen met al diens inschrijvingen en
              doelindelingen.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setVerwijderBevestig(null)}>
                Annuleer
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  await handleVerwijder(verwijderBevestig.id)
                  setVerwijderBevestig(null)
                }}
              >
                Verwijder
              </button>
            </div>
          </div>
        </div>
      )}

      {importResultaat && (
        <div className="modal-backdrop" onClick={() => setImportResultaat(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Import-resultaat</header>
            <div className="modal-text">
              <p style={{ marginBottom: 8 }}>
                <strong className="mono">{importResultaat.toegevoegd}</strong> schutter
                {importResultaat.toegevoegd !== 1 ? 's' : ''} toegevoegd.
                {importResultaat.nieuweGilden > 0 && (
                  <>
                    {' '}
                    <strong className="mono">{importResultaat.nieuweGilden}</strong> nieuw
                    {importResultaat.nieuweGilden !== 1 ? 'e gilden' : ' gilde'} aangemaakt.
                  </>
                )}
              </p>
              {importResultaat.fouten.length > 0 && (
                <>
                  <p style={{ marginTop: 12, color: 'var(--red-deep)' }}>
                    {importResultaat.fouten.length} fout
                    {importResultaat.fouten.length !== 1 ? 'en' : ''}:
                  </p>
                  <ul
                    style={{
                      marginTop: 6,
                      paddingLeft: 18,
                      maxHeight: 200,
                      overflowY: 'auto',
                      fontSize: 12.5,
                      color: 'var(--text-2)'
                    }}
                  >
                    {importResultaat.fouten.slice(0, 30).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                    {importResultaat.fouten.length > 30 && (
                      <li style={{ color: 'var(--muted)' }}>
                        … en nog {importResultaat.fouten.length - 30}
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setImportResultaat(null)}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {demoBevestig && (
        <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Demo data laden?</header>
            <div className="modal-text">
              <p>
                Dit verwijdert <strong>alle bestaande schutters en gilden</strong> en laadt
                demo-schutters. Inschrijvingen en doelindelingen van bestaande wedstrijden
                gaan verloren; de wedstrijden zelf blijven bestaan (maar zonder schutters).
              </p>
              <WedstrijdBackupBlok wedstrijden={wedstrijden} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDemoBevestig(false)}>
                Annuleer
              </button>
              <button className="btn btn-primary" onClick={handleLaadDemo} disabled={demoBezig}>
                {demoBezig ? 'Bezig…' : 'Demo data laden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Backup-blok dat in destructieve bevestigingsmodals wordt gestoken: nodigt de
// gebruiker uit om eerst alle wedstrijden te exporteren. Toont enkel als er
// wedstrijden zijn. Geeft een succes-status terug na de download, maar voert de
// destructieve actie zelf niet uit; dat blijft een aparte expliciete klik.
function WedstrijdBackupBlok({ wedstrijden }: { wedstrijden: Wedstrijd[] }): JSX.Element | null {
  const [bezig, setBezig] = useState(false)
  const [resultaat, setResultaat] = useState<{ opgeslagen: number; map: string } | null>(null)

  if (wedstrijden.length === 0) return null

  async function handleBackup(): Promise<void> {
    setBezig(true)
    try {
      const res = await exporteerWedstrijden(wedstrijden)
      if (!res.geannuleerd && res.map) {
        setResultaat({ opgeslagen: res.opgeslagen, map: res.map })
      }
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="backup-prompt">
      <div className="backup-prompt-tekst">
        <strong>Tip:</strong> je hebt {wedstrijden.length} wedstrijd
        {wedstrijden.length !== 1 ? 'en' : ''}. Maak eerst een backup zodat je de
        inschrijvingen en doelindeling later terug kan inlezen.
      </div>
      <button className="btn btn-sm" onClick={handleBackup} disabled={bezig}>
        {bezig
          ? 'Bezig met exporteren…'
          : resultaat
            ? 'Backup opnieuw maken'
            : 'Backup wedstrijden'}
      </button>
      {resultaat && !bezig && (
        <div className="backup-prompt-status">
          ✓ <strong className="mono">{resultaat.opgeslagen}</strong> bestand
          {resultaat.opgeslagen !== 1 ? 'en' : ''} opgeslagen in{' '}
          <span className="mono" style={{ wordBreak: 'break-all' }}>
            {resultaat.map}
          </span>
          .
        </div>
      )}
    </div>
  )
}

function Modal({ children }: { children: React.ReactNode }): JSX.Element {
  // Een schutter-formulier sluit enkel via Annuleren of Opslaan in de inhoud zelf.
  // Geen backdrop-dismiss en geen Escape: anders raakt ingevuld typewerk verloren
  // bij een misklik of toetsenbord-misslag.
  return (
    <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function BoogChip({ boog }: { boog: string }): JSX.Element {
  const cls =
    boog === 'Recurve'
      ? 'chip chip-blue'
      : boog === 'Compound'
        ? 'chip chip-red'
        : boog === 'Barebow'
          ? 'chip chip-yellow'
          : 'chip'
  return (
    <span className={cls}>
      <span className="chip-dot" />
      {boog}
    </span>
  )
}

function IconSearch(): JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconPlus(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconFilter(): JSX.Element {
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
      <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />
    </svg>
  )
}

function IconExchange(): JSX.Element {
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
      <path d="M3 7h14M14 4l3 3-3 3M21 17H7M10 14l-3 3 3 3" />
    </svg>
  )
}

function IconUpload(): JSX.Element {
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
      <path d="M12 20V8M6 12l6-6 6 6M4 3h16" />
    </svg>
  )
}

function IconDownload(): JSX.Element {
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
      <path d="M12 4v12M6 12l6 6 6-6M4 21h16" />
    </svg>
  )
}

function IconSparkle(): JSX.Element {
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
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14Z" />
    </svg>
  )
}

function IconChevron(): JSX.Element {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// ── CSV helpers ─────────────────────────────────────────

type ParseResultaat =
  | { ok: true; rijen: ImportRij[] }
  | { ok: false; fouten: string[] }

function parseImportTekst(tekst: string): ParseResultaat {
  const rijen = parseCSV(tekst)
  if (rijen.length === 0) return { ok: false, fouten: ['Bestand is leeg'] }

  const header = rijen[0].map((h) => h.trim().toLowerCase())
  const idx = {
    voornaam: header.indexOf('voornaam'),
    naam: header.indexOf('naam'),
    gilde: header.indexOf('gilde_naam'),
    boog: header.indexOf('type_boog'),
    cat: header.indexOf('leeftijdscategorie'),
    geslacht: header.indexOf('geslacht'),
    afstand: header.indexOf('afstand')
  }
  const ontbrekend = Object.entries(idx)
    .filter(([, v]) => v === -1)
    .map(([k]) => k)
  if (ontbrekend.length > 0) {
    return { ok: false, fouten: [`Ontbrekende kolommen in CSV: ${ontbrekend.join(', ')}`] }
  }

  const result: ImportRij[] = []
  for (let r = 1; r < rijen.length; r++) {
    const rij = rijen[r]
    if (rij.every((c) => c.trim() === '')) continue // lege regel overslaan
    result.push({
      regel: r + 1,
      voornaam: rij[idx.voornaam]?.trim() ?? '',
      naam: rij[idx.naam]?.trim() ?? '',
      gilde_naam: rij[idx.gilde]?.trim() ?? '',
      type_boog: (rij[idx.boog]?.trim() ?? '') as ImportRij['type_boog'],
      leeftijdscategorie: (rij[idx.cat]?.trim() ?? '') as ImportRij['leeftijdscategorie'],
      geslacht: (rij[idx.geslacht]?.trim().toUpperCase() ?? '') as ImportRij['geslacht'],
      afstand: Number(rij[idx.afstand]?.trim() ?? '0') as ImportRij['afstand'],
      // Default aan; modal markeert duplicaten zelf en zet die uit.
      actief: true
    })
  }
  return { ok: true, rijen: result }
}

function csvEscape(waarde: string): string {
  if (waarde == null) return ''
  const s = String(waarde)
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/**
 * Parser voor CSV met quoted fields (RFC 4180-stijl). Ondersteunt embedded
 * komma's, dubbele aanhalingstekens (escaped als "") en CRLF/LF regeleindes.
 */
function parseCSV(tekst: string): string[][] {
  // Verwijder eventuele UTF-8 BOM
  if (tekst.charCodeAt(0) === 0xfeff) tekst = tekst.slice(1)

  const rijen: string[][] = []
  let rij: string[] = []
  let veld = ''
  let inQuotes = false

  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i]

    if (inQuotes) {
      if (c === '"') {
        if (tekst[i + 1] === '"') {
          veld += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        veld += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      rij.push(veld)
      veld = ''
    } else if (c === '\r') {
      // negeer; LF erna closet de rij
    } else if (c === '\n') {
      rij.push(veld)
      rijen.push(rij)
      rij = []
      veld = ''
    } else {
      veld += c
    }
  }
  // laatste veld/rij flushen
  if (veld.length > 0 || rij.length > 0) {
    rij.push(veld)
    rijen.push(rij)
  }
  return rijen
}
