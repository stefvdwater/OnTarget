// Prullenbak-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt voor verwijder-acties op het
// wedstrijd-overzicht en in de schutters-tabel.

interface Props {
  size?: number
}

export function IconTrash({ size = 14 }: Props): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  )
}
