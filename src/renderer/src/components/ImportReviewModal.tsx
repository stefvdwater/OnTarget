import { useEffect, useMemo, useState } from 'react'
import type { Gilde, Schutter } from '../types'
import { afstandToegestaan, categorieToegestaan } from './SchutterFormulier'
import { geslachtLabel } from '../lib/labels'

export type DuplicaatActie = 'behoud' | 'vervang' | 'beide'

export interface DuplicaatInfoDb {
  bron: 'db'
  bestaande: Schutter
  actie: DuplicaatActie
}

export interface DuplicaatInfoCsv {
  bron: 'csv'
  // 1-gebaseerd regelnummer van de eerdere matchende rij (voor weergave)
  matchRegel: number
  actie: DuplicaatActie
}

export type DuplicaatInfo = DuplicaatInfoDb | DuplicaatInfoCsv

export interface ImportRij {
  regel: number
  voornaam: string
  naam: string
  gilde_naam: string
  type_boog: Schutter['type_boog'] | ''
  leeftijdscategorie: Schutter['leeftijdscategorie'] | ''
  geslacht: Schutter['geslacht'] | ''
  afstand: 12 | 18 | 25 | 0
  actief: boolean
  duplicaat?: DuplicaatInfo
}

const BOOGTYPES: Schutter['type_boog'][] = ['Recurve', 'Compound', 'Barebow', 'Andere']
const CATEGORIEËN: Schutter['leeftijdscategorie'][] = [
  'Aspirant',
  'Jeugd',
  'Junior',
  'Senior',
  'Veteraan'
]

function normaliseer(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

function dupSleutel(voornaam: string, naam: string, gilde: string | null | undefined): string {
  return `${normaliseer(voornaam)}|${normaliseer(naam)}|${normaliseer(gilde)}`
}

/**
 * Markeer duplicaten op (voornaam + naam + gilde, ci, getrimd).
 *
 * - DB-match: vult `duplicaat = { bron: 'db', bestaande, actie: 'skip' }` en zet `actief = false`.
 * - CSV-intern: eerste voorkomen blijft actief, vervolg-rijen worden uitgevinkt.
 *   DB-match wint van CSV-match — een CSV-rij die al matcht met DB krijgt geen
 *   csv-marker (de DB-actie dekt dat scenario al).
 */
export function detecteerDuplicaten(
  rijen: ImportRij[],
  bestaandeSchutters: Schutter[]
): ImportRij[] {
  const dbIndex = new Map<string, Schutter>()
  for (const s of bestaandeSchutters) {
    dbIndex.set(dupSleutel(s.voornaam, s.naam, s.gilde_naam), s)
  }

  const eersteCsvRegel = new Map<string, number>()
  return rijen.map((r) => {
    const sleutel = dupSleutel(r.voornaam, r.naam, r.gilde_naam)
    const dbMatch = dbIndex.get(sleutel)
    if (dbMatch) {
      return {
        ...r,
        actief: false,
        duplicaat: { bron: 'db', bestaande: dbMatch, actie: 'behoud' }
      }
    }
    const eerder = eersteCsvRegel.get(sleutel)
    if (eerder !== undefined) {
      return {
        ...r,
        actief: false,
        duplicaat: { bron: 'csv', matchRegel: eerder, actie: 'behoud' }
      }
    }
    eersteCsvRegel.set(sleutel, r.regel)
    return r
  })
}

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
  bestaandeSchutters: Schutter[]
  bezig: boolean
  onAnnuleer: () => void
  onBevestig: (rijen: ImportRij[]) => void
}

