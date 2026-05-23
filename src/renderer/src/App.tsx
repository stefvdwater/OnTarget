import { useState } from 'react'
import WedstrijdenPage from './pages/WedstrijdenPage'
import SchuttersPage from './pages/SchuttersPage'
import Header from './components/Header'
import { useDarkMode } from './hooks/useDarkMode'

type Pagina = 'wedstrijden' | 'schutters'

export default function App(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('wedstrijden')
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="app">
      <Header pagina={pagina} onSwitch={setPagina} isDark={isDark} onToggleDark={toggle} />
      <div className="content">
        {pagina === 'wedstrijden' && <WedstrijdenPage />}
        {pagina === 'schutters' && <SchuttersPage />}
      </div>
    </div>
  )
}
