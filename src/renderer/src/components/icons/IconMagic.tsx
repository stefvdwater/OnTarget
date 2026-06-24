// Toverstaf-icoon in dezelfde lijn-stijl als de andere inline-SVG iconen
// (currentColor stroke). Gebruikt voor de automatische indeling-actie.

interface Props {
  size?: number
}

export function IconMagic({ size = 14 }: Props): JSX.Element {
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
      <path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      <path d="M4 20 14 10" />
      <path d="m20 16 .8 1.6L22.4 18.4l-1.6.8L20 21l-.8-1.8L17.6 18.4l1.6-.8L20 16Z" />
    </svg>
  )
}
