// Potlood-icoon. Gebruikt voor bewerk-acties, bv. in de schutters-tabel.
import { IconBase, type IconProps } from './IconBase'

export function IconPencil({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconBase>
  )
}
