import { useEffect, useState } from 'react'
import type { Wedstrijd } from '../types'

interface Props {
  initieel?: Wedstrijd | null
  onOpslaan: (data: Omit<Wedstrijd, 'id' | 'aangemaakt_op'>) => void
  onAnnuleer: () => void
}

// Interne form state: werkt met aantal per afstand, totaal wordt berekend
interface FormData {
  naam: string
  datum: string
  locatie: string
  aantal_doelen_25m: number
  aantal_doelen_18m: number
  aantal_doelen_12m: number
  compound_startdoel: number
  aantal_compound_doelen: number
}

const leegFormulier: FormData = {
  naam: '',
  datum: new Date().toISOString().slice(0, 10),
  locatie: '',
  aantal_doelen_25m: 8,
  aantal_doelen_18m: 1,
  aantal_doelen_12m: 1,
  compound_startdoel: 5,
  aantal_compound_doelen: 1
}

export default function WedstrijdFormulier({ initieel, onOpslaan, onAnnuleer }: Props): JSX.Element {
  const [form, setForm] = useState<FormData>(leegFormulier)

  useEffect(() => {
    if (initieel) {
      const doelen25m = initieel.aantal_doelen - initieel.aantal_doelen_18m - initieel.aantal_doelen_12m
      setForm({
        naam: initieel.naam,
        datum: initieel.datum,
        locatie: initieel.locatie ?? '',
        aantal_doelen_25m: Math.max(0, doelen25m),
        aantal_doelen_18m: initieel.aantal_doelen_18m,
        aantal_doelen_12m: initieel.aantal_doelen_12m,
        compound_startdoel: initieel.compound_startdoel,
        aantal_compound_doelen: initieel.aantal_compound_doelen ?? 1
      })
    } else {
      setForm(leegFormulier)
    }
  }, [initieel])

  function setNum(veld: keyof FormData, waarde: string): void {
    setForm((f) => ({ ...f, [veld]: parseInt(waarde) || 0 }))
  }

  function handleOpslaan(): void {
    const totaal = form.aantal_doelen_25m + form.aantal_doelen_18m + form.aantal_doelen_12m
    onOpslaan({
      naam: form.naam,
      datum: form.datum,
      locatie: form.locatie,
      aantal_doelen: totaal,
      aantal_doelen_18m: form.aantal_doelen_18m,
      aantal_doelen_12m: form.aantal_doelen_12m,
      compound_startdoel: form.compound_startdoel,
      aantal_compound_doelen: form.aantal_compound_doelen
    })
  }

  const labelCls = 'block text-sm font-medium text-slate-700 mb-1'
  const inputCls = 'w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none'
  const totaal = form.aantal_doelen_25m + form.aantal_doelen_18m + form.aantal_doelen_12m

  const compoundEinde = form.compound_startdoel + form.aantal_compound_doelen - 1
  const compoundGeldig =
    form.compound_startdoel >= 1 &&
    compoundEinde <= form.aantal_doelen_25m

  return (
    <div className="space-y-4">
      {/* Naam & Datum */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Naam wedstrijd *</label>
          <input
            className={inputCls}
            value={form.naam}
            onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
            placeholder="bv. Wintercompetitie ronde 3"
          />
        </div>
        <div>
          <label className={labelCls}>Datum *</label>
          <input
            type="date"
            className={inputCls}
            value={form.datum}
            onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
          />
        </div>
      </div>

      {/* Locatie */}
      <div>
        <label className={labelCls}>Locatie</label>
        <input
          className={inputCls}
          value={form.locatie ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, locatie: e.target.value }))}
          placeholder="bv. Sporthal De Boog"
        />
      </div>

      {/* Doelen per afstand */}
      <div>
        <label className={labelCls}>Doelconfiguratie</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="mb-1 text-xs text-slate-500">Doelen op 25m</p>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.aantal_doelen_25m}
              onChange={(e) => setNum('aantal_doelen_25m', e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Doelen op 18m</p>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.aantal_doelen_18m}
              onChange={(e) => setNum('aantal_doelen_18m', e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Doelen op 12m</p>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.aantal_doelen_12m}
              onChange={(e) => setNum('aantal_doelen_12m', e.target.value)}
            />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Totaal: {totaal} doel{totaal !== 1 ? 'en' : ''}
        </p>
      </div>

      {/* Compound configuratie */}
      {form.aantal_doelen_25m > 0 && (
        <div>
          <label className={labelCls}>Compound (binnen de 25m doelen)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs text-slate-500">Startdoel</p>
              <input
                type="number"
                min={1}
                max={form.aantal_doelen_25m}
                className={inputCls}
                value={form.compound_startdoel}
                onChange={(e) => setNum('compound_startdoel', e.target.value)}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Aantal compound doelen</p>
              <input
                type="number"
                min={1}
                max={form.aantal_doelen_25m}
                className={inputCls}
                value={form.aantal_compound_doelen}
                onChange={(e) => setNum('aantal_compound_doelen', e.target.value)}
              />
            </div>
          </div>
          {compoundGeldig ? (
            <p className="mt-1.5 text-xs text-slate-400">
              Doel{form.aantal_compound_doelen > 1 ? 'en' : ''}{' '}
              {form.compound_startdoel === compoundEinde
                ? form.compound_startdoel
                : `${form.compound_startdoel}–${compoundEinde}`}{' '}
              {form.aantal_compound_doelen > 1 ? 'zijn' : 'is'} compound
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-amber-600">
              ⚠ Compound doelen vallen buiten de 25m zone (max doel {form.aantal_doelen_25m}).
            </p>
          )}
        </div>
      )}

      {/* Knoppen */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onAnnuleer}
          className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Annuleer
        </button>
        <button
          onClick={handleOpslaan}
          disabled={!form.naam.trim() || !form.datum || totaal === 0 || !compoundGeldig}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {initieel ? 'Opslaan' : 'Aanmaken'}
        </button>
      </div>
    </div>
  )
}
