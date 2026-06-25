// Pijl-naar-links-icoon. Gebruikt voor de terug-knop.
import { IconBase, type IconProps } from './IconBase'

export function IconArrowLeft({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="m12 19-7-7 7-7M19 12H5" />
    </IconBase>
  )
}
