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
      className={`flex w-44 shrink-0 flex-col rounded-md border surface-muted transition ${
        isOver
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900'
          : 'border-soft'
      }`}
    >
      {/* Header */}
      <div className="border-b border-soft px-3 py-2">
        <p className="text-xs font-medium text-primary">Niet ingedeeld</p>
        <p className="text-[10px] text-muted">
          {slots.length} schutter{slots.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Schutters */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {slots.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-muted">Iedereen ingedeeld</p>
        ) : (
          slots.map((s) => (
            <SchutterKaart key={s.schutter_id} slot={s} draggableId={`niet-${s.schutter_id}`} />
          ))
        )}
      </div>
    </div>
  )
}
