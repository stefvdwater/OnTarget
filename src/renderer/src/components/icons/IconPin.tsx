// Locatie-pin-icoon. Gebruikt bij de wedstrijdlocatie.
import { IconBase, type IconProps } from './IconBase'

export function IconPin({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  )
}
