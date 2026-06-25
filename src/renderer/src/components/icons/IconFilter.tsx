// Filter-trechter-icoon. Gebruikt bij de schutters-filters.
import { IconBase, type IconProps } from './IconBase'

export function IconFilter({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />
    </IconBase>
  )
}
