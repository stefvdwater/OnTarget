import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DoelMetConflicten } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'
import { IconWarn } from './icons/IconWarn'
import { IconLock } from './icons/IconLock'
import { IconUnlock } from './icons/IconUnlock'

interface Props {
  doel: DoelMetConflicten
  onVergrendel: () => void
}

export default function DoelKolom({ doel, onVergrendel }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: `doel-${doel.nummer}` })

  const bezetting = doel.schutters.length
  const beurtenEerste = berekenBeurten(doel.schutters, 'eerste')
  const beurtenTweede = berekenBeurten(doel.schutters, 'tweede')
  const maxBeurten = Math.max(beurtenEerste, beurtenTweede)
  const heeftConflicten = doel.conflicten.length > 0
  const isCompound = doel.zone === 'compound'

  const bezKlasse =
    maxBeurten === 0
      ? ''
      : maxBeurten >= 4 && maxBeurten <= 5
        ? 'ok'
        : maxBeurten === 6
          ? 'warn'
          : ''

  const className =
    'doel' +
    (isOver ? ' drag-over' : '') +
    (doel.vergrendeld ? ' locked' : '') +
    (isCompound ? ' compound' : '') +
    (maxBeurten > 6 ? ' over-bezet' : '')

  return (
    <div ref={setNodeRef} className={className}>
      <div className="doel-head">
        <div className="doel-num">
          <span className="n">Doel {String(doel.nummer).padStart(2, '0')}</span>
          {isCompound && <span className="doel-tag compound">Compound</span>}
          {doel.zone === '18m' && <span className="doel-tag">18m</span>}
          {doel.zone === '12m' && <span className="doel-tag">12m</span>}
        </div>
        <div className="doel-actions">
          <span className={'doel-bezetting ' + bezKlasse}>{maxBeurten}/6</span>
          <button
            className={'lock-btn' + (doel.vergrendeld ? ' active' : '')}
            onClick={onVergrendel}
          >
            {doel.vergrendeld ? <IconLock /> : <IconUnlock />}
          </button>
        </div>
      </div>

      <div className={'doel-body' + (bezetting === 0 ? ' empty' : '')}>
        {bezetting === 0 ? (
          doel.vergrendeld ? (
            'Vergrendeld — leeg'
          ) : (
            'Sleep schutters hierheen'
          )
        ) : (
          <SortableContext
            items={doel.schutters.map((s) => `${doel.nummer}-${s.schutter_id}`)}
            strategy={verticalListSortingStrategy}
          >
            {doel.schutters.map((s) => (
              <SchutterKaart
                key={s.schutter_id}
                slot={s}
                draggableId={`${doel.nummer}-${s.schutter_id}`}
                compact
                conflict={heeftConflicten}
              />
            ))}
          </SortableContext>
        )}
      </div>

      {heeftConflicten && (
        <div className="doel-warn">
          <IconWarn size={13} />
          <span>
            {doel.conflicten[0].bericht}
            {doel.conflicten.length > 1 ? ` (+${doel.conflicten.length - 1})` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

function berekenBeurten(slots: DoelMetConflicten['schutters'], helft: 'eerste' | 'tweede'): number {
  return slots.reduce((som, s) => {
    if (helft === 'eerste') {
      if (!s.dubbel_eerste_helft && s.dubbel_tweede_helft) return som
      return som + (s.dubbel_eerste_helft ? 2 : 1)
    } else {
      if (s.dubbel_eerste_helft && !s.dubbel_tweede_helft) return som
      return som + (s.dubbel_tweede_helft ? 2 : 1)
    }
  }, 0)
}

