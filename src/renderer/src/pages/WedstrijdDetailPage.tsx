import { useState } from 'react'
import type { Wedstrijd } from '../types'
import InschrijvingenTab from './InschrijvingenTab'
import IndelingTab from './IndelingTab'

interface Props {
  wedstrijd: Wedstrijd
  onTerug: () => void
  onBewerk: (w: Wedstrijd) => void
}

type Tab = 'inschrijvingen' | 'indeling'

export default function WedstrijdDetailPage({ wedstrijd, onTerug, onBewerk }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('inschrijvingen')

  function formatDatum(datum: string): string {
    return new Date(datum).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const tabCls = (t: Tab): string =>
    `px-5 py-2 text-sm font-medium border-b-2 transition ${
      tab === t
        ? 'border-indigo-600 dark:border-indigo-400 text-primary'
        : 'border-transparent text-muted hover:text-primary'
    }`

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <button
            onClick={onTerug}
            className="mb-1 flex items-center gap-1 text-sm text-muted hover:text-primary"
          >
            ← Terug naar overzicht
          </button>
          <h1 className="text-2xl font-semibold text-primary">{wedstrijd.naam}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {formatDatum(wedstrijd.datum)}
            {wedstrijd.locatie ? ` · ${wedstrijd.locatie}` : ''}
            {' · '}
            {wedstrijd.aantal_doelen} doelen
            {wedstrijd.aantal_doelen_18m > 0 ? ` (${wedstrijd.aantal_doelen_18m}× 18m)` : ''}
            {wedstrijd.aantal_doelen_12m > 0 ? ` (${wedstrijd.aantal_doelen_12m}× 12m)` : ''}
          </p>
        </div>
        <button onClick={() => onBewerk(wedstrijd)} className="btn-secondary">
          Wedstrijd bewerken
        </button>
      </div>

      {/* Tabbladen */}
      <div className="mb-5 flex border-b border-soft">
        <button className={tabCls('inschrijvingen')} onClick={() => setTab('inschrijvingen')}>
          Inschrijvingen
        </button>
        <button className={tabCls('indeling')} onClick={() => setTab('indeling')}>
          Doelindeling
        </button>
      </div>

      {/* Inhoud */}
      {tab === 'inschrijvingen' && <InschrijvingenTab wedstrijd={wedstrijd} />}
      {tab === 'indeling' && <IndelingTab wedstrijd={wedstrijd} />}
    </div>
  )
}
