// Filter-trechter-icoon in dezelfde lijn-stijl als de andere inline-SVG
// iconen (currentColor stroke). Gebruikt bij de schutters-filters.

interface Props {
  size?: number
}

export function IconFilter({ size = 14 }: Props): JSX.Element {
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
      <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />
    </svg>
  )
}
