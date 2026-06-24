// Uitwissel-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt voor de import/export-knop.

interface Props {
  size?: number
}

export function IconExchange({ size = 14 }: Props): JSX.Element {
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
      <path d="M3 7h14M14 4l3 3-3 3M21 17H7M10 14l-3 3 3 3" />
    </svg>
  )
}
