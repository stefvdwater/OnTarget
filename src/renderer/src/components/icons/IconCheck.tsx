// Vinkje-icoon. Gebruikt in de importreview-tabel voor geldige rijen.
import { IconBase, type IconProps } from './IconBase'

export function IconCheck({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size} strokeWidth={2.6}>
      <path d="m5 12 5 5L20 7" />
    </IconBase>
  )
}
