// Toverstaf-icoon. Gebruikt voor de automatische indeling-actie.
import { IconBase, type IconProps } from './IconBase'

export function IconMagic({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      <path d="M4 20 14 10" />
      <path d="m20 16 .8 1.6L22.4 18.4l-1.6.8L20 21l-.8-1.8L17.6 18.4l1.6-.8L20 16Z" />
    </IconBase>
  )
}
