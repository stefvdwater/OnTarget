// Upload-icoon. Gebruikt voor CSV-import.
import { IconBase, type IconProps } from './IconBase'

export function IconUpload({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M12 20V8M6 12l6-6 6 6M4 3h16" />
    </IconBase>
  )
}
