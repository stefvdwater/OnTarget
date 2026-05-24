import { Fragment } from 'react'
import type { DoelMetConflicten, DoelSlot } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import { categorieLabel } from '../lib/labels'
import {
  berekenTotalen,
  categorieAfkorting,
  doelLabel,
  doelPasseertFilter,
  dubbelLabel,
  passeertFilters,
  vergelijkSchutters,
  type PrintOpties,
  type SorteringDoel,
  type SorteringGilde
} from './afdruk-helpers'

interface Props {
  wedstrijd: Wedstrijd
  doelen: DoelMetConflicten[]
  opties: PrintOpties
  appVersie: string | null
}

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

function formatDatum(datum: string): string {
  const [y, m, d] = datum.split('-')
  return `${parseInt(d, 10)} ${MAANDEN[parseInt(m, 10) - 1]} ${y}`
}

function formatDatumKort(d: Date): string {
  const dag = String(d.getDate()).padStart(2, '0')
  const maand = String(d.getMonth() + 1).padStart(2, '0')
  return `${dag}/${maand}/${d.getFullYear()}`
}

export default function PrintDocument({
  wedstrijd,
  doelen,
  opties,
  appVersie
}: Props): JSX.Element {
  const versieTxt = appVersie ? `OnTarget v${appVersie}` : 'OnTarget'
  const vandaag = formatDatumKort(new Date())

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

      {/* Footer: in print toont CSS deze via position: fixed onderaan elke pagina.
          In de preview zit dezelfde footer onderaan het pagina-blok. Paginanummers
          worden niet geprint omdat Chromium's "Microsoft Print to PDF" geen
          @page counter(page) ondersteunt — datum + versie volstaan. */}
      <footer className="print-footer">
        <span>{vandaag}</span>
        <span>{versieTxt}</span>
      </footer>
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
  const sortering = opties.sortering as SorteringDoel
  const zichtbaar = doelen
    .filter((d) => doelPasseertFilter(d.nummer, opties.filters))
    .sort((a, b) => a.nummer - b.nummer)

  return (
    <table className="print-tabel">
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
      <tbody>
        {zichtbaar.map((doel) => {
          const schutters = doel.schutters
            .filter((s) => passeertFilters(s, doel.nummer, opties.filters))
            .slice()
            .sort((a, b) => vergelijkSchutters(a, b, sortering))

          // Bouw 6 rijen: A..F. Vul met werkelijke schutters in volgorde (sortering).
          // Posities A..F zijn afdruk-posities, niet noodzakelijk de slot.positie.
          const rijen: (DoelSlot | null)[] = []
          for (let i = 0; i < 6; i++) {
            rijen.push(schutters[i] ?? null)
          }
          return rijen.map((s, idx) => (
            <tr key={`${doel.nummer}-${idx}`}>
              <td className="print-cel-doel">{doelLabel(doel.nummer, idx + 1)}</td>
              <td>{s ? `${s.voornaam} ${s.naam}` : ''}</td>
              <td>{s?.gilde_naam ?? ''}</td>
              <td>{s?.type_boog ?? ''}</td>
              <td>{s ? categorieAfkorting(categorieLabel(s)) : ''}</td>
              <td>{s ? `${s.afstand}m` : ''}</td>
              <td>{s ? dubbelLabel(s) : ''}</td>
            </tr>
          ))
        })}
      </tbody>
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
  const sortering = opties.sortering as SorteringGilde

  // Verzamel alle (gefilterde) schutters samen met hun doelnummer + 1-based afdrukpositie.
  // De afdrukpositie binnen een doel volgt de slot.positie-ordening, want bij gilde-groepering
  // is volgorde-binnen-doel irrelevant — we tonen alleen het label "1A" enz.
  type Rij = { doelNummer: number; positie1: number; slot: DoelSlot }
  const allesPerGilde = new Map<string, Rij[]>()
  for (const d of doelen) {
    if (!doelPasseertFilter(d.nummer, opties.filters)) continue
    const gesorteerd = d.schutters.slice().sort((a, b) => a.positie - b.positie)
    gesorteerd.forEach((s, idx) => {
      if (!passeertFilters(s, d.nummer, opties.filters)) return
      const key = s.gilde_naam ?? '(Geen gilde)'
      if (!allesPerGilde.has(key)) allesPerGilde.set(key, [])
      allesPerGilde.get(key)!.push({ doelNummer: d.nummer, positie1: idx + 1, slot: s })
    })
  }

  const gildeKeys = Array.from(allesPerGilde.keys()).sort((a, b) => {
    if (a === '(Geen gilde)') return 1
    if (b === '(Geen gilde)') return -1
    return a.localeCompare(b, 'nl')
  })

  return (
    <table className="print-tabel">
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
      <tbody>
        {gildeKeys.map((gilde) => {
          const rijen = allesPerGilde.get(gilde)!.slice().sort((a, b) => {
            if (sortering === 'positie') {
              if (a.doelNummer !== b.doelNummer) return a.doelNummer - b.doelNummer
              return a.positie1 - b.positie1
            }
            return vergelijkSchutters(a.slot, b.slot, 'naam')
          })
          return (
            <Fragment key={gilde}>
              <tr className="print-gildekop">
                <td colSpan={7}>
                  <strong>{gilde}</strong>{' '}
                  <span style={{ color: '#555' }}>({rijen.length})</span>
                </td>
              </tr>
              {rijen.map((r) => (
                <tr key={`${gilde}-${r.doelNummer}-${r.slot.schutter_id}`}>
                  <td className="print-cel-doel">{doelLabel(r.doelNummer, r.positie1)}</td>
                  <td>{`${r.slot.voornaam} ${r.slot.naam}`}</td>
                  <td>{r.slot.gilde_naam ?? ''}</td>
                  <td>{r.slot.type_boog}</td>
                  <td>{categorieAfkorting(categorieLabel(r.slot))}</td>
                  <td>{`${r.slot.afstand}m`}</td>
                  <td>{dubbelLabel(r.slot)}</td>
                </tr>
              ))}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
