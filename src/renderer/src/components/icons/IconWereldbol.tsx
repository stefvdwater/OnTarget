// Wereldbol-icoon. Gebruikt voor de website-link. Default 16px sluit aan bij
// het oorspronkelijke gebruik in de header.
import { IconBase, type IconProps } from './IconBase'

export function IconWereldbol({ size = 16 }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </IconBase>
  )
}
