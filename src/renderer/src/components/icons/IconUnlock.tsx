// Slot-open-icoon. Gebruikt om een ontgrendeld doel aan te duiden.
import { IconBase, type IconProps } from './IconBase'

export function IconUnlock({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </IconBase>
  )
}
