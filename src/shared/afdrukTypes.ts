// Serializeerbaar model voor de Excel-export van een wedstrijdindeling.
// Gedeeld tussen de renderer (bouwt het model uit de indeling + afdrukopties)
// en het main-proces (schrijft het .xlsx-bestand en opent het in Excel).
// Enkel primitieve waarden, zodat het zonder verlies over IPC kan.

export interface ExcelKolom {
  kop: string
  breedte: number
}

export type ExcelRij =
  | { soort: 'data'; cellen: string[] }
  | { soort: 'groepkop'; tekst: string }

export interface ExcelModel {
  titel: string
  subtitel: string
  datum: string
  kolommen: ExcelKolom[]
  rijen: ExcelRij[]
  totalen: string[]
  waarschuwingen: string[]
}
