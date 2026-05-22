import { useDraggable } from '@dnd-kit/core'
import type { DoelSlot } from '../algoritme/types'

interface Props {
  slot: DoelSlot
  draggableId: string
  compact?: boolean
  conflict?: boolean
}

const boogkleur: Record<string, string> = {
  Compound: 'bg-purple-100 text-purple-700 border-purple-200',
  Recurve: 'bg-blue-50 text-blue-700 border-blue-200',
  Barebow: 'bg-green-50 text-green-700 border-green-200',
  Andere: 'bg-slate-100 text-slate-600 border-slate-200'
}

export default function SchutterKaart({ slot, draggableId, compact = false, conflict = false }: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: draggableId })

  const dubbel = slot.dubbel_eerste_helft || slot.dubbel_tweede_helft
  const dubbelLabel = slot.dubbel_eerste_helft && slot.dubbel_tweede_helft
    ? 'D'
    : slot.dubbel_eerste_helft
    ? 'D1'
    : slot.dubbel_tweede_helft
    ? 'D2'
    : null

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        select-none rounded border px-2 py-1 text-xs cursor-grab active:cursor-grabbing transition
        ${boogkleur[slot.type_boog] ?? 'bg-slate-50 border-slate-200'}
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${conflict ? 'ring-2 ring-amber-400' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium truncate">
          {slot.voornaam} {slot.naam}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {dubbel && (
            <span className="rounded bg-amber-100 px-1 text-amber-700 font-bold text-[10px]">
              {dubbelLabel}
            </span>
          )}
        </div>
      </div>
      {!compact && slot.gilde_naam && (
        <p className="mt-0.5 truncate text-[10px] opacity-70">{slot.gilde_naam}</p>
      )}
    </div>
  )
}
