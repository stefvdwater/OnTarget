import { useState } from 'react'
import WedstrijdenPage from './pages/WedstrijdenPage'
import SchuttersPage from './pages/SchuttersPage'
import Header from './components/Header'
import { useDarkMode } from './hooks/useDarkMode'

type Pagina = 'wedstrijden' | 'schutters'

export default function App(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('wedstrijden')
  // Bump deze sleutel bij élke nav-klik op 'Wedstrijden' zodat een ge-open detail
  // weer dichtklapt en de overzichts-pagina opnieuw monteert.
  const [homeVersie, setHomeVersie] = useState(0)
  const { isDark, toggle } = useDarkMode()

  function navigeer(p: Pagina): void {
    if (p === 'wedstrijden') setHomeVersie((v) => v + 1)
    setPagina(p)
  }

  return (
    <div className="app">
      <Header pagina={pagina} onSwitch={navigeer} isDark={isDark} onToggleDark={toggle} />
      <div className="content">
        {pagina === 'wedstrijden' && <WedstrijdenPage key={homeVersie} />}
        {pagina === 'schutters' && <SchuttersPage />}
      </div>
    </div>
  )
}
