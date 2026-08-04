import type { DoelSlot } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import { categorieLabel } from '../lib/labels'
import { formatDatumKort, type ScorekaartPagina } from './afdruk-helpers'

interface Props {
  wedstrijd: Wedstrijd
  paginas: ScorekaartPagina[]
}

const RIJEN = Array.from({ length: 10 }, (_, i) => i + 1)

export default function ScorekaartenDocument({ wedstrijd, paginas }: Props): JSX.Element {
  return (
    <>
      {paginas.map((pagina) => (
        <div key={pagina.doelNummer} className="scorekaarten-pagina">
          <div className="scorekaarten-titel">Doel {pagina.doelNummer}</div>
          <div className="scorekaarten-grid">
            {pagina.posities.map((slot, i) => (
              <Scorekaart key={i} wedstrijd={wedstrijd} slot={slot} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function Scorekaart({
  wedstrijd,
  slot
}: {
  wedstrijd: Wedstrijd
  slot: DoelSlot | null
}): JSX.Element {
  return (
    <div className="scorekaart">
      <div className="scorekaart-kop">
        <span>{wedstrijd.naam}</span>
        <span>{formatDatumKort(wedstrijd.datum)}</span>
      </div>

      <div className="scorekaart-info">
        {slot ? (
          <>
            <div className="scorekaart-naam">
              {slot.voornaam} {slot.naam}
            </div>
            <div className="scorekaart-info-rij">
              <span>{slot.gilde_naam ?? '—'}</span>
              <span>{categorieLabel(slot, slot.afstand)}</span>
              <span>{slot.type_boog}</span>
            </div>
          </>
        ) : (
          <div className="scorekaart-naam">&nbsp;</div>
        )}
      </div>

      <table className="scorekaart-tabel">
        <thead>
          <tr>
            <th></th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>Tot.</th>
            <th>
              Alg.
              <br />
              Tot.
            </th>
          </tr>
        </thead>
        <tbody>
          {RIJEN.map((r) => (
            <tr key={r}>
              <td className="scorekaart-cel-rijnr">{r}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="scorekaart-voet">
        <div>Rozen</div>
        <div>Punten</div>
      </div>
    </div>
  )
}
