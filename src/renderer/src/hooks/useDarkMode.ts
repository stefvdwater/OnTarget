import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

function leesInitieelThema(): boolean {
  if (typeof window === 'undefined') return false
  const opgeslagen = window.localStorage.getItem(STORAGE_KEY)
  if (opgeslagen === 'dark') return true
  if (opgeslagen === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function pasKlasseToe(donker: boolean): void {
  const root = document.documentElement
  if (donker) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function useDarkMode(): { isDark: boolean; toggle: () => void; setDark: (v: boolean) => void } {
  const [isDark, setIsDark] = useState<boolean>(leesInitieelThema)

  useEffect(() => {
    pasKlasseToe(isDark)
  }, [isDark])

  useEffect(() => {
    // Volg systeemvoorkeur tot de gebruiker een handmatige keuze maakt
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => {
      if (window.localStorage.getItem(STORAGE_KEY) === null) {
        setIsDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setDark = (v: boolean): void => {
    window.localStorage.setItem(STORAGE_KEY, v ? 'dark' : 'light')
    setIsDark(v)
  }
  const toggle = (): void => setDark(!isDark)

  return { isDark, toggle, setDark }
}
