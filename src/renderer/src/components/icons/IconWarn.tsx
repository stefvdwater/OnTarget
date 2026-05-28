// Waarschuwingsdriehoek-icoon met uitroepteken, in dezelfde lijn-stijl als
// de andere inline-SVG iconen (currentColor stroke). Wordt gebruikt in de
// importreview-tabel, de configuratie-waarschuwingen en de indeling-chip.
//
// De `size`-prop laat callsites de gewenste pictogramgrootte kiezen zonder
// dat ze rond het icoon hoeven te wrappen. Default 14 sluit aan bij het
// oorspronkelijke gebruik in ImportReviewModal.

interface Props {
  size?: number
}

export function IconWarn({ size = 14 }: Props): JSX.Element {
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
      <path d="M10.29 2 1.82 19a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 2a2 2 0 0 0-3.42 0Z" />
      <path d="M12 8v5M12 18h.01" />
    </svg>
  )
}
