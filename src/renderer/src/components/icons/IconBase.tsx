import type { ReactNode } from 'react'

// Gedeelde SVG-wrapper voor alle lijn-iconen (currentColor stroke, 24x24
// viewBox, ronde uiteinden). Elk concreet icoon levert enkel zijn pad(en)
// als children en stelt eventueel een afwijkende strokeWidth of
// default-grootte in. Pas de gemeenschappelijke rendering (a11y, default-stijl,
// theming) hier aan, niet per icoon.

export interface IconProps {
  size?: number
}

interface IconBaseProps extends IconProps {
  strokeWidth?: number
  children: ReactNode
}

export function IconBase({ size = 14, strokeWidth = 2, children }: IconBaseProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {children}
    </svg>
  )
}
