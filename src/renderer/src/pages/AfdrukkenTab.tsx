import type { Wedstrijd } from '../types'
import type { IndelingAfdrukFilters, ScorekaartenAfdrukFilters } from '../components/afdruk-helpers'
import IndelingAfdrukTab from './IndelingAfdrukTab'
import ScorekaartenAfdrukTab from './ScorekaartenAfdrukTab'

export type AfdrukModus = 'indeling' | 'scorekaarten'

interface Props {
  wedstrijd: Wedstrijd
  modus: AfdrukModus
  indelingFilters: IndelingAfdrukFilters
  onIndelingFiltersChange: (patch: Partial<IndelingAfdrukFilters>) => void
  scorekaartenFilters: ScorekaartenAfdrukFilters
  onScorekaartenFiltersChange: (patch: Partial<ScorekaartenAfdrukFilters>) => void
}

export default function AfdrukkenTab({
  wedstrijd,
  modus,
  indelingFilters,
  onIndelingFiltersChange,
  scorekaartenFilters,
  onScorekaartenFiltersChange
}: Props): JSX.Element {
  return modus === 'indeling' ? (
    <IndelingAfdrukTab
      wedstrijd={wedstrijd}
      filters={indelingFilters}
      onFiltersChange={onIndelingFiltersChange}
    />
  ) : (
    <ScorekaartenAfdrukTab
      wedstrijd={wedstrijd}
      filters={scorekaartenFilters}
      onFiltersChange={onScorekaartenFiltersChange}
    />
  )
}
