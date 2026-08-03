import type { DoelSlot } from '../algoritme/types'
import type { Wedstrijd } from '../types'
import { categorieLabel } from '../lib/labels'
import { formatDatumKort, type SchutterskaartPagina } from './afdruk-helpers'

interface Props {
  wedstrijd: Wedstrijd
  paginas: SchutterskaartPagina[]
}

const RIJEN = Array.from({ length: 10 }, (_, i) => i + 1)

export default function SchutterskaartenDocument({ wedstrijd, paginas }: Props): JSX.Element {
  return (
    <>
      {paginas.map((pagina) => (
        <div key={pagina.doelNummer} className="schutterskaarten-pagina">
          <div className="schutterskaarten-titel">Doel {pagina.doelNummer}</div>
          <div className="schutterskaarten-grid">
            {pagina.posities.map((slot, i) => (
              <Schutterskaart key={i} wedstrijd={wedstrijd} slot={slot} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function Schutterskaart({
  wedstrijd,
  slot
}: {
  wedstrijd: Wedstrijd
  slot: DoelSlot | null
}): JSX.Element {
  return (
    <div className="schutterskaart">
      <div className="schutterskaart-kop">
        <span>{wedstrijd.naam}</span>
        <span>{formatDatumKort(wedstrijd.datum)}</span>
      </div>

      <div className="schutterskaart-info">
        {slot ? (
          <>
            <div className="schutterskaart-naam">
              {slot.voornaam} {slot.naam}
            </div>
            <div className="schutterskaart-info-rij">
              <span>{slot.gilde_naam ?? '—'}</span>
              <span>{categorieLabel(slot, slot.afstand)}</span>
              <span>{slot.type_boog}</span>
            </div>
          </>
        ) : (
          <div className="schutterskaart-naam">&nbsp;</div>
        )}
      </div>

      <table className="schutterskaart-tabel">
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
              <td className="schutterskaart-cel-rijnr">{r}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="schutterskaart-voet">
        <div>Rozen</div>
        <div>Punten</div>
      </div>
    </div>
  )
}
