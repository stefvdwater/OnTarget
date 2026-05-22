import { useDroppable } from '@dnd-kit/core'
import type { DoelMetConflicten } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'

interface Props {
  doel: DoelMetConflicten
  onVergrendel: () => void
}

// Subtiele 2px-strip bovenaan om zones te onderscheiden zonder volle vlakvulling
const zoneStrip: Record<string, string> = {
  '25m': 'bg-slate-300 dark:bg-slate-600',
  compound: 'bg-violet-400',
  '18m': 'bg-amber-400',
  '12m': 'bg-orange-400'
}

const zoneLabel: Record<string, string | null> = {
  '25m': null,
  compound: 'Compound',
  '18m': '18m',
  '12m': '12m'
}

export default function DoelKolom({ doel, onVergrendel }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: `doel-${doel.nummer}` })

  const heeftConflicten = doel.conflicten.length > 0

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-md border surface-muted overflow-hidden transition ${
        isOver
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900'
          : 'border-soft'
      } ${doel.vergrendeld ? 'opacity-75' : ''}`}
    >
      {/* Zone-strip */}
      <div className={`h-0.5 w-full ${zoneStrip[doel.zone]}`} aria-hidden="true" />

      {/* Doel header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-soft">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-primary">#{doel.nummer}</span>
          {zoneLabel[doel.zone] && (
            <span className="text-[10px] font-medium text-muted">{zoneLabel[doel.zone]}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {heeftConflicten && (
            <div className="relative group">
              <span className="text-amber-500 cursor-help text-sm">⚠</span>
              <div className="absolute right-0 top-5 z-50 hidden w-56 surface border border-soft rounded-md p-2 shadow-lg group-hover:block">
                {doel.conflicten.map((c, i) => (
                  <p key={i} className="text-xs text-primary py-0.5">
                    {c.bericht}
                  </p>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onVergrendel}
            title={doel.vergrendeld ? 'Doel ontgrendelen' : 'Doel vergrendelen'}
            className="text-muted hover:text-primary text-xs transition"
          >
            {doel.vergrendeld ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Schutters */}
      <div className="flex-1 p-1.5 space-y-1.5 min-h-[60px]">
        {doel.schutters.map((s) => (
          <SchutterKaart
            key={s.schutter_id}
            slot={s}
            draggableId={`${doel.nummer}-${s.schutter_id}`}
            conflict={heeftConflicten}
          />
        ))}
        {doel.schutters.length === 0 && (
          <p className="text-center text-[10px] text-muted py-2">leeg</p>
        )}
      </div>

      {/* Teller */}
      <div className="border-t border-soft px-2 py-0.5 text-[10px] text-muted text-right">
        {(() => {
          const b1 = doel.schutters.reduce((som, s) => {
            if (!s.dubbel_eerste_helft && s.dubbel_tweede_helft) return som
            return som + (s.dubbel_eerste_helft ? 2 : 1)
          }, 0)
          const b2 = doel.schutters.reduce((som, s) => {
            if (s.dubbel_eerste_helft && !s.dubbel_tweede_helft) return som
            return som + (s.dubbel_tweede_helft ? 2 : 1)
          }, 0)
          return `${doel.schutters.length} schutter${doel.schutters.length !== 1 ? 's' : ''} · ${b1}/${b2} beurten`
        })()}
      </div>
    </div>
  )
}
