import type { Wedstrijd } from '../types'
import IndelingAfdrukTab from './IndelingAfdrukTab'
import ScorekaartenAfdrukTab from './ScorekaartenAfdrukTab'

export type AfdrukModus = 'indeling' | 'scorekaarten'

interface Props {
  wedstrijd: Wedstrijd
  modus: AfdrukModus
}

export default function AfdrukkenTab({ wedstrijd, modus }: Props): JSX.Element {
  return modus === 'indeling' ? (
    <IndelingAfdrukTab wedstrijd={wedstrijd} />
  ) : (
    <ScorekaartenAfdrukTab wedstrijd={wedstrijd} />
  )
}
