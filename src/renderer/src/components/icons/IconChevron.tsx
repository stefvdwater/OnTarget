// Chevron-icoon (pijl omlaag) in dezelfde lijn-stijl als de andere
// inline-SVG iconen (currentColor stroke). Gebruikt op dropdown-knoppen.
// Default 10px sluit aan bij het oorspronkelijke gebruik.

interface Props {
  size?: number
}

export function IconChevron({ size = 10 }: Props): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
