type Pagina = 'wedstrijden' | 'schutters'

interface Props {
  pagina: Pagina
  onSwitch: (p: Pagina) => void
}

export default function Header({ pagina, onSwitch }: Props): JSX.Element {
  return (
    <nav className="flex h-16 items-stretch border-b-4 border-black">
      {/* Merk: gele blok met OnTarget-logo */}
      <div className="flex items-center gap-2 bg-yellow-400 px-5">
        <Bullseye className="h-10 w-10" />
        <span className="font-black tracking-tight text-black text-2xl leading-none">
          nTarget
        </span>
      </div>

      {/* Tabs */}
      <Tab
        label="Wedstrijden"
        active={pagina === 'wedstrijden'}
        onClick={() => onSwitch('wedstrijden')}
        activeColor="bg-red-500"
        inactiveColor="bg-red-500/60 hover:bg-red-500/85"
      />
      <Tab
        label="Schutters"
        active={pagina === 'schutters'}
        onClick={() => onSwitch('schutters')}
        activeColor="bg-blue-500"
        inactiveColor="bg-blue-500/60 hover:bg-blue-500/85"
      />

      {/* Decoratieve afsluiting in De Stijl-stijl */}
      <div className="w-16 bg-black" />
      <div className="flex-1 bg-white" />
    </nav>
  )
}

interface TabProps {
  label: string
  active: boolean
  onClick: () => void
  activeColor: string
  inactiveColor: string
}

function Tab({ label, active, onClick, activeColor, inactiveColor }: TabProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center px-8 text-base font-bold tracking-wide text-white transition-colors ${
        active ? activeColor : inactiveColor
      }`}
    >
      {label}
      {active && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black" />
      )}
    </button>
  )
}

// Schietschijf-icoon met pijl door het centrum
function Bullseye({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#000000" strokeWidth="4" />
      <circle cx="50" cy="50" r="37" fill="#ef4444" />
      <circle cx="50" cy="50" r="26" fill="#ffffff" />
      <circle cx="50" cy="50" r="15" fill="#ef4444" />
      <circle cx="50" cy="50" r="5" fill="#000000" />
      {/* Pijl: schacht + punt + veer */}
      <line
        x1="8"
        y1="92"
        x2="62"
        y2="38"
        stroke="#000000"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <polygon points="68,32 54,38 62,46" fill="#000000" />
      <line x1="8" y1="92" x2="18" y2="82" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
      <line
        x1="14"
        y1="98"
        x2="24"
        y2="88"
        stroke="#000000"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
