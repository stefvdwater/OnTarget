import { Fragment } from 'react'
import type { DoelMetConflicten } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import {
  berekenZichtbareTotalen,
  bouwDoelGroepen,
  bouwGildeGroepen,
  doelLabel,
  formatDatum,
  slotNaarCellen,
  verzamelConflicten,
  type DoelGroep,
  type GildeGroep,
  type PrintOpties,
  type Totalen,
  type PrintConflict
} from './afdruk-helpers'

interface Props {
  wedstrijd: Wedstrijd
  doelen: DoelMetConflicten[]
  opties: PrintOpties
}

export default function PrintDocument({
  wedstrijd,
  doelen,
  opties
}: Props): JSX.Element {
  const totalen = berekenZichtbareTotalen(doelen, opties)
  const conflicten = opties.waarschuwingenTonen ? verzamelConflicten(doelen, opties) : []

  return (
    <>
      <PrintHeader wedstrijd={wedstrijd} />

      {opties.groepering === 'doel' ? (
        <DoelTabel doelen={doelen} opties={opties} />
      ) : (
        <GildeTabel doelen={doelen} opties={opties} />
      )}

      {opties.totalenTonen && totalen.totaalSchutters > 0 && <PrintTotalen totalen={totalen} />}

      {conflicten.length > 0 && <PrintWaarschuwingen conflicten={conflicten} />}
    </>
  )
}

// ── Herbruikbare bouwstenen (ook gebruikt door de gepagineerde preview) ──

export function PrintHeader({ wedstrijd }: { wedstrijd: Wedstrijd }): JSX.Element {
  return (
    <header className="print-header">
      <h1 className="print-titel">{wedstrijd.naam}</h1>
      <div className="print-subtitel">
        {formatDatum(wedstrijd.datum)}
        {wedstrijd.locatie ? ` · ${wedstrijd.locatie}` : ''} · {wedstrijd.aantal_doelen} doelen
      </div>
    </header>
  )
}

export function TabelKop(): JSX.Element {
  return (
    <thead>
      <tr>
        <th style={{ width: '7%' }}>Doel</th>
        <th style={{ width: '24%' }}>Naam</th>
        <th style={{ width: '24%' }}>Gilde</th>
        <th style={{ width: '10%' }}>Boog</th>
        <th style={{ width: '15%' }}>Categorie</th>
        <th style={{ width: '10%' }}>Afstand</th>
        <th style={{ width: '10%' }}>Dubbel</th>
      </tr>
    </thead>
  )
}

export function Cellen({ cellen }: { cellen: string[] }): JSX.Element {
  return (
    <>
      {cellen.map((cel, i) => (
        <td key={i} className={i === 0 ? 'print-cel-doel' : undefined}>{cel}</td>
      ))}
    </>
  )
}

export function DoelGroepTbody({ groep }: { groep: DoelGroep }): JSX.Element {
  return (
    <tbody className="print-doel-groep">
      {groep.rijen.map((r, idx) => (
        <tr key={`${groep.doelNummer}-${idx}`}>
          <Cellen cellen={slotNaarCellen(r.label, r.slot)} />
        </tr>
      ))}
    </tbody>
  )
}

export function GildeKopRij({ gilde, aantal }: { gilde: string; aantal: number }): JSX.Element {
  return (
    <tr className="print-gildekop">
      <td colSpan={7}>
        <strong>{gilde}</strong> <span style={{ color: '#555' }}>({aantal})</span>
      </td>
    </tr>
  )
}

export function GildeDataRij({ rij }: { rij: GildeGroep['rijen'][number] }): JSX.Element {
  return (
    <tr>
      <Cellen cellen={slotNaarCellen(doelLabel(rij.doelNummer, rij.positie1), rij.slot)} />
    </tr>
  )
}

export function PrintTotalen({ totalen }: { totalen: Totalen }): JSX.Element {
  return (
    <section className="print-totalen">
      <div><strong>Totaal schutters:</strong> {totalen.totaalSchutters}</div>
      <div>
        <strong>Per boog:</strong>{' '}
        {Object.entries(totalen.perBoog)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([b, n]) => `${b}: ${n}`)
          .join(' · ')}
      </div>
      <div>
        <strong>Per gilde:</strong>{' '}
        {Object.entries(totalen.perGilde)
          .sort(([a], [b]) => a.localeCompare(b, 'nl'))
          .map(([g, n]) => `${g}: ${n}`)
          .join(' · ')}
      </div>
      <div><strong>Dubbelschutters:</strong> {totalen.aantalDubbel}</div>
    </section>
  )
}

export function PrintWaarschuwingen({ conflicten }: { conflicten: PrintConflict[] }): JSX.Element {
  return (
    <section className="print-waarschuwingen">
      <h3>Aandachtspunten</h3>
      <ul>
        {conflicten.map((c, i) => (
          <li key={i}>
            <strong>Doel {String(c.doelNr).padStart(2, '0')}:</strong> {c.bericht}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Per-doel tabel ──────────────────────────────────────────

function DoelTabel({
  doelen,
  opties
}: {
  doelen: DoelMetConflicten[]
  opties: PrintOpties
}): JSX.Element {
  const groepen = bouwDoelGroepen(doelen, opties)

  return (
    <table className="print-tabel">
      <TabelKop />
      {groepen.map((groep) => (
        <DoelGroepTbody key={groep.doelNummer} groep={groep} />
      ))}
    </table>
  )
}

// ── Per-gilde tabel ─────────────────────────────────────────

function GildeTabel({
  doelen,
  opties
}: {
  doelen: DoelMetConflicten[]
  opties: PrintOpties
}): JSX.Element {
  const groepen = bouwGildeGroepen(doelen, opties)

  return (
    <table className="print-tabel">
      <TabelKop />
      <tbody>
        {groepen.map((groep) => (
          <Fragment key={groep.gilde}>
            <GildeKopRij gilde={groep.gilde} aantal={groep.rijen.length} />
            {groep.rijen.map((r) => (
              <GildeDataRij key={`${groep.gilde}-${r.doelNummer}-${r.slot.schutter_id}`} rij={r} />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
