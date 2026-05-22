import { useEffect, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { Inschrijving, Wedstrijd } from '../types'
import type { Doel, DoelMetConflicten, DoelSlot } from '../algoritme/types'
import { berekenIndeling } from '../algoritme/indeling'
import { configVanWedstrijd as cfgVanW } from '../algoritme/types'
import { voegConflictenToe } from '../algoritme/conflicten'
import SchutterKaart from '../components/SchutterKaart'
import DoelKolom from '../components/DoelKolom'
import NietIngedeeldBalk from '../components/NietIngedeeldBalk'

interface Props {
  wedstrijd: Wedstrijd
}

export default function IndelingTab({ wedstrijd }: Props): JSX.Element {
  const [doelen, setDoelen] = useState<DoelMetConflicten[]>([])
  const [nietIngedeeld, setNietIngedeeld] = useState<DoelSlot[]>([])
  const [actiefSlot, setActiefSlot] = useState<DoelSlot | null>(null)
  const [opgeslagen, setOpgeslagen] = useState(false)
  const [bevestigAuto, setBevestigAuto] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    laadIndeling()
  }, [wedstrijd.id])

  async function laadIndeling(): Promise<void> {
    const rijen = await window.api.indeling.getByWedstrijd(wedstrijd.id)

    if (rijen.length === 0) {
      // Nog geen indeling: toon alle ingeschreven als niet-ingedeeld
      const inschrijvingen: Inschrijving[] = await window.api.inschrijvingen.getByWedstrijd(wedstrijd.id)
      const legeDoelen = maakLegeDoelen(wedstrijd)
      setDoelen(legeDoelen)
      setNietIngedeeld(inschrijvingen.map((i, idx) => inschrijvingNaarSlot(i, idx)))
    } else {
      // Herstel opgeslagen indeling
      const config = cfgVanW(wedstrijd)
      const alleDoelen = maakLegeDoelen(wedstrijd)

      rijen.forEach((r: any) => {
        const doel = alleDoelen.find((d) => d.nummer === r.doel_nummer)
        if (doel) {
          doel.schutters.push({
            schutter_id: r.schutter_id,
            voornaam: r.voornaam,
            naam: r.naam,
            gilde_naam: r.gilde_naam,
            type_boog: r.type_boog,
            afstand: r.afstand,
            dubbel_eerste_helft: !!r.dubbel_eerste_helft,
            dubbel_tweede_helft: !!r.dubbel_tweede_helft,
            positie: r.positie
          })
          if (r.vergrendeld) doel.vergrendeld = true
        }
      })

      // Sorteer schutters per doel op positie
      alleDoelen.forEach((d) => d.schutters.sort((a, b) => a.positie - b.positie))
      setDoelen(voegConflictenToe(alleDoelen as Doel[]))
      setNietIngedeeld([])
    }
  }

  function voerAutoIn(): void {
    if (doelen.some((d) => d.schutters.length > 0)) {
      setBevestigAuto(true)
    } else {
      runAuto()
    }
  }

  async function runAuto(): Promise<void> {
    setBevestigAuto(false)
    const inschrijvingen: Inschrijving[] = await window.api.inschrijvingen.getByWedstrijd(wedstrijd.id)
    const vergrendeldeDoelen = await window.api.indeling.getVergrendeldeDoelen(wedstrijd.id)
    const vergrendeldeSet = new Set<number>(vergrendeldeDoelen)

    // Filter niet-vergrendelde inschrijvingen
    const vergrendeldeSchutterIds = new Set(
      doelen
        .filter((d) => vergrendeldeSet.has(d.nummer))
        .flatMap((d) => d.schutters.map((s) => s.schutter_id))
    )
    const vrijeInschrijvingen = inschrijvingen.filter(
      (i) => !vergrendeldeSchutterIds.has(i.schutter_id)
    )

    const config = cfgVanW(wedstrijd)
    const resultaat = berekenIndeling(vrijeInschrijvingen as any, config)

    // Voeg vergrendelde doelen terug samen
    const alleDoelen = resultaat.doelen.map((d) => {
      if (vergrendeldeSet.has(d.nummer)) {
        const huidig = doelen.find((h) => h.nummer === d.nummer)
        return huidig ?? d
      }
      return d
    })

    setDoelen(alleDoelen)
    setNietIngedeeld(resultaat.nietIngedeeld.map((s, i) => ({
      schutter_id: s.schutter_id,
      voornaam: s.voornaam,
      naam: s.naam,
      gilde_naam: s.gilde_naam,
      type_boog: s.type_boog,
      afstand: s.afstand,
      dubbel_eerste_helft: !!s.dubbel_eerste_helft,
      dubbel_tweede_helft: !!s.dubbel_tweede_helft,
      positie: i
    })))
    setOpgeslagen(false)
    await slaOp(alleDoelen)
  }

  async function slaOp(huidigeDoelen: DoelMetConflicten[]): Promise<void> {
    const rijen = huidigeDoelen.flatMap((d) =>
      d.schutters.map((s) => ({
        wedstrijd_id: wedstrijd.id,
        doel_nummer: d.nummer,
        schutter_id: s.schutter_id,
        positie: s.positie,
        vergrendeld: d.vergrendeld ? 1 : 0
      }))
    )
    await window.api.indeling.save(wedstrijd.id, rijen)
    setOpgeslagen(true)
  }

  // ── Drag & Drop ───────────────────────────────────────────

  function vindSlot(id: string): { doel: DoelMetConflicten | null; slot: DoelSlot | null } {
    for (const d of doelen) {
      const slot = d.schutters.find((s) => `${d.nummer}-${s.schutter_id}` === id)
      if (slot) return { doel: d, slot }
    }
    const inSlot = nietIngedeeld.find((s) => `niet-${s.schutter_id}` === id)
    return { doel: null, slot: inSlot ?? null }
  }

  function onDragStart(event: DragStartEvent): void {
    const { slot } = vindSlot(event.active.id as string)
    setActiefSlot(slot)
  }

  function onDragEnd(event: DragEndEvent): void {
    setActiefSlot(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Bepaal bron
    const vanNietIngedeeld = activeId.startsWith('niet-')
    const bronSchutterId = vanNietIngedeeld
      ? parseInt(activeId.replace('niet-', ''))
      : parseInt(activeId.split('-')[1])
    const bronDoelNr = vanNietIngedeeld ? null : parseInt(activeId.split('-')[0])

    // Bepaal bestemming
    const naarNietIngedeeld = overId === 'niet-ingedeeld'
    const naarDoelNr = overId.startsWith('doel-') ? parseInt(overId.replace('doel-', '')) : null

    if (naarNietIngedeeld) {
      verplaatsNaarNietIngedeeld(bronSchutterId, bronDoelNr)
    } else if (naarDoelNr !== null) {
      verplaatsNaarDoel(bronSchutterId, bronDoelNr, naarDoelNr)
    }
  }

  function verplaatsNaarNietIngedeeld(schutterId: number, vanDoelNr: number | null): void {
    if (vanDoelNr === null) return
    const nieuweDoelen = doelen.map((d) => {
      if (d.nummer !== vanDoelNr) return d
      return { ...d, schutters: d.schutters.filter((s) => s.schutter_id !== schutterId) }
    })
    const slot = doelen.find((d) => d.nummer === vanDoelNr)?.schutters.find((s) => s.schutter_id === schutterId)
    if (slot) setNietIngedeeld((prev) => [...prev, slot])
    const metConflicten = voegConflictenToe(nieuweDoelen as Doel[])
    setDoelen(metConflicten)
    slaOp(metConflicten)
  }

  function verplaatsNaarDoel(schutterId: number, vanDoelNr: number | null, naarDoelNr: number): void {
    let slot: DoelSlot | undefined

    let nieuweDoelen = doelen.map((d) => {
      if (vanDoelNr !== null && d.nummer === vanDoelNr) {
        slot = d.schutters.find((s) => s.schutter_id === schutterId)
        return { ...d, schutters: d.schutters.filter((s) => s.schutter_id !== schutterId) }
      }
      return d
    })

    if (!slot) {
      // Van niet-ingedeeld
      slot = nietIngedeeld.find((s) => s.schutter_id === schutterId)
      if (!slot) return
      setNietIngedeeld((prev) => prev.filter((s) => s.schutter_id !== schutterId))
    }

    nieuweDoelen = nieuweDoelen.map((d) => {
      if (d.nummer !== naarDoelNr) return d
      if (d.schutters.some((s) => s.schutter_id === schutterId)) return d
      const nieuwePositie = d.schutters.length
      return { ...d, schutters: [...d.schutters, { ...slot!, positie: nieuwePositie }] }
    })

    const metConflicten = voegConflictenToe(nieuweDoelen as Doel[])
    setDoelen(metConflicten)
    slaOp(metConflicten)
  }

  async function toggleVergrendel(doelNr: number): Promise<void> {
    const nieuweDoelen = doelen.map((d) =>
      d.nummer === doelNr ? { ...d, vergrendeld: !d.vergrendeld } : d
    )
    setDoelen(nieuweDoelen)
    const vergrendeld = nieuweDoelen.find((d) => d.nummer === doelNr)?.vergrendeld ?? false
    await window.api.indeling.toggleDoelVergrendeld(wedstrijd.id, doelNr, vergrendeld)
  }

  // ── Render ────────────────────────────────────────────────

  const totaalConflicten = doelen.reduce((s, d) => s + d.conflicten.length, 0)

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-[calc(100vh-220px)] gap-4">
        {/* Linker balk: niet-ingedeelde schutters */}
        <NietIngedeeldBalk slots={nietIngedeeld} />

        {/* Rechter zone: doelmatrix */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Actiebalk */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={voerAutoIn}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                ⚡ Auto
              </button>
              <button
                onClick={() => slaOp(doelen)}
                className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                💾 Opslaan
              </button>
              {opgeslagen && <span className="text-xs text-green-600">✓ Opgeslagen</span>}
            </div>
            {totaalConflicten > 0 && (
              <span className="text-sm text-amber-600">
                ⚠ {totaalConflicten} aandachtspunt{totaalConflicten > 1 ? 'en' : ''}
              </span>
            )}
          </div>

          {/* Doelen grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid auto-rows-min grid-cols-5 gap-2 pb-4">
              {doelen.map((doel) => (
                <DoelKolom
                  key={doel.nummer}
                  doel={doel}
                  onVergrendel={() => toggleVergrendel(doel.nummer)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {actiefSlot && <SchutterKaart slot={actiefSlot} draggableId="overlay" compact />}
      </DragOverlay>

      {/* Bevestiging Auto */}
      {bevestigAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Indeling herberekenen?</h2>
            <p className="mb-5 text-sm text-slate-600">
              De huidige indeling wordt overschreven. Vergrendelde doelen blijven bewaard.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBevestigAuto(false)}
                className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuleer
              </button>
              <button
                onClick={runAuto}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Herbereken
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}

// ── Helpers ───────────────────────────────────────────────

function maakLegeDoelen(wedstrijd: Wedstrijd): DoelMetConflicten[] {
  const totaal = wedstrijd.aantal_doelen
  const doelen18 = wedstrijd.aantal_doelen_18m
  const doelen12 = wedstrijd.aantal_doelen_12m
  const doelen25 = totaal - doelen18 - doelen12
  const compoundStart = wedstrijd.compound_startdoel
  const compoundEinde = compoundStart + (wedstrijd.aantal_compound_doelen ?? 1) - 1

  const doelen: DoelMetConflicten[] = []
  for (let i = 1; i <= totaal; i++) {
    let zone: Doel['zone']
    if (i > doelen25 + doelen18) zone = '12m'
    else if (i > doelen25) zone = '18m'
    else if (i >= compoundStart && i <= compoundEinde) zone = 'compound'
    else zone = '25m'
    doelen.push({ nummer: i, zone, schutters: [], vergrendeld: false, conflicten: [] })
  }
  return doelen
}

function inschrijvingNaarSlot(i: Inschrijving, idx: number): DoelSlot {
  return {
    schutter_id: i.schutter_id,
    voornaam: i.voornaam,
    naam: i.naam,
    gilde_naam: i.gilde_naam,
    type_boog: i.type_boog,
    afstand: i.afstand,
    dubbel_eerste_helft: !!i.dubbel_eerste_helft,
    dubbel_tweede_helft: !!i.dubbel_tweede_helft,
    positie: idx
  }
}
