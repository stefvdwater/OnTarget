import { useState } from 'react'
import WedstrijdenPage from './pages/WedstrijdenPage'
import SchuttersPage from './pages/SchuttersPage'
import Header from './components/Header'
import { useDarkMode } from './hooks/useDarkMode'
import { MenuProvider, useMenuActions } from './hooks/MenuContext'

type Pagina = 'wedstrijden' | 'schutters'

export default function App(): JSX.Element {
  return (
    <MenuProvider>
      <AppShell />
    </MenuProvider>
  )
}

function AppShell(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('wedstrijden')
  const { isDark, toggle } = useDarkMode()
  const actions = useMenuActions()

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header
        pagina={pagina}
        onSwitch={setPagina}
        isDark={isDark}
        onToggleDark={toggle}
        actions={actions}
      />
      <main className="flex-1 overflow-auto p-6">
        {pagina === 'wedstrijden' && <WedstrijdenPage />}
        {pagina === 'schutters' && <SchuttersPage />}
      </main>
    </div>
  )
}
