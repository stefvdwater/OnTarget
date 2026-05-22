import { useState } from 'react'
import MenuDropdown, { type MenuItem } from './MenuDropdown'
import type { MenuActions } from '../hooks/MenuContext'

type Pagina = 'wedstrijden' | 'schutters'

interface Props {
  pagina: Pagina
  onSwitch: (p: Pagina) => void
  isDark: boolean
  onToggleDark: () => void
  actions: MenuActions
}

export default function Header({
  pagina,
  onSwitch,
  isDark,
  onToggleDark,
  actions
}: Props): JSX.Element {
  const [overOpen, setOverOpen] = useState(false)

  const bestand: MenuItem[] = [
    {
      label: 'Nieuwe wedstrijd…',
      onClick: () => {
        onSwitch('wedstrijden')
        actions.nieuweWedstrijd?.()
      },
      disabled: !actions.nieuweWedstrijd && pagina !== 'wedstrijden'
    },
    { label: 'Importeer schutters…', disabled: true },
    { label: 'Exporteer naar PDF', disabled: true },
    { divider: true, label: '' },
    { label: 'Afsluiten', onClick: () => window.close() }
  ]

  const start: MenuItem[] = [
    {
      label: 'Auto-indeling',
      onClick: actions.autoIndeling,
      disabled: !actions.autoIndeling
    },
    {
      label: 'Opslaan',
      onClick: actions.opslaan,
      disabled: !actions.opslaan
    },
    { divider: true, label: '' },
    {
      label: 'Demo-data laden',
      onClick: actions.demoData,
      disabled: !actions.demoData
    }
  ]

  const beeld: MenuItem[] = [
    { label: 'Donkere modus', onClick: onToggleDark, checked: isDark },
    { divider: true, label: '' },
    {
      label: 'Wedstrijden',
      onClick: () => onSwitch('wedstrijden'),
      checked: pagina === 'wedstrijden'
    },
    {
      label: 'Schutters',
      onClick: () => onSwitch('schutters'),
      checked: pagina === 'schutters'
    }
  ]

  const help: MenuItem[] = [
    { label: 'Documentatie', disabled: true },
    { label: 'Over OnTarget', onClick: () => setOverOpen(true) }
  ]

  return (
    <>
      {/* Rij 1 — Menubalk */}
      <nav className="flex h-9 items-stretch surface border-b border-soft select-none">
        <div className="flex items-center pl-3 pr-4">
          <span className="text-sm font-semibold tracking-tight text-primary">OnTarget</span>
        </div>
        <MenuDropdown label="Bestand" items={bestand} />
        <MenuDropdown label="Start" items={start} />
        <MenuDropdown label="Beeld" items={beeld} />
        <MenuDropdown label="Help" items={help} />
        <div className="flex-1" />
        <button
          onClick={onToggleDark}
          aria-label="Donkere modus wisselen"
          title={isDark ? 'Lichte modus' : 'Donkere modus'}
          className="flex items-center justify-center px-3 text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <IconZon /> : <IconMaan />}
        </button>
      </nav>

      {/* Rij 2 — Sub-nav */}
      <div className="flex h-9 items-stretch surface-muted border-b border-soft select-none">
        <SubTab
          label="Wedstrijden"
          active={pagina === 'wedstrijden'}
          onClick={() => onSwitch('wedstrijden')}
        />
        <SubTab
          label="Schutters"
          active={pagina === 'schutters'}
          onClick={() => onSwitch('schutters')}
        />
      </div>

      {overOpen && <OverModal onClose={() => setOverOpen(false)} />}
    </>
  )
}

function SubTab({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 text-sm transition-colors ${
        active
          ? 'text-primary font-medium'
          : 'text-muted hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {label}
      {active && (
        <span className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
      )}
    </button>
  )
}

function OverModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface border border-soft rounded-md shadow-lg max-w-sm w-full p-6"
      >
        <h2 className="text-lg font-semibold text-primary mb-2">OnTarget</h2>
        <p className="text-sm text-muted mb-1">Doelindelingsapp voor boogschietwedstrijden.</p>
        <p className="text-sm text-muted mb-4">Versie 0.1.0</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}

function IconZon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconMaan(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
