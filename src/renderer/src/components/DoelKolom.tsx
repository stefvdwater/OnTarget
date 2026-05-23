import { useDroppable } from '@dnd-kit/core'
import type { DoelMetConflicten } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'

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
        : maxBeurten > 5
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
          <span className={'doel-bezetting ' + bezKlasse}>{bezetting}/5</span>
          <button
            className={'lock-btn' + (doel.vergrendeld ? ' active' : '')}
            onClick={onVergrendel}
            title={doel.vergrendeld ? 'Doel ontgrendelen' : 'Doel vergrendelen'}
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
          doel.schutters.map((s) => (
            <SchutterKaart
              key={s.schutter_id}
              slot={s}
              draggableId={`${doel.nummer}-${s.schutter_id}`}
              compact
              conflict={heeftConflicten}
            />
          ))
        )}
      </div>

      {heeftConflicten && (
        <div className="doel-warn" title={doel.conflicten.map((c) => c.bericht).join('\n')}>
          <IconWarn />
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

function IconLock(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function IconUnlock(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </svg>
  )
}

function IconWarn(): JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}
