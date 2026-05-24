import type { Inschrijving, Wedstrijd } from '../types'

export interface Schutter extends Inschrijving {}

export interface DoelSlot {
  schutter_id: number
  voornaam: string
  naam: string
  gilde_naam: string | null
  type_boog: string
  afstand: number
  leeftijdscategorie: string
  geslacht: 'M' | 'V'
  dubbel_eerste_helft: boolean
  dubbel_tweede_helft: boolean
  positie: number
}

export interface Doel {
  nummer: number
  zone: '25m' | '18m' | '12m' | 'compound'
  schutters: DoelSlot[]
  vergrendeld: boolean
}

export interface Conflict {
  bericht: string
}

export interface DoelMetConflicten extends Doel {
  conflicten: Conflict[]
}

export interface Indelingsresultaat {
  doelen: DoelMetConflicten[]
  nietIngedeeld: Schutter[]
}

export interface WedstrijdConfig {
  aantalDoelen: number
  aantalDoelen18m: number
  aantalDoelen12m: number
  compoundStartdoel: number
  aantalCompoundDoelen: number
}

export function configVanWedstrijd(w: Wedstrijd): WedstrijdConfig {
  return {
    aantalDoelen: w.aantal_doelen,
    aantalDoelen18m: w.aantal_doelen_18m,
    aantalDoelen12m: w.aantal_doelen_12m,
    compoundStartdoel: w.compound_startdoel,
    aantalCompoundDoelen: w.aantal_compound_doelen ?? 1
  }
}
