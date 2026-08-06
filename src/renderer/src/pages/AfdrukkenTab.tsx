import type { Wedstrijd } from '../types'
import type { IndelingAfdrukFilters, ScorekaartenAfdrukFilters } from '../components/afdruk-helpers'
import type { PatchFn } from '../hooks/usePatchState'
import IndelingAfdrukTab from './IndelingAfdrukTab'
import ScorekaartenAfdrukTab from './ScorekaartenAfdrukTab'

export type AfdrukModus = 'indeling' | 'scorekaarten'

interface ModusProps<T> {
  filters: T
  onFiltersChange: PatchFn<T>
}

interface Props {
  wedstrijd: Wedstrijd
  modus: AfdrukModus
  indeling: ModusProps<IndelingAfdrukFilters>
  scorekaarten: ModusProps<ScorekaartenAfdrukFilters>
}

export default function AfdrukkenTab({ wedstrijd, modus, indeling, scorekaarten }: Props): JSX.Element {
  return modus === 'indeling' ? (
    <IndelingAfdrukTab
      wedstrijd={wedstrijd}
      filters={indeling.filters}
      onFiltersChange={indeling.onFiltersChange}
    />
  ) : (
    <ScorekaartenAfdrukTab
      wedstrijd={wedstrijd}
      filters={scorekaarten.filters}
      onFiltersChange={scorekaarten.onFiltersChange}
    />
  )
}
