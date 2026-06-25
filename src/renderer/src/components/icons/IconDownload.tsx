// Download-icoon. Gebruikt voor CSV-export en backup-download.
import { IconBase, type IconProps } from './IconBase'

export function IconDownload({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M12 4v12M6 12l6 6 6-6M4 21h16" />
    </IconBase>
  )
}
