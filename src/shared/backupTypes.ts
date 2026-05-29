// Type-definities en validator voor het wedstrijd-backup JSON-formaat.
// Bron van waarheid voor het formaat zelf: internal-docs/BACKUP_FORMAT.md.
//
// Wordt gedeeld tussen main (export, import, conflict-check) en renderer
// (download/upload-helpers). Bevat alleen pure types en logica zonder
// platform-API's, zodat zowel main- als renderer-bundle hem veilig kunnen
// importeren via de `@shared`-alias.

export const HUIDIGE_SCHEMA = 1 as const

export interface BackupWedstrijdV1 {
  naam: string
  datum: string
  locatie: string | null
  aantal_doelen: number
  aantal_doelen_18m: number
  aantal_doelen_12m: number
  compound_startdoel: number
  // Spec verplicht voor schrijvers, maar lezers vallen terug op 1 voor
  // backups uit pre-0.2.4-versies waar het veld nog niet bestond. Daarom
  // optioneel in dit type.
  aantal_compound_doelen?: number
}

export interface BackupSchutterV1 {
  id: number
  voornaam: string
  naam: string
  gilde_naam: string | null
  type_boog: string
  leeftijdscategorie: string
  geslacht: string
  afstand: number
}

export interface BackupInschrijvingV1 {
  schutter_id: number
  aanmeldvolgorde: number
  dubbel_eerste_helft: 0 | 1
  dubbel_tweede_helft: 0 | 1
}

export interface BackupIndelingRijV1 {
  doel_nummer: number
  schutter_id: number
  positie: number
}

export interface BackupPayloadV1 {
  type: 'ontarget-wedstrijd-backup'
  schemaVersie: 1
  geexporteerdOp?: string
  wedstrijd: BackupWedstrijdV1
  schutters: BackupSchutterV1[]
  inschrijvingen: BackupInschrijvingV1[]
  indeling: BackupIndelingRijV1[]
  vergrendeldeDoelen: number[]
}

// Valideert dat een onbekende payload een geldig backup-bestand is voor een
// versie die deze app kan lezen. Gooit met een UI-vriendelijke boodschap zodat
// de fout door de bestaande catch-paden in importCheck/importApply naar de
// gebruiker komt. Zie BACKUP_FORMAT.md "Hoe lezers moeten omgaan met
// versie-mismatch" voor het vereiste gedrag.
export function valideerEnNormaliseer(payload: unknown): BackupPayloadV1 {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Bestand is geen OnTarget wedstrijd-backup')
  }
  const obj = payload as Record<string, unknown>
  if (obj.type !== 'ontarget-wedstrijd-backup') {
    throw new Error('Bestand is geen OnTarget wedstrijd-backup')
  }
  const v = obj.schemaVersie
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) {
    throw new Error('Ongeldige of ontbrekende schemaVersie')
  }
  if (v > HUIDIGE_SCHEMA) {
    throw new Error(
      'Bestand is gemaakt door een nieuwere versie van OnTarget. Update de app om dit bestand te kunnen openen.'
    )
  }
  // v === 1 (enige bestaande versie). Wedstrijd-blok moet aanwezig zijn,
  // anders kan zelfs de conflict-check er niets mee.
  const w = obj.wedstrijd as Record<string, unknown> | undefined
  if (!w || typeof w !== 'object' || typeof w.naam !== 'string' || typeof w.datum !== 'string') {
    throw new Error('Wedstrijd-gegevens ontbreken in bestand')
  }
  return obj as unknown as BackupPayloadV1
}
