import { resolve } from 'path'
import { execSync } from 'child_process'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// Versie die in de rechteronderhoek van de app komt.
// - Een echte build (release) toont het kale package.json-nummer, bv. "1.0.0".
// - De dev-server (npm run dev) krijgt een achtervoegsel zodat je in een
//   oogopslag ziet dat je in de dev-instantie zit, met de commit waarop je staat
//   en een -dirty-markering als er ongecommit werk bovenop ligt:
//   "1.0.0-dev+a1b2c3d" of "1.0.0-dev+a1b2c3d-dirty".
// De git-info wordt berekend bij het opstarten van de dev-server (HEAD op dat
// moment); valt git weg, dan blijft het bij een kaal "-dev".
function devVersie(): string {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim()
    const vuil = execSync('git status --porcelain').toString().trim().length > 0
    return `${pkg.version}-dev+${hash}${vuil ? '-dirty' : ''}`
  } catch {
    return `${pkg.version}-dev`
  }
}

export default defineConfig(({ command }) => {
  const appVersion = command === 'serve' ? devVersie() : pkg.version
  return {
    main: {
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      plugins: [externalizeDepsPlugin()]
    },
    preload: {
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@shared': resolve('src/shared')
        }
      },
      define: {
        __APP_VERSION__: JSON.stringify(appVersion)
      },
      plugins: [react()]
    }
  }
})
