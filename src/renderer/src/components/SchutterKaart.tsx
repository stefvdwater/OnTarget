import { useDraggable } from '@dnd-kit/core'
import type { DoelSlot } from '../algoritme/types'

interface Props {
  slot: DoelSlot
  draggableId: string
  compact?: boolean
  conflict?: boolean
}

const boogStip: Record<string, string> = {
  Recurve: 'bg-sky-500',
  Compound: 'bg-violet-500',
  Barebow: 'bg-emerald-500',
  Andere: 'bg-slate-400'
}

export default function SchutterKaart({
  slot,
  draggableId,
  compact = false,
  conflict = false
}: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: draggableId })

  const dubbelLabel = slot.dubbel_eerste_helft && slot.dubbel_tweede_helft
    ? 'E+T'
    : slot.dubbel_eerste_helft
      ? 'EH'
      : slot.dubbel_tweede_helft
        ? 'TH'
        : null

  const stipKleur = boogStip[slot.type_boog] ?? 'bg-slate-400'

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`relative surface border border-soft rounded-md shadow-sm px-2 py-1.5 text-xs font-medium text-primary cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'opacity-30' : ''
        } ${conflict ? 'ring-2 ring-amber-400' : ''}`}
      >
        {slot.voornaam} {slot.naam}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative surface border border-soft rounded-md shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-30' : ''
      } ${conflict ? 'ring-2 ring-amber-400' : ''}`}
    >
      {dubbelLabel && (
        <span className="absolute -top-1.5 -left-1.5 z-10 rounded bg-amber-100 dark:bg-amber-900/60 px-1 text-[9px] font-semibold text-amber-800 dark:text-amber-200 shadow-sm">
          {dubbelLabel}
        </span>
      )}
      <div className="grid grid-cols-2 grid-rows-2 gap-x-2 gap-y-0.5 px-2 py-1.5">
        <span className="text-xs font-medium text-primary truncate" title={`${slot.voornaam} ${slot.naam}`}>
          {slot.voornaam} {slot.naam}
        </span>
        <span
          className="text-[10px] text-muted text-right truncate"
          title={slot.leeftijdscategorie}
        >
          {slot.leeftijdscategorie}
        </span>
        <span
          className="text-[10px] text-muted truncate"
          title={slot.gilde_naam ?? ''}
        >
          {slot.gilde_naam ?? '—'}
        </span>
        <span className="text-[10px] text-muted text-right flex items-center justify-end gap-1 truncate">
          <span>{slot.type_boog}</span>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${stipKleur}`} aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}
