import { useEffect, useState } from 'react'
import type { Wedstrijd } from '../types'
import InschrijvingenTab from './InschrijvingenTab'
import IndelingTab from './IndelingTab'
import ConfiguratieTab from './ConfiguratieTab'
import AfdrukkenTab from './AfdrukkenTab'

interface Props {
  wedstrijd: Wedstrijd
  initialTab?: Tab
  onTerug: (verwijderd?: boolean) => void
}

type Tab = 'configuratie' | 'inschrijvingen' | 'indeling' | 'afdrukken'

export default function WedstrijdDetailPage({
  wedstrijd,
  initialTab = 'inschrijvingen',
  onTerug
}: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [huidig, setHuidig] = useState<Wedstrijd>(wedstrijd)
  const [aantalInschrijvingen, setAantalInschrijvingen] = useState(0)

  useEffect(() => {
    setHuidig(wedstrijd)
  }, [wedstrijd.id])

  useEffect(() => {
    window.api.inschrijvingen
      .getByWedstrijd(huidig.id)
      .then((rs) => setAantalInschrijvingen(rs.length))
  }, [huidig.id, tab])

  function formatDatum(datum: string): string {
    const [y, m, d] = datum.split('-')
    const maanden = [
      'januari',
      'februari',
      'maart',
      'april',
      'mei',
      'juni',
      'juli',
      'augustus',
      'september',
      'oktober',
      'november',
      'december'
    ]
    return `${parseInt(d, 10)} ${maanden[parseInt(m, 10) - 1]} ${y}`
  }

  async function handleConfigUpdate(patch: Partial<Wedstrijd>): Promise<void> {
    const nieuw: Wedstrijd = { ...huidig, ...patch }
    setHuidig(nieuw)
    await window.api.wedstrijden.update(nieuw)
  }

  async function handleVerwijder(): Promise<void> {
    await window.api.wedstrijden.delete(huidig.id)
    onTerug(true)
  }

  const tabLabel: Record<Tab, string> = {
    configuratie: 'Configuratie',
    inschrijvingen: 'Inschrijvingen',
    indeling: 'Indeling',
    afdrukken: 'Afdrukken'
  }

  return (
    <>
      <div className="crumb">
        <button onClick={() => onTerug()}>
          <IconArrowLeft /> Wedstrijden
        </button>
        <span>/</span>
        <button onClick={() => setTab('inschrijvingen')} title="Naar Inschrijvingen">
          {huidig.naam}
        </button>
        <span>/</span>
        <span style={{ color: 'var(--text-2)' }}>{tabLabel[tab]}</span>
      </div>

      <div className="page-head">
        <div>
          <h1>{huidig.naam}</h1>
          <div className="sub">
            {formatDatum(huidig.datum)}
            {huidig.locatie ? ` · ${huidig.locatie}` : ''} · {huidig.aantal_doelen} doelen
          </div>
        </div>
      </div>

      <div className="tabs">
        <Tab label="Configuratie" actief={tab === 'configuratie'} onClick={() => setTab('configuratie')} />
        <Tab
          label={
            <>
              Inschrijvingen{' '}
              <span className="mono" style={{ color: 'var(--muted)', marginLeft: 4 }}>
                {aantalInschrijvingen}
              </span>
            </>
          }
          actief={tab === 'inschrijvingen'}
          onClick={() => setTab('inschrijvingen')}
        />
        <Tab label="Indeling" actief={tab === 'indeling'} onClick={() => setTab('indeling')} />
        <Tab label="Afdrukken" actief={tab === 'afdrukken'} onClick={() => setTab('afdrukken')} />
      </div>

      {tab === 'configuratie' && (
        <ConfiguratieTab
          wedstrijd={huidig}
          onUpdate={handleConfigUpdate}
          onVerwijder={handleVerwijder}
        />
      )}
      {tab === 'inschrijvingen' && <InschrijvingenTab wedstrijd={huidig} />}
      {tab === 'indeling' && <IndelingTab wedstrijd={huidig} />}
      {tab === 'afdrukken' && <AfdrukkenTab wedstrijd={huidig} />}
    </>
  )
}

function Tab({
  label,
  actief,
  onClick
}: {
  label: React.ReactNode
  actief: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button className={'tab' + (actief ? ' active' : '')} onClick={onClick}>
      {label}
    </button>
  )
}

function IconArrowLeft(): JSX.Element {
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
      <path d="m12 19-7-7 7-7M19 12H5" />
    </svg>
  )
}
