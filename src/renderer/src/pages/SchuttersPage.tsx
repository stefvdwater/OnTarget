import { useEffect, useMemo, useRef, useState } from 'react'
import type { Schutter, SchutterFormData } from '../types'
import SchutterFormulier from '../components/SchutterFormulier'

type Modal = { type: 'nieuw'; zoek: string } | { type: 'bewerk'; schutter: Schutter } | null

export default function SchuttersPage(): JSX.Element {
  const [schutters, setSchutters] = useState<Schutter[]>([])
  const [zoek, setZoek] = useState('')
  const [filterBoog, setFilterBoog] = useState('alle')
  const [filterAfstand, setFilterAfstand] = useState('alle')
  const [modal, setModal] = useState<Modal>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)
  const [demoBevestig, setDemoBevestig] = useState(false)
  const [demoBezig, setDemoBezig] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const ioRef = useRef<HTMLDivElement>(null)

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
    const data = await window.api.schutters.getAll()
    setSchutters(data)
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
                <button className="menu-item" onClick={() => setIoOpen(false)} disabled>
                  <IconUpload />
                  <span>
                    <span className="menu-label">Importeren</span>
                    <span className="menu-sub">Schutters uit CSV inladen</span>
                  </span>
                </button>
                <button className="menu-item" onClick={() => setIoOpen(false)} disabled>
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
              <th>Leeftijdscategorie</th>
              <th>Geslacht</th>
              <th>Afstand</th>
              <th style={{ width: 80 }}></th>
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
                <td>{s.leeftijdscategorie}</td>
                <td className="mono">{s.geslacht}</td>
                <td className="mono">{s.afstand}m</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setModal({ type: 'bewerk', schutter: s })}
                  >
                    Bewerken
                  </button>
                </td>
              </tr>
            ))}
            {lijst.length === 0 && (
              <tr>
                <td
                  colSpan={7}
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

      {modal && (
        <Modal onClose={() => setModal(null)}>
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

      {demoBevestig && (
        <div className="modal-backdrop" onClick={() => setDemoBevestig(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Demo data laden?</header>
            <div className="modal-text">
              Dit verwijdert <strong>alle bestaande schutters en gilden</strong> en laadt
              demo-schutters. Wedstrijden en inschrijvingen worden ook gewist.
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

function Modal({
  onClose,
  children
}: {
  onClose: () => void
  children: React.ReactNode
}): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
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
