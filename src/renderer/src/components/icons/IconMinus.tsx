// Min-icoon. Gebruikt om een schutter uit te schrijven.
import { IconBase, type IconProps } from './IconBase'

export function IconMinus({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size} strokeWidth={2.2}>
      <path d="M5 12h14" />
    </IconBase>
  )
}
