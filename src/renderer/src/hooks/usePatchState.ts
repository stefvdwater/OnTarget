import { useCallback, useState } from 'react'

export type PatchOfUpdater<T> = Partial<T> | ((huidig: T) => Partial<T>)

/** Het type van de updater die `usePatchState` teruggeeft, handig als prop-type. */
export type PatchFn<T> = (patch: PatchOfUpdater<T>) => void

/**
 * State + een stabiele patch-updater: elke aanroep merget een gedeeltelijke
 * wijziging in de bestaande state (`{ ...prev, ...patch }`), net als
 * `handleConfigUpdate` in WedstrijdDetailPage. De patch mag ook een functie
 * zijn die de laatste state ontvangt (zoals React's eigen `setState`) voor
 * updates die van de vorige waarde afhangen, bv. het togglen van een item in
 * een Set zonder een verouderde snapshot te gebruiken.
 */
export function usePatchState<T>(init: T | (() => T)): [T, PatchFn<T>] {
  const [state, setState] = useState<T>(init)

  const update = useCallback((patch: PatchOfUpdater<T>) => {
    setState((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? (patch as (huidig: T) => Partial<T>)(prev) : patch)
    }))
  }, [])

  return [state, update]
}
