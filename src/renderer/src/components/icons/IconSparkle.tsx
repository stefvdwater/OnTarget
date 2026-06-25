// Sprankel-icoon. Gebruikt voor de demo-data-actie.
import { IconBase, type IconProps } from './IconBase'

export function IconSparkle({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14Z" />
    </IconBase>
  )
}
