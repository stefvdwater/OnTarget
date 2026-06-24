// Vinkje-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt in de importreview-tabel voor geldige rijen.

interface Props {
  size?: number
}

export function IconCheck({ size = 14 }: Props): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}
