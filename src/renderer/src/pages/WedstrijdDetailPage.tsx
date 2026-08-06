import { useEffect, useRef, useState } from 'react'
import type { Wedstrijd } from '../types'
import InschrijvingenTab from './InschrijvingenTab'
import IndelingTab from './IndelingTab'
import ConfiguratieTab from './ConfiguratieTab'
import AfdrukkenTab, { type AfdrukModus } from './AfdrukkenTab'
import {
  maakIndelingAfdrukFiltersDefault,
  maakScorekaartenAfdrukFiltersDefault,
  type IndelingAfdrukFilters,
  type ScorekaartenAfdrukFilters
} from '../components/afdruk-helpers'
import { IconArrowLeft } from '../components/icons/IconArrowLeft'
import { IconChevron } from '../components/icons/IconChevron'
import { IconGear } from '../components/icons/IconGear'
import { IconPencil } from '../components/icons/IconPencil'
import { IconDocument } from '../components/icons/IconDocument'
import { IconPrinter } from '../components/icons/IconPrinter'

// Debounce voor configuratie-wijzigingen: één DB-write per CONFIG_SAVE_DEBOUNCE_MS
// na de laatste toetsaanslag, in plaats van per karakter.
const CONFIG_SAVE_DEBOUNCE_MS = 300

interface Props {
  wedstrijd: Wedstrijd
  initialTab?: Tab
  onTerug: (verwijderd?: boolean) => void
}

type Tab = 'configuratie' | 'inschrijvingen' | 'indeling' | 'afdrukken'

// Enige bron van waarheid voor de stappenbalk: icoon + label per tab,
// gebruikt voor zowel de stappenbalk als het broodkruimel-label.
const STAPPEN: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: 'configuratie', icon: <IconGear size={14} />, label: 'Configuratie' },
  { tab: 'inschrijvingen', icon: <IconPencil size={14} />, label: 'Inschrijvingen' },
  { tab: 'indeling', icon: <IconDocument size={14} />, label: 'Indeling' },
  { tab: 'afdrukken', icon: <IconPrinter size={14} />, label: 'Afdrukken' }
]

const tabLabel: Record<Tab, string> = Object.fromEntries(
  STAPPEN.map((s) => [s.tab, s.label])
) as Record<Tab, string>

