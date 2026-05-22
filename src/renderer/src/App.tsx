import { useState } from 'react'
import WedstrijdenPage from './pages/WedstrijdenPage'
import SchuttersPage from './pages/SchuttersPage'
import Header from './components/Header'

type Pagina = 'wedstrijden' | 'schutters'

export default function App(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('wedstrijden')

  return (
    <div className="flex h-screen flex-col">
      <Header pagina={pagina} onSwitch={setPagina} />
      <main className="flex-1 overflow-auto p-6">
        {pagina === 'wedstrijden' && <WedstrijdenPage />}
        {pagina === 'schutters' && <SchuttersPage />}
      </main>
    </div>
  )
}
