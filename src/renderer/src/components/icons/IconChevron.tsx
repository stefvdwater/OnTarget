// Chevron-icoon (pijl omlaag). Gebruikt op dropdown-knoppen.
// Default 10px sluit aan bij het oorspronkelijke gebruik.
import { IconBase, type IconProps } from './IconBase'

export function IconChevron({ size = 10 }: IconProps): JSX.Element {
  return (
    <IconBase size={size} strokeWidth={2.4}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  )
}
