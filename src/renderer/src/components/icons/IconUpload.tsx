// Upload-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt voor CSV-import.

interface Props {
  size?: number
}

export function IconUpload({ size = 14 }: Props): JSX.Element {
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
      <path d="M12 20V8M6 12l6-6 6 6M4 3h16" />
    </svg>
  )
}
