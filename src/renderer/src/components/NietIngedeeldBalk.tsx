import { useDroppable } from '@dnd-kit/core'
import type { DoelSlot } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'

interface Props {
  slots: DoelSlot[]
  totaal: number
}

export default function NietIngedeeldBalk({ slots, totaal }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: 'niet-ingedeeld' })

  return (
    <aside ref={setNodeRef} className={'aanmeldlijst' + (isOver ? ' drag-over' : '')}>
      <div className="aanmeldlijst-head">
        <h3>Aanmeldvolgorde</h3>
        <span className="count">
          {slots.length} / {totaal}
        </span>
      </div>
      <div className="aanmeldlijst-body">
        {slots.length === 0 ? (
          <div className="aanmeldlijst-empty">
            Iedereen ingedeeld
            <div style={{ marginTop: 8, fontSize: 11 }}>
              Sleep schutters terug om opnieuw in te delen.
            </div>
          </div>
        ) : (
          slots.map((s, idx) => (
            <div key={s.schutter_id} className="aanmeld-row">
              <div className="pos">{String(idx + 1).padStart(2, '0')}</div>
              <SchutterKaart slot={s} draggableId={`niet-${s.schutter_id}`} />
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
