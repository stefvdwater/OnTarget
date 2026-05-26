import { useEffect, useMemo, useState } from 'react'
import type { Gilde, Schutter } from '../types'
import { afstandToegestaan, categorieToegestaan } from './SchutterFormulier'
import { geslachtLabel } from '../lib/labels'

export interface ImportRij {
  regel: number
  voornaam: string
  naam: string
  gilde_naam: string
  type_boog: Schutter['type_boog'] | ''
  leeftijdscategorie: Schutter['leeftijdscategorie'] | ''
  geslacht: Schutter['geslacht'] | ''
  afstand: 12 | 18 | 25 | 0
}

const BOOGTYPES: Schutter['type_boog'][] = ['Recurve', 'Compound', 'Barebow', 'Andere']
const CATEGORIEËN: Schutter['leeftijdscategorie'][] = [
  'Aspirant',
  'Jeugd',
  'Junior',
  'Senior',
  'Veteraan'
]

/**
 * Valideert één rij. Pure functie zodat dezelfde checks gelden bij parse-tijd
 * én tijdens live-editen in de review-modal.
 */
export function valideerImportRij(r: ImportRij): { ok: true } | { ok: false; redenen: string[] } {
  const redenen: string[] = []

  if (!r.voornaam.trim()) redenen.push('voornaam ontbreekt')
  if (!r.naam.trim()) redenen.push('naam ontbreekt')

  if (!BOOGTYPES.includes(r.type_boog as Schutter['type_boog'])) {
    redenen.push(`ongeldig boogtype "${r.type_boog || '—'}"`)
  }
  if (!CATEGORIEËN.includes(r.leeftijdscategorie as Schutter['leeftijdscategorie'])) {
    redenen.push(`ongeldige categorie "${r.leeftijdscategorie || '—'}"`)
  }
  if (r.geslacht !== 'M' && r.geslacht !== 'V') {
    redenen.push(`ongeldig geslacht "${r.geslacht || '—'}"`)
  }
  if (r.afstand !== 12 && r.afstand !== 18 && r.afstand !== 25) {
    redenen.push(`ongeldige afstand "${r.afstand || '—'}"`)
  }

  // Cross-constraints — alleen als de basisvelden geldig zijn:
  if (
    BOOGTYPES.includes(r.type_boog as Schutter['type_boog']) &&
    CATEGORIEËN.includes(r.leeftijdscategorie as Schutter['leeftijdscategorie'])
  ) {
    const cat = r.leeftijdscategorie as Schutter['leeftijdscategorie']
    const boog = r.type_boog as Schutter['type_boog']
    if (!categorieToegestaan(cat, boog)) {
      redenen.push('Compound-schutters kunnen geen Veteraan zijn')
    }
    if (
      (r.afstand === 12 || r.afstand === 18 || r.afstand === 25) &&
      !afstandToegestaan(cat, r.afstand)
    ) {
      if (cat === 'Jeugd') redenen.push('Jeugd-schutters schieten op 12m of 18m')
      else redenen.push(`${cat}-schutters schieten op 25m`)
    }
  }

  return redenen.length === 0 ? { ok: true } : { ok: false, redenen }
}

interface Props {
  rijen: ImportRij[]
  bekendeGilden: Gilde[]
  bezig: boolean
  onAnnuleer: () => void
  onBevestig: (rijen: ImportRij[]) => void
}

