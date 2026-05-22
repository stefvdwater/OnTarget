import { useEffect, useState } from 'react'
import type { Wedstrijd } from '../types'
import WedstrijdFormulier from '../components/WedstrijdFormulier'
import WedstrijdDetailPage from './WedstrijdDetailPage'

type Modal = { type: 'nieuw' } | { type: 'bewerk'; wedstrijd: Wedstrijd } | null

export default function WedstrijdenPage(): JSX.Element {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [modal, setModal] = useState<Modal>(null)
  const [verwijderBevestig, setVerwijderBevestig] = useState<number | null>(null)
  const [geselecteerd, setGeselecteerd] = useState<Wedstrijd | null>(null)

  useEffect(() => {
    laadWedstrijden()
  }, [])

  async function laadWedstrijden(): Promise<void> {
    const data = await window.api.wedstrijden.getAll()
    setWedstrijden(data)
  }

  async function handleOpslaan(data: Omit<Wedstrijd, 'id' | 'aangemaakt_op'>): Promise<void> {
    if (modal?.type === 'bewerk') {
      await window.api.wedstrijden.update({ ...data, id: modal.wedstrijd.id })
    } else {
      await window.api.wedstrijden.create(data)
    }
    setModal(null)
    laadWedstrijden()
  }

  async function handleVerwijder(id: number): Promise<void> {
    await window.api.wedstrijden.delete(id)
    setVerwijderBevestig(null)
    laadWedstrijden()
  }

  function formatDatum(datum: string): string {
    return new Date(datum).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Wedstrijd detail weergave
  if (geselecteerd) {
    return (
      <WedstrijdDetailPage
        wedstrijd={geselecteerd}
        onTerug={() => {
          setGeselecteerd(null)
          laadWedstrijden()
        }}
        onBewerk={(w) => setModal({ type: 'bewerk', wedstrijd: w })}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Wedstrijden</h1>
        <button
          onClick={() => setModal({ type: 'nieuw' })}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nieuwe wedstrijd
        </button>
      </div>

      {/* Lijst */}
      {wedstrijden.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">
          Nog geen wedstrijden aangemaakt.
        </div>
      ) : (
        <div className="space-y-2">
          {wedstrijden.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-blue-300 hover:shadow-md transition cursor-pointer"
              onClick={() => setGeselecteerd(w)}
            >
              <div>
                <p className="font-semibold text-slate-800">{w.naam}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {formatDatum(w.datum)}
                  {w.locatie ? ` · ${w.locatie}` : ''}
                  {' · '}
                  {w.aantal_doelen} doelen
                </p>
              </div>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setModal({ type: 'bewerk', wedstrijd: w })}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Bewerk
                </button>
                <button
                  onClick={() => setVerwijderBevestig(w.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: nieuw / bewerk */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {modal.type === 'nieuw' ? 'Nieuwe wedstrijd' : 'Wedstrijd bewerken'}
            </h2>
            <WedstrijdFormulier
              initieel={modal.type === 'bewerk' ? modal.wedstrijd : null}
              onOpslaan={handleOpslaan}
              onAnnuleer={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {/* Modal: verwijder bevestiging */}
      {verwijderBevestig !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Wedstrijd verwijderen?</h2>
            <p className="mb-5 text-sm text-slate-600">
              Alle inschrijvingen en de doelindeling van deze wedstrijd worden ook verwijderd.
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
