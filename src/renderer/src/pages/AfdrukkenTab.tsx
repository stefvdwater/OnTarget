import { useState } from 'react'
import type { Wedstrijd } from '../types'
import IndelingAfdrukTab from './IndelingAfdrukTab'
import SchutterskaartenAfdrukTab from './SchutterskaartenAfdrukTab'

interface Props {
  wedstrijd: Wedstrijd
}

type AfdrukModus = 'indeling' | 'schutterskaarten'

// Placeholder-toggle: de definitieve vormgeving hiervan ligt nog niet vast,
// hergebruikt daarom bewust de bestaande .afdruk-radio-* stijl i.p.v. iets
// nieuws te ontwerpen.
export default function AfdrukkenTab({ wedstrijd }: Props): JSX.Element {
  const [modus, setModus] = useState<AfdrukModus>('indeling')

  return (
    <div>
      <div className="afdruk-modus-toggle afdruk-radio-rij">
        <label className="afdruk-radio">
          <input
            type="radio"
            name="afdruk-modus"
            checked={modus === 'indeling'}
            onChange={() => setModus('indeling')}
          />
          Indeling
        </label>
        <label className="afdruk-radio">
          <input
            type="radio"
            name="afdruk-modus"
            checked={modus === 'schutterskaarten'}
            onChange={() => setModus('schutterskaarten')}
          />
          Schutterskaarten
        </label>
      </div>

      {modus === 'indeling' ? (
        <IndelingAfdrukTab wedstrijd={wedstrijd} />
      ) : (
        <SchutterskaartenAfdrukTab wedstrijd={wedstrijd} />
      )}
    </div>
  )
}
