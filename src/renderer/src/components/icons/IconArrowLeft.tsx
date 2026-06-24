// Pijl-naar-links-icoon in dezelfde lijn-stijl als de andere inline-SVG
// iconen (currentColor stroke). Gebruikt voor de terug-knop.

interface Props {
  size?: number
}

export function IconArrowLeft({ size = 14 }: Props): JSX.Element {
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
      <path d="m12 19-7-7 7-7M19 12H5" />
    </svg>
  )
}