export default function WedstrijdDetailPage({
  wedstrijd,
  initialTab = 'inschrijvingen',
  onTerug
}: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [afdrukModus, setAfdrukModus] = useState<AfdrukModus>('indeling')
  const [huidig, setHuidig] = useState<Wedstrijd>(wedstrijd)
  const [aantalInschrijvingen, setAantalInschrijvingen] = useState(0)

  // Tab-lokale UI-state (zoekveld, print-filters) die hier leeft in plaats
  // van in de sub-tabs zelf: WedstrijdDetailPage unmount niet bij het
  // wisselen van tab, de sub-tabs wel (`{tab === 'x' && <XTab/>}`). Zonder
  // deze lift verliest elke sub-tab zijn filters/toggles bij elke
  // tab-wissel (issue #42).
  const [inschrijvingenZoek, setInschrijvingenZoek] = useState('')
  const [indelingAfdrukFilters, setIndelingAfdrukFilters] = useState<IndelingAfdrukFilters>(
    maakIndelingAfdrukFiltersDefault
  )
  const [scorekaartenAfdrukFilters, setScorekaartenAfdrukFilters] =
    useState<ScorekaartenAfdrukFilters>(maakScorekaartenAfdrukFiltersDefault)

  function updateIndelingAfdrukFilters(patch: Partial<IndelingAfdrukFilters>): void {
    setIndelingAfdrukFilters((prev) => ({ ...prev, ...patch }))
  }

  function updateScorekaartenAfdrukFilters(patch: Partial<ScorekaartenAfdrukFilters>): void {
    setScorekaartenAfdrukFilters((prev) => ({ ...prev, ...patch }))
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<Wedstrijd | null>(null)

  function flushConfigSave(): void {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const toSave = pendingSaveRef.current
    if (toSave) {
      pendingSaveRef.current = null
      void window.api.wedstrijden.update(toSave)
    }
  }

  useEffect(() => {
    setHuidig(wedstrijd)
  }, [wedstrijd.id])

  useEffect(() => {
    window.api.inschrijvingen
      .getByWedstrijd(huidig.id)
      .then((rs) => setAantalInschrijvingen(rs.length))
  }, [huidig.id, tab])

  // Flush bij wedstrijd-wissel: cleanup loopt voor de nieuwe wedstrijd geladen is.
  useEffect(() => {
    return () => flushConfigSave()
  }, [huidig.id])

  // Flush bij tab-wissel weg van Configuratie zodat een laatste edit niet blijft hangen.
  useEffect(() => {
    if (tab !== 'configuratie') flushConfigSave()
  }, [tab])

  // Flush bij unmount, window blur en sluiten.
  useEffect(() => {
    const onBlurOrUnload = (): void => flushConfigSave()
    window.addEventListener('blur', onBlurOrUnload)
    window.addEventListener('beforeunload', onBlurOrUnload)
    return () => {
      window.removeEventListener('blur', onBlurOrUnload)
      window.removeEventListener('beforeunload', onBlurOrUnload)
      flushConfigSave()
    }
  }, [])

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

  function handleConfigUpdate(patch: Partial<Wedstrijd>): void {
    const nieuw: Wedstrijd = { ...huidig, ...patch }
    setHuidig(nieuw)
    pendingSaveRef.current = nieuw
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const toSave = pendingSaveRef.current
      if (toSave) {
        pendingSaveRef.current = null
        void window.api.wedstrijden.update(toSave)
      }
    }, CONFIG_SAVE_DEBOUNCE_MS)
  }

  async function handleVerwijder(): Promise<void> {
    await window.api.wedstrijden.delete(huidig.id)
    onTerug(true)
  }

  return (
    <>
      <div className="crumb">
        <button onClick={() => onTerug()}>
          <IconArrowLeft /> Wedstrijden
        </button>
        <span>/</span>
        <button onClick={() => setTab('inschrijvingen')}>
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

      <div className="steps">
        {STAPPEN.map((s) => (
          <Step
            key={s.tab}
            icon={s.icon}
            label={s.label}
            badge={
              s.tab === 'inschrijvingen' ? (
                <span className="step-badge mono">{aantalInschrijvingen}</span>
              ) : undefined
            }
            actief={tab === s.tab}
            onClick={() => setTab(s.tab)}
          />
        ))}

        {tab === 'afdrukken' && (
          <div className="afdruk-modus-toggle">
            <ModusKnop
              label="Indeling"
              actief={afdrukModus === 'indeling'}
              onClick={() => setAfdrukModus('indeling')}
            />
            <ModusKnop
              label="Scorekaarten"
              actief={afdrukModus === 'scorekaarten'}
              onClick={() => setAfdrukModus('scorekaarten')}
            />
          </div>
        )}
      </div>

      {tab === 'configuratie' && (
        <ConfiguratieTab
          wedstrijd={huidig}
          onUpdate={handleConfigUpdate}
          onVerwijder={handleVerwijder}
        />
      )}
      {tab === 'inschrijvingen' && (
        <InschrijvingenTab
          wedstrijd={huidig}
          zoek={inschrijvingenZoek}
          onZoekChange={setInschrijvingenZoek}
        />
      )}
      {tab === 'indeling' && <IndelingTab wedstrijd={huidig} />}
      {tab === 'afdrukken' && (
        <AfdrukkenTab
          wedstrijd={huidig}
          modus={afdrukModus}
          indelingFilters={indelingAfdrukFilters}
          onIndelingFiltersChange={updateIndelingAfdrukFilters}
          scorekaartenFilters={scorekaartenAfdrukFilters}
          onScorekaartenFiltersChange={updateScorekaartenAfdrukFilters}
        />
      )}
    </>
  )
}

function Step({
  icon,
  label,
  badge,
  actief,
  onClick
}: {
  icon: React.ReactNode
  label: string
  badge?: React.ReactNode
  actief: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div className={'step' + (actief ? ' actief' : '')}>
      <button className="step-btn" onClick={onClick}>
        <span className="step-icoon">{icon}</span>
        <span className="step-tekst">
          <span className="step-label">{label}</span>
          {badge}
        </span>
      </button>
      <span className="step-connector">
        <IconChevron size={14} richting="rechts" />
      </span>
    </div>
  )
}

// Zelfde opmaak als Step (.step/.step-btn/.step-label), maar zonder cirkel,
// zonder icoon en zonder chevron-connector: dit zijn geen stappen in een
// volgorde, enkel twee gelijkwaardige print-modi. De actieve status blijft
// zichtbaar via dezelfde gele onderstreping en vetgedrukt label.
function ModusKnop({
  label,
  actief,
  onClick
}: {
  label: string
  actief: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div className={'step' + (actief ? ' actief' : '')}>
      <button className="step-btn" onClick={onClick}>
        <span className="step-tekst">
          <span className="step-label">{label}</span>
        </span>
      </button>
    </div>
  )
}
