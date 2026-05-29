import { useEffect, useMemo, useState } from 'react'
import type { Inschrijving, Schutter, SchutterFormData, Wedstrijd } from '../types'
import SchutterFormulier from '../components/SchutterFormulier'
import { categorieLabel } from '../lib/labels'

interface Props {
  wedstrijd: Wedstrijd
}

export default function InschrijvingenTab({ wedstrijd }: Props): JSX.Element {
  const [inschrijvingen, setInschrijvingen] = useState<Inschrijving[]>([])
  const [alleSchutters, setAlleSchutters] = useState<Schutter[]>([])
  const [zoek, setZoek] = useState('')
  const [nieuwOpen, setNieuwOpen] = useState(false)

  useEffect(() => {
    laad()
  }, [wedstrijd.id])

  async function laad(): Promise<void> {
    const [ins, sch] = await Promise.all([
      window.api.inschrijvingen.getByWedstrijd(wedstrijd.id),
      window.api.schutters.getAll()
    ])
    setInschrijvingen(ins)
    setAlleSchutters(sch)
  }

  const ingeschrevenIds = useMemo(
    () => new Set(inschrijvingen.map((i) => i.schutter_id)),
    [inschrijvingen]
  )

  const beschikbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return alleSchutters.filter((s) => {
      if (ingeschrevenIds.has(s.id)) return false
      if (q) {
        const hay = `${s.voornaam} ${s.naam} ${s.gilde_naam ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [alleSchutters, ingeschrevenIds, zoek])

  const sorted = useMemo(
    () => [...inschrijvingen].sort((a, b) => a.aanmeldvolgorde - b.aanmeldvolgorde),
    [inschrijvingen]
  )

  async function voegToe(schutterId: number): Promise<void> {
    // aanmeldvolgorde wordt in het main-process bepaald binnen een transactie.
    await window.api.inschrijvingen.create({
      wedstrijd_id: wedstrijd.id,
      schutter_id: schutterId,
      dubbel_eerste_helft: 0,
      dubbel_tweede_helft: 0
    })
    laad()
  }

  async function verwijder(id: number): Promise<void> {
    await window.api.inschrijvingen.delete(id)
    laad()
  }

  async function toggleDubbel(
    insch: Inschrijving,
    veld: 'dubbel_eerste_helft' | 'dubbel_tweede_helft'
  ): Promise<void> {
    await window.api.inschrijvingen.update({
      ...insch,
      [veld]: insch[veld] ? 0 : 1
    })
    laad()
  }

  async function maakNieuw(data: SchutterFormData): Promise<void> {
    let gilde_id = data.gilde_id
    if (data.gilde_naam_nieuw.trim()) {
      const r = await window.api.gilden.create(data.gilde_naam_nieuw.trim())
      gilde_id = r.lastInsertRowid
    }
    const r = await window.api.schutters.create({ ...data, gilde_id })
    const nieuwId = r.lastInsertRowid
    await window.api.inschrijvingen.create({
      wedstrijd_id: wedstrijd.id,
      schutter_id: nieuwId,
      dubbel_eerste_helft: 0,
      dubbel_tweede_helft: 0
    })
    setNieuwOpen(false)
    setZoek('')
    laad()
  }

  function gildeKort(volledig: string | null): string {
    if (!volledig) return '—'
    return volledig.replace(/^Gilde\s+/i, '').replace(/^Schuttersgilde\s+/i, '').replace(/^Koninklijk Gilde\s+/i, '')
  }

  return (
    <div className="split-pane">
      <div>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Naam</th>
                <th>Gilde</th>
                <th>Boog</th>
                <th>Categorie</th>
                <th>Afstand</th>
                <th style={{ width: 130 }}>
                  Dubbel
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      fontSize: 10,
                      fontWeight: 500,
                      marginTop: 2,
                      color: 'var(--muted-2)',
                      textTransform: 'none',
                      letterSpacing: 0
                    }}
                  >
                    <span>1e helft</span>
                    <span>2e helft</span>
                  </div>
                </th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.id}>
                  <td className="mono" style={{ color: 'var(--muted)' }}>
                    {String(i.aanmeldvolgorde).padStart(2, '0')}
                  </td>
                  <td>
                    <strong>
                      {i.voornaam} {i.naam}
                    </strong>
                  </td>
                  <td>{i.gilde_naam ?? '—'}</td>
                  <td>
                    <BoogChip boog={i.type_boog} />
                  </td>
                  <td>{categorieLabel(i)}</td>
                  <td className="mono">{i.afstand}m</td>
                  <td>
                    <div className="dubbel-cell">
                      <label className="dubbel-check">
                        <input
                          type="checkbox"
                          checked={!!i.dubbel_eerste_helft}
                          onChange={() => toggleDubbel(i, 'dubbel_eerste_helft')}
                        />
                        <span>1e</span>
                      </label>
                      <label className="dubbel-check">
                        <input
                          type="checkbox"
                          checked={!!i.dubbel_tweede_helft}
                          onChange={() => toggleDubbel(i, 'dubbel_tweede_helft')}
                        />
                        <span>2e</span>
                      </label>
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => verwijder(i.id)}>
                      <IconMinus /> Verwijder
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}
                  >
                    Nog geen schutters ingeschreven. Klik rechts op{' '}
                    <span
                      style={{
                        display: 'inline-flex',
                        verticalAlign: 'middle',
                        margin: '0 2px'
                      }}
                    >
                      <IconPlus />
                    </span>{' '}
                    om er toe te voegen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="beschikbaar-paneel">
        <div className="beschikbaar-paneel-head">
          <h3>Schutters toevoegen</h3>
          <div className="search">
            <IconSearch />
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="Zoek schutter of gilde…"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
            />
          </div>
        </div>
        <div className="beschikbaar-paneel-list">
          {beschikbaar.map((s) => (
            <div key={s.id} className="beschikbaar-row">
              <div className="info">
                <div className="nm">
                  {s.voornaam} {s.naam}
                </div>
                <div className="sub">
                  {gildeKort(s.gilde_naam)} · {s.type_boog} · {s.afstand}m
                </div>
              </div>
              <button className="add" onClick={() => voegToe(s.id)} type="button">
                <IconPlus />
              </button>
            </div>
          ))}

          {beschikbaar.length === 0 && zoek.trim() === '' && (
            <div className="empty-state">
              <div className="big">Iedereen ingeschreven</div>
              <div style={{ marginBottom: 14 }}>Geen schutters meer beschikbaar.</div>
              <button className="btn btn-primary btn-sm" onClick={() => setNieuwOpen(true)}>
                <IconPlus /> Nieuwe schutter aanmaken
              </button>
            </div>
          )}

          {beschikbaar.length === 0 && zoek.trim() !== '' && (
            <div className="empty-state">
              <div className="big">Geen schutter gevonden</div>
              <div style={{ marginBottom: 14 }}>
                Geen schutter of gilde matcht &quot;{zoek}&quot;.
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setNieuwOpen(true)}>
                <IconPlus /> Nieuwe schutter aanmaken
              </button>
            </div>
          )}
        </div>
      </aside>

      {nieuwOpen && (
        <Modal>
          <SchutterFormulier
            initieelZoek={zoek}
            titel="Nieuwe schutter"
            bevestigLabel="Aanmaken & inschrijven"
            onAnnuleer={() => setNieuwOpen(false)}
            onBevestig={maakNieuw}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({ children }: { children: React.ReactNode }): JSX.Element {
  // Een schutter-formulier sluit enkel via Annuleren of Opslaan in de inhoud zelf.
  // Geen backdrop-dismiss en geen Escape: anders raakt ingevuld typewerk verloren
  // bij een misklik of toetsenbord-misslag.
  return (
    <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function BoogChip({ boog }: { boog: string }): JSX.Element {
  const cls =
    boog === 'Recurve'
      ? 'chip chip-blue'
      : boog === 'Compound'
        ? 'chip chip-red'
        : boog === 'Barebow'
          ? 'chip chip-yellow'
          : 'chip'
  return (
    <span className={cls}>
      <span className="chip-dot" />
      {boog}
    </span>
  )
}

function IconSearch(): JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconPlus(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconMinus(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
    </svg>
  )
}
