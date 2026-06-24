// Waarschuwingsdriehoek-icoon met uitroepteken. Gebruikt in de
// importreview-tabel, de configuratie-waarschuwingen en de indeling-chip.
import { IconBase, type IconProps } from './IconBase'

export function IconWarn({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M10.29 2 1.82 19a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 2a2 2 0 0 0-3.42 0Z" />
      <path d="M12 8v5M12 18h.01" />
    </IconBase>
  )
}
