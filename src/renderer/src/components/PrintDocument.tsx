import { Fragment } from 'react'
import type { DoelMetConflicten, DoelSlot } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import {
  berekenTotalen,
  bouwDoelGroepen,
  bouwGildeGroepen,
  doelLabel,
  doelPasseertFilter,
  formatDatum,
  passeertFilters,
  slotNaarCellen,
  type PrintOpties
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
  // Verzamel alle (gefilterde) ingedeelde schutters voor totalen
  const alleGefilterdeSchutters: DoelSlot[] = []
  for (const d of doelen) {
    for (const s of d.schutters) {
      if (passeertFilters(s, d.nummer, opties.filters)) {
        alleGefilterdeSchutters.push(s)
      }
    }
  }
  const totalen = berekenTotalen(alleGefilterdeSchutters)

  const conflicten = opties.waarschuwingenTonen
    ? doelen
        .filter((d) => d.conflicten.length > 0 && doelPasseertFilter(d.nummer, opties.filters))
        .flatMap((d) => d.conflicten.map((c) => ({ doelNr: d.nummer, bericht: c.bericht })))
    : []

  return (
    <>
      <header className="print-header">
        <h1 className="print-titel">{wedstrijd.naam}</h1>
        <div className="print-subtitel">
          {formatDatum(wedstrijd.datum)}
          {wedstrijd.locatie ? ` · ${wedstrijd.locatie}` : ''} · {wedstrijd.aantal_doelen} doelen
        </div>
      </header>

      {opties.groepering === 'doel' ? (
        <DoelTabel doelen={doelen} opties={opties} />
      ) : (
        <GildeTabel doelen={doelen} opties={opties} />
      )}

      {opties.totalenTonen && totalen.totaalSchutters > 0 && (
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
      )}

      {conflicten.length > 0 && (
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
      )}
    </>
  )
}

// ── Gedeelde kolomkop ───────────────────────────────────────

function TabelKop(): JSX.Element {
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

function Cellen({ cellen }: { cellen: string[] }): JSX.Element {
  return (
    <>
      {cellen.map((cel, i) => (
        <td key={i} className={i === 0 ? 'print-cel-doel' : undefined}>{cel}</td>
      ))}
    </>
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
        <tbody key={groep.doelNummer} className="print-doel-groep">
          {groep.rijen.map((r, idx) => (
            <tr key={`${groep.doelNummer}-${idx}`}>
              <Cellen cellen={slotNaarCellen(r.label, r.slot)} />
            </tr>
          ))}
        </tbody>
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
            <tr className="print-gildekop">
              <td colSpan={7}>
                <strong>{groep.gilde}</strong>{' '}
                <span style={{ color: '#555' }}>({groep.rijen.length})</span>
              </td>
            </tr>
            {groep.rijen.map((r) => (
              <tr key={`${groep.gilde}-${r.doelNummer}-${r.slot.schutter_id}`}>
                <Cellen cellen={slotNaarCellen(doelLabel(r.doelNummer, r.positie1), r.slot)} />
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
