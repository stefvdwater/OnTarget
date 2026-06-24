// Kalender-icoon. Gebruikt bij wedstrijddatums.
import { IconBase, type IconProps } from './IconBase'

export function IconCalendar({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </IconBase>
  )
}
