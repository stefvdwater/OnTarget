// Kruis-icoon (sluiten) in dezelfde lijn-stijl als de andere inline-SVG
// iconen (currentColor stroke). Gebruikt om indelingen te wissen/sluiten.

interface Props {
  size?: number
}

export function IconX({ size = 14 }: Props): JSX.Element {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
