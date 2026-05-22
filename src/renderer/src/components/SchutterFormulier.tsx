import { useEffect, useState } from 'react'
import type { Gilde, Schutter, SchutterFormData } from '../types'

interface Props {
  initieel?: Schutter | null
  onOpslaan: (data: SchutterFormData) => void
  onAnnuleer: () => void
}

// Volgorde en regels voor leeftijdscategorieën
const CATEGORIE_VOLGORDE: SchutterFormData['leeftijdscategorie'][] = [
  'Jeugd', 'Junior', 'Aspirant', 'Senior', 'Veteraan'
]

// Jeugdcategorieën schieten korte afstand (12m of 18m)
const JEUGD_CATEGORIEËN: SchutterFormData['leeftijdscategorie'][] = ['Aspirant', 'Jeugd']

function isJeugdCategorie(cat: SchutterFormData['leeftijdscategorie']): boolean {
  return JEUGD_CATEGORIEËN.includes(cat)
}

const leegFormulier: SchutterFormData = {
  voornaam: '',
  naam: '',
  gilde_id: null,
  gilde_naam_nieuw: '',
  type_boog: 'Recurve',
  leeftijdscategorie: 'Senior',
  geslacht: 'M',
  afstand: 25
}

export default function SchutterFormulier({ initieel, onOpslaan, onAnnuleer }: Props): JSX.Element {
  const [form, setForm] = useState<SchutterFormData>(leegFormulier)
  const [gilden, setGilden] = useState<Gilde[]>([])
  const [nieuwGilde, setNieuwGilde] = useState(false)

  useEffect(() => {
    window.api.gilden.getAll().then(setGilden)
  }, [])

  useEffect(() => {
    if (initieel) {
      setForm({
        voornaam: initieel.voornaam,
        naam: initieel.naam,
        gilde_id: initieel.gilde_id,
        gilde_naam_nieuw: '',
        type_boog: initieel.type_boog,
        leeftijdscategorie: initieel.leeftijdscategorie,
        geslacht: initieel.geslacht,
        afstand: initieel.afstand
      })
    } else {
      setForm(leegFormulier)
    }
    setNieuwGilde(false)
  }, [initieel])

  // Wanneer categorie wijzigt: pas afstand automatisch aan
  function handleCategorieWijzig(cat: SchutterFormData['leeftijdscategorie']): void {
    const nieuweAfstand: SchutterFormData['afstand'] = isJeugdCategorie(cat)
      ? form.afstand !== 25 ? form.afstand : 18  // behoud 12/18 indien al ingesteld, anders 18
      : 25
    setForm((f) => ({ ...f, leeftijdscategorie: cat, afstand: nieuweAfstand }))
  }

  // Wanneer boogtype wijzigt: verwijder Veteraan-categorie voor Compound
  function handleBoogtypeWijzig(type: SchutterFormData['type_boog']): void {
    const nieuweCategorie =
      type === 'Compound' && form.leeftijdscategorie === 'Veteraan' ? 'Senior' : form.leeftijdscategorie
    setForm((f) => ({ ...f, type_boog: type, leeftijdscategorie: nieuweCategorie }))
  }

  function set<K extends keyof SchutterFormData>(veld: K, waarde: SchutterFormData[K]): void {
    setForm((f) => ({ ...f, [veld]: waarde }))
  }

  function handleOpslaan(): void {
    if (!form.voornaam.trim() || !form.naam.trim()) return
    onOpslaan(form)
  }

  // Beschikbare afstanden afhankelijk van categorie
  const beschikbareAfstanden: SchutterFormData['afstand'][] = isJeugdCategorie(form.leeftijdscategorie)
    ? [18, 12]
    : [25]

  // Beschikbare categorieën afhankelijk van boogtype (Compound kan geen Veteraan zijn)
  const beschikbareCategorieën = CATEGORIE_VOLGORDE.filter(
    (c) => !(form.type_boog === 'Compound' && c === 'Veteraan')
  )

  const labelCls = 'block text-sm font-medium text-primary mb-1'
  const inputCls = 'input'
  const selectCls = inputCls

  return (
    <div className="space-y-4">
      {/* Naam */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Voornaam *</label>
          <input
            className={inputCls}
            value={form.voornaam}
            onChange={(e) => set('voornaam', e.target.value)}
            placeholder="Voornaam"
          />
        </div>
        <div>
          <label className={labelCls}>Naam *</label>
          <input
            className={inputCls}
            value={form.naam}
            onChange={(e) => set('naam', e.target.value)}
            placeholder="Familienaam"
          />
        </div>
      </div>

      {/* Gilde */}
      <div>
        <label className={labelCls}>Gilde</label>
        {!nieuwGilde ? (
          <div className="flex gap-2">
            <select
              className={selectCls}
              value={form.gilde_id ?? ''}
              onChange={(e) => set('gilde_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Geen gilde —</option>
              {gilden.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.naam}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNieuwGilde(true)}
              className="btn-secondary whitespace-nowrap"
            >
              + Nieuw gilde
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={form.gilde_naam_nieuw}
              onChange={(e) => set('gilde_naam_nieuw', e.target.value)}
              placeholder="Naam nieuw gilde"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setNieuwGilde(false)}
              className="btn-secondary whitespace-nowrap"
            >
              Annuleer
            </button>
          </div>
        )}
      </div>

      {/* Leeftijdscategorie & Geslacht */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Leeftijdscategorie</label>
          <select
            className={selectCls}
            value={form.leeftijdscategorie}
            onChange={(e) => handleCategorieWijzig(e.target.value as SchutterFormData['leeftijdscategorie'])}
          >
            {beschikbareCategorieën.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Geslacht</label>
          <select
            className={selectCls}
            value={form.geslacht}
            onChange={(e) => setForm((f) => ({ ...f, geslacht: e.target.value as SchutterFormData['geslacht'] }))}
          >
            <option value="M">M</option>
            <option value="V">V</option>
          </select>
        </div>
      </div>

      {/* Type boog & Afstand */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type boog</label>
          <select
            className={selectCls}
            value={form.type_boog}
            onChange={(e) => handleBoogtypeWijzig(e.target.value as SchutterFormData['type_boog'])}
          >
            <option>Recurve</option>
            <option>Compound</option>
            <option>Barebow</option>
            <option>Andere</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>
            Afstand
            {isJeugdCategorie(form.leeftijdscategorie) && (
              <span className="ml-1 text-[10px] font-normal text-muted">(jeugd: 12m of 18m)</span>
            )}
          </label>
          <select
            className={selectCls}
            value={form.afstand}
            onChange={(e) => setForm((f) => ({ ...f, afstand: Number(e.target.value) as SchutterFormData['afstand'] }))}
          >
            {beschikbareAfstanden.map((a) => (
              <option key={a} value={a}>{a}m</option>
            ))}
          </select>
        </div>
      </div>

      {/* Knoppen */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onAnnuleer} className="btn-secondary">
          Annuleer
        </button>
        <button
          type="button"
          onClick={handleOpslaan}
          disabled={!form.voornaam.trim() || !form.naam.trim()}
          className="btn-primary"
        >
          {initieel ? 'Opslaan' : 'Toevoegen'}
        </button>
      </div>
    </div>
  )
}
