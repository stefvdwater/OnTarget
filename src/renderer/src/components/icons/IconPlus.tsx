// Plus-icoon. Gebruikt voor toevoeg-acties, bv. "Nieuwe schutter".
import { IconBase, type IconProps } from './IconBase'

export function IconPlus({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  )
}
