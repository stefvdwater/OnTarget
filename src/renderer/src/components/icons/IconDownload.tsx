// Download-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt voor CSV-export en backup-download.

interface Props {
  size?: number
}

export function IconDownload({ size = 14 }: Props): JSX.Element {
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
      <path d="M12 4v12M6 12l6 6 6-6M4 21h16" />
    </svg>
  )
}
