// Maan-icoon. Gebruikt in de dark-mode-schakelaar. Default 16px sluit aan bij
// het oorspronkelijke gebruik in de header.
import { IconBase, type IconProps } from './IconBase'

export function IconMaan({ size = 16 }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </IconBase>
  )
}
