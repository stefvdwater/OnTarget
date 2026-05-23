import { useEffect, useState } from 'react'
import type { Gilde, Schutter, SchutterFormData } from '../types'

interface Props {
  /** Bestaande schutter om te bewerken; null voor nieuw. */
  bestaand?: Schutter | null
  /** Voor-ingevulde zoekterm waaruit voornaam/naam worden afgeleid (alleen bij nieuw). */
  initieelZoek?: string
  titel?: string
  bevestigLabel?: string
  onAnnuleer: () => void
  onBevestig: (data: SchutterFormData) => void
  /** Optioneel: toon Verwijderen-knop bij bewerken. */
  onVerwijder?: () => void
}

const CATEGORIEËN: SchutterFormData['leeftijdscategorie'][] = [
  'Aspirant',
  'Jeugd',
  'Junior',
  'Senior',
  'Veteraan'
]

export default function SchutterFormulier({
  bestaand,
  initieelZoek = '',
  titel,
  bevestigLabel,
  onAnnuleer,
  onBevestig,
  onVerwijder
}: Props): JSX.Element {
  const parts = initieelZoek.trim().split(/\s+/)

  const [voornaam, setVoornaam] = useState(bestaand?.voornaam ?? parts[0] ?? '')
  const [naam, setNaam] = useState(bestaand?.naam ?? parts.slice(1).join(' ') ?? '')
  const [gildeId, setGildeId] = useState<number | null>(bestaand?.gilde_id ?? null)
  const [nieuwGildeNaam, setNieuwGildeNaam] = useState('')
  const [nieuwGildeOpen, setNieuwGildeOpen] = useState(false)
  const [typeBoog, setTypeBoog] = useState<SchutterFormData['type_boog']>(
    bestaand?.type_boog ?? 'Recurve'
  )
  const [leeftijdscategorie, setLeeftijd] = useState<SchutterFormData['leeftijdscategorie']>(
    bestaand?.leeftijdscategorie ?? 'Senior'
  )
  const [geslacht, setGeslacht] = useState<SchutterFormData['geslacht']>(
    bestaand?.geslacht ?? 'M'
  )
  const [afstand, setAfstand] = useState<SchutterFormData['afstand']>(bestaand?.afstand ?? 25)
  const [gilden, setGilden] = useState<Gilde[]>([])

  useEffect(() => {
    window.api.gilden.getAll().then((g) => {
      setGilden(g)
      if (!bestaand && gildeId == null && g.length > 0) setGildeId(g[0].id)
    })
  }, [])

  const finaleTitel = titel ?? (bestaand ? 'Bewerk schutter' : 'Nieuwe schutter')
  const finaleBevestig =
    bevestigLabel ?? (bestaand ? 'Wijzigingen opslaan' : 'Schutter aanmaken')

  const kanOpslaan = voornaam.trim().length > 0 && naam.trim().length > 0

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!kanOpslaan) return
    onBevestig({
      voornaam: voornaam.trim(),
      naam: naam.trim(),
      gilde_id: gildeId,
      gilde_naam_nieuw: nieuwGildeOpen ? nieuwGildeNaam.trim() : '',
      type_boog: typeBoog,
      leeftijdscategorie,
      geslacht,
      afstand
    })
  }

  return (
    <form className="nieuw-form" onSubmit={submit}>
      <div className="nieuw-form-head">
        <strong>{finaleTitel}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onAnnuleer}>
          <IconX /> Annuleer
        </button>
      </div>

      <div className="nieuw-form-row two">
        <label>
          <span>Voornaam</span>
          <input
            className="input"
            value={voornaam}
            onChange={(e) => setVoornaam(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          <span>Naam</span>
          <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} />
        </label>
      </div>

      <label>
        <span>
          Gilde
          {!nieuwGildeOpen ? (
            <button
              type="button"
              onClick={() => setNieuwGildeOpen(true)}
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                marginLeft: 8,
                color: 'var(--blue)',
                cursor: 'pointer',
                fontSize: 11,
                textTransform: 'none',
                letterSpacing: 0,
                fontWeight: 500
              }}
            >
              + nieuw gilde
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNieuwGildeOpen(false)
                setNieuwGildeNaam('')
              }}
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                marginLeft: 8,
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: 11,
                textTransform: 'none',
                letterSpacing: 0,
                fontWeight: 500
              }}
            >
              annuleer
            </button>
          )}
        </span>
        {!nieuwGildeOpen ? (
          <select
            className="select"
            value={gildeId ?? ''}
            onChange={(e) => setGildeId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— Geen gilde —</option>
            {gilden.map((g) => (
              <option key={g.id} value={g.id}>
                {g.naam}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            placeholder="Naam nieuw gilde"
            value={nieuwGildeNaam}
            onChange={(e) => setNieuwGildeNaam(e.target.value)}
            autoFocus
          />
        )}
      </label>

      <div className="nieuw-form-row two">
        <label>
          <span>Boogtype</span>
          <select
            className="select"
            value={typeBoog}
            onChange={(e) => setTypeBoog(e.target.value as SchutterFormData['type_boog'])}
          >
            <option>Recurve</option>
            <option>Compound</option>
            <option>Barebow</option>
            <option>Andere</option>
          </select>
        </label>
        <label>
          <span>Categorie</span>
          <select
            className="select"
            value={leeftijdscategorie}
            onChange={(e) =>
              setLeeftijd(e.target.value as SchutterFormData['leeftijdscategorie'])
            }
          >
            {CATEGORIEËN.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="nieuw-form-row two">
        <label>
          <span>Geslacht</span>
          <div className="segmented">
            {(['M', 'V'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={geslacht === g ? 'on' : ''}
                onClick={() => setGeslacht(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>Afstand</span>
          <div className="segmented">
            {([12, 18, 25] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={afstand === a ? 'on' : ''}
                onClick={() => setAfstand(a)}
              >
                {a}m
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="nieuw-form-actions">
        {onVerwijder && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginRight: 'auto', color: 'var(--red)' }}
            onClick={onVerwijder}
          >
            Verwijderen
          </button>
        )}
        <button type="button" className="btn" onClick={onAnnuleer}>
          Annuleer
        </button>
        <button type="submit" className="btn btn-primary" disabled={!kanOpslaan}>
          {!bestaand && <IconPlus />} {finaleBevestig}
        </button>
      </div>
    </form>
  )
}

function IconX(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
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
