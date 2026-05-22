import { useEffect, useState } from 'react'
import type { Schutter, SchutterFormData } from '../types'
import SchutterFormulier from '../components/SchutterFormulier'
import { useRegisterMenuActions } from '../hooks/MenuContext'

type Modal = { type: 'nieuw' } | { type: 'bewerk'; schutter: Schutter } | null

export default function SchuttersPage(): JSX.Element {
  const [schutters, setSchutters] = useState<Schutter[]>([])
  const [zoekterm, setZoekterm] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [verwijderBevestig, setVerwijderBevestig] = useState<number | null>(null)
  const [demoBezig, setDemoBezig] = useState(false)
  const [demoBevestig, setDemoBevestig] = useState(false)

  useEffect(() => {
    laadSchutters()
  }, [])

  useRegisterMenuActions({
    demoData: () => setDemoBevestig(true)
  })

  async function laadSchutters(): Promise<void> {
    const data = await window.api.schutters.getAll()
    setSchutters(data)
  }

  const gefilterd = schutters.filter((s) => {
    const q = zoekterm.toLowerCase()
    return (
      s.naam.toLowerCase().includes(q) ||
      s.voornaam.toLowerCase().includes(q) ||
      (s.gilde_naam ?? '').toLowerCase().includes(q)
    )
  })

  async function handleOpslaan(data: SchutterFormData): Promise<void> {
    let gilde_id = data.gilde_id

    if (data.gilde_naam_nieuw.trim()) {
      const result = await window.api.gilden.create(data.gilde_naam_nieuw.trim())
      gilde_id = result.lastInsertRowid
    }

    if (modal?.type === 'bewerk') {
      await window.api.schutters.update({ ...data, gilde_id, id: modal.schutter.id })
    } else {
      await window.api.schutters.create({ ...data, gilde_id })
    }

    setModal(null)
    laadSchutters()
  }

  async function handleVerwijder(id: number): Promise<void> {
    await window.api.schutters.delete(id)
    setVerwijderBevestig(null)
    laadSchutters()
  }

  async function handleLaadDemo(): Promise<void> {
    setDemoBezig(true)
    setDemoBevestig(false)
    await window.api.demo.laad()
    setDemoBezig(false)
    laadSchutters()
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Schutters</h1>
        <div className="flex gap-2">
          <button onClick={() => setDemoBevestig(true)} className="btn-secondary">
            Demo data laden
          </button>
          <button onClick={() => setModal({ type: 'nieuw' })} className="btn-primary">
            + Nieuwe schutter
          </button>
        </div>
      </div>

      {/* Zoekbalk */}
      <input
        type="text"
        placeholder="Zoek op naam of gilde..."
        value={zoekterm}
        onChange={(e) => setZoekterm(e.target.value)}
        className="input mb-4"
      />

      {/* Tabel */}
      <div className="overflow-hidden rounded-md border border-soft surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-soft surface-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Naam</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Gilde</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Boog</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Categorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Afstand</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">G</th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {gefilterd.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {zoekterm ? 'Geen schutters gevonden.' : 'Nog geen schutters toegevoegd.'}
                </td>
              </tr>
            )}
            {gefilterd.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 font-medium text-primary">
                  {s.voornaam} {s.naam}
                </td>
                <td className="px-4 py-2.5 text-muted">{s.gilde_naam ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted">{s.type_boog}</td>
                <td className="px-4 py-2.5 text-muted">{s.leeftijdscategorie}</td>
                <td className="px-4 py-2.5 text-muted">{s.afstand}m</td>
                <td className="px-4 py-2.5 text-muted">{s.geslacht}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ type: 'bewerk', schutter: s })}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => setVerwijderBevestig(s.id)}
                      className="text-red-500 dark:text-red-400 hover:underline"
                    >
                      Verwijder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Teller */}
      <p className="mt-2 text-right text-xs text-muted">
        {gefilterd.length} van {schutters.length} schutters
      </p>

      {/* Modal: nieuw / bewerk */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg surface border border-soft rounded-md p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              {modal.type === 'nieuw' ? 'Nieuwe schutter' : 'Schutter bewerken'}
            </h2>
            <SchutterFormulier
              initieel={modal.type === 'bewerk' ? modal.schutter : null}
              onOpslaan={handleOpslaan}
              onAnnuleer={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {/* Modal: demo data bevestiging */}
      {demoBevestig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm surface border border-soft rounded-md p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold text-primary">Demo data laden?</h2>
            <p className="mb-5 text-sm text-muted">
              Dit verwijdert <strong>alle bestaande schutters en gilden</strong> en laadt 100 demo-schutters
              verdeeld over 11 gilden. Wedstrijden en inschrijvingen worden ook gewist.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDemoBevestig(false)} className="btn-secondary">
                Annuleer
              </button>
              <button onClick={handleLaadDemo} disabled={demoBezig} className="btn-primary">
                {demoBezig ? 'Bezig…' : 'Demo data laden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: verwijder bevestiging */}
      {verwijderBevestig !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm surface border border-soft rounded-md p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold text-primary">Schutter verwijderen?</h2>
            <p className="mb-5 text-sm text-muted">
              Deze schutter wordt permanent verwijderd uit het schuttersbestand.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setVerwijderBevestig(null)} className="btn-secondary">
                Annuleer
              </button>
              <button onClick={() => handleVerwijder(verwijderBevestig)} className="btn-danger">
                Verwijder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
