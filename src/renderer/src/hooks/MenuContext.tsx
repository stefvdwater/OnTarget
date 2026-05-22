import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface MenuActions {
  nieuweWedstrijd?: () => void
  autoIndeling?: () => void
  opslaan?: () => void
  demoData?: () => void
}

interface MenuContextValue {
  actions: MenuActions
  registerActions: (partial: MenuActions) => void
}

const MenuContext = createContext<MenuContextValue>({
  actions: {},
  registerActions: () => {}
})

export function MenuProvider({ children }: { children: ReactNode }): JSX.Element {
  const [actions, setActions] = useState<MenuActions>({})

  const registerActions = useCallback((partial: MenuActions): void => {
    setActions((prev) => ({ ...prev, ...partial }))
  }, [])

  return <MenuContext.Provider value={{ actions, registerActions }}>{children}</MenuContext.Provider>
}

export function useMenuActions(): MenuActions {
  return useContext(MenuContext).actions
}

/**
 * Hook voor pagina's om hun menu-acties te registreren. Bij unmount worden
 * de geregistreerde keys teruggezet naar undefined.
 */
export function useRegisterMenuActions(partial: MenuActions): void {
  const { registerActions } = useContext(MenuContext)
  // Gebruik string-key van de actienamen om effecten correct te triggeren
  const keysSig = Object.keys(partial).sort().join(',')
  useEffect(() => {
    registerActions(partial)
    return () => {
      const reset: MenuActions = {}
      ;(Object.keys(partial) as Array<keyof MenuActions>).forEach((k) => {
        reset[k] = undefined
      })
      registerActions(reset)
    }
    // We willen het effect uitvoeren wanneer de set sleutels verandert; de callback-identiteit
    // is voor pages stabiel (via useCallback of inline → re-register elke render is acceptabel
    // voor deze schaal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSig, ...Object.values(partial)])
}