export default function ImportReviewModal({
  rijen,
  bekendeGilden,
  bezig,
  onAnnuleer,
  onBevestig
}: Props): JSX.Element {
  // Conflicten bovenaan zodat de gebruiker niet moet zoeken; relatieve volgorde
  // van conflict-rijen en geldige rijen blijft onderling behouden. Na opening blijft
  // de volgorde stabiel, ook als een rij intussen geldig wordt door bewerking.
  const [bewerkt, setBewerkt] = useState<ImportRij[]>(() => {
    const kopie = rijen.map((r) => ({ ...r }))
    const conflict: ImportRij[] = []
    const ok: ImportRij[] = []
    for (const r of kopie) {
      if (valideerImportRij(r).ok) ok.push(r)
      else conflict.push(r)
    }
    return [...conflict, ...ok]
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onAnnuleer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAnnuleer])

  function patch(idx: number, p: Partial<ImportRij>): void {
    setBewerkt((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...p }
      return next
    })
  }

  const validaties = useMemo(() => bewerkt.map(valideerImportRij), [bewerkt])
  const aantalConflict = validaties.filter((v) => !v.ok).length
  const aantalOk = bewerkt.length - aantalConflict
  const kanImporteren = aantalConflict === 0 && bewerkt.length > 0 && !bezig

  return (
    <div className="modal-backdrop" onClick={onAnnuleer}>
      <div className="modal-body import-review" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          Import controleren
          <div className="import-review-sub">
            <span className="mono">{bewerkt.length}</span> rij{bewerkt.length !== 1 ? 'en' : ''} —{' '}
            <span className="mono">{aantalOk}</span> geldig
            {aantalConflict > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--red-deep)' }}>
                  <span className="mono">{aantalConflict}</span> conflict
                  {aantalConflict !== 1 ? 'en' : ''}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="import-review-list">
          {bewerkt.map((rij, idx) => (
            <RowEditor
              key={idx}
              rij={rij}
              validatie={validaties[idx]}
              gilden={bekendeGilden}
              onPatch={(p) => patch(idx, p)}
            />
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onAnnuleer}>
            Annuleer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onBevestig(bewerkt)}
            disabled={!kanImporteren}
          >
            {bezig
              ? 'Bezig…'
              : aantalConflict > 0
                ? `${aantalConflict} conflict${aantalConflict !== 1 ? 'en' : ''} resterend`
                : `Importeer ${bewerkt.length} schutter${bewerkt.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function RowEditor({
  rij,
  validatie,
  gilden,
  onPatch
}: {
  rij: ImportRij
  validatie: ReturnType<typeof valideerImportRij>
  gilden: Gilde[]
  onPatch: (p: Partial<ImportRij>) => void
}): JSX.Element {
  const ok = validatie.ok

  // Bij wijziging van boogtype: corrigeer auto Veteraan → Senior
  function kiesBoog(t: Schutter['type_boog']): void {
    if (
      t === 'Compound' &&
      rij.leeftijdscategorie === 'Veteraan'
    ) {
      onPatch({ type_boog: t, leeftijdscategorie: 'Senior' })
    } else {
      onPatch({ type_boog: t })
    }
  }

  function kiesCat(c: Schutter['leeftijdscategorie']): void {
    if ((c === 'Junior' || c === 'Senior' || c === 'Veteraan') && rij.afstand !== 25) {
      onPatch({ leeftijdscategorie: c, afstand: 25 })
    } else if (c === 'Jeugd' && rij.afstand === 25) {
      onPatch({ leeftijdscategorie: c, afstand: 18 })
    } else {
      onPatch({ leeftijdscategorie: c })
    }
  }

  const beschikbareCategorieën = CATEGORIEËN.filter((c) =>
    BOOGTYPES.includes(rij.type_boog as Schutter['type_boog'])
      ? categorieToegestaan(c, rij.type_boog as Schutter['type_boog'])
      : true
  )

  return (
    <div className={'import-review-row' + (ok ? ' ok' : ' fout')}>
      <div className="import-review-row-head">
        <span className="status">{ok ? <IconCheck /> : <IconWarn />}</span>
        <span className="regel mono">Rij {rij.regel}</span>
        <input
          className="input"
          placeholder="Voornaam"
          value={rij.voornaam}
          onChange={(e) => onPatch({ voornaam: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className="input"
          placeholder="Naam"
          value={rij.naam}
          onChange={(e) => onPatch({ naam: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className="input"
          placeholder="Gilde (optioneel)"
          value={rij.gilde_naam}
          onChange={(e) => onPatch({ gilde_naam: e.target.value })}
          list={`gilden-${rij.regel}`}
          style={{ flex: 1.2 }}
        />
        <datalist id={`gilden-${rij.regel}`}>
          {gilden.map((g) => (
            <option key={g.id} value={g.naam} />
          ))}
        </datalist>
      </div>

      <div className="import-review-row-body">
        <select
          className="select"
          value={rij.type_boog}
          onChange={(e) => kiesBoog(e.target.value as Schutter['type_boog'])}
        >
          <option value="">— Boogtype —</option>
          {BOOGTYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={rij.leeftijdscategorie}
          onChange={(e) => kiesCat(e.target.value as Schutter['leeftijdscategorie'])}
        >
          <option value="">— Categorie —</option>
          {beschikbareCategorieën.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="segmented" style={{ minWidth: 120 }}>
          {(['M', 'V'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={rij.geslacht === g ? 'on' : ''}
              onClick={() => onPatch({ geslacht: g })}
            >
              {geslachtLabel(g)}
            </button>
          ))}
        </div>
        <div className="segmented" style={{ minWidth: 150 }}>
          {([12, 18, 25] as const).map((a) => {
            const cat = CATEGORIEËN.includes(rij.leeftijdscategorie as Schutter['leeftijdscategorie'])
              ? (rij.leeftijdscategorie as Schutter['leeftijdscategorie'])
              : null
            const toegestaan = cat ? afstandToegestaan(cat, a) : true
            return (
              <button
                key={a}
                type="button"
                className={rij.afstand === a ? 'on' : ''}
                onClick={() => onPatch({ afstand: a })}
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
      </div>

      {!ok && (
        <div className="import-review-row-warn">
          <IconWarn />
          <span>{validatie.redenen.join(' · ')}</span>
        </div>
      )}
    </div>
  )
}

function IconCheck(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

function IconWarn(): JSX.Element {
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
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}
