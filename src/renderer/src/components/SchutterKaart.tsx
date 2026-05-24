import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DoelSlot } from '../algoritme/types'
import { categorieLabel } from '../lib/labels'

interface Props {
  slot: DoelSlot
  draggableId: string
  compact?: boolean
  conflict?: boolean
}

export default function SchutterKaart({
  slot,
  draggableId,
  compact = false,
  conflict = false
}: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const fullNaam = `${slot.voornaam} ${slot.naam}`
  const catLabel = categorieLabel(
    slot.leeftijdscategorie as 'Aspirant' | 'Jeugd' | 'Junior' | 'Senior' | 'Veteraan',
    slot.geslacht
  )
  const d1 = slot.dubbel_eerste_helft
  const d2 = slot.dubbel_tweede_helft
  const dubbelLabel = d1 && d2 ? 'Dubbel' : d1 ? 'Dubbel 1e' : d2 ? 'Dubbel 2e' : null
  const dubbelTitle =
    d1 && d2
      ? 'Schiet dubbel: beide helften'
      : d1
        ? 'Schiet dubbel: eerste helft'
        : d2
          ? 'Schiet dubbel: tweede helft'
          : ''

  const className =
    'schutter' +
    (compact ? ' compact' : '') +
    (isDragging ? ' dragging' : '') +
    (conflict ? ' conflict' : '')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={className}
      data-boog={slot.type_boog}
      title={`${fullNaam} — ${slot.gilde_naam ?? '—'} — ${slot.type_boog} — ${catLabel} — ${slot.afstand}m${
        dubbelTitle ? ' — ' + dubbelTitle : ''
      }`}
    >
      <div className="naam-wrap">
        <span className="naam">{fullNaam}</span>
        {dubbelLabel && (
          <span
            className={'dubbel-badge' + (d1 && d2 ? ' full' : '')}
            title={dubbelTitle}
          >
            {dubbelLabel}
          </span>
        )}
      </div>
      <div className="leeftijd">{catLabel}</div>
      <div className="gilde">{slot.gilde_naam ?? '—'}</div>
      <div className="boog">{slot.type_boog}</div>
    </div>
  )
}
