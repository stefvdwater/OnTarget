import { IconZon } from './icons/IconZon'
import { IconMaan } from './icons/IconMaan'
import { IconWereldbol } from './icons/IconWereldbol'

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
        <a
          className="theme-toggle"
          href="https://ontarget.stefvdwater.be"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Website openen"
        >
          <IconWereldbol />
        </a>
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
