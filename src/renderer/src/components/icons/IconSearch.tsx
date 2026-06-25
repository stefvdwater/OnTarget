// Vergrootglas-icoon. Gebruikt in zoekvelden. Default 15px sluit aan bij
// het oorspronkelijke gebruik.
import { IconBase, type IconProps } from './IconBase'

export function IconSearch({ size = 15 }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </IconBase>
  )
}
