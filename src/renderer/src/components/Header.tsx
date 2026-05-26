type Pagina = 'wedstrijden' | 'schutters'

interface Props {
  pagina: Pagina
  onSwitch: (p: Pagina) => void
  isDark: boolean
  onToggleDark: () => void
}

export default function Header({ pagina, onSwitch, isDark, onToggleDark }: Props): JSX.Element {
  return (
    <header className="topbar">
      <button
        type="button"
        className="brand brand-button"
        onClick={() => onSwitch('wedstrijden')}
      >
        <TargetMark className="brand-mark" />
        <span>OnTarget</span>
      </button>
      <nav className="nav">
        <button
          className={'nav-item' + (pagina === 'wedstrijden' ? ' active' : '')}
          onClick={() => onSwitch('wedstrijden')}
        >
          Wedstrijden
        </button>
        <button
          className={'nav-item' + (pagina === 'schutters' ? ' active' : '')}
          onClick={() => onSwitch('schutters')}
        >
          Schutters
        </button>
      </nav>
      <div className="topbar-spacer" />
      <div className="topbar-right">
        <button
          className="theme-toggle"
          onClick={onToggleDark}
          aria-label="Donkere modus wisselen"
        >
          {isDark ? <IconZon /> : <IconMaan />}
        </button>
      </div>
    </header>
  )
}

function TargetMark({ className }: { className?: string }): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#1c1917" />
      <circle cx="16" cy="16" r="11.5" fill="#1d70b8" />
      <circle cx="16" cy="16" r="8" fill="#e63946" />
      <circle cx="16" cy="16" r="4.5" fill="#f5c518" />
      <circle cx="16" cy="16" r="1.2" fill="#fff" />
    </svg>
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
