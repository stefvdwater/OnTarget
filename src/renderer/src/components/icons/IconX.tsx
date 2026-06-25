// Kruis-icoon (sluiten). Gebruikt om indelingen te wissen/sluiten.
import { IconBase, type IconProps } from './IconBase'

export function IconX({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M18 6 6 18M6 6l12 12" />
    </IconBase>
  )
}
