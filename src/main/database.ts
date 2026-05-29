import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import initSqlJs, { Database } from 'sql.js'

let db: Database
let dbPath: string
let saveTimeout: NodeJS.Timeout | null = null
let inTransaction = false

// Converteert sql.js resultaten naar een array van objecten
export function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// Geeft één rij terug of null
export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows[0] ?? null
}

// Voert een statement uit en geeft lastInsertRowid en changes terug
export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  db.run(sql, params)
  const info = queryOne('SELECT last_insert_rowid() as id, changes() as changes')
  // Binnen een transactie plant transaction() zelf één save na de commit.
  if (!inTransaction) scheduleSave()
  return { lastInsertRowid: info?.id ?? 0, changes: info?.changes ?? 0 }
}

// Voert meerdere statements uit in een transactie.
// sql.js ondersteunt geen geneste transacties: een tweede BEGIN faalt stil.
// Daarom expliciet weigeren in plaats van een silent SQL-fout.
export function transaction(fn: () => void): void {
  if (inTransaction) throw new Error('Nested transaction not supported')
  inTransaction = true
  db.run('BEGIN')
  try {
    fn()
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  } finally {
    inTransaction = false
  }
  scheduleSave()
}

// Sla de database op na een korte vertraging (debounce)
function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => saveToDisk(), 500)
}

// Synchroon flushen van wachtende save. Aanroepen vanuit before-quit
// zodat data niet verloren gaat als de app binnen 500ms na een schrijfactie sluit.
export function flushDatabaseSync(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  saveToDisk()
}

function saveToDisk(): void {
  try {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  } catch (err) {
    const boodschap = err instanceof Error ? err.message : String(err)
    console.error('Kon database niet opslaan:', err)
    // showErrorBox is synchroon en werkt ook tijdens before-quit.
    dialog.showErrorBox(
      'Opslagfout',
      `Kon de database niet opslaan: ${boodschap}\n\n` +
        'Recente wijzigingen kunnen verloren gaan bij het sluiten van de app. ' +
        'Controleer schijfruimte en bestandsrechten, en probeer de app opnieuw te starten.'
    )
  }
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  dbPath = join(app.getPath('userData'), 'doelindeling.db')

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  createSchema()
}

function createSchema(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS gilden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naam TEXT NOT NULL UNIQUE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS schutters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voornaam TEXT NOT NULL,
      naam TEXT NOT NULL,
      gilde_id INTEGER REFERENCES gilden(id),
      type_boog TEXT NOT NULL CHECK(type_boog IN ('Recurve', 'Compound', 'Barebow', 'Andere')),
      leeftijdscategorie TEXT NOT NULL CHECK(leeftijdscategorie IN ('Aspirant', 'Jeugd', 'Junior', 'Senior', 'Veteraan')),
      geslacht TEXT NOT NULL CHECK(geslacht IN ('M', 'V')),
      afstand INTEGER NOT NULL CHECK(afstand IN (12, 18, 25))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS wedstrijden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naam TEXT NOT NULL,
      datum TEXT NOT NULL,
      locatie TEXT,
      aantal_doelen INTEGER NOT NULL DEFAULT 10,
      aantal_doelen_18m INTEGER NOT NULL DEFAULT 1,
      aantal_doelen_12m INTEGER NOT NULL DEFAULT 0,
      compound_startdoel INTEGER NOT NULL DEFAULT 5,
      aantal_compound_doelen INTEGER NOT NULL DEFAULT 1,
      aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Migratie: voeg kolom toe aan bestaande databases
  try {
    db.run(`ALTER TABLE wedstrijden ADD COLUMN aantal_compound_doelen INTEGER NOT NULL DEFAULT 1`)
  } catch {
    // Kolom bestaat al — geen probleem
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS inschrijvingen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wedstrijd_id INTEGER NOT NULL REFERENCES wedstrijden(id),
      schutter_id INTEGER NOT NULL REFERENCES schutters(id),
      aanmeldvolgorde INTEGER NOT NULL,
      dubbel_eerste_helft INTEGER NOT NULL DEFAULT 0,
      dubbel_tweede_helft INTEGER NOT NULL DEFAULT 0,
      UNIQUE(wedstrijd_id, schutter_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS indeling (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wedstrijd_id INTEGER NOT NULL REFERENCES wedstrijden(id),
      doel_nummer INTEGER NOT NULL,
      schutter_id INTEGER NOT NULL REFERENCES schutters(id),
      positie INTEGER NOT NULL,
      vergrendeld INTEGER NOT NULL DEFAULT 0,
      UNIQUE(wedstrijd_id, doel_nummer, schutter_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS vergrendelde_doelen (
      wedstrijd_id INTEGER NOT NULL REFERENCES wedstrijden(id),
      doel_nummer INTEGER NOT NULL,
      PRIMARY KEY (wedstrijd_id, doel_nummer)
    )
  `)
}
