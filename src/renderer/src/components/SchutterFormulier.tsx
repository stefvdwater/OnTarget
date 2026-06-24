import { useEffect, useState } from 'react'
import type { Gilde, Schutter, SchutterFormData } from '../types'
import { geslachtLabel } from '../lib/labels'

interface Props {
  /** Bestaande schutter om te bewerken; null voor nieuw. */
  bestaand?: Schutter | null
  /** Voor-ingevulde zoekterm waaruit voornaam/naam worden afgeleid (alleen bij nieuw). */
  initieelZoek?: string
  titel?: string
  bevestigLabel?: string
  onAnnuleer: () => void
  onBevestig: (data: SchutterFormData) => void
}

const CATEGORIEËN: SchutterFormData['leeftijdscategorie'][] = [
  'Aspirant',
  'Jeugd',
  'Junior',
  'Senior',
  'Veteraan'
]

// Regels voor leeftijdscategorie ↔ afstand ↔ boogtype.
export const VAST_25M: SchutterFormData['leeftijdscategorie'][] = [
  'Aspirant',
  'Junior',
  'Senior',
  'Veteraan'
]
export const VAST_KORT: SchutterFormData['leeftijdscategorie'][] = ['Jeugd']

export function afstandToegestaan(
  cat: SchutterFormData['leeftijdscategorie'],
  afstand: SchutterFormData['afstand']
): boolean {
  if (VAST_25M.includes(cat)) return afstand === 25
  if (VAST_KORT.includes(cat)) return afstand === 12 || afstand === 18
  return true
}

export function categorieToegestaan(
  cat: SchutterFormData['leeftijdscategorie'],
  typeBoog: SchutterFormData['type_boog']
): boolean {
  if (typeBoog === 'Compound' && cat === 'Veteraan') return false
  return true
}

