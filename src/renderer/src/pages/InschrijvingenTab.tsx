import { useEffect, useRef, useState } from 'react'
import type { Gilde, Inschrijving, Schutter, SchutterFormData, Wedstrijd } from '../types'
import SchutterFormulier from '../components/SchutterFormulier'

interface Props {
  wedstrijd: Wedstrijd
}

export default function InschrijvingenTab({ wedstrijd }: Props): JSX.Element {
  const [inschrijvingen, setInschrijvingen] = useState<Inschrijving[]>([])
  const [zoekterm, setZoekterm] = useState('')
  const [zoekresultaten, setZoekresultaten] = useState<Schutter[]>([])
  const [toonNieuw, setToonNieuw] = useState(false)
  const [bewerk, setBewerk] = useState<Inschrijving | null>(null)
  const [verwijderBevestig, setVerwijderBevestig] = useState<number | null>(null)
  const [gilden, setGilden] = useState<Gilde[]>([])
  const [gildeFilter, setGildeFilter] = useState<number | ''>('')
  const zoekRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    laadInschrijvingen()
    window.api.gilden.getAll().then(setGilden)
  }, [wedstrijd.id])

  async function laadInschrijvingen(): Promise<void> {
    const data = await window.api.inschrijvingen.getByWedstrijd(wedstrijd.id)
    setInschrijvingen(data)
  }

  // Live zoeken in schuttersbestand (op naam of gilde)
  useEffect(() => {
    const ingeschrevenIds = new Set(inschrijvingen.map((i) => i.schutter_id))

    if (gildeFilter !== '') {
      // Gilde geselecteerd: toon alle schutters van dat gilde die nog niet ingeschreven zijn
      window.api.schutters.getAll().then((allemaal: Schutter[]) => {
        setZoekresultaten(
          allemaal.filter((s) => s.gilde_id === gildeFilter && !ingeschrevenIds.has(s.id))
        )
      })
      return
    }

    if (zoekterm.trim().length < 1) {
      setZoekresultaten([])
      return
    }
    window.api.schutters.search(zoekterm).then((resultaten: Schutter[]) => {
      // Filter al ingeschreven schutters uit de resultaten
      setZoekresultaten(resultaten.filter((s: Schutter) => !ingeschrevenIds.has(s.id)))
    })
  }, [zoekterm, gildeFilter, inschrijvingen])

  async function schrijfIn(schutter: Schutter): Promise<void> {
    const volgorde = inschrijvingen.length + 1
    await window.api.inschrijvingen.create({
      wedstrijd_id: wedstrijd.id,
      schutter_id: schutter.id,
      aanmeldvolgorde: volgorde,
      dubbel_eerste_helft: 0,
      dubbel_tweede_helft: 0
    })
    // Bij vrije zoekopdracht: wis het zoekveld
    if (gildeFilter === '') {
      setZoekterm('')
      setZoekresultaten([])
    }
    // Bij gildefilter: lijst wordt automatisch vernieuwd via useEffect na laadInschrijvingen
    laadInschrijvingen()
  }

  async function handleNieuweSchutter(data: SchutterFormData): Promise<void> {
    let gilde_id = data.gilde_id
    if (data.gilde_naam_nieuw.trim()) {
      const result = await window.api.gilden.create(data.gilde_naam_nieuw.trim())
      gilde_id = result.lastInsertRowid
    }
    const result = await window.api.schutters.create({ ...data, gilde_id })
    const nieuwId = result.lastInsertRowid
    await window.api.inschrijvingen.create({
      wedstrijd_id: wedstrijd.id,
      schutter_id: nieuwId,
      aanmeldvolgorde: inschrijvingen.length + 1,
      dubbel_eerste_helft: 0,
      dubbel_tweede_helft: 0
    })
    setToonNieuw(false)
    setZoekterm('')
    laadInschrijvingen()
  }

  async function toggleDubbel(
    inschrijving: Inschrijving,
    veld: 'dubbel_eerste_helft' | 'dubbel_tweede_helft'
  ): Promise<void> {
    const huidig = inschrijving[veld]
    await window.api.inschrijvingen.update({
      ...inschrijving,
      [veld]: huidig ? 0 : 1
    })
    laadInschrijvingen()
  }

  async function handleVerwijder(id: number): Promise<void> {
    await window.api.inschrijvingen.delete(id)
    setVerwijderBevestig(null)
    laadInschrijvingen()
  }

  const boogStip: Record<string, string> = {
    Recurve: 'bg-sky-500',
    Compound: 'bg-violet-500',
    Barebow: 'bg-emerald-500',
    Andere: 'bg-slate-400'
  }

  const afstandKleur: Record<number, string> = {
    25: 'text-muted',
    18: 'text-amber-600 dark:text-amber-400',
    12: 'text-orange-600 dark:text-orange-400'
  }

  return (
    <div>
      {/* Zoekbalk + gildefilter + inschrijven */}
      <div className="mb-4 flex gap-2">
        {/* Gildefilter dropdown */}
        <select
          value={gildeFilter}
          onChange={(e) => {
            setGildeFilter(e.target.value === '' ? '' : Number(e.target.value))
            setZoekterm('')
            setToonNieuw(false)
          }}
          className="input w-auto"
        >
          <option value="">Alle gilden</option>
          {gilden.map((g) => (
            <option key={g.id} value={g.id}>
              {g.naam}
            </option>
          ))}
        </select>

        {/* Naam-zoekbalk */}
        <div className="relative flex-1">
          <input
            ref={zoekRef}
            type="text"
            placeholder={gildeFilter !== '' ? 'Filter op naam binnen gilde…' : 'Zoek schutter op naam of gilde…'}
            value={zoekterm}
            onChange={(e) => {
              setZoekterm(e.target.value)
              setToonNieuw(false)
            }}
            disabled={gildeFilter !== ''}
            className="input disabled:opacity-60"
          />

          {/* Zoekresultaten dropdown — bij vrij zoeken */}
          {gildeFilter === '' && zoekresultaten.length > 0 && (
            <div className="absolute top-full z-20 mt-1 w-full rounded-md border border-soft surface shadow-lg">
              {zoekresultaten.map((s) => (
                <button
                  key={s.id}
                  onClick={() => schrijfIn(s)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-primary"
                >
                  <span className="font-medium">
                    {s.voornaam} {s.naam}
                  </span>
                  <span className="text-muted">{s.gilde_naam ?? '—'}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setToonNieuw(true)
                  setZoekresultaten([])
                }}
                className="flex w-full items-center gap-2 border-t divider px-4 py-2.5 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                + Nieuwe schutter toevoegen: &quot;{zoekterm}&quot;
              </button>
            </div>
          )}
          {/* Geen resultaten maar wel zoekterm */}
          {gildeFilter === '' && zoekterm.trim().length > 0 && zoekresultaten.length === 0 && !toonNieuw && (
            <div className="absolute top-full z-20 mt-1 w-full rounded-md border border-soft surface shadow-lg">
              <button
                onClick={() => {
                  setToonNieuw(true)
                  setZoekresultaten([])
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                + Nieuwe schutter toevoegen: &quot;{zoekterm}&quot;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schutters van geselecteerd gilde */}
      {gildeFilter !== '' && zoekresultaten.length > 0 && (
        <div className="mb-4 rounded-md border border-soft surface shadow-sm overflow-hidden">
          <div className="border-b border-soft surface-muted px-4 py-2 text-xs font-medium text-muted">
            {zoekresultaten.length} schutter{zoekresultaten.length !== 1 ? 's' : ''} beschikbaar om in te schrijven
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {zoekresultaten.map((s) => (
              <button
                key={s.id}
                onClick={() => schrijfIn(s)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span className="font-medium text-primary">
                  {s.voornaam} {s.naam}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <span>{s.type_boog}</span>
                  <span>{s.afstand}m</span>
                  <span className="rounded bg-indigo-600 dark:bg-indigo-500 px-2 py-0.5 text-white">+ Inschrijven</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {gildeFilter !== '' && zoekresultaten.length === 0 && (
        <p className="mb-4 text-sm text-muted">
          Alle schutters van dit gilde zijn al ingeschreven.
        </p>
      )}

      {/* Formulier nieuwe schutter */}
      {toonNieuw && (
        <div className="mb-4 rounded-md border border-soft surface-muted p-4">
          <h3 className="mb-3 font-medium text-primary">Nieuwe schutter toevoegen</h3>
          <SchutterFormulier
            initieel={null}
            onOpslaan={handleNieuweSchutter}
            onAnnuleer={() => {
              setToonNieuw(false)
              setZoekterm('')
            }}
          />
        </div>
      )}

      {/* Inschrijvingslijst */}
      <div className="overflow-hidden rounded-md border border-soft surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-soft surface-muted">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Naam</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Gilde</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Boog</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Afstand</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted">1e helft dubbel</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted">2e helft dubbel</th>
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {inschrijvingen.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Nog geen schutters ingeschreven. Zoek hierboven naar een schutter.
                </td>
              </tr>
            )}
            {inschrijvingen.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2.5 text-muted">{i.aanmeldvolgorde}</td>
                <td className="px-4 py-2.5 font-medium text-primary">
                  {i.voornaam} {i.naam}
                </td>
                <td className="px-4 py-2.5 text-muted">{i.gilde_naam ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${boogStip[i.type_boog] ?? 'bg-slate-400'}`} />
                    {i.type_boog}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-xs ${afstandKleur[i.afstand]}`}>{i.afstand}m</td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!i.dubbel_eerste_helft}
                    onChange={() => toggleDubbel(i, 'dubbel_eerste_helft')}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                  />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!i.dubbel_tweede_helft}
                    onChange={() => toggleDubbel(i, 'dubbel_tweede_helft')}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => setVerwijderBevestig(i.id)}
                    className="text-red-500 dark:text-red-400 hover:underline"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-right text-xs text-muted">
        {inschrijvingen.length} schutter{inschrijvingen.length !== 1 ? 's' : ''} ingeschreven
      </p>

      {/* Modal: verwijder bevestiging */}
      {verwijderBevestig !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm surface border border-soft rounded-md p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold text-primary">Inschrijving verwijderen?</h2>
            <p className="mb-5 text-sm text-muted">
              De schutter wordt uitgeschreven uit deze wedstrijd. Het schuttersfiche blijft bewaard.
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
