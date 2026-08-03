// Chevron-icoon, default pijl omlaag (dropdown-knoppen). `richting="rechts"`
// draait 'm naar rechts (bv. stap-connectors), zonder dat de gebruiker zelf
// met een CSS-transform moet werken.
// Default 10px sluit aan bij het oorspronkelijke gebruik.
import { IconBase, type IconProps } from './IconBase'

interface ChevronProps extends IconProps {
  richting?: 'omlaag' | 'rechts'
}

export function IconChevron({ size = 10, richting = 'omlaag' }: ChevronProps): JSX.Element {
  return (
    <IconBase
      size={size}
      strokeWidth={2.4}
      style={richting === 'rechts' ? { transform: 'rotate(-90deg)' } : undefined}
    >
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  )
}
