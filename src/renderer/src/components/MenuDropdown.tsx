import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onClick?: () => void
  disabled?: boolean
  checked?: boolean
  divider?: boolean
}

interface Props {
  label: string
  items: MenuItem[]
}

export default function MenuDropdown({ label, items }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 h-full text-sm transition-colors ${
          open
            ? 'bg-slate-100 dark:bg-slate-800 text-primary'
            : 'text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 min-w-[200px] surface border border-soft rounded-md shadow-lg py-1"
        >
          {items.map((item, idx) =>
            item.divider ? (
              <hr key={idx} className="my-1 border-t divider" />
            ) : (
              <button
                key={idx}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return
                  item.onClick?.()
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                  item.disabled
                    ? 'text-muted cursor-not-allowed opacity-60'
                    : 'text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.checked !== undefined && (
                    <span className="w-3 text-xs">{item.checked ? '✓' : ''}</span>
                  )}
                  <span>{item.label}</span>
                </span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
