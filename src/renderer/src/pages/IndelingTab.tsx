import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
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
  const [bevestigAuto, setBevestigAuto] = useState(false)
  const [bevestigLeegmaken, setBevestigLeegmaken] = useState(false)
  const [totaalInschrijvingen, setTotaalInschrijvingen] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    laadIndeling()
  }, [wedstrijd.id])

  async function laadIndeling(): Promise<void> {
    const rijen = await window.api.indeling.getByWedstrijd(wedstrijd.id)
    const inschrijvingen: Inschrijving[] = await window.api.inschrijvingen.getByWedstrijd(wedstrijd.id)
    const vergrendeldeDoelen = await window.api.indeling.getVergrendeldeDoelen(wedstrijd.id)
    const vergrendeldeSet = new Set<number>(vergrendeldeDoelen)
    setTotaalInschrijvingen(inschrijvingen.length)

    if (rijen.length === 0) {
      const legeDoelen = maakLegeDoelen(wedstrijd)
      legeDoelen.forEach((d) => {
        d.vergrendeld = vergrendeldeSet.has(d.nummer)
      })
      setDoelen(legeDoelen)
      setNietIngedeeld(inschrijvingen.map((i, idx) => inschrijvingNaarSlot(i, idx)))
    } else {
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
            leeftijdscategorie: r.leeftijdscategorie,
            geslacht: r.geslacht,
            dubbel_eerste_helft: !!r.dubbel_eerste_helft,
            dubbel_tweede_helft: !!r.dubbel_tweede_helft,
            positie: r.positie
          })
        }
      })

      alleDoelen.forEach((d) => {
        d.schutters.sort((a, b) => a.positie - b.positie)
        d.vergrendeld = vergrendeldeSet.has(d.nummer)
      })
      setDoelen(voegConflictenToe(alleDoelen as Doel[]))

      const ingedeeldIds = new Set(rijen.map((r: any) => r.schutter_id))
      const nogIn = inschrijvingen
        .filter((i) => !ingedeeldIds.has(i.schutter_id))
        .map((i, idx) => inschrijvingNaarSlot(i, idx))
      setNietIngedeeld(nogIn)
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

    const vergrendeldeSchutterIds = new Set(
      doelen
        .filter((d) => vergrendeldeSet.has(d.nummer))
        .flatMap((d) => d.schutters.map((s) => s.schutter_id))
    )
    const vrijeInschrijvingen = inschrijvingen.filter(
      (i) => !vergrendeldeSchutterIds.has(i.schutter_id)
    )

    const config = cfgVanW(wedstrijd)
    const resultaat = berekenIndeling(vrijeInschrijvingen as any, config, vergrendeldeDoelen)

    const alleDoelen = resultaat.doelen.map((d) => {
      if (vergrendeldeSet.has(d.nummer)) {
        const huidig = doelen.find((h) => h.nummer === d.nummer)
        return huidig ?? d
      }
      return d
    })

    setDoelen(alleDoelen)
    setNietIngedeeld(
      resultaat.nietIngedeeld.map((s, i) => ({
        schutter_id: s.schutter_id,
        voornaam: s.voornaam,
        naam: s.naam,
        gilde_naam: s.gilde_naam,
        type_boog: s.type_boog,
        afstand: s.afstand,
        leeftijdscategorie: s.leeftijdscategorie,
        geslacht: s.geslacht,
        dubbel_eerste_helft: !!s.dubbel_eerste_helft,
        dubbel_tweede_helft: !!s.dubbel_tweede_helft,
        positie: i
      }))
    )
    await slaOp(alleDoelen)
  }

  async function slaOp(huidigeDoelen: DoelMetConflicten[]): Promise<void> {
    const rijen = huidigeDoelen.flatMap((d) =>
      d.schutters.map((s) => ({
        wedstrijd_id: wedstrijd.id,
        doel_nummer: d.nummer,
        schutter_id: s.schutter_id,
        positie: s.positie
      }))
    )
    await window.api.indeling.save(wedstrijd.id, rijen)
  }

  // ── Drag & Drop ──────────────────────────────────────────

  function vindSlot(id: string): DoelSlot | null {
    for (const d of doelen) {
      const slot = d.schutters.find((s) => `${d.nummer}-${s.schutter_id}` === id)
      if (slot) return slot
    }
    return nietIngedeeld.find((s) => `niet-${s.schutter_id}` === id) ?? null
  }

  function onDragStart(event: DragStartEvent): void {
    setActiefSlot(vindSlot(event.active.id as string))
  }

  function onDragEnd(event: DragEndEvent): void {
    setActiefSlot(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const vanNietIngedeeld = activeId.startsWith('niet-')
    const bronSchutterId = vanNietIngedeeld
      ? parseInt(activeId.replace('niet-', ''))
      : parseInt(activeId.split('-')[1])
    const bronDoelNr = vanNietIngedeeld ? null : parseInt(activeId.split('-')[0])

    if (overId === 'niet-ingedeeld') {
      verplaatsNaarNietIngedeeld(bronSchutterId, bronDoelNr)
      return
    }

    if (overId.startsWith('doel-')) {
      const naarDoelNr = parseInt(overId.replace('doel-', ''))
      verplaatsNaarDoel(bronSchutterId, bronDoelNr, naarDoelNr)
      return
    }

    // Drop op een schutter-slot: format "{doelNr}-{schutterId}"
    const slotOver = parseSlotId(overId)
    if (slotOver) {
      verplaatsNaarDoel(bronSchutterId, bronDoelNr, slotOver.doelNr, slotOver.positie)
    }
  }

  function parseSlotId(id: string): { doelNr: number; positie: number } | null {
    if (id.startsWith('doel-') || id.startsWith('niet-')) return null
    const parts = id.split('-')
    if (parts.length !== 2) return null
    const doelNr = parseInt(parts[0])
    const schutterId = parseInt(parts[1])
    if (isNaN(doelNr) || isNaN(schutterId)) return null
    const doel = doelen.find((d) => d.nummer === doelNr)
    if (!doel) return null
    const idx = doel.schutters.findIndex((s) => s.schutter_id === schutterId)
    if (idx === -1) return null
    return { doelNr, positie: idx }
  }

  function verplaatsNaarNietIngedeeld(schutterId: number, vanDoelNr: number | null): void {
    if (vanDoelNr === null) return
    const slot = doelen
      .find((d) => d.nummer === vanDoelNr)
      ?.schutters.find((s) => s.schutter_id === schutterId)
    if (!slot) return
    const nieuweDoelen = doelen.map((d) =>
      d.nummer === vanDoelNr
        ? { ...d, schutters: d.schutters.filter((s) => s.schutter_id !== schutterId) }
        : d
    )
    setNietIngedeeld((prev) => [...prev, slot])
    const metConflicten = voegConflictenToe(nieuweDoelen as Doel[])
    setDoelen(metConflicten)
    slaOp(metConflicten)
  }

  function verplaatsNaarDoel(
    schutterId: number,
    vanDoelNr: number | null,
    naarDoelNr: number,
    naarPositie?: number
  ): void {
    const doelDest = doelen.find((d) => d.nummer === naarDoelNr)
    if (!doelDest || doelDest.vergrendeld) return

    // Binnen-doel reorder
    if (vanDoelNr === naarDoelNr && naarPositie !== undefined) {
      const bronIdx = doelDest.schutters.findIndex((s) => s.schutter_id === schutterId)
      if (bronIdx === -1 || bronIdx === naarPositie) return
      const herschikt = arrayMove(doelDest.schutters, bronIdx, naarPositie)
      const nieuweDoelen = doelen.map((d) =>
        d.nummer === naarDoelNr
          ? { ...d, schutters: herschikt.map((s, i) => ({ ...s, positie: i })) }
          : d
      )
      const metConflicten = voegConflictenToe(nieuweDoelen as Doel[])
      setDoelen(metConflicten)
      slaOp(metConflicten)
      return
    }

    let slot: DoelSlot | undefined

    let nieuweDoelen = doelen.map((d) => {
      if (vanDoelNr !== null && d.nummer === vanDoelNr) {
        if (d.vergrendeld) return d
        slot = d.schutters.find((s) => s.schutter_id === schutterId)
        return { ...d, schutters: d.schutters.filter((s) => s.schutter_id !== schutterId) }
      }
      return d
    })

    if (!slot) {
      slot = nietIngedeeld.find((s) => s.schutter_id === schutterId)
      if (!slot) return
      setNietIngedeeld((prev) => prev.filter((s) => s.schutter_id !== schutterId))
    }

    nieuweDoelen = nieuweDoelen.map((d) => {
      if (d.nummer !== naarDoelNr) return d
      if (d.schutters.some((s) => s.schutter_id === schutterId)) return d
      const nieuw = [...d.schutters]
      const insertIdx = naarPositie ?? nieuw.length
      nieuw.splice(Math.min(insertIdx, nieuw.length), 0, { ...slot!, positie: 0 })
      return { ...d, schutters: nieuw.map((s, i) => ({ ...s, positie: i })) }
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

  async function voerLeegmakenUit(): Promise<void> {
    setBevestigLeegmaken(false)
    const nieuweDoelen = doelen.map((d) => (d.vergrendeld ? d : { ...d, schutters: [] }))

    // Schutters die op een vergrendeld doel staan moeten ingedeeld blijven.
    const vergrendeldeSchutterIds = new Set(
      nieuweDoelen.filter((d) => d.vergrendeld).flatMap((d) => d.schutters.map((s) => s.schutter_id))
    )

    // Herstel oorspronkelijke aanmeldvolgorde door inschrijvingen opnieuw op te halen.
    const inschrijvingen: Inschrijving[] = await window.api.inschrijvingen.getByWedstrijd(
      wedstrijd.id
    )
    const nogIn = inschrijvingen
      .filter((i) => !vergrendeldeSchutterIds.has(i.schutter_id))
      .map((i, idx) => inschrijvingNaarSlot(i, idx))

    setNietIngedeeld(nogIn)
    const metConflicten = voegConflictenToe(nieuweDoelen as Doel[])
    setDoelen(metConflicten)
    slaOp(metConflicten)
  }

  function toggleAlleVergrendeld(): void {
    const allesVergrendeld = doelen.length > 0 && doelen.every((d) => d.vergrendeld)
    const nieuweStatus = !allesVergrendeld
    const nieuweDoelen = doelen.map((d) => ({ ...d, vergrendeld: nieuweStatus }))
    setDoelen(nieuweDoelen)
    // Persist per doel
    for (const d of nieuweDoelen) {
      window.api.indeling.toggleDoelVergrendeld(wedstrijd.id, d.nummer, nieuweStatus)
    }
  }

  // ── Render ────────────────────────────────────────────────

  const aantalIngedeeld = doelen.reduce((s, d) => s + d.schutters.length, 0)
  const totaal = aantalIngedeeld + nietIngedeeld.length
  const totaalConflicten = doelen.reduce((s, d) => s + d.conflicten.length, 0)
  const allesVergrendeld = doelen.length > 0 && doelen.every((d) => d.vergrendeld)

  const doelenPerZone = useMemo(() => {
    return {
      '25m': doelen.filter((d) => d.zone === '25m'),
      compound: doelen.filter((d) => d.zone === 'compound'),
      '18m': doelen.filter((d) => d.zone === '18m'),
      '12m': doelen.filter((d) => d.zone === '12m')
    }
  }, [doelen])

  // Merge 25m en compound in één zone-blok zoals in de design (compound staat tussen 25m doelen)
  const doelen25mEnCompound = useMemo(() => {
    return doelen.filter((d) => d.zone === '25m' || d.zone === 'compound').sort((a, b) => a.nummer - b.nummer)
  }, [doelen])

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* Actiebalk */}
      <div className="indeling-bar">
        <div className="progress-text">
          <span className="big">{aantalIngedeeld}</span>
          <span>van {totaalInschrijvingen || totaal} schutters ingedeeld</span>
        </div>
        {totaalConflicten > 0 && (
          <span className="aandachtspunten-wrap" tabIndex={0}>
            <span className="chip chip-yellow" style={{ cursor: 'help' }}>
              ⚠ {totaalConflicten} aandachtspunt{totaalConflicten > 1 ? 'en' : ''}
            </span>
            <div className="aandachtspunten-popover" role="tooltip">
              <h4>Aandachtspunten per doel</h4>
              <ul>
                {doelen
                  .filter((d) => d.conflicten.length > 0)
                  .map((d) => (
                    <li key={d.nummer}>
                      <span className="doel-ref">Doel {String(d.nummer).padStart(2, '0')}</span>
                      <span className="berichten">
                        {d.conflicten.map((c) => c.bericht).join(' · ')}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => setBevestigLeegmaken(true)}>
          <IconX /> Leegmaken
        </button>
        <button
          className="btn"
          onClick={toggleAlleVergrendeld}
          title={allesVergrendeld ? 'Alle doelen ontgrendelen' : 'Alle doelen vergrendelen'}
        >
          {allesVergrendeld ? <IconUnlock /> : <IconLock />}
          {allesVergrendeld ? 'Doelen ontgrendelen' : 'Doelen vergrendelen'}
        </button>
        <button className="btn btn-accent-yellow" onClick={voerAutoIn}>
          <IconMagic /> Automatisch indelen
        </button>
      </div>

      {/* Indeling layout */}
      <div className="indeling-layout">
        <NietIngedeeldBalk slots={nietIngedeeld} totaal={totaalInschrijvingen || totaal} />

        <main>
          {doelen25mEnCompound.length > 0 && (
            <section className="doelen-zone">
              <div className="doelen-zone-head">
                <h2>25 meter</h2>
                <span className="zone-tag">{doelen25mEnCompound.length} doelen</span>
              </div>
              <div className="doelen-grid">
                {doelen25mEnCompound.map((d) => (
                  <DoelKolom
                    key={d.nummer}
                    doel={d}
                    onVergrendel={() => toggleVergrendel(d.nummer)}
                  />
                ))}
              </div>
            </section>
          )}
          {doelenPerZone['18m'].length > 0 && (
            <section className="doelen-zone">
              <div className="doelen-zone-head">
                <h2>18 meter</h2>
                <span className="zone-tag">{doelenPerZone['18m'].length} doelen</span>
              </div>
              <div className="doelen-grid">
                {doelenPerZone['18m'].map((d) => (
                  <DoelKolom
                    key={d.nummer}
                    doel={d}
                    onVergrendel={() => toggleVergrendel(d.nummer)}
                  />
                ))}
              </div>
            </section>
          )}
          {doelenPerZone['12m'].length > 0 && (
            <section className="doelen-zone">
              <div className="doelen-zone-head">
                <h2>12 meter</h2>
                <span className="zone-tag">{doelenPerZone['12m'].length} doelen</span>
              </div>
              <div className="doelen-grid">
                {doelenPerZone['12m'].map((d) => (
                  <DoelKolom
                    key={d.nummer}
                    doel={d}
                    onVergrendel={() => toggleVergrendel(d.nummer)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <DragOverlay>
        {actiefSlot && <SchutterKaart slot={actiefSlot} draggableId="overlay" compact />}
      </DragOverlay>

      {bevestigAuto && (
        <div className="modal-backdrop" onClick={() => setBevestigAuto(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Indeling herberekenen?</header>
            <div className="modal-text">
              De huidige indeling wordt overschreven. Vergrendelde doelen blijven bewaard.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setBevestigAuto(false)}>
                Annuleer
              </button>
              <button className="btn btn-accent-yellow" onClick={runAuto}>
                <IconMagic /> Herbereken
              </button>
            </div>
          </div>
        </div>
      )}

      {bevestigLeegmaken && (
        <div className="modal-backdrop" onClick={() => setBevestigLeegmaken(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">Indeling leegmaken?</header>
            <div className="modal-text">
              Alle niet-vergrendelde doelen worden leeggemaakt. Vergrendelde doelen blijven bewaard.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setBevestigLeegmaken(false)}>
                Annuleer
              </button>
              <button className="btn" onClick={voerLeegmakenUit}>
                <IconX /> Leegmaken
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
    leeftijdscategorie: i.leeftijdscategorie,
    geslacht: i.geslacht,
    dubbel_eerste_helft: !!i.dubbel_eerste_helft,
    dubbel_tweede_helft: !!i.dubbel_tweede_helft,
    positie: idx
  }
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

function IconLock(): JSX.Element {
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function IconUnlock(): JSX.Element {
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </svg>
  )
}

function IconMagic(): JSX.Element {
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
      <path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      <path d="M4 20 14 10" />
      <path d="m20 16 .8 1.6L22.4 18.4l-1.6.8L20 21l-.8-1.8L17.6 18.4l1.6-.8L20 16Z" />
    </svg>
  )
}
