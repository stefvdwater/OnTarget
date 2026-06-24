import { useState } from 'react'
import type { Wedstrijd } from '../types'
import { IconWarn } from '../components/icons/IconWarn'
import WedstrijdVerwijderModal from '../components/WedstrijdVerwijderModal'

interface Props {
  wedstrijd: Wedstrijd
  onUpdate: (patch: Partial<Wedstrijd>) => void
  onVerwijder: () => void
}

export default function ConfiguratieTab({ wedstrijd, onUpdate, onVerwijder }: Props): JSX.Element {
  const [verwijderBevestig, setVerwijderBevestig] = useState(false)

  const w = wedstrijd
  const aantal25m = Math.max(0, w.aantal_doelen - w.aantal_doelen_18m - w.aantal_doelen_12m)
  const aantalCompound = w.aantal_compound_doelen ?? 1
  const compoundEind = w.compound_startdoel + aantalCompound - 1
  const compoundBuitenZone = w.compound_startdoel < 1 || compoundEind > aantal25m

  return (
    <div className="config-layout">
      {/* Algemene gegevens */}
      <section className="config-card">
        <header>
          <h2>Algemene gegevens</h2>
          <p>Naam, datum en locatie van de wedstrijd.</p>
        </header>
        <div className="config-grid">
          <Veld label="Naam" full>
            <input
              className="input"
              value={w.naam}
              onChange={(e) => onUpdate({ naam: e.target.value })}
            />
          </Veld>
          <Veld label="Datum">
            <input
              type="date"
              className="input"
              value={w.datum}
              onChange={(e) => onUpdate({ datum: e.target.value })}
            />
          </Veld>
          <Veld label="Locatie">
            <input
              className="input"
              value={w.locatie ?? ''}
              onChange={(e) => onUpdate({ locatie: e.target.value })}
            />
          </Veld>
        </div>
      </section>

      {/* Doelen */}
      <section className="config-card">
        <header>
          <h2>Doelen</h2>
          <p>Aantal doelen per afstand. Het totaal wordt automatisch berekend.</p>
        </header>
        <div className="config-grid">
          <Veld label="Aantal 25m-doelen">
            <input
              type="number"
              min={0}
              className="input"
              value={aantal25m}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                onUpdate({ aantal_doelen: v + w.aantal_doelen_18m + w.aantal_doelen_12m })
              }}
            />
          </Veld>
          <Veld label="Aantal 18m-doelen">
            <input
              type="number"
              min={0}
              className="input"
              value={w.aantal_doelen_18m}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                onUpdate({
                  aantal_doelen_18m: v,
                  aantal_doelen: aantal25m + v + w.aantal_doelen_12m
                })
              }}
            />
          </Veld>
          <Veld label="Aantal 12m-doelen">
            <input
              type="number"
              min={0}
              className="input"
              value={w.aantal_doelen_12m}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                onUpdate({
                  aantal_doelen_12m: v,
                  aantal_doelen: aantal25m + w.aantal_doelen_18m + v
                })
              }}
            />
          </Veld>
        </div>

        <div className="zone-overzicht">
          <ZoneBalkje label="25m" aantal={aantal25m} kleur="var(--blue)" />
          <ZoneBalkje label="18m" aantal={w.aantal_doelen_18m} kleur="var(--yellow)" />
          <ZoneBalkje label="12m" aantal={w.aantal_doelen_12m} kleur="var(--red)" />
          <div className="zone-totaal mono">= {w.aantal_doelen} doelen totaal</div>
        </div>
      </section>

      {/* Compound */}
      <section className="config-card">
        <header>
          <h2>Compound-doelen</h2>
          <p>
            Op welk(e) 25m-doel(en) staan de compound-schutters? Het startdoel is het eerste,
            de doelen erna lopen op tot het aantal compound-doelen.
          </p>
        </header>
        <div className="config-grid">
          <Veld label="Startdoel (compound)">
            <input
              type="number"
              min={0}
              max={Math.max(1, aantal25m)}
              className="input"
              value={w.compound_startdoel}
              onChange={(e) =>
                onUpdate({
                  compound_startdoel: Math.max(0, parseInt(e.target.value || '0', 10))
                })
              }
            />
          </Veld>
          <Veld label="Aantal compound-doelen">
            <input
              type="number"
              min={0}
              className="input"
              value={aantalCompound}
              onChange={(e) =>
                onUpdate({
                  aantal_compound_doelen: Math.max(0, parseInt(e.target.value || '0', 10))
                })
              }
            />
          </Veld>
          <Veld label="Compound op doel(en)">
            <div className="readonly mono">
              {aantalCompound === 0
                ? '—'
                : aantalCompound === 1
                  ? `Doel ${String(w.compound_startdoel).padStart(2, '0')}`
                  : `Doel ${String(w.compound_startdoel).padStart(2, '0')} – ${String(compoundEind).padStart(2, '0')}`}
            </div>
          </Veld>
        </div>
        {compoundBuitenZone && aantalCompound > 0 && (
          <div className="config-warn">
            <IconWarn size={16} /> Compound-doelen vallen buiten de 25m-zone (1 – {aantal25m}).
          </div>
        )}
      </section>

      {/* Gevarenzone */}
      <section className="config-card danger">
        <header>
          <h2>Gevarenzone</h2>
          <p>Onomkeerbare acties: alle inschrijvingen en indelingen verdwijnen.</p>
        </header>
        <div className="config-actions">
          <button className="btn danger" onClick={() => setVerwijderBevestig(true)}>
            Wedstrijd verwijderen
          </button>
        </div>
      </section>

      {verwijderBevestig && (
        <WedstrijdVerwijderModal
          wedstrijd={w}
          onAnnuleer={() => setVerwijderBevestig(false)}
          onBevestig={onVerwijder}
        />
      )}
    </div>
  )
}

function Veld({
  label,
  full,
  children
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <label className={'config-veld' + (full ? ' full' : '')}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function ZoneBalkje({
  label,
  aantal,
  kleur
}: {
  label: string
  aantal: number
  kleur: string
}): JSX.Element | null {
  if (aantal <= 0) return null
  return (
    <div className="zone-balk">
      <span className="zone-dot" style={{ background: kleur }} />
      <span className="zone-label">{label}</span>
      <span className="zone-aantal mono">×{aantal}</span>
    </div>
  )
}