export default function SchutterFormulier({
  bestaand,
  initieelZoek = '',
  titel,
  bevestigLabel,
  onAnnuleer,
  onBevestig
}: Props): JSX.Element {
  const parts = initieelZoek.trim().split(/\s+/)

  const [voornaam, setVoornaam] = useState(bestaand?.voornaam ?? parts[0] ?? '')
  const [naam, setNaam] = useState(bestaand?.naam ?? parts.slice(1).join(' ') ?? '')
  const [gildeId, setGildeId] = useState<number | null>(bestaand?.gilde_id ?? null)
  const [nieuwGildeNaam, setNieuwGildeNaam] = useState('')
  const [nieuwGildeOpen, setNieuwGildeOpen] = useState(false)
  // Bij een nieuwe schutter staat alles bewust leeg/ongekozen: de gebruiker
  // moet boog, categorie, geslacht en afstand zelf selecteren (zie kanOpslaan).
  const [typeBoog, setTypeBoog] = useState<SchutterFormData['type_boog'] | ''>(
    bestaand?.type_boog ?? ''
  )
  const [leeftijdscategorie, setLeeftijd] = useState<SchutterFormData['leeftijdscategorie'] | ''>(
    bestaand?.leeftijdscategorie ?? ''
  )
  const [geslacht, setGeslacht] = useState<SchutterFormData['geslacht'] | ''>(
    bestaand?.geslacht ?? ''
  )
  const [afstand, setAfstand] = useState<SchutterFormData['afstand'] | null>(
    bestaand?.afstand ?? null
  )
  const [gilden, setGilden] = useState<Gilde[]>([])

  useEffect(() => {
    // Toon enkel gilden met minstens één schutter, zodat verlaten gilden
    // niet als suggestie verschijnen.
    Promise.all([
      window.api.gilden.getMetSchutters(),
      // Fallback: bij bewerken kan de huidige schutter het enige lid zijn
      // van een gilde — dat gilde moet wel zichtbaar blijven.
      bestaand?.gilde_id != null ? window.api.gilden.getAll() : Promise.resolve([])
    ]).then(([metSchutters, alle]) => {
      const lijst: Gilde[] = [...metSchutters]
      if (bestaand?.gilde_id != null) {
        const aanwezig = lijst.some((g) => g.id === bestaand.gilde_id)
        if (!aanwezig) {
          const eigen = (alle as Gilde[]).find((g) => g.id === bestaand.gilde_id)
          if (eigen) {
            lijst.push(eigen)
            lijst.sort((a, b) => a.naam.localeCompare(b.naam))
          }
        }
      }
      setGilden(lijst)
    })
  }, [bestaand?.id, bestaand?.gilde_id])

  const finaleTitel = titel ?? (bestaand ? 'Bewerk schutter' : 'Nieuwe schutter')
  const finaleBevestig =
    bevestigLabel ?? (bestaand ? 'Wijzigingen opslaan' : 'Schutter aanmaken')

  const kanOpslaan =
    voornaam.trim().length > 0 &&
    naam.trim().length > 0 &&
    typeBoog !== '' &&
    leeftijdscategorie !== '' &&
    geslacht !== '' &&
    afstand !== null

  function kiesCategorie(c: SchutterFormData['leeftijdscategorie'] | ''): void {
    if (c === '') {
      setLeeftijd('')
      return
    }
    // Compound + Veteraan kan niet: het filter onder categorie-select voorkomt dit al,
    // maar wanneer een bestaande schutter wordt geladen via een ongeldige combo kan dit toch
    // gebeuren. We laten dat geval consistent door bij Veteraan + Compound de boog niet aan
    // te raken hier (dat gebeurt in kiesBoogtype). Bij een categorie met maar één toegestane
    // afstand vullen we die meteen in; bij Jeugd (12m/18m) laten we de keuze open.
    if (VAST_25M.includes(c) && afstand !== 25) setAfstand(25)
    else if (VAST_KORT.includes(c) && afstand === 25) setAfstand(18)
    setLeeftijd(c)
  }

  function kiesBoogtype(t: SchutterFormData['type_boog'] | ''): void {
    if (t === 'Compound' && leeftijdscategorie === 'Veteraan') setLeeftijd('Senior')
    setTypeBoog(t)
  }

  const beschikbareCategorieën =
    typeBoog === '' ? CATEGORIEËN : CATEGORIEËN.filter((c) => categorieToegestaan(c, typeBoog))

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!kanOpslaan || typeBoog === '' || leeftijdscategorie === '' || geslacht === '' || afstand === null)
      return
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
            onChange={(e) => kiesBoogtype(e.target.value as SchutterFormData['type_boog'] | '')}
          >
            <option value="" disabled>
              — Kies boogtype —
            </option>
            <option value="Recurve">Recurve</option>
            <option value="Compound">Compound</option>
            <option value="Barebow">Barebow</option>
            <option value="Andere">Andere</option>
          </select>
        </label>
        <label>
          <span>Categorie</span>
          <select
            className="select"
            value={leeftijdscategorie}
            onChange={(e) =>
              kiesCategorie(e.target.value as SchutterFormData['leeftijdscategorie'] | '')
            }
          >
            <option value="" disabled>
              — Kies categorie —
            </option>
            {beschikbareCategorieën.map((c) => (
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
                {geslachtLabel(g)}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>Afstand</span>
          <div className="segmented">
            {([12, 18, 25] as const).map((a) => {
              const toegestaan =
                leeftijdscategorie === '' ? true : afstandToegestaan(leeftijdscategorie, a)
              return (
                <button
                  key={a}
                  type="button"
                  className={afstand === a ? 'on' : ''}
                  onClick={() => setAfstand(a)}
                  disabled={!toegestaan}
                  style={
                    toegestaan
                      ? undefined
                      : { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'auto' }
                  }
                >
                  {a}m
                </button>
              )
            })}
          </div>
        </label>
      </div>

      <div className="nieuw-form-actions">
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