export default function ImportReviewModal({
  rijen,
  bekendeGilden,
  bestaandeSchutters,
  bezig,
  onAnnuleer,
  onBevestig
}: Props): JSX.Element {
  // Markeer duplicaten, en zet conflicten + duplicaten bovenaan zodat de
  // gebruiker niet moet zoeken. Relatieve volgorde blijft daarna stabiel.
  const [bewerkt, setBewerkt] = useState<ImportRij[]>(() => {
    const gemarkeerd = detecteerDuplicaten(
      rijen.map((r) => ({ ...r })),
      bestaandeSchutters
    )
    const conflict: ImportRij[] = []
    const dup: ImportRij[] = []
    const ok: ImportRij[] = []
    for (const r of gemarkeerd) {
      if (!valideerImportRij(r).ok) conflict.push(r)
      else if (r.duplicaat) dup.push(r)
      else ok.push(r)
    }
    return [...conflict, ...dup, ...ok]
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

  function zetDbActie(idx: number, actie: DuplicaatActie): void {
    setBewerkt((prev) => {
      const next = [...prev]
      const r = next[idx]
      if (!r.duplicaat || r.duplicaat.bron !== 'db') return prev
      next[idx] = {
        ...r,
        duplicaat: { ...r.duplicaat, actie },
        actief: actie === 'vervang' || actie === 'beide'
      }
      return next
    })
  }

  /**
   * Past de actie voor een CSV-intern duplicaat toe. De keuze raakt twee rijen:
   * - 'behoud': eerdere rij blijft actief, deze rij inactief
   * - 'vervang': deze rij actief, eerdere rij inactief
   * - 'beide': beide actief
   */
  function zetCsvActie(idx: number, actie: DuplicaatActie): void {
    setBewerkt((prev) => {
      const r = prev[idx]
      if (!r.duplicaat || r.duplicaat.bron !== 'csv') return prev
      const matchRegel = r.duplicaat.matchRegel
      const dezeActief = actie === 'vervang' || actie === 'beide'
      const eerdereActief = actie === 'behoud' || actie === 'beide'
      return prev.map((row, i) => {
        if (i === idx) {
          return {
            ...row,
            duplicaat: { ...(row.duplicaat as DuplicaatInfoCsv), actie },
            actief: dezeActief
          }
        }
        if (row.regel === matchRegel) {
          return { ...row, actief: eerdereActief }
        }
        return row
      })
    })
  }

  const validaties = useMemo(() => bewerkt.map(valideerImportRij), [bewerkt])
  const aantalActief = bewerkt.filter((r) => r.actief).length
  // Alleen actieve rijen tellen voor blokkeren — uitgevinkte rijen mogen ongeldig zijn.
  const aantalActiefConflict = bewerkt.reduce(
    (n, r, i) => (r.actief && !validaties[i].ok ? n + 1 : n),
    0
  )
  const aantalDuplicaat = bewerkt.filter((r) => r.duplicaat).length
  const kanImporteren = aantalActief > 0 && aantalActiefConflict === 0 && !bezig

  const alleActief = aantalActief === bewerkt.length
  function zetAllesActief(actief: boolean): void {
    setBewerkt((prev) =>
      prev.map((r) => {
        if (!r.duplicaat) return { ...r, actief }
        // Bij bulk-aan kiezen we 'beide' zodat alle rijen geïmporteerd worden
        // (incl. de matchende rij). 'vervang' zou bij CSV-duplicaten de
        // eerdere rij net deactiveren, wat strijdig is met "alles aan".
        const actie: DuplicaatActie = actief ? 'beide' : 'behoud'
        return { ...r, actief, duplicaat: { ...r.duplicaat, actie } }
      })
    )
  }

  return (
    <div className="modal-backdrop" onClick={onAnnuleer}>
      <div className="modal-body import-review" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          Import controleren
          <div className="import-review-sub">
            <span className="mono">{bewerkt.length}</span> rij{bewerkt.length !== 1 ? 'en' : ''}
            {' · '}
            <span className="mono">{aantalActief}</span> aangevinkt
            {aantalDuplicaat > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--blue)' }}>
                  <span className="mono">{aantalDuplicaat}</span> duplica
                  {aantalDuplicaat !== 1 ? 'ten' : 'at'}
                </span>
              </>
            )}
            {aantalActiefConflict > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--red-deep)' }}>
                  <span className="mono">{aantalActiefConflict}</span> conflict
                  {aantalActiefConflict !== 1 ? 'en' : ''}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="import-review-toolbar">
          <label className="bulk-toggle">
            <input
              type="checkbox"
              checked={alleActief}
              ref={(el) => {
                if (el) el.indeterminate = !alleActief && aantalActief > 0
              }}
              onChange={(e) => zetAllesActief(e.target.checked)}
            />
            <span>Alles aan/uit</span>
          </label>
        </div>

        <div className="import-review-list">
          {bewerkt.map((rij, idx) => (
            <RowEditor
              key={idx}
              rij={rij}
              validatie={validaties[idx]}
              gilden={bekendeGilden}
              onPatch={(p) => patch(idx, p)}
              onDbActie={(a) => zetDbActie(idx, a)}
              onCsvActie={(a) => zetCsvActie(idx, a)}
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
              : aantalActiefConflict > 0
                ? `${aantalActiefConflict} conflict${aantalActiefConflict !== 1 ? 'en' : ''} resterend`
                : `Importeer ${aantalActief} schutter${aantalActief !== 1 ? 's' : ''}`}
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
  onPatch,
  onDbActie,
  onCsvActie
}: {
  rij: ImportRij
  validatie: ReturnType<typeof valideerImportRij>
  gilden: Gilde[]
  onPatch: (p: Partial<ImportRij>) => void
  onDbActie: (actie: DuplicaatActie) => void
  onCsvActie: (actie: DuplicaatActie) => void
}): JSX.Element {
  const ok = validatie.ok
  const dupDb = rij.duplicaat?.bron === 'db' ? rij.duplicaat : null
  const dupCsv = rij.duplicaat?.bron === 'csv' ? rij.duplicaat : null
  const bestaande = dupDb?.bestaande

  // Welke velden wijken af van de bestaande DB-schutter?
  const afwijkt = (veld: 'voornaam' | 'naam' | 'gilde' | 'boog' | 'cat' | 'geslacht' | 'afstand'): boolean => {
    if (!bestaande) return false
    switch (veld) {
      case 'voornaam':
        return normaliseer(rij.voornaam) !== normaliseer(bestaande.voornaam)
      case 'naam':
        return normaliseer(rij.naam) !== normaliseer(bestaande.naam)
      case 'gilde':
        return normaliseer(rij.gilde_naam) !== normaliseer(bestaande.gilde_naam)
      case 'boog':
        return rij.type_boog !== bestaande.type_boog
      case 'cat':
        return rij.leeftijdscategorie !== bestaande.leeftijdscategorie
      case 'geslacht':
        return rij.geslacht !== bestaande.geslacht
      case 'afstand':
        return rij.afstand !== bestaande.afstand
    }
  }

  function kiesBoog(t: Schutter['type_boog']): void {
    if (t === 'Compound' && rij.leeftijdscategorie === 'Veteraan') {
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

  const rowCls = [
    'import-review-row',
    ok ? 'ok' : 'fout',
    rij.duplicaat ? 'duplicaat' : '',
    rij.actief ? '' : 'inactief'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowCls}>
      <div className="import-review-row-head">
        <input
          type="checkbox"
          className="row-toggle"
          checked={rij.actief}
          onChange={(e) => {
            const actief = e.target.checked
            if (dupDb) {
              // Toggle stuurt actie aan zodat we consistent blijven met de radio.
              onDbActie(actief ? 'vervang' : 'behoud')
            } else if (dupCsv) {
              onCsvActie(actief ? 'vervang' : 'behoud')
            } else {
              onPatch({ actief })
            }
          }}
          aria-label="Importeer deze rij"
        />
        <span className="status">{ok && !rij.duplicaat ? <IconCheck /> : <IconWarn />}</span>
        <span className="regel mono">Rij {rij.regel}</span>
        <input
          className={'input' + (afwijkt('voornaam') ? ' afwijkend' : '')}
          placeholder="Voornaam"
          value={rij.voornaam}
          onChange={(e) => onPatch({ voornaam: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className={'input' + (afwijkt('naam') ? ' afwijkend' : '')}
          placeholder="Naam"
          value={rij.naam}
          onChange={(e) => onPatch({ naam: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className={'input' + (afwijkt('gilde') ? ' afwijkend' : '')}
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
          className={'select' + (afwijkt('boog') ? ' afwijkend' : '')}
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
          className={'select' + (afwijkt('cat') ? ' afwijkend' : '')}
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
        <div
          className={'segmented' + (afwijkt('geslacht') ? ' afwijkend' : '')}
          style={{ minWidth: 120 }}
        >
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
        <div
          className={'segmented' + (afwijkt('afstand') ? ' afwijkend' : '')}
          style={{ minWidth: 150 }}
        >
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

      {dupDb && (
        <div className="import-review-row-dup">
          <div className="dup-label">
            <IconWarn />
            <span>
              Bestaat al in database
              {bestaande?.gilde_naam ? ` (${bestaande.gilde_naam})` : ''}. Wat doen?
            </span>
          </div>
          <div className="dup-keuze">
            {(
              [
                ['behoud', 'Behoud bestaande'],
                ['vervang', 'Vervang met deze rij'],
                ['beide', 'Importeer beide']
              ] as [DuplicaatActie, string][]
            ).map(([a, label]) => (
              <label key={a} className={'dup-radio' + (dupDb.actie === a ? ' on' : '')}>
                <input
                  type="radio"
                  name={`dup-${rij.regel}`}
                  checked={dupDb.actie === a}
                  onChange={() => onDbActie(a)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {dupCsv && (
        <div className="import-review-row-dup">
          <div className="dup-label">
            <IconWarn />
            <span>
              Duplicaat van rij <span className="mono">{dupCsv.matchRegel}</span> uit hetzelfde
              bestand. Wat doen?
            </span>
          </div>
          <div className="dup-keuze">
            {(
              [
                ['behoud', `Behoud rij ${dupCsv.matchRegel}`],
                ['vervang', 'Vervang met deze rij'],
                ['beide', 'Importeer beide']
              ] as [DuplicaatActie, string][]
            ).map(([a, label]) => (
              <label key={a} className={'dup-radio' + (dupCsv.actie === a ? ' on' : '')}>
                <input
                  type="radio"
                  name={`dup-${rij.regel}`}
                  checked={dupCsv.actie === a}
                  onChange={() => onCsvActie(a)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
