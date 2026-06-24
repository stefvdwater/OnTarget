// Minimale resolver-hook zodat Node de algoritmebestanden rechtstreeks kan draaien.
// De broncode gebruikt extensieloze relatieve imports (bv. `./types`) die bedoeld
// zijn voor de bundler (vite). Node ESM doet geen extensie-resolutie, dus voegen we
// `.ts` toe voor relatieve, extensieloze imports. Node 24 strikt de types zelf.
// Zo draait het test-harnas zonder extra npm-dependency.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relatief = specifier.startsWith('./') || specifier.startsWith('../')
    const heeftExtensie = /\.[mc]?[jt]s$/.test(specifier)
    if (relatief && !heeftExtensie) {
      try {
        return nextResolve(specifier + '.ts', context)
      } catch {
        // Val terug op de standaardresolutie (geeft de originele foutmelding).
      }
    }
    return nextResolve(specifier, context)
  }
})
