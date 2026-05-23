import { useEffect, useState } from 'react'
import type { Wedstrijd } from '../types'
import WedstrijdDetailPage from './WedstrijdDetailPage'

export default function WedstrijdenPage(): JSX.Element {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [geselecteerd, setGeselecteerd] = useState<{ wedstrijd: Wedstrijd; initialTab?: TabType } | null>(null)
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    laadWedstrijden()
  }, [])

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
            <button
              key={w.id}
              className="wedstrijd-card"
              onClick={() => setGeselecteerd({ wedstrijd: w })}
            >
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
            </button>
          ))}
        </div>
      )}
    </>
  )
}

type TabType = 'configuratie' | 'inschrijvingen' | 'indeling' | 'afdrukken'

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
