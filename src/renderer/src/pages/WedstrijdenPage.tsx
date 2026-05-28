import { useEffect, useRef, useState } from 'react'
import type { Wedstrijd } from '../types'
import WedstrijdDetailPage from './WedstrijdDetailPage'
import {
  exporteerWedstrijd,
  exporteerWedstrijden,
  type BulkExportResultaat
} from '../lib/wedstrijdBackup'

type ConflictDialog = {
  payload: any
  bestaande: { id: number; naam: string; datum: string }
  bestandsnaam: string
  indexInBatch: number
  batchTotaal: number
}

type BatchResultaat =
  | {
      bestandsnaam: string
      status: 'ok'
      naam: string
      hernoemd: boolean
      oorspronkelijkeNaam: string
      nieuweSchutters: number
      nieuweGilden: number
    }
  | { bestandsnaam: string; status: 'overgeslagen' }
  | { bestandsnaam: string; status: 'fout'; detail: string }

export default function WedstrijdenPage(): JSX.Element {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [geselecteerd, setGeselecteerd] = useState<{ wedstrijd: Wedstrijd; initialTab?: TabType } | null>(null)
  const [bezig, setBezig] = useState(false)
  const [ioOpen, setIoOpen] = useState(false)
  const [importBezig, setImportBezig] = useState(false)
  const [conflict, setConflict] = useState<ConflictDialog | null>(null)
  const [batchResultaat, setBatchResultaat] = useState<BatchResultaat[] | null>(null)
  const [exportResultaat, setExportResultaat] = useState<BulkExportResultaat | null>(null)
  const ioRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Promise-resolver voor de conflict-modal: de batch-loop wacht hierop.
  const conflictResolverRef = useRef<((actie: 'vervang' | 'kopie' | 'overslaan') => void) | null>(
    null
  )

  useEffect(() => {
    laadWedstrijden()
  }, [])

  useEffect(() => {
    if (!ioOpen) return
    const onDown = (e: MouseEvent): void => {
      if (ioRef.current && !ioRef.current.contains(e.target as Node)) setIoOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [ioOpen])

  async function laadWedstrijden(): Promise<void> {
    const data = await window.api.wedstrijden.getAll()
    setWedstrijden(data)
    const pairs = await Promise.all(
      data.map(async (w) => {
        const rs = await window.api.inschrijvingen.getByWedstrijd(w.id)
        return [w.id, rs.length] as const
      })
    )
    setCounts(Object.fromEntries(pairs))
  }

  async function nieuweWedstrijd(): Promise<void> {
    if (bezig) return
    setBezig(true)
    const vandaag = new Date().toISOString().slice(0, 10)
    const nieuw = {
      naam: 'Nieuwe wedstrijd',
      datum: vandaag,
      locatie: '',
      aantal_doelen: 10,
      aantal_doelen_18m: 2,
      aantal_doelen_12m: 1,
      compound_startdoel: 6,
      aantal_compound_doelen: 1
    }
    const res = await window.api.wedstrijden.create(nieuw)
    const id = res.lastInsertRowid
    const created = await window.api.wedstrijden.getById(id)
    setBezig(false)
    if (created) setGeselecteerd({ wedstrijd: created, initialTab: 'configuratie' })
  }

  function formatDatum(datum: string): string {
    const [y, m, d] = datum.split('-')
    const maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    return `${parseInt(d, 10)} ${maanden[parseInt(m, 10) - 1]} ${y}`
  }

  // ── Export ──────────────────────────────────────────────
  async function exporteerAlle(): Promise<void> {
    setIoOpen(false)
    const res = await exporteerWedstrijden(wedstrijden)
    if (!res.geannuleerd) setExportResultaat(res)
  }

  // ── Import ──────────────────────────────────────────────
  function handleImportKies(): void {
    setIoOpen(false)
    fileRef.current?.click()
  }

  async function handleImportBestand(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setImportBezig(true)
    const resultaten: BatchResultaat[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const tekst = await file.text()
        const payload = JSON.parse(tekst)
        const oorspronkelijke = payload?.wedstrijd?.naam ?? ''
        const check = await window.api.wedstrijden.importCheck(payload)

        let actie: 'vervang' | 'kopie' | 'geen' = 'geen'
        if (check.conflict) {
          const keuze = await new Promise<'vervang' | 'kopie' | 'overslaan'>((resolve) => {
            conflictResolverRef.current = resolve
            setConflict({
              payload,
              bestaande: check.conflict!,
              bestandsnaam: file.name,
              indexInBatch: i,
              batchTotaal: files.length
            })
          })
          conflictResolverRef.current = null
          setConflict(null)

          if (keuze === 'overslaan') {
            resultaten.push({ bestandsnaam: file.name, status: 'overgeslagen' })
            continue
          }
          actie = keuze
        }

        const res = await window.api.wedstrijden.importApply(payload, actie)
        resultaten.push({
          bestandsnaam: file.name,
          status: 'ok',
          naam: res.naam,
          hernoemd: actie === 'kopie' && res.naam !== oorspronkelijke,
          oorspronkelijkeNaam: oorspronkelijke,
          nieuweSchutters: res.nieuweSchutters,
          nieuweGilden: res.nieuweGilden
        })
      } catch (err) {
        const detail =
          err instanceof SyntaxError
            ? 'Bestand is geen geldig JSON-formaat.'
            : (err as Error).message || 'Onbekende fout.'
        resultaten.push({ bestandsnaam: file.name, status: 'fout', detail })
      }
    }

    setImportBezig(false)
    setBatchResultaat(resultaten)
    await laadWedstrijden()
  }

  function bevestigConflict(actie: 'vervang' | 'kopie' | 'overslaan'): void {
    conflictResolverRef.current?.(actie)
  }

  if (geselecteerd) {
    return (
      <WedstrijdDetailPage
        wedstrijd={geselecteerd.wedstrijd}
        initialTab={geselecteerd.initialTab}
        onTerug={() => {
          setGeselecteerd(null)
          laadWedstrijden()
        }}
      />
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Wedstrijden</h1>
          <div className="sub">{wedstrijden.length} wedstrijden gepland</div>
        </div>
        <div className="page-actions">
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
                      {importBezig ? 'Bezig met importeren…' : 'Wedstrijden importeren'}
                    </span>
                    <span className="menu-sub">Eén of meerdere backup-bestanden (.json)</span>
                  </span>
                </button>
                <button
                  className="menu-item"
                  onClick={exporteerAlle}
                  disabled={wedstrijden.length === 0}
                >
                  <IconDownload />
                  <span>
                    <span className="menu-label">Alle exporteren</span>
                    <span className="menu-sub">
                      {wedstrijden.length === 0
                        ? 'Nog geen wedstrijden'
                        : `Eén bestand per wedstrijd (${wedstrijden.length})`}
                    </span>
                  </span>
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              multiple
              style={{ display: 'none' }}
              onChange={handleImportBestand}
            />
          </div>
          <button className="btn btn-primary" onClick={nieuweWedstrijd} disabled={bezig}>
            <IconPlus /> Nieuwe wedstrijd
          </button>
        </div>
      </div>

      {wedstrijden.length === 0 ? (
        <div className="card empty-state">
          <div className="big">Nog geen wedstrijden</div>
          <div>Klik op &quot;Nieuwe wedstrijd&quot; om te beginnen.</div>
        </div>
      ) : (
        <div className="wedstrijd-grid">
          {wedstrijden.map((w) => (
            <div
              key={w.id}
              className="wedstrijd-card"
              role="button"
              tabIndex={0}
              onClick={() => setGeselecteerd({ wedstrijd: w })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setGeselecteerd({ wedstrijd: w })
                }
              }}
            >
              <button
                className="wedstrijd-card-export"
                onClick={(e) => {
                  e.stopPropagation()
                  exporteerWedstrijd(w)
                }}
              >
                <IconDownload />
              </button>
              <div>
                <h3>{w.naam}</h3>
                <div className="meta" style={{ marginTop: 6 }}>
                  <div className="meta-row">
                    <IconCalendar /> {formatDatum(w.datum)}
                  </div>
                  {w.locatie && (
                    <div className="meta-row">
                      <IconPin /> {w.locatie}
                    </div>
                  )}
                </div>
              </div>
              <div className="stats">
                <span className="chip">
                  <span className="mono">{w.aantal_doelen}</span> doelen
                </span>
                <span className="chip chip-yellow">
                  <span className="chip-dot" />
                  <span className="mono">{counts[w.id] ?? 0}</span> ingeschreven
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {conflict && (
        <div className="modal-backdrop" onClick={() => bevestigConflict('overslaan')}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Wedstrijd bestaat al</header>
            <div className="modal-text">
              {conflict.batchTotaal > 1 && (
                <p style={{ marginBottom: 10, color: 'var(--muted)', fontSize: 12.5 }}>
                  Bestand {conflict.indexInBatch + 1} van {conflict.batchTotaal}:{' '}
                  <span className="mono">{conflict.bestandsnaam}</span>
                </p>
              )}
              Er bestaat al een wedstrijd <strong>{conflict.bestaande.naam}</strong> op{' '}
              <strong>{formatDatum(conflict.bestaande.datum)}</strong>.
              <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-2)' }}>
                <li>
                  <strong>Vervangen</strong>: de bestaande wedstrijd wordt verwijderd (samen met
                  haar inschrijvingen en doelindeling) en de backup wordt geïmporteerd.
                </li>
                <li>
                  <strong>Als kopie importeren</strong>: er wordt een nieuwe wedstrijd aangemaakt
                  met &quot;(kopie)&quot; in de naam. De bestaande wedstrijd blijft ongewijzigd.
                </li>
                <li>
                  <strong>Overslaan</strong>: dit bestand wordt genegeerd
                  {conflict.batchTotaal > 1 ? '; volgende bestanden worden gewoon verwerkt' : ''}.
                </li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => bevestigConflict('overslaan')}>
                Overslaan
              </button>
              <button className="btn" onClick={() => bevestigConflict('kopie')}>
                Als kopie importeren
              </button>
              <button className="btn danger" onClick={() => bevestigConflict('vervang')}>
                Vervangen
              </button>
            </div>
          </div>
        </div>
      )}

      {batchResultaat && (
        <div className="modal-backdrop" onClick={() => setBatchResultaat(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Import-resultaat</header>
            <div className="modal-text">
              <BatchSamenvatting resultaten={batchResultaat} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setBatchResultaat(null)}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {exportResultaat && (
        <div className="modal-backdrop" onClick={() => setExportResultaat(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Export voltooid</header>
            <div className="modal-text">
              <p style={{ marginBottom: 8 }}>
                <strong className="mono">{exportResultaat.opgeslagen}</strong> bestand
                {exportResultaat.opgeslagen !== 1 ? 'en' : ''} opgeslagen in:
              </p>
              <p className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)', wordBreak: 'break-all' }}>
                {exportResultaat.map}
              </p>
              {exportResultaat.fouten.length > 0 && (
                <>
                  <p style={{ marginTop: 12, color: 'var(--red-deep)' }}>
                    {exportResultaat.fouten.length} fout
                    {exportResultaat.fouten.length !== 1 ? 'en' : ''}:
                  </p>
                  <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-2)' }}>
                    {exportResultaat.fouten.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setExportResultaat(null)}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type TabType = 'configuratie' | 'inschrijvingen' | 'indeling' | 'afdrukken'

function BatchSamenvatting({ resultaten }: { resultaten: BatchResultaat[] }): JSX.Element {
  const ok = resultaten.filter((r) => r.status === 'ok').length
  const overgeslagen = resultaten.filter((r) => r.status === 'overgeslagen').length
  const fout = resultaten.filter((r) => r.status === 'fout').length
  const totaal = resultaten.length

  const totaalNieuweSchutters = resultaten.reduce(
    (n, r) => (r.status === 'ok' ? n + r.nieuweSchutters : n),
    0
  )
  const totaalNieuweGilden = resultaten.reduce(
    (n, r) => (r.status === 'ok' ? n + r.nieuweGilden : n),
    0
  )

  return (
    <>
      <p style={{ marginBottom: 8 }}>
        <strong className="mono">{ok}</strong> van <strong className="mono">{totaal}</strong>{' '}
        wedstrijd{totaal !== 1 ? 'en' : ''} geïmporteerd
        {overgeslagen > 0 && (
          <>
            , <strong className="mono">{overgeslagen}</strong> overgeslagen
          </>
        )}
        {fout > 0 && (
          <>
            , <strong className="mono">{fout}</strong> mislukt
          </>
        )}
        .
      </p>
      {(totaalNieuweSchutters > 0 || totaalNieuweGilden > 0) && (
        <p style={{ color: 'var(--text-2)', marginBottom: 12 }}>
          {totaalNieuweSchutters > 0 && (
            <>
              <strong className="mono">{totaalNieuweSchutters}</strong> nieuwe schutter
              {totaalNieuweSchutters !== 1 ? 's' : ''} aangemaakt.
            </>
          )}
          {totaalNieuweSchutters > 0 && totaalNieuweGilden > 0 && ' '}
          {totaalNieuweGilden > 0 && (
            <>
              <strong className="mono">{totaalNieuweGilden}</strong> nieuw
              {totaalNieuweGilden !== 1 ? 'e gilden' : ' gilde'} aangemaakt.
            </>
          )}
        </p>
      )}
      <ul
        style={{
          marginTop: 6,
          paddingLeft: 0,
          listStyle: 'none',
          maxHeight: 260,
          overflowY: 'auto',
          fontSize: 12.5
        }}
      >
        {resultaten.map((r, i) => (
          <li
            key={i}
            style={{
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              color: r.status === 'fout' ? 'var(--red-deep)' : 'var(--text)'
            }}
          >
            <span
              className="mono"
              style={{ marginRight: 8, color: 'var(--muted)' }}
            >
              {r.status === 'ok' ? '✓' : r.status === 'overgeslagen' ? '–' : '✗'}
            </span>
            <span className="mono">{r.bestandsnaam}</span>
            {r.status === 'ok' && (
              <>
                {' → '}
                <strong>{r.naam}</strong>
                {r.hernoemd && (
                  <span style={{ color: 'var(--muted)' }}>
                    {' '}(hernoemd, oorspronkelijk <em>{r.oorspronkelijkeNaam}</em>)
                  </span>
                )}
              </>
            )}
            {r.status === 'overgeslagen' && (
              <span style={{ color: 'var(--muted)' }}> · overgeslagen</span>
            )}
            {r.status === 'fout' && (
              <span style={{ marginLeft: 6 }}>· {r.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </>
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

function IconCalendar(): JSX.Element {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconPin(): JSX.Element {
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
      <path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
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
