import { useDroppable } from '@dnd-kit/core'
import type { DoelMetConflicten } from '../algoritme/types'
import SchutterKaart from './SchutterKaart'

interface Props {
  doel: DoelMetConflicten
  onVergrendel: () => void
}

const zoneStijl: Record<string, string> = {
  '25m': 'border-slate-200 bg-white',
  compound: 'border-purple-200 bg-purple-50',
  '18m': 'border-amber-200 bg-amber-50',
  '12m': 'border-orange-200 bg-orange-50'
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
      className={`
        flex flex-col rounded-lg border-2 transition
        ${zoneStijl[doel.zone]}
        ${isOver ? 'border-blue-400 ring-2 ring-blue-200' : ''}
        ${doel.vergrendeld ? 'opacity-75' : ''}
      `}
    >
      {/* Doel header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-inherit">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-slate-700">#{doel.nummer}</span>
          {zoneLabel[doel.zone] && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-slate-600">
              {zoneLabel[doel.zone]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {heeftConflicten && (
            <div className="relative group">
              <span className="text-amber-500 cursor-help text-sm">⚠</span>
              {/* Tooltip */}
              <div className="absolute right-0 top-5 z-50 hidden w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl group-hover:block">
                {doel.conflicten.map((c, i) => (
                  <p key={i} className="text-xs text-slate-700 py-0.5">
                    {c.bericht}
                  </p>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onVergrendel}
            title={doel.vergrendeld ? 'Doel ontgrendelen' : 'Doel vergrendelen'}
            className="text-slate-400 hover:text-slate-600 text-xs transition"
          >
            {doel.vergrendeld ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Schutters */}
      <div className="flex-1 p-1.5 space-y-1 min-h-[60px]">
        {doel.schutters.map((s) => (
          <SchutterKaart
            key={s.schutter_id}
            slot={s}
            draggableId={`${doel.nummer}-${s.schutter_id}`}
            conflict={heeftConflicten}
          />
        ))}
        {doel.schutters.length === 0 && (
          <p className="text-center text-[10px] text-slate-300 py-2">leeg</p>
        )}
      </div>

      {/* Teller */}
      <div className="border-t border-inherit px-2 py-0.5 text-[10px] text-slate-400 text-right">
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
