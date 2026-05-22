import { useEffect, useState } from 'react'
import type { Schutter, SchutterFormData } from '../types'
import SchutterFormulier from '../components/SchutterFormulier'

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

    // Nieuw gilde aanmaken indien opgegeven
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
        <h1 className="text-2xl font-bold text-slate-800">Schutters</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDemoBevestig(true)}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Demo data laden
          </button>
          <button
            onClick={() => setModal({ type: 'nieuw' })}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
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
        className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      {/* Tabel */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Naam</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Gilde</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Boog</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Categorie</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Afstand</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">G</th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gefilterd.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {zoekterm ? 'Geen schutters gevonden.' : 'Nog geen schutters toegevoegd.'}
                </td>
              </tr>
            )}
            {gefilterd.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  {s.voornaam} {s.naam}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{s.gilde_naam ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.type_boog}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.leeftijdscategorie}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.afstand}m</td>
                <td className="px-4 py-2.5 text-slate-600">{s.geslacht}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ type: 'bewerk', schutter: s })}
                      className="text-blue-600 hover:underline"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => setVerwijderBevestig(s.id)}
                      className="text-red-500 hover:underline"
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
      <p className="mt-2 text-right text-xs text-slate-400">
        {gefilterd.length} van {schutters.length} schutters
      </p>

      {/* Modal: nieuw / bewerk */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Demo data laden?</h2>
            <p className="mb-5 text-sm text-slate-600">
              Dit verwijdert <strong>alle bestaande schutters en gilden</strong> en laadt 100 demo-schutters
              verdeeld over 11 gilden. Wedstrijden en inschrijvingen worden ook gewist.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDemoBevestig(false)}
                className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuleer
              </button>
              <button
                onClick={handleLaadDemo}
                disabled={demoBezig}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {demoBezig ? 'Bezig…' : 'Demo data laden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: verwijder bevestiging */}
      {verwijderBevestig !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Schutter verwijderen?</h2>
            <p className="mb-5 text-sm text-slate-600">
              Deze schutter wordt permanent verwijderd uit het schuttersbestand.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setVerwijderBevestig(null)}
                className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuleer
              </button>
              <button
                onClick={() => handleVerwijder(verwijderBevestig)}
                className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Verwijder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
