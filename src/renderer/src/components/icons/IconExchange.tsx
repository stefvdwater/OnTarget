// Uitwissel-icoon. Gebruikt voor de import/export-knop.
import { IconBase, type IconProps } from './IconBase'

export function IconExchange({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M3 7h14M14 4l3 3-3 3M21 17H7M10 14l-3 3 3 3" />
    </IconBase>
  )
}
