import { useDroppable } from '@dnd-kit/core'
import type { DoelSlot } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'

interface Props {
  slots: DoelSlot[]
}

export default function NietIngedeeldBalk({ slots }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: 'niet-ingedeeld' })

  return (
    <div
      ref={setNodeRef}
      className={`
        flex w-44 shrink-0 flex-col rounded-lg border-2 transition
        ${isOver ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50'}
      `}
    >
      {/* Header */}
      <div className="border-b border-inherit px-3 py-2">
        <p className="text-xs font-semibold text-slate-600">Niet ingedeeld</p>
        <p className="text-[10px] text-slate-400">{slots.length} schutter{slots.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Schutters */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {slots.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-slate-300">Iedereen ingedeeld</p>
        ) : (
          slots.map((s) => (
            <SchutterKaart
              key={s.schutter_id}
              slot={s}
              draggableId={`niet-${s.schutter_id}`}
            />
          ))
        )}
      </div>
    </div>
  )
}
