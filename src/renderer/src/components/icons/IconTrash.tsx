// Prullenbak-icoon. Gebruikt voor verwijder-acties op het wedstrijd-overzicht
// en in de schutters-tabel.
import { IconBase, type IconProps } from './IconBase'

export function IconTrash({ size }: IconProps): JSX.Element {
  return (
    <IconBase size={size}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </IconBase>
  )
}
